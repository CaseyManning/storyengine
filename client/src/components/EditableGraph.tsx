import { useState, useCallback, useRef } from 'react';
import ForceGraphSpace, { FGItem, FGLink } from './ForceGraphSpace';

interface EditableGraphProps {
	initialNodes?: FGItem[];
	initialLinks?: FGLink[];
	onGraphChange?: (nodes: FGItem[]) => void;
}

const EditableGraph = ({ initialNodes = [], initialLinks = [], onGraphChange }: EditableGraphProps) => {
	const [nodes, setNodes] = useState<FGItem[]>(initialNodes);
	const [links, setLinks] = useState<FGLink[]>(initialLinks);
	const [mode, setMode] = useState<'view' | 'add' | 'connect'>('view');
	const [selectedNode, setSelectedNode] = useState<string | null>(null);
	const [newNodeText, setNewNodeText] = useState('');
	const [connectionLabel, setConnectionLabel] = useState('');
	const nextIdRef = useRef(
		nodes.length > 0 ? Math.max(...nodes.map((n) => parseInt(n.id.replace('node-', '')))) + 1 : 1,
	);

	console.log('initial links', initialLinks);

	// Add a new node
	const handleAddNode = () => {
		if (!newNodeText.trim()) return;

		const newNode: FGItem = {
			id: `node-${nextIdRef.current}`,
			node: (
				<div
					className="graph-node"
					style={{
						padding: '10px',
						background: 'white',
						borderRadius: '8px',
						boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
						cursor: mode === 'connect' ? 'pointer' : 'default',
						border: '2px solid #ccc',
					}}
					onClick={() => handleNodeClick(`node-${nextIdRef.current}`)}
				>
					{newNodeText}
				</div>
			),
		};

		nextIdRef.current += 1;
		const updatedNodes = [...nodes, newNode];
		setNodes(updatedNodes);
		setNewNodeText('');
		onGraphChange?.(updatedNodes);
	};

	// Handle node click based on mode
	const handleNodeClick = useCallback(
		(nodeId: string) => {
			if (mode === 'connect') {
				if (!selectedNode) {
					// First node selection
					setSelectedNode(nodeId);
				} else if (selectedNode !== nodeId) {
					// Second node selection - create connection
					const updatedNodes = nodes.map((node) => {
						if (node.id === selectedNode) {
							const newLink: FGLink = {
								source: selectedNode,
								target: nodeId,
								label: connectionLabel.trim(),
								directional: false,
							};

							// Check if this link already exists
							if (!links.some((link) => link.source === selectedNode && link.target === nodeId)) {
								setLinks([...links, newLink]);
							}
						}
						return node;
					});

					setNodes(updatedNodes);
					setSelectedNode(null);
					setConnectionLabel('');
					onGraphChange?.(updatedNodes);
				}
			}
		},
		[mode, selectedNode, nodes, connectionLabel, onGraphChange, links],
	);

	// Generate nodes with click handlers
	const nodesWithHandlers = nodes.map((node) => ({
		...node,
		node: (
			<div className="default-node" onClick={() => handleNodeClick(node.id)}>
				{node.node}
			</div>
		),
	}));

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
				<div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
					<button
						onClick={() => setMode('view')}
						style={{
							background: mode === 'view' ? '#4a90e2' : '#f5f5f5',
							color: mode === 'view' ? 'white' : 'black',
							border: 'none',
							padding: '8px 16px',
							borderRadius: '4px',
							cursor: 'pointer',
						}}
					>
						View
					</button>
					<button
						onClick={() => setMode('add')}
						style={{
							background: mode === 'add' ? '#4a90e2' : '#f5f5f5',
							color: mode === 'add' ? 'white' : 'black',
							border: 'none',
							padding: '8px 16px',
							borderRadius: '4px',
							cursor: 'pointer',
						}}
					>
						Add Node
					</button>
					<button
						onClick={() => {
							setMode('connect');
							setSelectedNode(null);
						}}
						style={{
							background: mode === 'connect' ? '#4a90e2' : '#f5f5f5',
							color: mode === 'connect' ? 'white' : 'black',
							border: 'none',
							padding: '8px 16px',
							borderRadius: '4px',
							cursor: 'pointer',
						}}
					>
						Connect Nodes
					</button>
				</div>

				{mode === 'add' && (
					<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
						<input
							type="text"
							value={newNodeText}
							onChange={(e) => setNewNodeText(e.target.value)}
							placeholder="Node text..."
							style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
						/>
						<button
							onClick={handleAddNode}
							style={{
								background: '#4a90e2',
								color: 'white',
								border: 'none',
								padding: '8px 16px',
								borderRadius: '4px',
								cursor: 'pointer',
							}}
						>
							Add
						</button>
					</div>
				)}

				{mode === 'connect' && (
					<div style={{ marginTop: '10px' }}>
						{selectedNode ? (
							<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
								<input
									type="text"
									value={connectionLabel}
									onChange={(e) => setConnectionLabel(e.target.value)}
									placeholder="Connection label (optional)"
									style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
								/>
								<p>Now select a target node to connect to {selectedNode}</p>
							</div>
						) : (
							<p>Select a source node first</p>
						)}
					</div>
				)}
			</div>

			<div style={{ flex: 1, position: 'relative' }}>
				<ForceGraphSpace nodes={nodesWithHandlers} links={links} selectedNode={selectedNode} />
			</div>
		</div>
	);
};

export default EditableGraph;
