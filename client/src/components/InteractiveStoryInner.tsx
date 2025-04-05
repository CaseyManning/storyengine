import React, { useMemo } from 'react';
import { Story, StoryChoice } from '../../../shared/types/interactiveFiction';
import ForceGraph from './ForceGraph';
import '../styles/InteractiveStory.css';

interface InteractiveStoryInnerProps {
	story: Story;
	currentNodeId: string | null;
	processingChoice: string | null;
	onChoice: (choiceId: string) => void;
	onNodeClick: (nodeId: string) => void;
	onNewStory: () => void;
	onBackToList: () => void;
}

const InteractiveStoryInner: React.FC<InteractiveStoryInnerProps> = ({
	story,
	currentNodeId,
	processingChoice,
	onChoice,
	onNodeClick,
	onNewStory,
	onBackToList,
}) => {
	// Get the current node from the story
	const currentNode = useMemo(() => {
		return currentNodeId ? story.nodes.find((node) => node.id === currentNodeId) : null;
	}, [currentNodeId, story]);

	// Get available choices for the current node
	const availableChoices: StoryChoice[] = useMemo(() => {
		if (!currentNodeId) return [];

		const node = story.nodes.find((node) => node.id === currentNodeId);
		if (!node) return [];

		return node.choiceIds
			.map((choiceId) => story.choices.find((choice) => choice.id === choiceId))
			.filter((choice): choice is StoryChoice => choice !== undefined);
	}, [currentNodeId, story]);

	// Prepare graph data for ForceGraph component
	const graphData = useMemo(() => {
		// Keep track of all node IDs that should be in the graph
		const nodeIdsInGraph = new Set<string>();

		// Add all existing story nodes to the set
		story.nodes.forEach((node) => nodeIdsInGraph.add(node.id));

		// Find all target node IDs from choices that might not exist yet
		const missingNodeIds = new Set<string>();
		story.choices.forEach((choice) => {
			if (!nodeIdsInGraph.has(choice.nextNodeId)) {
				missingNodeIds.add(choice.nextNodeId);
			}
		});

		// Create nodes for the graph from existing story nodes
		const nodes = story.nodes.map((node) => ({
			id: node.id,
			node: (
				<div className={`graph-node ${node.id === currentNodeId ? 'current-node' : ''}`}>
					{(node.displayText || '').substring(0, 20)}...
				</div>
			),
		}));

		// Create dummy nodes for missing targets
		const dummyNodes = Array.from(missingNodeIds).map((nodeId) => ({
			id: nodeId,
			node: <div className="graph-node dummy-node">Future node</div>,
		}));

		// Combine existing and dummy nodes
		const allNodes = [...nodes, ...dummyNodes];

		// Create links for the graph
		const links = story.choices
			.map((choice) => {
				// Find the source node (the node that has this choice in its choiceIds)
				const sourceNode = story.nodes.find((node) => node.choiceIds.includes(choice.id));

				return {
					source: sourceNode?.id || '',
					target: choice.nextNodeId,
					label: choice.displayText.substring(0, 15) + '...',
					directional: true,
				};
			})
			.filter((link) => link.source); // Only filter out links with empty source

		return { nodes: allNodes, links };
	}, [story, currentNodeId]);

	return (
		<div className="interactive-story-container">
			<div className="story-navigation">
				<button onClick={onBackToList}>Back to Stories</button>
				<button onClick={onNewStory}>Start New Story</button>
			</div>

			<div className="splitscreen-container">
				{/* Left panel - Story text and choices */}
				<div className="story-panel">
					{/* Show a loading indicator when processing a choice */}
					{processingChoice && <div className="processing-indicator">Processing your choice...</div>}

					<div className="story-description">{currentNode ? currentNode.displayText : 'no current node'}</div>

					<div className="story-choices">
						{availableChoices.length > 0 ? (
							<ul>
								{availableChoices.map((choice) => (
									<li key={choice.id}>
										<button onClick={() => onChoice(choice.id)} disabled={!!processingChoice}>
											{choice.displayText}
										</button>
									</li>
								))}
							</ul>
						) : (
							<p>no available choices</p>
						)}
					</div>
				</div>

				{/* Right panel - Force graph visualization */}
				<div className="graph-panel">
					<div className="graph-container">
						<ForceGraph
							nodes={graphData.nodes}
							links={graphData.links}
							width={400}
							height={500}
							onNodeClick={onNodeClick}
						/>
					</div>
					<div className="graph-legend">
						<div className="legend-item">
							<div className="legend-node"></div>
							<span>Story Node</span>
						</div>
						<div className="legend-item">
							<div className="legend-node current"></div>
							<span>Current Node</span>
						</div>
						<div className="legend-item">
							<div className="legend-node dummy"></div>
							<span>Future Node</span>
						</div>
						<div className="legend-item">
							<div className="legend-arrow">→</div>
							<span>Choice</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default InteractiveStoryInner;
