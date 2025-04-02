import { z } from 'zod';
import { generate_structured } from '../utils/oai';
import { TCharacter, Story, TWorldObject } from '../../../shared/types/story';
import { v4 as uuidv4 } from 'uuid';
import { availableMemory } from 'process';

// Zod schema for character parsing response
const CharacterSchema = z.object({
	characters: z.array(
		z.object({
			name: z.string(),
			description: z.string(),
			traits: z.array(z.string()).optional(),
			role: z.string().optional(),
		}),
	),
});

type CharacterParseResult = z.infer<typeof CharacterSchema>;

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
			// Custom schema for the OpenAI response
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

			// Call OpenAI to parse the characters
			const result = await generate_structured(prompt, characterSchema);

			// Convert the result to TCharacter objects
			const chunkCharacters = result.characters.map((char: any): Omit<TCharacter, 'id'> => {
				// Combine description, traits and role into a cohesive biography
				const traitsText = char.traits?.length > 0 ? `\nKey traits: ${char.traits.join(', ')}.` : '';

				const roleText = char.role ? `\nRole: ${char.role}.` : '';

				const biographyContent = `${char.description} ${traitsText} ${roleText}`;

				return {
					name: char.name,
					relations: [],
					biography: {
						content: biographyContent,
						reducedContent: char.description,
						generatingContext: chunk.substring(0, 500), // First 500 chars as context
					},
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

	const existingList = existing.map((obj) => obj.name).join(', ');

	for (const newObject of newObjects) {
		const prompt = `We have the following list of current objects in our story: ${JSON.stringify(existing)}.
    We are adding a new object to the story: ${JSON.stringify(newObject)}.
    Please check if this object is a close duplicate of any of the existing objects (i.e. referring to the same thing without necessarily being worded exactly the same).`;

		try {
			const result = (await generate_structured(prompt, duplicateSchema)) as { isDuplicate: boolean };
			if (!result.isDuplicate) {
				deduplicatedObjects.push(newObject);
			}
		} catch (error) {
			console.error('Error checking for duplicate objects:', error);
			throw new Error(
				`Failed to check for duplicates: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return deduplicatedObjects;
}

/**
 * Parses a story text to extract characters and returns a partial Story object
 * @param storyText The story text to parse
 * @returns A partial Story object with the cast populated
 */
export async function parseStory(storyText: string): Promise<Partial<Story>> {
	const chunks = chunkStory(storyText);
	const characters = await parseCharacters(chunks);

	return {
		cast: characters,
		// Other story elements would be added by other parser functions
	};
}
