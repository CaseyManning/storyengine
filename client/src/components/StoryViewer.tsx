import React, { useEffect, useState } from 'react';
import ForceGraphSpace, { FGItem } from './ForceGraphSpace';
import '../styles/StoryViewer.css';
import { Story } from '../../../shared/types/story';
import { TStoryMovement } from '../../../shared/types/story';
import { useNavigate, useParams } from 'react-router-dom';
import { parseSBStory } from '../story/utils';
import { storyService } from '../services/api';

const StoryViewer = () => {
	// Convert story data to graph nodes

	const { storyId: storyIdParam } = useParams();
	const navigate = useNavigate();

	if (!storyIdParam) {
		navigate('/');
	}

	const storyId = storyIdParam as string;

	const [storyData, setStoryData] = useState<Story | null>(null);

	useEffect(() => {
		const fetchStoryData = async () => {
			const data = await storyService.getStory(storyId);
			console.log('data: ', data);
			const story = parseSBStory(data.story, data.objects);
			setStoryData(story);
		};

		fetchStoryData();
	}, [storyId]);

	const createGraphNodes = (): FGItem[] => {
		if (!storyData) return [];

		const nodes: FGItem[] = [];

		// Add characters
		storyData.cast.forEach((character) => {
			nodes.push({
				id: character.id,
				node: (
					<div className="graph-node character-node">
						<h3>{character.id}</h3>
						<p>{character.biography.reducedContent}</p>
					</div>
				),
			});
		});

		// Add story movements (recursive function)
		const addMovements = (movement: TStoryMovement, parentId?: string) => {
			const nodeLinks = [];
			if (parentId) nodeLinks.push(parentId);

			// Add links to characters for leaf nodes
			if (movement.type === 'leaf') {
				movement.characters.forEach((char) => {
					nodeLinks.push(char.id);
				});
			}

			nodes.push({
				id: movement.id,
				node: (
					<div className="graph-node movement-node">
						<h3>{movement.id}</h3>
						<p>{movement.content.reducedContent}</p>
					</div>
				),
			});

			// Process children for composite nodes
			if (movement.type === 'composite') {
				movement.children.forEach((child) => {
					addMovements(child, movement.id);
				});
			}
		};

		addMovements(storyData.movement);

		return nodes;
	};

	return (
		<div className="viewer">
			<div className="force-graph-container">
				<ForceGraphSpace nodes={createGraphNodes()} links={[]} selectedNode={null} />
			</div>
		</div>
	);
};

export default StoryViewer;
