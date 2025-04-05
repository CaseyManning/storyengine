import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interactiveStoryService } from '../services/api';
import '../styles/InteractiveStory.css';

interface StoryListItem {
  id: string;
  created_at: string;
  story_data: any;
}

const InteractiveStoryList: React.FC = () => {
  const navigate = useNavigate();
  
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchStories = async () => {
      try {
        setLoading(true);
        const response = await interactiveStoryService.getStories();
        
        if (response.success) {
          setStories(response.data || []);
        } else {
          throw new Error(response.message || 'Failed to fetch stories');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError('Failed to load stories. Please try again.');
        setLoading(false);
      }
    };
    
    fetchStories();
  }, []);
  
  const handleCreateNew = () => {
    navigate('/interactive/create');
  };
  
  const handlePlayStory = (storyId: string) => {
    navigate(`/interactive/${storyId}`);
  };
  
  const handleDeleteStory = async (storyId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this story?')) {
      return;
    }
    
    try {
      await interactiveStoryService.deleteStory(storyId);
      
      // Remove the deleted story from the list
      setStories(stories.filter(story => story.id !== storyId));
    } catch (err) {
      console.error('Error deleting story:', err);
      setError('Failed to delete the story. Please try again.');
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="interactive-story-container">
      <div className="story-header">
        <h1>Interactive Stories</h1>
        <button 
          className="create-story-button"
          onClick={handleCreateNew}
        >
          Create New Story
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-message">Loading your stories...</div>
      ) : stories.length === 0 ? (
        <div className="empty-state">
          <p>You don't have any interactive stories yet.</p>
          <p>Create your first story to begin your adventure!</p>
        </div>
      ) : (
        <div className="story-list">
          {stories.map(story => (
            <div 
              key={story.id} 
              className="story-item"
              onClick={() => handlePlayStory(story.id)}
            >
              <div className="story-item-details">
                <h3>Interactive Story</h3>
                <p className="story-date">Created: {formatDate(story.created_at)}</p>
              </div>
              <div className="story-item-actions">
                <button 
                  className="play-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayStory(story.id);
                  }}
                >
                  Continue
                </button>
                <button 
                  className="delete-button"
                  onClick={(e) => handleDeleteStory(story.id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InteractiveStoryList;