export interface NodeRendererProps {
	node: React.ReactNode;
	selected: boolean;
}

export const NodeRenderer = ({ node, selected }: NodeRendererProps) => {
	if (typeof node === 'string') {
		return (
			<div
				style={{
					padding: '8px 12px',
					background: selected ? '#e6f7ff' : 'white',
					border: `2px solid ${selected ? '#1890ff' : '#999'}`,
					borderRadius: '6px',
					userSelect: 'none',
					boxShadow: selected ? '0 0 10px rgba(24, 144, 255, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.00)',
					pointerEvents: 'none',
				}}
			>
				{node}
			</div>
		);
	}
	// Apply pointer-events: none to ensure drag events are handled by the foreignObject
	return <div style={{ pointerEvents: 'none' }}>{node}</div>;
};
