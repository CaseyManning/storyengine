import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3Force from 'd3-force';
import { select } from 'd3-selection';
import { zoom } from 'd3-zoom';
import { NodeRenderer } from './NodeRenderer';
import '../styles/ForceGraph.css';

// Add global type definitions for animation frame tracking
declare global {
	interface Window {
		_forceGraphAnimationFrame?: number;
		_forceGraphZoomFrame?: number;
	}
}

export interface InputNode {
	id: string;
	node: React.ReactNode;
}

export interface Node extends InputNode {
	x: number;
	y: number;
	vx: number;
	vy: number;
	fx: number | null;
	fy: number | null;
	width: number;
	height: number;
}

export interface Link {
	source: string;
	target: string;
	label?: string;
	directional?: boolean;
}

interface ForceGraphProps {
	nodes: InputNode[];
	links: Link[];
	width?: number;
	height?: number;
	onNodeClick?: (nodeId: string) => void;
}

// Default node size constants
const DEFAULT_NODE_WIDTH = 50;
const DEFAULT_NODE_HEIGHT = 50;

// Custom hook for graph simulation
function useGraphSimulation(nodes: Node[], links: Link[], width: number, height: number) {
	const [graphNodes, setGraphNodes] = useState<Node[]>([]);
	const [graphLinks, setGraphLinks] = useState<(Link & d3Force.SimulationLinkDatum<Node>)[]>([]);
	const [simulation, setSimulation] = useState<d3Force.Simulation<Node, d3Force.SimulationLinkDatum<Node>> | null>(
		null,
	);

	// Keep track of node positions across renders
	const nodePositionsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

	// Process nodes and links
	useEffect(() => {
		// Create a copy of nodes with preserved positions for existing nodes
		const nodesWithPositions = nodes.map((node) => {
			const savedPosition = nodePositionsRef.current.get(node.id);
			if (savedPosition) {
				// Preserve position and velocity of existing nodes
				return {
					...node,
					x: savedPosition.x,
					y: savedPosition.y,
					vx: savedPosition.vx,
					vy: savedPosition.vy,
				};
			}

			// For new nodes, try to position them strategically near connected nodes
			// Find if this node is connected to any existing node with a known position
			const connectedNodes = links.filter((link) => link.source === node.id || link.target === node.id);

			for (const link of connectedNodes) {
				const connectedId = link.source === node.id ? link.target : link.source;
				const connectedPosition = nodePositionsRef.current.get(connectedId);

				if (connectedPosition) {
					// Position new node near its connection with a slight offset
					const angle = Math.random() * 2 * Math.PI;
					const distance = 100 + Math.random() * 50; // Position 100-150px away

					const newX = connectedPosition.x + Math.cos(angle) * distance;
					const newY = connectedPosition.y + Math.sin(angle) * distance;

					return {
						...node,
						x: newX,
						y: newY,
						vx: 0,
						vy: 0,
						// Initially fix position to prevent chaotic movement
						fx: newX,
						fy: newY,
					};
				}
			}

			// No connections found with known positions, use a random position
			return {
				...node,
				x: Math.random() * width,
				y: Math.random() * height,
				vx: 0,
				vy: 0,
				fx: null,
				fy: null,
			};
		});

		// Convert string IDs to node references for links
		const nodeMap = new Map<string, Node>();
		nodesWithPositions.forEach((node) => {
			nodeMap.set(node.id, node);
		});

		const linksCopy = links.map((link) => ({
			...link,
			source: nodeMap.get(link.source) || link.source,
			target: nodeMap.get(link.target) || link.target,
		}));

		setGraphNodes(nodesWithPositions);
		setGraphLinks(linksCopy as (Link & d3Force.SimulationLinkDatum<Node>)[]);

		// Create a collision force that accounts for node dimensions
		const getNodeRadius = (node: Node) => {
			return Math.max(DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT) / 2;
		};

		// Check if we should update or create a new simulation
		const shouldCreateNewSimulation = !simulation;

		let sim = simulation;

		if (shouldCreateNewSimulation) {
			// Create a new simulation if none exists
			sim = d3Force
				.forceSimulation<Node>(nodesWithPositions)
				// Higher initial alpha for longer simulation runtime
				.alpha(10.0)
				// Slower alphaDecay for more gradual cooling
				.alphaDecay(0.001)
				.force(
					'link',
					d3Force
						.forceLink<Node, d3Force.SimulationLinkDatum<Node>>(linksCopy)
						.id((d) => d.id)
						.distance(150), // Increased to accommodate node sizes
				)
				.force('charge', d3Force.forceManyBody().strength(-300)) // Stronger repulsion
				.force('center', d3Force.forceCenter(width / 2, height / 2))
				.force('collision', d3Force.forceCollide<Node>().radius(getNodeRadius).strength(0.8));
		} else {
			// Update existing simulation with new nodes and links
			sim!.nodes(nodesWithPositions);
			sim!.force(
				'link',
				d3Force
					.forceLink(linksCopy)
					.id((d: any) => d.id)
					.distance(150),
			);

			// Identify which nodes are new
			const newNodes = nodesWithPositions.filter((node) => !nodePositionsRef.current.has(node.id));
			const newNodeCount = newNodes.length;

			if (newNodeCount > 0) {
				// More heat when new nodes are added
				sim!.alpha(2).alphaDecay(0.02).restart();

				// Release fixed positions of new nodes after a short delay
				setTimeout(() => {
					newNodes.forEach((node) => {
						if (node.fx !== null && node.fy !== null) {
							node.fx = null;
							node.fy = null;
						}
					});

					// Restart with a lower alpha to settle gently
					sim!.alpha(0.3).restart();
				}, 1500);
			} else {
				// Just a gentle restart for existing nodes
				sim!.alpha(0.1).restart();
			}
		}

		// Set up or update tick handler
		sim!.on('tick', () => {
			// Cancel any existing animation frame to avoid duplicate updates
			if (window._forceGraphAnimationFrame) {
				cancelAnimationFrame(window._forceGraphAnimationFrame);
			}

			// Use requestAnimationFrame to throttle state updates
			window._forceGraphAnimationFrame = requestAnimationFrame(() => {
				// Update node positions ref with current positions
				nodesWithPositions.forEach((node) => {
					if (node.x !== undefined && node.y !== undefined) {
						nodePositionsRef.current.set(node.id, {
							x: node.x,
							y: node.y,
							vx: node.vx || 0,
							vy: node.vy || 0,
						});
					}
				});

				setGraphNodes([...nodesWithPositions]);
				setGraphLinks([...linksCopy] as (Link & d3Force.SimulationLinkDatum<Node>)[]);
			});
		});

		if (shouldCreateNewSimulation) {
			setSimulation(sim);
		}

		return () => {
			if (sim) {
				sim.stop();
			}
			if (window._forceGraphAnimationFrame) {
				cancelAnimationFrame(window._forceGraphAnimationFrame);
			}
		};
	}, [nodes, links, width, height, simulation]);

	return { graphNodes, graphLinks, simulation };
}

