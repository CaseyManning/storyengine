import { Story } from '../../../shared/types/story';
import type { SBStory, SBStoryObject } from '../../../shared/types/supabase';

export function parseSBStory(story: SBStory, objects: SBStoryObject[]): Story {
	console.log('story: ', story);
	console.log('objects: ', objects);
	return {
		cast: [],
		world: [],
		movement: {
			id: story.id.toString(),
			content: {
				content: '',
				reducedContent: '',
				generatingContext: '',
			},
			type: 'composite',
			children: [],
		},
	};
}
