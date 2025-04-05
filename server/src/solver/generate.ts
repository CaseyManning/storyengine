import { Story, StoryNode, StoryChoice } from '../../../shared/types/interactiveFiction';
import { generate, generate_structured } from '../utils/oai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { saveStoryNode, saveStoryChoice } from '../utils/supabase';

// Schema for generating story options
const choicesSchema = z.object({
	choices: z.array(
		z.object({
			displayText: z.string(),
			consequences: z.string(),
		}),
	),
});

interface ChoiceOutput {
	displayText: string;
	consequences: string;
}

/**
 * Generate a new story with an initial node and choices
 */
export async function generateStory(storyPrompt?: string): Promise<Story> {
	const initialPrompt =
		storyPrompt ||
		'You are a storyteller. Generate a story about a girl who goes on a quest to find a new home for her family after a natural disaster.';

	// Generate initial world state
	const worldState = await generate(
		`${initialPrompt}\n\nCreate the opening scene of this interactive story. Describe the current situation in detail.`,
	);

	// Create initial node ID
	const initialNodeId = uuidv4();

	// Generate initial choices
	const choicesResponse = await generate_structured(
		`Based on this world state:\n\n${worldState}\n\nGenerate 3 possible actions the player could take. Each choice should be distinct and lead to different outcomes.`,
		choicesSchema,
	);

	// Create node and choice objects
	const choices: StoryChoice[] = choicesResponse.choices.map((choice: ChoiceOutput) => {
		const id = uuidv4();
		const nextNodeId = uuidv4();
		return {
			id,
			displayText: choice.displayText,
			nextNodeId,
			consequences: choice.consequences,
		};
	});

	const nodeDisplayTextPrompt = `Based on this world state:\n\n${worldState}\n\n Generate a a short passage (3 sentences or less) describing the player's current situation.`;
	const nodeDisplayText = await generate(nodeDisplayTextPrompt);

	const initialNode: StoryNode = {
		id: initialNodeId,
		worldStateDescription: worldState,
		displayText: nodeDisplayText,
		choiceIds: choices.map((choice) => choice.id),
	};

	// Create the full story
	const story: Story = {
		id: uuidv4(),
		nodes: [initialNode],
		choices: choices,
	};

	return story;
}

/**
 * Generate a new node and choices based on a previous choice
 */
export async function generateNextNode(story: Story, choiceId: string): Promise<Story> {
	// Find the selected choice
	const selectedChoice = story.choices.find((choice) => choice.id === choiceId);
	if (!selectedChoice) {
		throw new Error(`Choice with ID ${choiceId} not found`);
	}

	// Get the previous node
	const previousNode = story.nodes.find((node) => node.choiceIds.includes(choiceId));
	if (!previousNode) {
		throw new Error(`No node contains choice with ID ${choiceId}`);
	}

	// Generate new world state based on previous state and consequences
	const newWorldState = await generate(
		`Previous world state: ${previousNode.worldStateDescription}\n\n` +
			`The player chose: ${selectedChoice.displayText}\n\n` +
			`Consequences: ${selectedChoice.consequences}\n\n` +
			`Generate a detailed description of the new world state after these events.`,
	);

	// Generate new choices
	const choicesResponse = await generate_structured(
		`Based on this world state:\n\n${newWorldState}\n\nGenerate 3 possible actions the player could take next. Each choice should be distinct and lead to different outcomes.`,
		choicesSchema,
	);

	// Create new choices
	const newChoices: StoryChoice[] = choicesResponse.choices.map((choice: ChoiceOutput) => {
		const id = uuidv4();
		const nextNodeId = uuidv4();
		return {
			id,
			displayText: choice.displayText,
			nextNodeId,
			consequences: choice.consequences,
		};
	});

	const nodeDisplayTextPrompt = `Based on this world state:\n\n${newWorldState}\n\n Generate a a short passage (3 sentences or less) describing what is currently happening, contextualizing the players current choices in response, which will be: ${newChoices.map((choice) => choice.displayText).join(', ')}`;
	const nodeDisplayText = await generate(nodeDisplayTextPrompt);

	// Create new node
	const newNode: StoryNode = {
		id: selectedChoice.nextNodeId,
		worldStateDescription: newWorldState,
		displayText: nodeDisplayText,
		choiceIds: newChoices.map((choice) => choice.id),
	};

	// Save the new node and choices to the database
	await saveStoryNode(newNode, story.id);
	for (const choice of newChoices) {
		await saveStoryChoice(choice, story.id);
	}

	// Update the story
	const updatedStory: Story = {
		id: story.id,
		nodes: [...story.nodes, newNode],
		choices: [...story.choices, ...newChoices],
	};

	return updatedStory;
}