// Custom hook for zoom and pan functionality
function useZoomPan(svgRef: React.RefObject<SVGSVGElement | null>) {
	const zoomRef = useRef<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });

	// Setup zoom behavior
	useEffect(() => {
		if (!svgRef.current) return;

		const svg = select(svgRef.current);

		const zoomBehavior = zoom()
			.scaleExtent([0.1, 4]) // Min/max zoom scale
			.on('zoom', (event) => {
				// Cancel any pending animation frame to avoid stacking updates
				if (window._forceGraphZoomFrame) {
					cancelAnimationFrame(window._forceGraphZoomFrame);
				}

				// Update the zoom ref directly
				zoomRef.current = {
					x: event.transform.x,
					y: event.transform.y,
					k: event.transform.k,
				};

				// Apply transform to the zoom-group element
				// We select by class to ensure we're getting the right element
				select(svgRef.current)
					.select('.zoom-group')
					.attr(
						'transform',
						`translate(${zoomRef.current.x},${zoomRef.current.y}) scale(${zoomRef.current.k})`,
					);
			})
			// Filter events to handle mouse interactions properly
			.filter((event) => {
				// Handle events based on their target
				const target = event.target as Element;

				// Allow wheel events for zooming regardless of where they occur
				if (event.type === 'wheel') return true;

				const isForeignObject = target.tagName === 'foreignObject' || target.closest('foreignObject') !== null;

				// For mouse events on nodes, don't activate pan behavior
				return !isForeignObject;
			});

		svg.call(zoomBehavior as any);

		return () => {
			if (window._forceGraphZoomFrame) {
				cancelAnimationFrame(window._forceGraphZoomFrame);
			}
			svg.on('.zoom', null);
		};
	}, [svgRef]);

	return zoomRef;
}

