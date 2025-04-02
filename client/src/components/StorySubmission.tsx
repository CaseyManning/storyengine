import React from 'react';
import '../styles/StoryViewer.css';

interface StorySubmissionProps {
	storyText: string;
	setStoryText: (text: string) => void;
	onSubmit: () => void;
	error: string | null;
}

const StorySubmission: React.FC<StorySubmissionProps> = ({ storyText, setStoryText, onSubmit, error }) => {
	return (
		<div className="upload-section">
			<textarea
				value={storyText}
				onChange={(e) => setStoryText(e.target.value)}
				placeholder="Enter your story text here..."
				rows={6}
			/>
			<button onClick={onSubmit}>Upload Story</button>
			{error && <div className="error-message">{error}</div>}
		</div>
	);
};

export default StorySubmission;
