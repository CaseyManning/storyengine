export interface NodeRendererProps {
	node: React.ReactNode;
	selected: boolean;
}

export const NodeRenderer = ({ node, selected }: NodeRendererProps) => {
	if (typeof node === 'string') {
		return <div className={`default-node${selected ? ' selected' : ''}`}>{node}</div>;
	}
	return <>{node}</>;
};