// Custom hook for node dragging functionality
function useNodeDrag(
	simulation: d3Force.Simulation<Node, d3Force.SimulationLinkDatum<Node>> | null,
	graphNodes: Node[],
	zoomRef: React.MutableRefObject<{ x: number; y: number; k: number }>,
) {
	const mouseDownTimeRef = useRef<number>(0);
	const isDraggingRef = useRef<boolean>(false);
	const draggedNodeRef = useRef<{ nodeId: string; fx: number; fy: number } | null>(null);

	const handleDragStart = useCallback(
		(event: React.MouseEvent, nodeId: string) => {
			if (!simulation) return;

			// Prevent the event from being captured by the zoom behavior
			event.stopPropagation();

			// Record time for distinguishing between clicks and drags
			mouseDownTimeRef.current = Date.now();

			// Flag that we're now dragging
			isDraggingRef.current = true;

			const node = graphNodes.find((n) => n.id === nodeId);
			if (!node) return;

			// Heat up the simulation when dragging starts, but don't make it too high
			simulation.alphaTarget(0.2).restart();

			// Store initial node position for correct drag calculation
			const initialNodeX = node.x!;
			const initialNodeY = node.y!;

			// Set fixed position to prevent node from moving with simulation
			node.fx = initialNodeX;
			node.fy = initialNodeY;

			// Store the dragged node info in ref
			draggedNodeRef.current = {
				nodeId,
				fx: initialNodeX,
				fy: initialNodeY,
			};

			// Store initial mouse position
			const startX = event.clientX;
			const startY = event.clientY;

			const handleDrag = (moveEvent: MouseEvent) => {
				// Prevent default browser behavior
				moveEvent.preventDefault();
				// Stop propagation to prevent zoom/pan
				moveEvent.stopPropagation();

				// Get the current node (it might have changed reference due to state updates)
				const currentNode = graphNodes.find((n) => n.id === nodeId);
				if (!currentNode) return;

				// Calculate mouse displacement, adjusted for zoom scale
				const dx = (moveEvent.clientX - startX) / zoomRef.current.k;
				const dy = (moveEvent.clientY - startY) / zoomRef.current.k;

				// Update fixed position
				const newFx = initialNodeX + dx;
				const newFy = initialNodeY + dy;

				// Update the node's fixed position directly
				currentNode.fx = newFx;
				currentNode.fy = newFy;

				// Also update our ref to maintain this position across renders
				draggedNodeRef.current = {
					nodeId,
					fx: newFx,
					fy: newFy,
				};

				// Restart simulation with low alpha
				simulation.alpha(0.2).restart();
			};

			const handleDragEnd = () => {
				// Clean up event listeners
				document.removeEventListener('mousemove', handleDrag);
				document.removeEventListener('mouseup', handleDragEnd);

				// Flag that we're done dragging
				isDraggingRef.current = false;
				draggedNodeRef.current = null;

				// Find node again to get current reference
				const currentNode = graphNodes.find((n) => n.id === nodeId);
				if (currentNode) {
					// Store the final position but release the fixed constraint
					currentNode.x = currentNode.fx!;
					currentNode.y = currentNode.fy!;
					currentNode.fx = null;
					currentNode.fy = null;
				}

				// Let the simulation cool down gently
				simulation.alphaTarget(0);
			};

			// Add global event listeners to handle drag movement and release
			document.addEventListener('mousemove', handleDrag);
			document.addEventListener('mouseup', handleDragEnd);
		},
		[graphNodes, simulation, zoomRef],
	);

	// Effect to ensure dragged node position is preserved during simulation updates
	useEffect(() => {
		// If we're dragging, make sure the dragged node position is maintained
		if (isDraggingRef.current && draggedNodeRef.current) {
			const { nodeId, fx, fy } = draggedNodeRef.current;
			const node = graphNodes.find((n) => n.id === nodeId);
			if (node) {
				// Restore fixed position that might have been overwritten
				node.fx = fx;
				node.fy = fy;
			}
		}
	}, [graphNodes]);

	const isRecentMouseDown = useCallback(() => {
		// Consider it a click if less than 200ms passed between mousedown and mouseup
		return Date.now() - mouseDownTimeRef.current < 200;
	}, []);

	return { handleDragStart, isRecentMouseDown, isDragging: isDraggingRef };
}

