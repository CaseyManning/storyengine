import React from 'react';
import ForceGraphSpace, { FGItem } from './ForceGraphSpace';
import '../styles/StoryViewer.css';
import { StoryData } from './StoryViewer';
import { TStoryMovement } from '../../../shared/types/story';

interface StoryVisualizerProps {
  storyData: StoryData;
}

const StoryVisualizer: React.FC<StoryVisualizerProps> = ({ storyData }) => {
  // Convert story data to graph nodes
  const createGraphNodes = (): FGItem[] => {
    if (!storyData) return [];

    const nodes: FGItem[] = [];

    // Add characters
    storyData.cast.forEach(character => {
      nodes.push({
        id: character.id,
        node: (
          <div className="graph-node character-node">
            <h3>{character.id}</h3>
            <p>{character.biography.reducedContent}</p>
          </div>
        ),
        links: [] // Links will be populated later
      });
    });

    // Add story movements (recursive function)
    const addMovements = (movement: TStoryMovement, parentId?: string) => {
      const nodeLinks = [];
      if (parentId) nodeLinks.push(parentId);

      // Add links to characters for leaf nodes
      if (movement.type === 'leaf') {
        movement.characters.forEach(char => {
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
        links: nodeLinks
      });

      // Process children for composite nodes
      if (movement.type === 'composite') {
        movement.children.forEach(child => {
          addMovements(child, movement.id);
        });
      }
    };

    addMovements(storyData.movement);

    return nodes;
  };

  return (
    <div className="visualization-section">
      <h2>Story Visualization</h2>
      <div className="force-graph-container">
        <ForceGraphSpace nodes={createGraphNodes()} />
      </div>
    </div>
  );
};

export default StoryVisualizer;