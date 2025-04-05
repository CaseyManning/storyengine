import { SBStoryChoice, SBStoryNode, StoryChoice } from '../../../shared/types/interactiveFiction';
import { StoryNode } from '../../../shared/types/interactiveFiction';

export function storyNodeToSb(node: StoryNode, storyId: string): SBStoryNode {
	return {
		id: node.id,
		story_id: storyId,
		display_text: node.displayText,
		world_state: node.worldStateDescription,
		choice_ids: node.choiceIds,
	};
}

export function storyChoiceToSb(choice: StoryChoice, storyId: string): SBStoryChoice {
	return {
		id: choice.id,
		story_id: storyId,
		display_text: choice.displayText,
		next_node_id: choice.nextNodeId,
		consequences: choice.consequences,
	};
}
