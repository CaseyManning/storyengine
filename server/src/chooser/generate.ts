import { Character, ConflictThread, DecisionChoice, DecisionPoint, StoryState } from "./types";
import {v4 as uuidv4} from 'uuid';
import { generate, generate_structured } from "../utils/oai";
import supabase from "../utils/supabase";
import { z } from "zod";
const maxDepth = 16;

export default async function generateStory(prompt: string) {

    let storyId = uuidv4();

    let storyPoints: Record<string, DecisionPoint> = {};
    let storyChoices: Record<string, DecisionChoice> = {};

    let conflictThreads: ConflictThread[] = [];
    let charactersList: string[] = [];
    let characters: Record<string, Character> = {};

    let opening: string = await generateOpening(prompt);

    let pointsToProcess: DecisionPoint[] = [];

    let storyGraph: StoryState = {
        id: uuidv4(),
        openThreads: [],
        storyContext: null,
        characters: [],
    };

    console.log(opening)

    let initialPoint: DecisionPoint = {
        id: uuidv4(),
        parentDecisionPoint: null,
        description: opening,
        choices: [],
        storyState: storyGraph,
        visited: false,
        depth: 0,
    };
    initialPoint = await generateChildPoints(initialPoint, charactersList.map(name => characters[name]), conflictThreads, opening);

    pointsToProcess.push(initialPoint);

    console.log("Initial point:");
    console.log(initialPoint);

    while(pointsToProcess.length > 0) {
        let currentPoint = pointsToProcess.pop()!;

        console.log(currentPoint);

        currentPoint = await generateChildPoints(currentPoint, charactersList.map(name => characters[name]), conflictThreads, opening);
        pointsToProcess.push(currentPoint);
    }


    async function generateChildPoints(currentPoint: DecisionPoint, characters: Character[], conflictThreads: ConflictThread[], opening: string) {

        let context = assembleContext(currentPoint, characters, conflictThreads, opening);

        let prompt = `${context}
        
        Generate two options for the player to choose from. This could be an action, a dialogue option, choosing between two places to go, etc. given the current context (i.e. if the player is currently in a conversation, the options should be dialogue choices or to end the conversation).

        For each option, give a text descriptor (e.g. "Go to the kitchen" or "ask why they're here"). For each option, give a description of the consequences of the choice to the state of the story, and where the player ends up contextually.
        `;

        const InstructionFormat = z.object({
            choice1Action: z.string(),
            choice1ResultingState: z.string(),
            choice2Action: z.string(),
            choice2ResultingState: z.string(),
        });

        let childPoints = await generate_structured(prompt, InstructionFormat);

        let choice1Id = uuidv4();
        let choice1: DecisionChoice = {
            id: choice1Id,
            decisionPointId: currentPoint.id,
            text: childPoints.choice1Action,
            next: {
                id: choice1Id,
                parentDecisionPoint: currentPoint.id,
                description: childPoints.choice1ResultingState,
                choices: [],
                storyState: currentPoint.storyState,
                visited: false,
                depth: currentPoint.depth + 1,
            } as DecisionPoint,
        }

        let choice2Id = uuidv4();
        let choice2: DecisionChoice = {
            id: choice2Id,
            decisionPointId: choice2Id,
            text: childPoints.choice2Action,
            next: {
                id: choice2Id,
                parentDecisionPoint: currentPoint.id,
                description: childPoints.choice2ResultingState,
                choices: [],
                storyState: currentPoint.storyState,
                visited: false,
                depth: currentPoint.depth + 1,
            } as DecisionPoint,
        }

        const updatedPoint = {
            ...currentPoint,
            choices: [choice1, choice2],
        }
        storyPoints[choice1.decisionPointId] = updatedPoint;

        return updatedPoint;
    }

    async function uploadNode(node: DecisionPoint) {
        const { data, error } = await supabase.from('storypoints').insert({
            id: node.id,
            story_id: storyId,
            parent_id: node.parentDecisionPoint,
            description: node.description,
            choiceIds: node.choices.map(choice => choice.id),
            choiceLabels: node.choices.map(choice => choice.text),
        });
    }

    function generateOpening(storyPrompt: string) {
        let prompt = `
        Create a compelling opening for a short story with the following prompt: ${storyPrompt}. Describe the setting and context, the protagonst, and where the story will begin, with an initial situation that will lead to the first decision point.
        `;

        let opening = generate(prompt);
        return opening;
    }

    function assembleContext(decisionPoint: DecisionPoint, characters: Character[], conflictThreads: ConflictThread[], opening: string) {

        let pointHistory: DecisionPoint[] = [];
        let choiceHistory: DecisionChoice[] = [];
        
        let currentPoint = decisionPoint;
        while (currentPoint) {
            pointHistory.push(currentPoint);
            if(storyChoices[currentPoint.id] && currentPoint.parentDecisionPoint) {
                choiceHistory.push(storyChoices[currentPoint.id]);
                currentPoint = storyPoints[currentPoint.parentDecisionPoint];
            } else {
                break;
            }
        }
        pointHistory.reverse();
        choiceHistory.reverse();

        let prompt = `
        The story began as:
        ${opening}

        The cast:
        ${characters.map(character => `${character.name}: ${character.biography}`).join('\n')}
        
        Plot so far:
        `;
        for(let i = 0; i < choiceHistory.length; i++) {
            prompt += `${pointHistory[i].description}\n`;
            if(choiceHistory[i]) {
                prompt += `The player chose: ${choiceHistory[i].text}\n`;
            }
        }

        prompt += `
        And now:
        ${decisionPoint.description}
        `;

        return prompt;
    }

}