import { createClient, PostgrestError } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
	Story,
	StoryNode,
	StoryChoice,
	SBStoryNode,
	SBStoryChoice,
	SBStoryProgress,
} from '../../../shared/types/interactiveFiction';
import { storyNodeToSb, storyChoiceToSb } from '../solver/utils';

// Load environment variables
dotenv.config();

// Fix typo in environment variable names
const supabaseUrl = process.env.SUPABSE_URL || '';
const supabaseKey = process.env.SUPABSE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
	console.error('Supabase URL or key is missing. Check your .env file.');
	process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Database table names
const TABLES = {
	STORIES: 'interactive_stories',
	NODES: 'interactive_nodes',
	CHOICES: 'interactive_choices',
	PROGRESS: 'interactive_story_progress',
};

/**
 * Check if a node exists in the database
 */
export async function checkNodeExists(storyId: string, nodeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(TABLES.NODES)
      .select('id')
      .eq('id', nodeId)
      .eq('story_id', storyId)
      .maybeSingle();
      
    if (error) return false;
    return !!data;
  } catch (error) {
    console.error('Error checking if node exists:', error);
    return false;
  }
}

/**
 * Transform database node to application node
 */
export function sbToStoryNode(sbNode: SBStoryNode): StoryNode {
	return {
		id: sbNode.id,
		displayText: sbNode.display_text,
		worldStateDescription: sbNode.world_state,
		choiceIds: sbNode.choice_ids,
	};
}

/**
 * Transform database choice to application choice
 */
export function sbToStoryChoice(sbChoice: SBStoryChoice): StoryChoice {
	return {
		id: sbChoice.id,
		displayText: sbChoice.display_text,
		nextNodeId: sbChoice.next_node_id,
		consequences: sbChoice.consequences,
	};
}

/**
 * Create a new story record
 */
export async function createStoryRecord(userId?: string): Promise<string> {
	const { data, error } = await supabase
		.from(TABLES.STORIES)
		.insert({
			story_data: {
				initialized: true,
			},
			user_id: userId,
		})
		.select('id')
		.single();

	if (error) throw error;
	return data.id;
}

/**
 * Fetch a story by ID with optional user progress
 */
export async function fetchStory(storyId: string, userId?: string): Promise<Story> {
	// Fetch nodes
	const { data: nodesData, error: nodesError } = await supabase
		.from(TABLES.NODES)
		.select('*')
		.eq('story_id', storyId);

	if (nodesError) throw nodesError;

	// Fetch choices
	const { data: choicesData, error: choicesError } = await supabase
		.from(TABLES.CHOICES)
		.select('*')
		.eq('story_id', storyId);

	if (choicesError) throw choicesError;

	// Get user progress if userId is provided
	let currentNodeId: string | null = null;

	if (userId) {
		const { data: progressData, error: progressError } = await supabase
			.from(TABLES.PROGRESS)
			.select('node_id')
			.eq('story_id', storyId)
			.eq('user_id', userId)
			.maybeSingle();

		if (!progressError && progressData) {
			currentNodeId = progressData.node_id;
		}
	}

	// If no progress found and nodes exist, use the first node as current
	if (!currentNodeId && nodesData.length > 0) {
		currentNodeId = nodesData[0].id;
	}

	// Transform data from DB format to application format
	const nodes: StoryNode[] = nodesData.map(sbToStoryNode);
	const choices: StoryChoice[] = choicesData.map(sbToStoryChoice);

	return {
		id: storyId,
		nodes,
		choices,
		metadata: {
			currentNodeId,
		},
	};
}

/**
 * Save a node to the database
 */
export async function saveStoryNode(node: StoryNode, storyId: string): Promise<void> {
	const sbNode = storyNodeToSb(node, storyId);
	const { error } = await supabase.from(TABLES.NODES).insert(sbNode);

	if (error) throw error;
}

/**
 * Save multiple nodes to the database
 */
export async function saveStoryNodes(nodes: StoryNode[], storyId: string): Promise<void> {
	if (nodes.length === 0) return;

	const sbNodes = nodes.map((node) => storyNodeToSb(node, storyId));
	const { error } = await supabase.from(TABLES.NODES).insert(sbNodes);

	if (error) throw error;
}

/**
 * Save a choice to the database
 */
