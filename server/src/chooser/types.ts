interface Character {
    id: string;
    name: string;
    biography: string;
}

interface ConflictThread {
    id: string;
    resolved: boolean;
    characters: Character[];
    description: string;
}

interface DecisionPoint {
    id: string;
    //parentChoice: string | null; parent choice id equals id
    parentDecisionPoint: string | null;
    description: string;
    choices: DecisionChoice[];
    storyState: StoryState;
    visited: boolean;
    depth: number; 
}

interface DecisionChoice {
    id: string;
    decisionPointId: string;
    text: string;
    next: DecisionPoint;
}

interface StoryState {
    id: string;
    openThreads: string[];
    storyContext: string | null;
    characters: string[];
}

export type { StoryState, DecisionPoint, DecisionChoice, Character, ConflictThread };