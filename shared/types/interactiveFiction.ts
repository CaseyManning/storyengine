interface StoryNode {
	id: string;
	displayText: string;
	worldStateDescription: string;
	choiceIds: string[];
}

interface StoryChoice {
	id: string;
	displayText: string;
	nextNodeId: string;
	//text description of the effect on the world state
	consequences: string;
}

interface StoryMetadata {
	currentNodeId: string | null;
	// Could add other metadata like story title, creation date, etc.
}

interface Story {
	id: string;
	nodes: StoryNode[];
	choices: StoryChoice[];
	metadata?: StoryMetadata; // Optional metadata about the story
}

interface SBStoryNode {
	id: string;
	story_id: string;
	display_text: string;
	world_state: string;
	choice_ids: any;
}

interface SBStoryChoice {
	id: string;
	story_id: string;
	display_text: string;
	next_node_id: string;
	consequences: string;
}

interface SBStoryProgress {
	story_id: number;
	user_id: string;
	node_id: string;
}

export type { StoryNode, StoryChoice, Story, StoryMetadata, SBStoryNode, SBStoryChoice, SBStoryProgress };
