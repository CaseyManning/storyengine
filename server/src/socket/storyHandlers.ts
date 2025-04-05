import { Server, Socket } from 'socket.io';
import supabase, {
	fetchStory,
	saveStoryNode,
	saveStoryChoice,
	updateStoryProgress,
	checkNodeExists,
} from '../utils/supabase';
import { generateNextNode } from '../solver/generate';
import { Story, StoryNode, StoryChoice } from '../../../shared/types/interactiveFiction';

/**
 * Sets up WebSocket handlers for interactive story functionality
 * @param io - Socket.io server instance
 */
export function setupStorySocketHandlers(io: Server): void {
	// Map to track ongoing pregeneration tasks
	const pregenerationTasks = new Map<string, Promise<void>>();

	// Set to track nodes that are already generated or being generated
	const generatedNodeIds = new Set<string>();

	io.on('connection', (socket: Socket) => {
		// User authentication for sockets
		let userId: string | null = null;

		socket.on('authenticate', (userData: { id: string }) => {
			userId = userData.id;
			console.log(`Socket ${socket.id} authenticated as user ${userId}`);
		});

		socket.on('join_story', async (storyId: string) => {
			socket.join(`story:${storyId}`);
			console.log(`Client ${socket.id} joined story ${storyId}`);
		});

		socket.on('leave_story', (storyId: string) => {
			socket.leave(`story:${storyId}`);
			console.log(`Client ${socket.id} left story ${storyId}`);
		});

		socket.on('make_choice', async (data: { storyId: string; choiceId: string }) => {
			try {
				const { storyId, choiceId } = data;

				if (!userId) {
					socket.emit('choice_error', {
						message: 'Authentication required',
					});
					return;
				}

				console.log(`Processing choice ${choiceId} for story ${storyId}`);

				// Find the choice to get the next node ID
				const { data: choiceData, error: choiceError } = await supabase
					.from('interactive_choices')
					.select('next_node_id')
					.eq('id', choiceId)
					.eq('story_id', storyId)
					.single();

				if (choiceError) throw choiceError;
				const nextNodeId = choiceData.next_node_id;

				// Check if the target node exists
				const nodeExists = await checkNodeExists(storyId, nextNodeId);

				// If the node doesn't exist, generate it
				if (!nodeExists) {
					console.log(`Target node ${nextNodeId} does not exist, generating it`);
					// Get the current story state from normalized tables
					const currentStory = await fetchStory(storyId);

					// Generate the next node and its choices
					const updatedStory = await generateNextNode(currentStory, choiceId);

					// Find the generated node
					const generatedNode = updatedStory.nodes.find((n) => n.id === nextNodeId);
					if (!generatedNode) {
						throw new Error(`Failed to generate node ${nextNodeId}`);
					}

					// Find new choices that weren't in the original story
					const newChoices = updatedStory.choices.filter(
						(c) => !currentStory.choices.some((cc) => cc.id === c.id),
					);

					// Notify all clients in the story room about the new content
					io.to(`story:${storyId}`).emit('story_content_added', {
						storyId,
						newContent: {
							nodes: [generatedNode],
							choices: newChoices,
						},
					});
				}

				// Update the user's progress
				await updateStoryProgress(storyId, userId, nextNodeId);

				// Emit a progress_updated event to all clients in this story room
				io.to(`story:${storyId}`).emit('progress_updated', {
					storyId,
					userId,
					nodeId: nextNodeId,
				});

				// Emit a specific "choice_processed" event to the client who made the choice
				socket.emit('choice_processed', {
					storyId,
					choiceId,
					success: true,
				});

				// After updating progress, trigger pregeneration for the next set of choices
				// This runs asynchronously and doesn't block the response
				await pregenerateNextNodesFromNode(storyId, nextNodeId, 2); // Generate 2 levels deep
			} catch (error) {
				console.error('Error processing choice via socket:', error);
				socket.emit('choice_error', {
					message: error instanceof Error ? error.message : 'An error occurred',
				});
			}
		});

		// Function to check if a node should be pregenerated
		async function shouldPregenerateNode(storyId: string, nodeId: string): Promise<boolean> {
			// If we've already generated or are generating this node, skip it
			if (generatedNodeIds.has(`${storyId}:${nodeId}`)) {
				return false;
			}

			// Check if the node exists in the database
			const nodeExists = await checkNodeExists(storyId, nodeId);
			return !nodeExists;
		}

		// Function to pregenerate content for all choices of a specific node
		// depth controls how many levels ahead to pregenerate (1 = immediate choices, 2 = choices of choices, etc.)
		async function pregenerateNextNodesFromNode(storyId: string, nodeId: string, depth: number = 1): Promise<void> {
			// Prevent pregeneration if depth is zero or negative
			if (depth <= 0) return;

			// Generate a unique key for this pregeneration task
			const taskKey = `${storyId}:${nodeId}:pregenerate`;
			const nodeKey = `${storyId}:${nodeId}`;

			// Mark this node as being generated
			generatedNodeIds.add(nodeKey);

			// If there's already a pregeneration task for this node, don't start another one
			if (pregenerationTasks.has(taskKey)) {
				console.log(`Pregeneration already in progress for node ${nodeId} in story ${storyId}`);
				return;
			}

			// Create and store the pregeneration task
			const task = (async () => {
				try {
					console.log(`Starting pregeneration for node ${nodeId} in story ${storyId} (depth: ${depth})`);

					// Get the node's choices
					const { data: nodeData, error: nodeError } = await supabase
						.from('interactive_nodes')
						.select('choice_ids')
						.eq('id', nodeId)
						.eq('story_id', storyId)
						.single();

					if (nodeError) {
						console.error('Error finding node for pregeneration:', nodeError);
						return;
					}

					const choiceIds = nodeData.choice_ids || [];
					if (choiceIds.length === 0) {
						console.log(`Node ${nodeId} has no choices, skipping pregeneration`);
						return;
					}

					// Get the story structure
					const currentStory = await fetchStory(storyId);

					// Track generated next nodes for recursive pregeneration
					const generatedNextNodeIds: string[] = [];

					// For each choice in the current node, pregenerate the next node if it doesn't exist
					for (const choiceId of choiceIds) {
						try {
							// Get the target node ID for this choice
							const { data: choiceData, error: choiceError } = await supabase
								.from('interactive_choices')
								.select('next_node_id')
								.eq('id', choiceId)
								.eq('story_id', storyId)
								.single();

							if (choiceError) {
								console.error(`Error getting choice ${choiceId} for pregeneration:`, choiceError);
								continue;
							}

							const nextNodeId = choiceData.next_node_id;
							generatedNextNodeIds.push(nextNodeId);

							// Check if we should pregenerate this node
							const shouldPregenerate = await shouldPregenerateNode(storyId, nextNodeId);

							if (shouldPregenerate) {
								console.log(
									`Pregenerating content for choice ${choiceId} leading to node ${nextNodeId}`,
								);

								// Create a copy of the current story
								const tempStory: Story = {
									id: currentStory.id,
									nodes: [...currentStory.nodes],
									choices: [...currentStory.choices],
									metadata: currentStory.metadata,
								};

								// Generate the next node and its choices
								const updatedStory = await generateNextNode(tempStory, choiceId);

								// Find the newly generated node
								const newNode = updatedStory.nodes.find((n) => n.id === nextNodeId);

								if (!newNode) {
									console.error(`Failed to generate node ${nextNodeId} for choice ${choiceId}`);
									continue;
								}

								// Find new choices that weren't in the original story
								const newChoices = updatedStory.choices.filter(
									(c) => !currentStory.choices.some((cc) => cc.id === c.id),
								);

								// Mark this node as generated
								generatedNodeIds.add(`${storyId}:${nextNodeId}`);

								// Notify all clients about the new content
								io.to(`story:${storyId}`).emit('story_content_added', {
									storyId,
									newContent: {
										nodes: [newNode],
										choices: newChoices,
									},
								});

								console.log(
									`Successfully pregenerated node ${nextNodeId} with ${newChoices.length} choices`,
								);
							} else {
								console.log(
									`Node ${nextNodeId} already exists or is being generated, skipping pregeneration`,
								);
							}
						} catch (error) {
							console.error(`Error pregenerating for choice ${choiceId}:`, error);
							// Continue with the next choice even if this one failed
						}
					}

					// If we're not at the max depth, recursively pregenerate for generated nodes
					if (depth > 1) {
						console.log(
							`Continuing pregeneration at depth ${depth - 1} for ${generatedNextNodeIds.length} nodes`,
						);
						for (const nextNodeId of generatedNextNodeIds) {
							// Only pregenerate if the node exists (was successfully generated)
							if (await checkNodeExists(storyId, nextNodeId)) {
								await pregenerateNextNodesFromNode(storyId, nextNodeId, depth - 1);
							}
						}
					}

					console.log(`Finished pregeneration for node ${nodeId} in story ${storyId}`);
				} catch (error) {
					console.error(`Error during pregeneration for node ${nodeId} in story ${storyId}:`, error);
				} finally {
					// Remove the task from the map when done
					pregenerationTasks.delete(taskKey);
				}
			})();

			pregenerationTasks.set(taskKey, task);

			// We don't await the task here, it runs asynchronously
			// But we can attach a catch handler to prevent unhandled promise rejections
			task.catch((err) => {
				console.error(`Unhandled error in pregeneration task for ${nodeId}:`, err);
			});
		}
	});
}
