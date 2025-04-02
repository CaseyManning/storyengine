import { useMemo, useState, useEffect } from 'react';
import { storyService } from '../services/api';
import '../styles/StoryViewer.css';
import type { TStoryMovement, TCharacter } from '../../../shared/types/story';
import StorySubmission from './StorySubmission';
import StoryLoading from './StoryLoading';
import { Navigate } from 'react-router-dom';

export interface StoryData {
	cast: TCharacter[];
	movement: TStoryMovement;
}

enum StoryState {
	Submission = 'submission',
	Loading = 'loading',
	Done = 'done',
}

const StoryViewer = () => {
	const [storyText, setStoryText] = useState('the little lamb jumped over the fence.');
	const [error, setError] = useState<string | null>(null);
	const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
	const [isParsed, setIsParsed] = useState(false);
	const [storyState, setStoryState] = useState<StoryState>(StoryState.Submission);

	const checkStoryStatus = async (storyId: string) => {
		try {
			const response = await storyService.checkStoryStatus(storyId);
			if (response.success && response.data.parsed) {
				setIsParsed(true);
				setStoryState(StoryState.Done);
			}
		} catch (err) {
			console.error('Error checking story status:', err);
			setStoryState(StoryState.Submission);
			setError('Error checking story status');
		}
	};

	useEffect(() => {
		if (currentStoryId && !isParsed) {
			const intervalId = window.setInterval(() => {
				console.log('checking status');
				console.log('isParsed', isParsed);
				checkStoryStatus(currentStoryId);
			}, 1000);

			return () => window.clearInterval(intervalId);
		}
	}, [currentStoryId, isParsed]);

	const handleUpload = async (text: string) => {
		if (!text.trim()) {
			setError('Please enter story text');
			return;
		}

		setStoryState(StoryState.Loading);
		setError(null);
		setIsParsed(false);
		setCurrentStoryId(null);

		try {
			const data = await storyService.uploadStory(text);
			const storyId = data.storyId;

			if (storyId) {
				setCurrentStoryId(storyId);
			}
		} catch (err: any) {
			setError(err.message);
			console.error(err);
			setStoryState(StoryState.Submission);
		}
	};

	const content = useMemo((): React.ReactNode => {
		switch (storyState) {
			case StoryState.Submission:
				return (
					<StorySubmission
						storyText={storyText}
						setStoryText={setStoryText}
						onSubmit={() => handleUpload(storyText)}
						error={error}
					/>
				);
			case StoryState.Loading:
				return <StoryLoading isParsed={isParsed} />;
			case StoryState.Done:
				return <Navigate to={`/view/${currentStoryId}`} />;
			default:
				return null;
		}
	}, [storyState, storyText, error, isParsed, currentStoryId]);

	return <div className="story-viewer">{content}</div>;
};

export default StoryViewer;
