import { io, Socket } from 'socket.io-client';
import { Story, StoryNode, StoryChoice } from '../../../shared/types/interactiveFiction';

let socket: Socket | null = null;

const connectSocket = (userId: string): Socket => {
	console.log('connecting socket');
	if (!socket) {
		socket = io('http://localhost:3001', {
			withCredentials: true,
		});

		// Authenticate with user ID
		socket.emit('authenticate', { id: userId });

		// Set up reconnection handler
		socket.on('connect', () => {
			console.log('Socket connected');
			// Re-authenticate on reconnection
			if (!socket) {
				console.log('err: no socket found, cant authenticate');
				return;
			}
			socket.emit('authenticate', { id: userId });
		});

		socket.on('disconnect', () => {
			console.log('Socket disconnected');
		});

		socket.on('connect_error', (error: any) => {
			console.error('Socket connection error:', error);
		});
	}

	return socket;
};

export const disconnectSocket = (): void => {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
};

// Story-specific methods
export const joinStory = (storyId: string): void => {
	if (socket) {
		socket.emit('join_story', storyId);
	}
};

export const leaveStory = (storyId: string): void => {
	if (socket) {
		socket.emit('leave_story', storyId);
	}
};

export const makeChoice = (storyId: string, choiceId: string): void => {
	if (socket) {
		socket.emit('make_choice', { storyId, choiceId });
	}
};

// Socket event listeners - original events
// Event listener tracking to prevent duplicates
const activeListeners: Record<string, boolean> = {
  'story_updated': false,
  'choice_processing': false,
  'choice_processed': false,
  'choice_error': false,
  'story_content_added': false,
  'progress_updated': false
};

// Safe way to add event listeners that prevents duplicates
const safeAddListener = (event: string, callback: Function): void => {
  if (!socket) return;
  
  // Remove any existing listener first to prevent duplicates
  socket.off(event);
  
  // Add the new listener
  socket.on(event, callback as any);
  activeListeners[event] = true;
  
  console.log(`Added listener for ${event}`);
};

export const onStoryUpdated = (callback: (data: { storyId: string; story: Story }) => void): void => {
  safeAddListener('story_updated', callback);
};

export const onChoiceProcessing = (callback: (data: { storyId: string; choiceId: string }) => void): void => {
  safeAddListener('choice_processing', callback);
};

export const onChoiceProcessed = (
  callback: (data: { storyId: string; choiceId: string; success: boolean }) => void,
): void => {
  safeAddListener('choice_processed', callback);
};

export const onChoiceError = (callback: (data: { message: string }) => void): void => {
  safeAddListener('choice_error', callback);
};

// New socket event listeners
export interface StoryContentAddedData {
  storyId: string;
  newContent: {
    nodes: StoryNode[];
    choices: StoryChoice[];
  };
}

export const onStoryContentAdded = (callback: (data: StoryContentAddedData) => void): void => {
  safeAddListener('story_content_added', callback);
};

export interface ProgressUpdatedData {
  storyId: string;
  userId: string;
  nodeId: string;
}

export const onProgressUpdated = (callback: (data: ProgressUpdatedData) => void): void => {
  safeAddListener('progress_updated', callback);
};

// Remove event listeners
export const removeAllListeners = (): void => {
	if (socket) {
		socket.removeAllListeners();
	}
};

export const removeStoryListeners = (): void => {
	if (socket) {
		// Remove all event listeners
		socket.off('story_updated');
		socket.off('choice_processing');
		socket.off('choice_processed');
		socket.off('choice_error');
		socket.off('story_content_added');
		socket.off('progress_updated');
		
		// Reset tracking
		Object.keys(activeListeners).forEach(key => {
			activeListeners[key as keyof typeof activeListeners] = false;
		});
		
		console.log('All story listeners removed');
	}
};

const socketService = {
	connectSocket,
	disconnectSocket,
	joinStory,
	leaveStory,
	makeChoice,
	onStoryUpdated,
	onChoiceProcessing,
	onChoiceProcessed,
	onChoiceError,
	onStoryContentAdded,
	onProgressUpdated,
	removeAllListeners,
	removeStoryListeners,
};

export default socketService;
