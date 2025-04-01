// interface TextData {
//     content: string;
//     reducedContent: string;
//     generatingContext: string;
//     emotionalValue: string;
// }

// type TWorldObject = TCharacter | TWorldStateData;

// interface Lockable {
//     locked: boolean;
// }

// interface TWorldStateData extends Lockable {
//     id: string;
//     content: TextData;
//     dependencies: TWorldObject[];
// }

// interface Story {
//     cast: TCharacter[];
//     world: TWorldStateData[];
//     movement: TStoryMovement;
// }

// interface TCharacter extends Lockable {
//     id: string;
//     biography: TextData;
// }

// interface TLeafStoryMovement extends Lockable {
//     characters: TCharacter[];
//     setting: TextData;
//     mechanics: TextData;
// }

// interface TCompositeStoryMovement extends Lockable {
//     children: TStoryMovement[];
// }

// type TStoryMovement = {
//     id: string;
//     content: TextData;
// } & (
//     | {
//         type: 'leaf';
//     } & TLeafStoryMovement
//     | {
//         type: 'composite';
//     } & TCompositeStoryMovement
// );

// export type { Story, TCharacter, TLeafStoryMovement, TCompositeStoryMovement, TStoryMovement, TWorldStateData, TextData };

export {};