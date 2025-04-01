import React from 'react';
import '../styles/StoryViewer.css';

interface StoryLoadingProps {
  isParsed: boolean;
}

const StoryLoading: React.FC<StoryLoadingProps> = ({ isParsed }) => {
  return (
    <div className="status-message">
      {isParsed ? (
        <div className="success">
          <p>Story parsed successfully!</p>
        </div>
      ) : (
        <p>Parsing story... Please wait.</p>
      )}
    </div>
  );
};

export default StoryLoading;