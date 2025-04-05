import { z } from 'zod';
import { generate_structured } from '../utils/oai';
import { TCharacter, TStory, TWorldObject, TStateNode, TMovement } from '../../../shared/types/story';
import { v4 as uuidv4 } from 'uuid';
import { availableMemory } from 'process';

/**
 * Parses a story text to extract characters
 * @param storyText The story text to parse
 * @returns An array of TCharacter objects
 */
export async function parseCharacters(storyChunks: ChunkedStory): Promise<TCharacter[]> {
	if (!storyChunks || storyChunks.length === 0 || storyChunks[0].trim().length === 0) {
		throw new Error('Story text cannot be empty');
	}

	let allCharacters: TCharacter[] = [];

	for (const chunk of storyChunks) {
		const prompt = `
      Analyze the following story chunk and identify all characters mentioned. If there is a reference to  a character that has clearly been mentioned before, that character can be omitted.
      For each character, provide:
      1. Their name
      2. A brief description based on the text
      3. Key personality traits (if apparent)
      4. Their role in the story (if clear)

      Story Chunk:
      ${chunk}
    `;

		try {
			const characterSchema = z.object({
				characters: z.array(
					z.object({
						name: z.string(),
						description: z.string(),
						traits: z.array(z.string()).optional(),
						role: z.string().optional(),
					}),
				),
			});

			const result = await generate_structured(prompt, characterSchema);

			const chunkCharacters = result.characters.map((char: any): TCharacter => {
				const traitsText = char.traits?.length > 0 ? `\nKey traits: ${char.traits.join(', ')}.` : '';

				const roleText = char.role ? `\nRole: ${char.role}.` : '';

				const biographyContent = `${char.description} ${traitsText} ${roleText}`;

				return {
					id: uuidv4(),
					name: char.name,
					relations: [],
					biography: biographyContent,
				};
			});

			console.log(`found ${chunkCharacters.length} characters in chunk`);

			allCharacters = await deduplicateObjects(allCharacters, chunkCharacters);
		} catch (error) {
			console.error('Error parsing characters from story chunk:', error);
			throw new Error(`Failed to parse characters: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	return allCharacters;
}

type ChunkedStory = string[];

function chunkStory(storyText: string): ChunkedStory {
	const chunks: ChunkedStory = [];
	const defaultChunkSize = 2000;
	var remainingText = storyText;

	while (remainingText.length > 0) {
		if (remainingText.length < defaultChunkSize || remainingText.substring(defaultChunkSize).indexOf('.') < 0) {
			chunks.push(remainingText);
			break;
		}

		let searchText = remainingText.substring(defaultChunkSize);
		let terminatingStrings = ['. ', '.\n', '."', '.”', '! ', '!\n', '!"', '!”', '? ', '?\n', '?"', '?”'];
		let idxs = terminatingStrings.map((str) => searchText.indexOf(str));
		let minIdx = Math.min(...idxs.filter((idx) => idx !== -1));

		let splitIdx = minIdx + defaultChunkSize + 2;

		chunks.push(remainingText.substring(0, splitIdx));
		remainingText = remainingText.substring(splitIdx);
	}

	return chunks;
}

async function deduplicateObjects<T extends TWorldObject>(existing: T[], newObjects: T[]): Promise<T[]> {
	const deduplicatedObjects: T[] = [...existing];

	const duplicateSchema = z.object({
		isDuplicate: z.boolean(),
	});

	for (const newObject of newObjects) {
		const prompt = `We have the following list of current objects or characters in our story: ${JSON.stringify(existing)}.
    We are adding a new object or character to the story: ${JSON.stringify(newObject)}.
    Please check if this object or character is a close duplicate of any of the existing ones (i.e. referring to the same thing without necessarily being worded exactly the same).`;

		try {
			const result = (await generate_structured(prompt, duplicateSchema)) as { isDuplicate: boolean };
			if (!result.isDuplicate) {
				deduplicatedObjects.push(newObject);
			}
		} catch (error) {
			throw new Error(
				`Failed to check for duplicates: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return deduplicatedObjects;
}

/**
 * Extracts story states and movements from text using an iterative approach
 * @param storyText The story text to parse
 * @param characters Known characters in the story
 * @returns Arrays of state nodes and movements
 */
export async function parseStatesAndMovements(
	storyText: string,
	characters: TCharacter[],
): Promise<{ states: TStateNode[]; movements: TMovement[] }> {
	if (!storyText || storyText.trim().length === 0) {
		throw new Error('Story text cannot be empty');
	}

	const states: TStateNode[] = [];
	const movements: TMovement[] = [];
	
	try {
		// First, get the initial state before any action happens
		const initialStateSchema = z.object({
			initialState: z.string().describe('Detailed description of the world state at the beginning of the story'),
			firstAction: z.string().describe('Description of the first action or event that changes the world state')
		});

		const initialStatePrompt = `
		Read the following story text and identify the initial state of the world BEFORE any action happens.
		
		Describe in as much detail as possible the state of the world and characters at the beginning of the story, including:
		- Setting/environment description
		- Character positions and situations
		- Important objects and their states
		- Atmosphere and time period
		- Any other relevant details

		Then, identify the first significant action or event that changes the state of the world.
		
		Characters in this story: ${characters.map((c) => c.name).join(', ')}
		
		Story Text:
		${storyText}
		`;

		const initialStateResult = await generate_structured(initialStatePrompt, initialStateSchema);

		// Create the initial state node
		const initialState: TStateNode = {
			id: uuidv4(),
			worldstate: initialStateResult.initialState,
		};

		states.push(initialState);
		
		// Start the iterative process with the first action
		let previousState = initialState;
		let previousAction = initialStateResult.firstAction;
		let continueProcessing = true;
		
		while (continueProcessing) {
			const nextStateSchema = z.object({
				resultingState: z.string().describe('Detailed description of the world state after the previous action/event'),
				nextAction: z.string().describe('Description of the next action/event in the story that changes the world state'),
				hasMoreActions: z.boolean().describe('Whether there are more significant actions in the story')
			});
			
			const nextStatePrompt = `
			Continue analyzing the following story. Based on the current state of the world:
			"${previousState.worldstate}"
			
			And after this action occurs:
			"${previousAction}"
			
			Provide:
			1. A detailed description of the new state of the world after this action
			2. The next significant action or event that changes the state of the world (if any)
			3. Whether there are more significant actions in the story after this one
			
			Focus on concrete changes to the physical world, character situations, or relationships.
			
			Characters in this story: ${characters.map((c) => c.name).join(', ')}
			
			Story Text:
			${storyText}
			`;
			
			const stateResult = await generate_structured(nextStatePrompt, nextStateSchema);
			
			// Create the new state node
			const newState: TStateNode = {
				id: uuidv4(),
				worldstate: stateResult.resultingState,
			};
			
			states.push(newState);
			
			// Create the movement connecting the states
			const movement: TMovement = {
				id: uuidv4(),
				source: previousState,
				destination: newState,
				action: previousAction,
				dependencies: [], // Would need more complex analysis to populate
				submovements: null, // Could be populated with nested movements in a future enhancement
			};
			
			movements.push(movement);
			
			// Update for next iteration
			previousState = newState;
			previousAction = stateResult.nextAction;
			
			// Check if we should continue
			continueProcessing = stateResult.hasMoreActions;
		}

		return { states, movements };
	} catch (error) {
		console.error('Error parsing states and movements from story:', error);
		throw new Error(
			`Failed to parse states and movements: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Parses a story text to extract characters, states, movements and returns a TStory object
 * @param storyText The story text to parse
 * @returns A complete TStory object
 */
export async function parseStory(storyText: string): Promise<TStory> {
	const chunks = chunkStory(storyText);
	const characters = await parseCharacters(chunks);
	const { states, movements } = await parseStatesAndMovements(storyText, characters);

	return {
		cast: characters,
		world: [], // Could be populated in future enhancements
		states: states,
		movements: movements,
	};
}
