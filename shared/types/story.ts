type TWorldObject = TCharacter | TWorldStateData;

interface TWorldStateData {
	id: string;
	name: string;
	dependencies: TWorldObject[];
}

interface TStory {
	cast: TCharacter[];
	world: TWorldStateData[];
	states: TStateNode[];
	movements: TMovement[];
}

interface TCharacterRelation extends TRelation<TCharacter> {
	type: 'character';
}

interface TRelation<T extends TWorldObject> {
	source: T;
	target: T;
	description: string;
}

interface TCharacter {
	id: string;
	name: string;
	biography: string;
	relations: TCharacterRelation[];
}

interface TStateNode {
	id: string;
	worldstate: string;
}

interface TMovement {
	id: string;
	source: TStateNode;
	destination: TStateNode;
	action: string;
	dependencies: TWorldObject[];
	submovements: TMovement[] | null;
}

export type { TStory, TCharacter, TStateNode, TWorldStateData, TWorldObject, TMovement };
