import { useState } from 'react';
import api from '../services/api';
import '../styles/StoryViewer.css';
import type { TStoryMovement, TCharacter } from '../../../shared/types/story';
import StorySubmission from './StorySubmission';
import StoryLoading from './StoryLoading';
import StoryVisualizer from './StoryVisualizer';

// Create story service to handle API calls
const storyService = {
  uploadStory: async (storyText: string) => {
    const response = await api.post('/story/upload', { storyText });
    return response.data;
  },
  checkStoryStatus: async (storyId: string) => {
    const response = await api.get(`/story/status/${storyId}`);
    return response.data;
  }
};

export interface StoryData {
  cast: TCharacter[];
  movement: TStoryMovement;
}

type StoryState = 'submission' | 'loading' | 'visualization';

const StoryViewer = () => {
  const [storyText, setStoryText] = useState('the little lamb jumped over the fence.');
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [isParsed, setIsParsed] = useState(false);
  const [storyState, setStoryState] = useState<StoryState>('submission');
  
  const checkStoryStatus = async (storyId: string) => {
    try {
      const response = await storyService.checkStoryStatus(storyId);
      if (response.success && response.data.parsed) {
        // Story has been parsed
        setIsParsed(true);
        setStoryState('visualization');
        
        // TODO: Fetch the full story data here
        // For now, we'll just update the UI to show it's been parsed
      }
    } catch (err) {
      console.error('Error checking story status:', err);
      setStoryState('submission');
      setError('Error checking story status');
    }
  };

  const handleUpload = async (text: string) => {
    if (!text.trim()) {
      setError('Please enter story text');
      return;
    }

    setStoryState('loading');
    setError(null);
    setIsParsed(false);
    
    try {
      const data = await storyService.uploadStory(text);
      const storyId = data.storyId;
      
      if (storyId) {
        setCurrentStoryId(storyId);

        var checkStatus = () => {
          if(!isParsed) {
            checkStoryStatus(storyId);
            window.setTimeout(checkStatus, 1000);
          }
        }
        window.setTimeout(checkStatus, 1000);
      }
    } catch (err: any) {
      setError(err.message);
      console.error(err);
      setStoryState('submission');
    }
  };

  const renderContent = () => {
    switch (storyState) {
      case 'submission':
        return (
          <StorySubmission
            storyText={storyText}
            setStoryText={setStoryText}
            onSubmit={() => handleUpload(storyText)}
            error={error}
          />
        );
      case 'loading':
        return <StoryLoading isParsed={isParsed} />;
      case 'visualization':
        return storyData ? <StoryVisualizer storyData={storyData} /> : <p>story parsed!</p>;
      default:
        return null;
    }
  };

  return (
    <div className="story-viewer">
      {renderContent()}
    </div>
  );
};

export default StoryViewer;