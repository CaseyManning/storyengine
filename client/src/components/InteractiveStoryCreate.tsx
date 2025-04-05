import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interactiveStoryService } from '../services/api';
import '../styles/InteractiveStory.css';

const InteractiveStoryCreate: React.FC = () => {
  const navigate = useNavigate();
  
  const [storyPrompt, setStoryPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storyPrompt.trim()) {
      setError('Please enter a story prompt');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await interactiveStoryService.createStory(storyPrompt);
      
      // Navigate to the newly created story
      if (response.success && response.data.id) {
        navigate(`/interactive/${response.data.id}`);
      } else {
        throw new Error('Failed to create story');
      }
    } catch (err) {
      console.error('Error creating story:', err);
      setError('Failed to create the story. Please try again.');
      setLoading(false);
    }
  };
  
  const handleBackToList = () => {
    navigate('/interactive');
  };
  
  return (
    <div className="interactive-story-container">
      <div className="story-navigation">
        <button onClick={handleBackToList}>Back to Stories</button>
      </div>
      
      <div className="story-content">
        <h2>Create a New Interactive Story</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleCreateStory}>
          <div className="form-group">
            <label htmlFor="storyPrompt">Story Prompt:</label>
            <textarea 
              id="storyPrompt"
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              placeholder="Describe the story setting and theme you want to explore..."
              rows={6}
              required
            />
            <p className="help-text">
              Provide details about the world, characters, and scenario for your interactive story.
            </p>
          </div>
          
          <button 
            type="submit" 
            className="create-story-button"
            disabled={loading || !storyPrompt.trim()}
          >
            {loading ? 'Creating...' : 'Create Story'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InteractiveStoryCreate;