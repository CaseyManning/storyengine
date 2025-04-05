import React, { useState, useEffect, useCallback, useRef } from 'react';
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

	// Initialize socket connection - split into two effects to avoid reconnections
	// First effect: Socket connection and join story
	useEffect(() => {
		if (user?.id && storyId) {
			console.log('Setting up socket connection for user', user.id);
			socketService.connectSocket(user.id);
			socketService.joinStory(storyId);

			// Clean up socket connection on unmount
			return () => {
				console.log('Cleaning up socket connection');
				socketService.leaveStory(storyId);
				socketService.removeStoryListeners();
			};
		}
	}, [user?.id, storyId]); // Only depend on user ID and story ID

	// Use refs to safely access the latest state without causing dependency issues
	const stateRef = useRef({
		currentNodeId: null as string | null,
		processingChoice: null as string | null,
		story: null as Story | null,
	});

	// Update refs whenever state changes
	useEffect(() => {
		stateRef.current.currentNodeId = currentNodeId;
	}, [currentNodeId]);

	useEffect(() => {
		stateRef.current.processingChoice = processingChoice;
	}, [processingChoice]);

	useEffect(() => {
		stateRef.current.story = story;
	}, [story]);

	// First effect: Set up all socket event listeners only once
	useEffect(() => {
		// Only run this once when the component mounts with valid user and storyId
		if (!user?.id || !storyId) return;

		// Define handlers inside the effect to get proper closure
		// while avoiding re-creation and dependencies issues

		const handleStoryUpdated = ({ story: updatedStory }: { story: Story }) => {
			setStory(updatedStory);

			const current = stateRef.current;
			// Only update currentNodeId if needed
			if (!current.currentNodeId) {
				setCurrentNodeId(updatedStory.metadata?.currentNodeId || null);
			} else if (current.processingChoice) {
				const choice = updatedStory.choices.find((c) => c.id === current.processingChoice);
				if (choice) {
					setCurrentNodeId(choice.nextNodeId);
				}
				setProcessingChoice(null);
			} else if (updatedStory.metadata?.currentNodeId) {
				setCurrentNodeId(updatedStory.metadata.currentNodeId);
			}

			setLoading(false);
		};

		const handleStoryContentAdded = ({
			newContent,
		}: {
			newContent: { nodes: StoryNode[]; choices: StoryChoice[] };
		}) => {
			addContentToStory(newContent.nodes, newContent.choices);
		};

		const handleProgressUpdated = ({ nodeId }: { nodeId: string }) => {
			updateProgress(nodeId);
		};

		const handleChoiceProcessed = ({ choiceId }: { choiceId: string }) => {
			const current = stateRef.current;
			if (current.processingChoice === choiceId && current.story) {
				const choice = current.story.choices.find((c) => c.id === choiceId);
				if (choice) {
					setCurrentNodeId(choice.nextNodeId);
					setProcessingChoice(null);
					setLoading(false);
				}
			}
		};

		const handleChoiceError = ({ message }: { message: string }) => {
			setError(message);
			setProcessingChoice(null);
			setLoading(false);
		};

		console.log('Setting up socket event listeners - THIS SHOULD HAPPEN ONCE');

		// Add all event listeners
		socketService.onStoryUpdated(handleStoryUpdated);
		socketService.onStoryContentAdded(handleStoryContentAdded);
		socketService.onProgressUpdated(handleProgressUpdated);
		socketService.onChoiceProcessed(handleChoiceProcessed);
		socketService.onChoiceError(handleChoiceError);

		// Clean up on unmount or if user/storyId changes
		return () => {
			console.log('Cleaning up socket event listeners');
			socketService.removeStoryListeners();
		};
	}, [user?.id, storyId, addContentToStory, updateProgress]);

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
	});

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
