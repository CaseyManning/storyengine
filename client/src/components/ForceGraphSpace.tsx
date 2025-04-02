import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
	forceSimulation,
	forceLink,
	forceManyBody,
	forceCenter,
	forceCollide,
	Simulation,
	SimulationNodeDatum,
	SimulationLinkDatum,
} from 'd3-force';
import { NodeRenderer } from './NodeRenderer';

export interface FGItem {
	id: string;
	node: React.ReactNode;
}

export interface FGLink {
	source: string;
	target: string;
	directional: boolean;
	label?: string;
}

export interface FGSimLink {
	source: FGItem;
	target: FGItem;
	label?: string;
}

interface NodeData extends SimulationNodeDatum {
	id: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}

interface LinkData extends SimulationLinkDatum<NodeData> {
	label?: string;
}

interface Position {
	x: number;
	y: number;
}

export interface ForceGraphSpaceProps {
	nodes: FGItem[];
	links: FGLink[];
	selectedNode: string | null;
}

const ForceGraphSpace = memo(function ForceGraphSpace(props: ForceGraphSpaceProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [positions, setPositions] = useState<Map<string, Position>>(new Map());
	const simulationRef = useRef<Simulation<NodeData, LinkData> | null>(null);
	const [nodeSizes, setNodeSizes] = useState<Map<string, { width: number; height: number }>>(new Map());
	const [containerWidth, setContainerWidth] = useState(0);
	const [containerHeight, setContainerHeight] = useState(0);
	const [isDragging, setIsDragging] = useState<string | null>(null);

	const { nodes, links, selectedNode } = props;

	const measureNode = (id: string, element: HTMLElement) => {
		const rect = element.getBoundingClientRect();
		const newSize = { width: rect.width, height: rect.height };

		const currentSize = nodeSizes.get(id);
		if (
			!currentSize ||
			Math.abs(currentSize.width - newSize.width) > 1 ||
			Math.abs(currentSize.height - newSize.height) > 1
		) {
			console.log('current size', currentSize);
			console.log('new size', newSize);
			setNodeSizes((prev) => {
				const newSizes = new Map(prev);
				newSizes.set(id, newSize);
				return newSizes;
			});
			simulationRef.current?.restart();
		}
	};

	useEffect(() => {
		// Function to update width
		const updateWidth = () => {
			if (containerRef.current) {
				setContainerWidth(containerRef.current.clientWidth);
				setContainerHeight(containerRef.current.clientHeight);
				console.log(containerRef.current.clientWidth, containerRef.current.clientHeight);
			}
		};
		updateWidth();
		const resizeObserver = new ResizeObserver(updateWidth);

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		// Cleanup
		return () => {
			if (containerRef.current) {
				resizeObserver.unobserve(containerRef.current);
			}
		};
	}, []);

	useMemo(() => {
		const nodeData: NodeData[] = nodes.map((node) => ({
			id: node.id,
			...nodeSizes.get(node.id),
		}));
		console.log('node data', nodeData);
		console.log('force graph space links', links);

		const simulation = forceSimulation(nodeData)
			.force('charge', forceManyBody().strength(-300))
			.force('center', forceCenter(containerWidth / 2, containerHeight / 2))
			.force(
				'link',
				forceLink(links)
					.id((d: any) => d.id)
					.distance(100),
			)
			.force(
				'collision',
				forceCollide().radius((d: SimulationNodeDatum) => {
					const node = d as NodeData;
					const size = nodeSizes.get(node.id);
					if (!size) return 50;
					return 20 + Math.max(size.width, size.height) / 2;
				}),
			);

		simulation.on('tick', () => {
			const newPositions = new Map<string, { x: number; y: number }>();
			nodeData.forEach((node) => {
				if (node.x && node.y) {
					newPositions.set(node.id, { x: node.x, y: node.y });
				}
			});
			setPositions(newPositions);
		});

		simulationRef.current = simulation;

		return simulation;
	}, [containerWidth, containerHeight, nodeSizes, links, nodes]);

	return (
		<div
			ref={containerRef}
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
				overflow: 'hidden',
			}}
		>
			{/* Add SVG element for links */}
			<svg
				style={{
					position: 'absolute',
					width: '100%',
					height: '100%',
					pointerEvents: 'none',
					left: 0,
					top: 0,
					zIndex: 0,
				}}
			>
				{links.map((link, i) => {
					const simLink: FGSimLink = link as any as FGSimLink; //TODO: why

					const sourcePos = positions.get(simLink.source.id);
					const targetPos = positions.get(simLink.target.id);
					if (!sourcePos || !targetPos) return null;

					// const sourcePos: Position = link.source;

					// const sourcePos = simLink.source;
					// const targetPos = simLink.target;

					// Calculate the midpoint with an offset for the curve
					const dx = targetPos.x - sourcePos.x;
					const dy = targetPos.y - sourcePos.y;
					const distance = Math.sqrt(dx * dx + dy * dy);

					// Calculate control point offset
					const offset = Math.min(distance * 0.2, 50); // Cap the offset at 50px

					// Calculate control points
					const midX = (sourcePos.x + targetPos.x) / 2;
					const midY = (sourcePos.y + targetPos.y) / 2;

					// Add perpendicular offset to create curve
					const controlX = midX + (dy * offset) / distance;
					const controlY = midY + (dx * offset) / distance;

					return (
						<g key={`${link.source}-${link.target}-${i}`}>
							<path
								d={`M ${sourcePos.x} ${sourcePos.y} Q ${controlX} ${controlY} ${targetPos.x} ${targetPos.y}`}
								fill="none"
								stroke="#999"
								strokeWidth={2}
							/>
							{link.label && (
								<text
									x={controlX}
									y={controlY}
									fill="#666"
									fontSize="12"
									textAnchor="middle"
									dominantBaseline="middle"
									pointerEvents="none"
								>
									<tspan dy="-0.5em" style={{ backgroundColor: 'white', padding: '2px 4px' }}>
										{link.label}
									</tspan>
								</text>
							)}
						</g>
					);
				})}
			</svg>

			{nodes.map((item) => {
				const pos = positions.get(item.id);
				return pos ? (
					<div
						key={item.id}
						style={{
							position: 'absolute',
							transform: `translate(${pos.x}px, ${pos.y}px)`,
							transition: 'transform 0.1s ease-out',
							translate: '-50% -50%',
						}}
					>
						<NodeRenderer node={item.node} selected={false} />
					</div>
				) : null;
			})}
		</div>
	);
});

export default ForceGraphSpace;
