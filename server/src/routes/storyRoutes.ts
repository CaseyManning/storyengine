import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { getUserStories, fetchStory, updateStoryProgress, deleteStory, saveCompleteStory } from '../utils/supabase';
import { generateStory, generateNextNode } from '../solver/generate';

const router = express.Router();

// Get all stories for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
	try {
		// Get stories with metadata
		const stories = await getUserStories(req.user.id);

		res.status(200).json({
			success: true,
			message: 'Stories retrieved successfully',
			data: stories,
		});
	} catch (error) {
		console.error('Error fetching stories:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to fetch stories',
			error: error instanceof Error ? error.message : String(error),
		});
	}
});

// Create a new story
router.post('/new', isAuthenticated, async (req, res) => {
	try {
		const { storyPrompt } = req.body;

		// Generate new story
		const story = await generateStory(storyPrompt);

		// Save the story to the database
		const id = await saveCompleteStory(story, req.user.id);

		res.status(201).json({
			success: true,
			message: 'New story created successfully',
			data: {
				id,
				story,
			},
		});
	} catch (error) {
		console.error('Error creating new story:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to create new story',
			error: error instanceof Error ? error.message : String(error),
		});
	}
});

// Get a specific story by ID
router.get('/:storyId', isAuthenticated, async (req, res) => {
	try {
		const { storyId } = req.params;

		// Get the story data, including user progress
		const storyData = await fetchStory(storyId, req.user.id);

		res.status(200).json({
			success: true,
			message: 'Story retrieved successfully',
			data: storyData,
		});
	} catch (error) {
		console.error('Error fetching story:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to fetch story',
			error: error instanceof Error ? error.message : String(error),
		});
	}
});

// Make a choice in a story (REST API backup for the WebSocket approach)
router.post('/:storyId/choice/:choiceId', isAuthenticated, async (req, res) => {
	try {
		const { storyId, choiceId } = req.params;

		// Get the current story data, with user progress
		const currentStory = await fetchStory(storyId, req.user.id);

		// Generate next node based on the choice
		const updatedStory = await generateNextNode(currentStory, choiceId);

		// Find the choice to get the next node ID
		const selectedChoice = updatedStory.choices.find((c) => c.id === choiceId);
		if (!selectedChoice) {
			throw new Error(`Choice ${choiceId} not found in story`);
		}

		// Update user progress
		await updateStoryProgress(storyId, req.user.id, selectedChoice.nextNodeId);

		res.status(200).json({
			success: true,
			message: 'Choice processed successfully',
			data: updatedStory,
		});
	} catch (error) {
		console.error('Error processing choice:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to process choice',
			error: error instanceof Error ? error.message : String(error),
		});
	}
});

// Delete a story
router.delete('/:storyId', isAuthenticated, async (req, res) => {
	try {
		const { storyId } = req.params;

		// Delete the story and all related data
		await deleteStory(storyId, req.user.id);

		res.status(200).json({
			success: true,
			message: 'Story deleted successfully',
		});
	} catch (error) {
		console.error('Error deleting story:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to delete story',
			error: error instanceof Error ? error.message : String(error),
		});
	}
});

export default router;