export async function saveStoryChoice(choice: StoryChoice, storyId: string): Promise<void> {
	const sbChoice = storyChoiceToSb(choice, storyId);
	const { error } = await supabase.from(TABLES.CHOICES).insert(sbChoice);

	if (error) throw error;
}

/**
 * Save multiple choices to the database
 */
export async function saveStoryChoices(choices: StoryChoice[], storyId: string): Promise<void> {
	if (choices.length === 0) return;

	const sbChoices = choices.map((choice) => storyChoiceToSb(choice, storyId));
	const { error } = await supabase.from(TABLES.CHOICES).insert(sbChoices);

	if (error) throw error;
}

/**
 * Update user's story progress
 */
export async function updateStoryProgress(storyId: string, userId: string, nodeId: string): Promise<void> {
	const { error } = await supabase.from(TABLES.PROGRESS).upsert({
		story_id: storyId,
		user_id: userId,
		node_id: nodeId,
	});

	if (error) throw error;
}

/**
 * Get user's story progress
 */
export async function getStoryProgress(storyId: string, userId: string): Promise<string | null> {
	const { data, error } = await supabase
		.from(TABLES.PROGRESS)
		.select('node_id')
		.eq('story_id', storyId)
		.eq('user_id', userId)
		.maybeSingle();

	if (error) throw error;
	return data?.node_id || null;
}

/**
 * Get all stories for a user with metadata
 */
export async function getUserStories(userId: string): Promise<any[]> {
	const { data: stories, error } = await supabase
		.from(TABLES.STORIES)
		.select('id, created_at, updated_at')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (error) throw error;

	// For each story, get preview info
	const storiesWithMetadata = await Promise.all(
		(stories || []).map(async (story) => {
			// Get count of nodes
			const { count: nodeCount, error: nodeCountError } = await supabase
				.from(TABLES.NODES)
				.select('id', { count: 'exact', head: true })
				.eq('story_id', story.id);

			if (nodeCountError) throw nodeCountError;

			// Get latest node (for preview)
			const { data: latestNode, error: latestNodeError } = await supabase
				.from(TABLES.NODES)
				.select('display_text')
				.eq('story_id', story.id)
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			// Get user's current progress
			const { data: progressData, error: progressError } = await supabase
				.from(TABLES.PROGRESS)
				.select('node_id')
				.eq('story_id', story.id)
				.eq('user_id', userId)
				.maybeSingle();

			// Build preview object
			return {
				id: story.id,
				created_at: story.created_at,
				updated_at: story.updated_at,
				preview: {
					nodeCount: nodeCount || 0,
					latestNodeText: latestNode?.display_text || 'Story beginning...',
					currentNodeId: progressData?.node_id || null,
				},
			};
		}),
	);

	return storiesWithMetadata || [];
}

/**
 * Delete a story and all related data
 */
export async function deleteStory(storyId: string, userId: string): Promise<void> {
	// Delete user progress first (no foreign key constraints)
	const { error: deleteProgressError } = await supabase
		.from(TABLES.PROGRESS)
		.delete()
		.eq('story_id', storyId)
		.eq('user_id', userId);

	if (deleteProgressError) throw deleteProgressError;

	// Delete nodes
	const { error: deleteNodesError } = await supabase.from(TABLES.NODES).delete().eq('story_id', storyId);

	if (deleteNodesError) throw deleteNodesError;

	// Delete choices
	const { error: deleteChoicesError } = await supabase.from(TABLES.CHOICES).delete().eq('story_id', storyId);

	if (deleteChoicesError) throw deleteChoicesError;

	// Finally delete the story record
	const { error: deleteError } = await supabase.from(TABLES.STORIES).delete().eq('id', storyId);

	if (deleteError) throw deleteError;
}

/**
 * Save a complete story (nodes and choices)
 */
export async function saveCompleteStory(story: Story, userId?: string): Promise<string> {
	// Create the story record
	const storyId = await createStoryRecord(userId);

	// Save all nodes
	if (story.nodes.length > 0) {
		await saveStoryNodes(story.nodes, storyId);
	}

	// Save all choices
	if (story.choices.length > 0) {
		await saveStoryChoices(story.choices, storyId);
	}

	return storyId;
}

export default supabase;
