import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, Simulation, SimulationNodeDatum } from 'd3-force'

export interface FGItem {
    id: string;
    node: React.ReactNode;
    links: string[];
}

export interface FGLink {
    source: string;
    target: string;
}

interface NodeData extends SimulationNodeDatum {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export interface ForceGraphSpaceProps {
    nodes: FGItem[]
}

const ForceGraphSpace = memo(function ForceGraphSpace({ nodes }: ForceGraphSpaceProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<Map<string, { x: number, y: number }>>(new Map());
    const simulationRef = useRef<Simulation<NodeData, any> | null>(null);
    const [nodeSizes, setNodeSizes] = useState<Map<string, { width: number, height: number }>>(new Map());
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [links, setLinks] = useState<Array<{ source: NodeData, target: NodeData }>>([]);

    const measureNode = (id: string, element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const newSize = { width: rect.width, height: rect.height };
        
        const currentSize = nodeSizes.get(id);
        if (!currentSize || 
            Math.abs(currentSize.width - newSize.width) > 1 || 
            Math.abs(currentSize.height - newSize.height) > 1) {
                console.log('current size', currentSize);
                console.log('new size', newSize);
            setNodeSizes(prev => {
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
        // Initial measurement
        updateWidth();
    
        // Set up ResizeObserver to track changes
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
        const nodeData: NodeData[] = nodes.map(node => ({
            id: node.id,
            ...nodeSizes.get(node.id),
        }));
    
        const uniqueLinks = new Set<string>();
        const linkData: { source: any, target: any }[] = nodes.flatMap(node => {
            return node.links.map(targetId => {
                const [id1, id2] = [node.id, targetId].sort();
                const linkKey = `${id1}-${id2}`;
                
                if (uniqueLinks.has(linkKey)) {
                    return null;
                }
                uniqueLinks.add(linkKey);
                
                return {
                    source: node.id,
                    target: targetId,
                };
            }).filter((link): link is { source: string, target: string } => link !== null);
        });

        // Store the links for rendering
        setLinks(linkData);

        const simulation = forceSimulation(nodeData)
        .force('charge', forceManyBody().strength(-300))
        .force('center', forceCenter(
            containerWidth / 2,
            containerHeight / 2
        ))
        .force('link', forceLink(linkData)
            .id((d: any) => d.id)
            .distance(100)
        )
        .force('collision', forceCollide().radius((d: SimulationNodeDatum) => {
            const node = d as NodeData;
            const size = nodeSizes.get(node.id);
            if (!size) return 50;
            return 20 + Math.max(size.width, size.height) / 2;
        }));

        simulation.on('tick', () => {
            const newPositions = new Map<string, { x: number, y: number }>();
            nodeData.forEach(node => {
            if (node.x && node.y) {
                newPositions.set(node.id, { x: node.x, y: node.y });
            }
        });
            setPositions(newPositions);
        });

        simulationRef.current = simulation;
        
        return simulation;
    }, [containerWidth, containerHeight, nodeSizes]);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden'
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
                    zIndex: 0
                }}
            >
                {links.map((link, i) => {
                    const sourcePos = positions.get(link.source.id);
                    const targetPos = positions.get(link.target.id);
                    if (!sourcePos || !targetPos) return null;

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
                    const controlX = midX + dy * offset / distance;
                    const controlY = midY + dx * offset / distance;

                    return (
                        <path
                            key={`${link.source}-${link.target}-${i}`}
                            d={`M ${sourcePos.x} ${sourcePos.y} Q ${controlX} ${controlY} ${targetPos.x} ${targetPos.y}`}
                            fill="none"
                            stroke="#999"
                            strokeWidth={2}
                        />
                    );
                })}
            </svg>

            {nodes.map(item => {
                const pos = positions.get(item.id);
                return pos ? (
                    <div
                        key={item.id}
                        style={{
                            position: 'absolute',
                            transform: `translate(${pos.x}px, ${pos.y}px)`,
                            transition: 'transform 0.1s ease-out',
                            translate: '-50% -50%'
                        }}
                    >
                        <div>
                            {item.node}
                        </div>
                    </div>
                ) : null;
            })}
        </div>
    );
});

export default ForceGraphSpace