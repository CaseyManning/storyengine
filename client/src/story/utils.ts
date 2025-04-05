import { TStory } from '../../../shared/types/story';
import type { SBStory, SBStoryObject } from '../../../shared/types/supabase';

export function parseSBStory(story: SBStory, objects: SBStoryObject[]): TStory {
	console.log('story: ', story);
	console.log('objects: ', objects);
	return {
		cast: [],
		world: [],
		movements: [],
		states: [],
	};
}
