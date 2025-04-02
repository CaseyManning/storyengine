import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3Force from 'd3-force';
import { select } from 'd3-selection';
import { zoom } from 'd3-zoom';
import { NodeRenderer } from './NodeRenderer';

// Add global type definitions for animation frame tracking
declare global {
	interface Window {
		_forceGraphAnimationFrame?: number;
		_forceGraphZoomFrame?: number;
	}
}

export interface Node {
	id: string;
	node: React.ReactNode;
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
	width?: number;
	height?: number;
}

export interface Link {
	source: string;
	target: string;
	label?: string;
	directional?: boolean;
}

interface ForceGraphProps {
	nodes: Node[];
	links: Link[];
	width?: number;
	height?: number;
	onNodeClick?: (nodeId: string) => void;
}

const ForceGraph: React.FC<ForceGraphProps> = ({ nodes, links, width = 800, height = 600, onNodeClick }) => {
	const svgRef = useRef<SVGSVGElement>(null);
	const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const zoomRef = useRef<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });

	// We don't need transform state - using it directly is likely causing the infinite updates
	// Moving to a ref-only approach for transform
	const [selectedNode, setSelectedNode] = useState<string | null>(null);
	const [simulation, setSimulation] = useState<d3Force.Simulation<Node, d3Force.SimulationLinkDatum<Node>> | null>(
		null,
	);
	const [graphNodes, setGraphNodes] = useState<Node[]>([]);
	const [graphLinks, setGraphLinks] = useState<(Link & d3Force.SimulationLinkDatum<Node>)[]>([]);
	const [nodeDimensions, setNodeDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

	// Default node size (used as a fallback)
	const DEFAULT_NODE_WIDTH = 120;
	const DEFAULT_NODE_HEIGHT = 60;

	// Node reference callback to measure node sizes
	const nodeRefCallback = useCallback(
		(node: HTMLDivElement | null, id: string) => {
			if (node) {
				nodeRefs.current.set(id, node);
				// Only update dimensions if they've changed substantially
				const rect = node.getBoundingClientRect();
				const newWidth = Math.max(rect.width, DEFAULT_NODE_WIDTH);
				const newHeight = Math.max(rect.height, DEFAULT_NODE_HEIGHT);

				const currentDimensions = nodeDimensions.get(id);
				if (
					!currentDimensions ||
					Math.abs(currentDimensions.width - newWidth) > 5 ||
					Math.abs(currentDimensions.height - newHeight) > 5
				) {
					setNodeDimensions((prev) => {
						const newMap = new Map(prev);
						newMap.set(id, { width: newWidth, height: newHeight });
						return newMap;
					});
				}
			}
		},
		[nodeDimensions],
	);

	// Initialize and update the simulation when nodes or links change
	useEffect(() => {
		// Deep copy nodes to avoid mutating props
		const nodesCopy = nodes.map((node) => ({ ...node }));

		// Convert string IDs to node references for links
		const nodeMap = new Map<string, Node>();
		nodesCopy.forEach((node) => {
			nodeMap.set(node.id, node);
		});

		const linksCopy = links.map((link) => ({
			...link,
			source: nodeMap.get(link.source) || link.source,
			target: nodeMap.get(link.target) || link.target,
		}));

		setGraphNodes(nodesCopy);
		setGraphLinks(linksCopy as (Link & d3Force.SimulationLinkDatum<Node>)[]);

		// Create a collision force that accounts for node dimensions
		const getNodeRadius = (node: Node) => {
			const dimensions = nodeDimensions.get(node.id);
			if (dimensions) {
				// Use the larger of width/2 or height/2 as the radius for collision
				return Math.max(dimensions.width / 2, dimensions.height / 2);
			}
			// Use default if dimensions not available yet
			return Math.max(DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT) / 2;
		};

		// Create the simulation
		const sim = d3Force
			.forceSimulation<Node>(nodesCopy)
			.force(
				'link',
				d3Force
					.forceLink<Node, d3Force.SimulationLinkDatum<Node>>(linksCopy)
					.id((d) => d.id)
					.distance(150), // Increased to accommodate node sizes
			)
			.force('charge', d3Force.forceManyBody().strength(-400)) // Stronger repulsion
			.force('center', d3Force.forceCenter(width / 2, height / 2))
			.force('collision', d3Force.forceCollide<Node>().radius(getNodeRadius).strength(0.8))
			.on('tick', () => {
				// Cancel any existing animation frame to avoid duplicate updates
				if (window._forceGraphAnimationFrame) {
					cancelAnimationFrame(window._forceGraphAnimationFrame);
				}

				// Use requestAnimationFrame to throttle state updates
				window._forceGraphAnimationFrame = requestAnimationFrame(() => {
					setGraphNodes([...nodesCopy]);
					setGraphLinks([...linksCopy] as (Link & d3Force.SimulationLinkDatum<Node>)[]);
				});
			});
		setSimulation(sim);

		return () => {
			sim.stop();
		};
	}, [nodes, links, width, height, nodeDimensions]);

	// Handle zoom and pan
	useEffect(() => {
		if (!svgRef.current) return;
		const svg = select(svgRef.current);

		const zoomBehavior = zoom()
			.scaleExtent([0.1, 4])
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

				// Apply transform directly to the g element - no React state involved
				select(svgRef.current)
					.select('g')
					.attr(
						'transform',
						`translate(${zoomRef.current.x},${zoomRef.current.y}) scale(${zoomRef.current.k})`,
					);
			})
			// Filter events to only enable panning on the background, not on nodes
			.filter((event) => {
				// Only handle zoom events from the svg background, not from nodes
				const target = event.target as Element;
				const isForeignObject = target.tagName === 'foreignObject' || target.closest('foreignObject') !== null;

				// For wheel events (zooming), always allow
				if (event.type === 'wheel') return true;

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
	}, []);

	// Handle node dragging
	const handleDragStart = (event: React.MouseEvent, nodeId: string) => {
		if (!simulation) return;

		// Prevent the event from being captured by the zoom behavior
		event.stopPropagation();

		const node = graphNodes.find((n) => n.id === nodeId);
		if (!node) return;

		// Heat up the simulation when dragging starts
		simulation.alphaTarget(0.3).restart();

		// Store initial node position for correct drag calculation
		const initialNodeX = node.x!;
		const initialNodeY = node.y!;

		// Set fixed position to prevent node from moving with simulation
		node.fx = initialNodeX;
		node.fy = initialNodeY;

		// Store initial mouse position
		const startX = event.clientX;
		const startY = event.clientY;

		const handleDrag = (moveEvent: MouseEvent) => {
			// Prevent default browser behavior
			moveEvent.preventDefault();
			// Stop propagation to prevent zoom/pan
			moveEvent.stopPropagation();

			// Calculate mouse displacement, adjusted for zoom scale using the ref
			const dx = (moveEvent.clientX - startX) / zoomRef.current.k;
			const dy = (moveEvent.clientY - startY) / zoomRef.current.k;

			// Update node's fixed position based on initial position plus displacement
			node.fx = initialNodeX + dx;
			node.fy = initialNodeY + dy;

			// Update the simulation
			simulation.alpha(0.3).restart();
		};

		const handleDragEnd = (endEvent: MouseEvent) => {
			// Clean up event listeners
			document.removeEventListener('mousemove', handleDrag);
			document.removeEventListener('mouseup', handleDragEnd);

			// Let the simulation cool down
			simulation.alphaTarget(0);

			// Optional: Unfix position when drag ends to allow node to move with simulation
			node.fx = null;
			node.fy = null;
		};

		// Add global event listeners to handle drag movement and release
		document.addEventListener('mousemove', handleDrag);
		document.addEventListener('mouseup', handleDragEnd);
	};

	const handleNodeClick = (nodeId: string) => {
		setSelectedNode(nodeId === selectedNode ? null : nodeId);
		if (onNodeClick) {
			onNodeClick(nodeId);
		}
	};

	// Calculate dimensions for each node based on content
	const getNodeDimension = (nodeId: string) => {
		const dimensions = nodeDimensions.get(nodeId);
		if (dimensions) {
			return dimensions;
		}
		return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
	};

	const mouseDownTimeRef = useRef<number>(0);

	return (
		<svg ref={svgRef} width={width} height={height} style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
			<g>
				{/* Links */}
				{graphLinks.map((link, index) => {
					const sourceNode =
						typeof link.source === 'object' ? link.source : graphNodes.find((n) => n.id === link.source);
					const targetNode =
						typeof link.target === 'object' ? link.target : graphNodes.find((n) => n.id === link.target);

					if (
						!sourceNode ||
						!targetNode ||
						!sourceNode.x ||
						!sourceNode.y ||
						!targetNode.x ||
						!targetNode.y
					) {
						return null;
					}

					return (
						<g key={`link-${index}`}>
							<line
								x1={sourceNode.x}
								y1={sourceNode.y}
								x2={targetNode.x}
								y2={targetNode.y}
								stroke="#999"
								strokeWidth={1.5}
								strokeOpacity={0.6}
							/>
							{link.label && (
								<text
									x={(sourceNode.x + targetNode.x) / 2}
									y={(sourceNode.y + targetNode.y) / 2}
									textAnchor="middle"
									fill="#666"
									fontSize={10}
									dy={-5}
								>
									{link.label}
								</text>
							)}
							{link.directional && (
								<marker
									id={`arrowhead-${index}`}
									markerWidth={10}
									markerHeight={7}
									refX={9}
									refY={3.5}
									orient="auto"
								>
									<polygon points="0 0, 10 3.5, 0 7" fill="#999" />
								</marker>
							)}
						</g>
					);
				})}

				{/* Nodes */}
				{graphNodes.map((node) => {
					if (!node.x || !node.y) return null;

					const { width, height } = getNodeDimension(node.id);
					const halfWidth = width / 2;
					const halfHeight = height / 2;

					return (
						<foreignObject
							key={node.id}
							x={node.x - halfWidth}
							y={node.y - halfHeight}
							width={width}
							height={height}
							style={{
								overflow: 'visible',
								cursor: 'grab',
							}}
							onMouseDown={(e) => {
								e.stopPropagation();
								handleDragStart(e, node.id);
								mouseDownTimeRef.current = Date.now();
							}}
							onClick={(e) => {
								e.stopPropagation();
								if (Date.now() - mouseDownTimeRef.current < 200) {
									handleNodeClick(node.id);
								}
							}}
							// Prevent panning when interacting with nodes
							pointerEvents="all"
						>
							<div
								ref={(el) => {
									if (el) {
										nodeRefCallback(el, node.id);
									}
								}}
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
				})}
			</g>
		</svg>
	);
};

export default ForceGraph;
