export interface NodeRendererProps {
	node: React.ReactNode;
	selected: boolean;
}

export const NodeRenderer = ({ node, selected }: NodeRendererProps) => {
	if (typeof node === 'string') {
		return <div className="default-node">{node}</div>;
	}
	// Apply pointer-events: none to ensure drag events are handled by the foreignObject
	return <div style={{ pointerEvents: 'none' }}>{node}</div>;
};
