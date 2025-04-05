import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interactiveStoryService } from '../services/api';
import { Story, StoryNode, StoryChoice } from '../../../shared/types/interactiveFiction';
import '../styles/InteractiveStory.css';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socketService';
import InteractiveStoryInner from './InteractiveStoryInner';

const InteractiveStory: React.FC = () => {
	const { storyId } = useParams<{ storyId: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();

	const [story, setStory] = useState<Story | null>(null);
	const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [processingChoice, setProcessingChoice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Add new content to the story
	const addContentToStory = useCallback((newNodes: StoryNode[], newChoices: StoryChoice[]) => {
		setStory((currentStory) => {
			if (!currentStory) return null;

			// Add new nodes and choices without duplicates
			const updatedNodes = [...currentStory.nodes];
			const updatedChoices = [...currentStory.choices];

			// Add new nodes if they don't already exist
			newNodes.forEach((newNode) => {
				if (!updatedNodes.some((node) => node.id === newNode.id)) {
					updatedNodes.push(newNode);
				}
			});

			// Add new choices if they don't already exist
			newChoices.forEach((newChoice) => {
				if (!updatedChoices.some((choice) => choice.id === newChoice.id)) {
					updatedChoices.push(newChoice);
				}
			});

			return {
				...currentStory,
				nodes: updatedNodes,
				choices: updatedChoices,
			};
		});
	}, []);

	// Update progress based on socket event
	const updateProgress = useCallback((nodeId: string) => {
		setCurrentNodeId(nodeId);
		setProcessingChoice(null);
		setLoading(false);
	}, []);

	// Initialize socket connection
	useEffect(() => {
		if (user?.id && storyId) {
			socketService.connectSocket(user.id);
			socketService.joinStory(storyId);

			// Set up socket event listeners
			socketService.onStoryUpdated(({ story: updatedStory }) => {
				setStory(updatedStory);
				if (!currentNodeId) {
					setCurrentNodeId(updatedStory.metadata?.currentNodeId || null);
				}

				// If this is a new node from our choice, update the current node
				if (processingChoice) {
					const choice = updatedStory.choices.find((c) => c.id === processingChoice);
					if (choice) {
						setCurrentNodeId(choice.nextNodeId);
					}
					setProcessingChoice(null);
				} else if (updatedStory.metadata?.currentNodeId) {
					// Set current node from metadata
					setCurrentNodeId(updatedStory.metadata.currentNodeId);
				}

				setLoading(false);
			});

			// Handle new content being added
			socketService.onStoryContentAdded(({ newContent }) => {
				addContentToStory(newContent.nodes, newContent.choices);
			});

			// Handle progress updates
			socketService.onProgressUpdated(({ nodeId }) => {
				if (user.id === user.id) {
					// Check if this update is for the current user
					updateProgress(nodeId);
				}
			});

			socketService.onChoiceProcessed(({ choiceId }) => {
				if (processingChoice === choiceId) {
					// If we have local data for this choice, navigate directly
					if (story) {
						const choice = story.choices.find((c) => c.id === choiceId);
						if (choice) {
							setCurrentNodeId(choice.nextNodeId);
							setProcessingChoice(null);
							setLoading(false);
						}
					}
				}
			});

			socketService.onChoiceError(({ message }) => {
				setError(message);
				setProcessingChoice(null);
				setLoading(false);
			});

			// Clean up socket connection on unmount
			return () => {
				socketService.leaveStory(storyId);
				socketService.removeStoryListeners();
			};
		}
	}, [user?.id, storyId, processingChoice, story, addContentToStory, updateProgress, currentNodeId]);

	// Load story data
	useEffect(() => {
		const fetchStory = async () => {
			if (!storyId) return;

			try {
				setLoading(true);
				const storyData = await interactiveStoryService.getStoryById(storyId);
				setStory(storyData);

				if (!currentNodeId) {
					setCurrentNodeId(storyData.metadata?.currentNodeId || null);
				}

				setLoading(false);
			} catch (err) {
				console.error('Error fetching story:', err);
				setError('Failed to load the story. Please try again.');
				setLoading(false);
			}
		};

		fetchStory();
	}, []);

	// Check if a choice already has pregenerated content
	const hasNextState = (choiceId: string): boolean => {
		if (!story) return false;

		// Find the choice
		const choice = story.choices.find((c) => c.id === choiceId);
		if (!choice) return false;

		// Check if the target node exists in our story data
		const targetNodeExists = story.nodes.some((node) => node.id === choice.nextNodeId);

		return targetNodeExists;
	};

	// Handle making a choice via WebSockets or direct navigation for pregenerated content
	const handleChoice = (choiceId: string) => {
		if (!storyId || !story) return;

		// Always send the choice to the server to update progress
		socketService.makeChoice(storyId, choiceId);

		// Check if we already have the next node
		if (hasNextState(choiceId)) {
			const choice = story.choices.find((c) => c.id === choiceId);
			if (choice) {
				setCurrentNodeId(choice.nextNodeId);
				return;
			}
		}
		// Show loading state for non-pregenerated content
		setProcessingChoice(choiceId);
		setLoading(true);
	};

	// Handle node click in the graph
	const handleNodeClick = (nodeId: string) => {
		// Find the node
		const node = story?.nodes.find((n) => n.id === nodeId);
		if (node) {
			// If this is a clickable node, update current node
			setCurrentNodeId(nodeId);
		}
	};

	// Navigation handlers
	const handleNewStory = () => {
		navigate('/interactive/create');
	};

	const handleBackToList = () => {
		navigate('/interactive');
	};

	if (loading && !story) {
		return <div className="interactive-story-container loading">Loading story...</div>;
	}

	if (error) {
		return (
			<div className="interactive-story-container error">
				<p>{error}</p>
				<button onClick={handleBackToList}>Back to Stories</button>
			</div>
		);
	}

	if (!story) {
		return (
			<div className="interactive-story-container error">
				<p>Story not found or has no content.</p>
				<button onClick={handleBackToList}>Back to Stories</button>
			</div>
		);
	}

	return (
		<InteractiveStoryInner
			story={story}
			currentNodeId={currentNodeId}
			processingChoice={processingChoice}
			onChoice={handleChoice}
			onNodeClick={handleNodeClick}
			onNewStory={handleNewStory}
			onBackToList={handleBackToList}
		/>
	);
};

export default InteractiveStory;