// Main ForceGraph component
const ForceGraph: React.FC<ForceGraphProps> = ({
	nodes: inputNodes,
	links,
	width = 800,
	height = 600,
	onNodeClick,
}) => {
	const svgRef = useRef<SVGSVGElement>(null);
	const [selectedNode, setSelectedNode] = useState<string | null>(null);

	const nodes: Node[] = useMemo(
		() =>
			inputNodes.map((node) => ({
				...node,
				// Don't set specific initial positions - let the simulation handle this
				// and preserve positions when existing nodes are updated
				x: undefined as any,
				y: undefined as any,
				vx: 0,
				vy: 0,
				fx: null,
				fy: null,
				width: DEFAULT_NODE_WIDTH,
				height: DEFAULT_NODE_HEIGHT,
			})),
		[inputNodes],
	);

	// Use custom hooks
	const { graphNodes, graphLinks, simulation } = useGraphSimulation(nodes, links, width, height);
	const zoomRef = useZoomPan(svgRef);
	const { handleDragStart, isRecentMouseDown, isDragging } = useNodeDrag(simulation, graphNodes, zoomRef);

	// Pass the isDragging ref to the simulation
	useEffect(() => {
		if (simulation) {
			// @ts-ignore - Add a custom property to the simulation
			simulation.isDraggingRef = isDragging;
		}
	}, [simulation, isDragging]);

	// Node click handler
	const handleNodeClick = useCallback(
		(nodeId: string) => {
			setSelectedNode(nodeId === selectedNode ? null : nodeId);
			if (onNodeClick) {
				onNodeClick(nodeId);
			}
		},
		[selectedNode, onNodeClick],
	);

	// Get node dimension based on node type (circle, rectangle, etc)
	const getNodeRadius = useCallback((node: Node, isRectangular = true) => {
		if (isRectangular) {
			// For rectangular nodes, we need to account for the actual direction of the link
			return Math.max(DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT) / 2;
		}
		// For circular nodes (if you had any)
		return Math.max(DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT) / 2;
	}, []);

	const renderedLinks = useMemo(() => {
		return graphLinks.map((link: Link & d3Force.SimulationLinkDatum<Node>, index) => {
			const sourceNode = link.source as Node;
			const targetNode = link.target as Node;

			if (!sourceNode || !targetNode) {
				return null;
			}

			// Calculate line endpoints that properly intersect with node boundaries
			let x1 = sourceNode.x;
			let y1 = sourceNode.y;
			let x2 = targetNode.x;
			let y2 = targetNode.y;

			// Get the angle between nodes
			const dx = x2 - x1;
			const dy = y2 - y1;
			const angle = Math.atan2(dy, dx);

			// Calculate source node intersection point (if needed)
			const sourceRadius = getNodeRadius(sourceNode);

			// Calculate target node intersection point
			const targetRadius = getNodeRadius(targetNode);

			// Position the end of the line at the edge of the target node
			x2 = targetNode.x - Math.cos(angle) * targetRadius;
			y2 = targetNode.y - Math.sin(angle) * targetRadius;

			// Position the start of the line at the edge of the source node
			x1 = sourceNode.x + Math.cos(angle) * sourceRadius;
			y1 = sourceNode.y + Math.sin(angle) * sourceRadius;

			// For directional links, adjust the line ending to work with the V-shaped arrow
			if (link.directional) {
				// Keep the line ending exactly at the node boundary
				// With a V-shaped arrow, we don't need to adjust as much since there's less overlap
				x2 = targetNode.x - Math.cos(angle) * targetRadius;
				y2 = targetNode.y - Math.sin(angle) * targetRadius;
			}

			return (
				<g key={`link-${index}`}>
					<line
						x1={x1}
						y1={y1}
						x2={x2}
						y2={y2}
						stroke="#999"
						strokeWidth={2}
						strokeOpacity={1}
						// Add marker-end for directional links
						markerEnd={link.directional ? `url(#arrowhead-${index})` : undefined}
					/>
					{link.label && (
						<text
							x={(sourceNode.x + targetNode.x) / 2}
							y={(sourceNode.y + targetNode.y) / 2}
							textAnchor="middle"
							fill="#666"
							className="link-label"
							fontSize={10}
							dy={-5}
						>
							{link.label}
						</text>
					)}
				</g>
			);
		});
	}, [graphLinks, getNodeRadius]);

	const renderedNodes = useMemo(() => {
		return graphNodes.map((node) => {
			if (!node.x || !node.y) return null;

			const halfWidth = DEFAULT_NODE_WIDTH / 2;
			const halfHeight = DEFAULT_NODE_HEIGHT / 2;

			return (
				<foreignObject
					key={node.id}
					x={node.x - halfWidth}
					y={node.y - halfHeight}
					width={DEFAULT_NODE_WIDTH}
					height={DEFAULT_NODE_HEIGHT}
					style={{
						overflow: 'visible',
						cursor: 'grab',
					}}
					onMouseDown={(e) => {
						e.stopPropagation();
						handleDragStart(e, node.id);
					}}
					onClick={(e) => {
						e.stopPropagation();
						if (isRecentMouseDown()) {
							handleNodeClick(node.id);
						}
					}}
					pointerEvents="all"
				>
					<div
						style={{
							width: '100%',
							height: '100%',
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							pointerEvents: 'none', // Let events pass through to the foreignObject
						}}
					>
						<NodeRenderer node={node.node} selected={node.id === selectedNode} />
					</div>
				</foreignObject>
			);
		});
	}, [handleDragStart, handleNodeClick, isRecentMouseDown, selectedNode, graphNodes]);

	// Define marker definitions for all directional links
	const markerDefs = useMemo(() => {
		return graphLinks
			.filter((link: Link & d3Force.SimulationLinkDatum<Node>) => link.directional)
			.map((link, index) => (
				<marker
					key={`marker-${index}`}
					id={`arrowhead-${index}`}
					viewBox="0 0 10 8"
					refX="6"
					refY="4"
					markerWidth="10"
					markerHeight="8"
					orient="auto"
				>
					{/* Create a V shape with two lines instead of a filled polygon */}
					<g>
						<line x1="0" y1="0" x2="6" y2="4" stroke="#999" strokeWidth="1" />
						<line x1="0" y1="8" x2="6" y2="4" stroke="#999" strokeWidth="1" />
					</g>
				</marker>
			));
	}, [graphLinks]);

	// Set a class name on the SVG element to ensure it captures events properly
	return (
		<svg ref={svgRef} width={width} height={height} className="force-graph-svg">
			<defs>{markerDefs}</defs>
			{/* The top-level group that will be transformed by zoom */}
			<g className="zoom-group">
				{renderedLinks}
				{renderedNodes}
			</g>
		</svg>
	);
};

export default ForceGraph;
