import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { parseStory } from '../parser/parse';
import supabase from '../utils/supabase';

const router = express.Router();

// Get all stories for the current user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('parsedStories')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Stories retrieved successfully',
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stories',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Upload new story
router.post('/upload', isAuthenticated, async (req, res) => {
  try {
    const { storyText: story } = req.body;
    
    if (!story) {
      return res.status(400).json({
        success: false,
        message: 'Story content is required'
      });
    }

    // 1. Insert the raw story into the parsedStories table
    const { data, error: storyInsertError } = await supabase
      .from('stories')
      .insert({
        user_id: req.user.id,
        text: story,
      }).select();

    if (storyInsertError) {
      console.error('Error inserting story:', storyInsertError);
    }
    console.log('storyInsertData', data);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to insert story'
      });
    }

    const { id: storyId } = data[0];

    res.status(200).json({
      success: true,
      storyId,
    });

    const parsedStoryData = await parseStory(story);
    
    if (parsedStoryData.cast && parsedStoryData.cast.length > 0) {
      const characterObjects = parsedStoryData.cast.map(character => ({
        story_id: storyId,
        type: 'character',
        data: character,
      }));

      console.log('characterObjects', characterObjects);

      const { error: charactersInsertError } = await supabase
        .from('storyObjects')
        .insert(characterObjects);

      if (charactersInsertError) throw charactersInsertError;

      const { error: updateError } = await supabase
        .from('stories')
        .update({
          parsed: true
        })
        .eq('id', storyId);

      if (updateError) throw updateError;
    }
    
  } catch (error) {
    console.error('Error processing story upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process story',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/status/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('stories')
      .select('id,parsed')
      .eq('id', id)
      .single();

    if (error) throw error;

    let { parsed } = data;``

    res.status(200).json({
      success: true,
      data: {
        parsed
      }
    });
    
  } catch (error) {
    console.error('Error fetching story status:', error);
  }
});

// Get story by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the story from parsedStories
    const { data: storyData, error: storyError } = await supabase
      .from('parsedStories')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (storyError) throw storyError;
    if (!storyData) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Get the story objects (characters, etc.)
    const { data: storyObjects, error: objectsError } = await supabase
      .from('storyObjects')
      .select('*')
      .eq('story_id', id);

    if (objectsError) throw objectsError;

    // Organize story objects by type
    const organized = {
      characters: storyObjects?.filter(obj => obj.type === 'character').map(obj => obj.data) || []
    };

    res.status(200).json({
      success: true,
      message: 'Story retrieved successfully',
      data: {
        ...storyData,
        objects: organized
      }
    });
    
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch story',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;