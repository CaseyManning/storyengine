interface SupabaseStory {
	id: string;
	story_text: string;
	parsed: boolean;
}

interface SBStoryObject {
	id: string;
	type: string;
	data: any;
}

interface SBStory {
	id: number;
	user_id: string;
	text: string;
	parsed: boolean;
	created_at: string;
}

export type { SupabaseStory, SBStoryObject, SBStory };
