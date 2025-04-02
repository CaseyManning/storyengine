interface TextData {
	content: string;
	reducedContent: string;
	generatingContext: string;
}

type TWorldObject = TCharacter | TWorldStateData;

interface TWorldStateData {
	id: string;
	name: string;
	content: TextData;
	dependencies: TWorldObject[];
}

interface Story {
	cast: TCharacter[];
	world: TWorldStateData[];
	movement: TStoryMovement;
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
	biography: TextData;
	relations: TCharacterRelation[];
}

interface TLeafStoryMovement {
	characters: TCharacter[];
	setting: TextData;
	mechanics: TextData;
}

interface TCompositeStoryMovement {
	children: TStoryMovement[];
}

type TStoryMovement = {
	id: string;
	content: TextData;
} & (
	| ({
			type: 'leaf';
	  } & TLeafStoryMovement)
	| ({
			type: 'composite';
	  } & TCompositeStoryMovement)
);

export type {
	Story,
	TCharacter,
	TLeafStoryMovement,
	TCompositeStoryMovement,
	TStoryMovement,
	TWorldStateData,
	TWorldObject,
};
