import React from 'react';
import EditableGraph from './EditableGraph';

const TestGraph = () => {
	return (
		<div
			style={{
				height: '100vh',
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			<div style={{ flex: 1 }}>
				<EditableGraph
					initialNodes={[
						{
							id: 'node-1',
							node: 'First Node',
						},
						{
							id: 'node-2',
							node: 'Second Node',
						},
						{
							id: 'node-3',
							node: 'Third Node',
						},
					]}
					initialLinks={[
						{ source: 'node-1', target: 'node-2', label: 'connects to', directional: false },
						{ source: 'node-3', target: 'node-2', label: 'refers to', directional: false },
					]}
					onGraphChange={(nodes) => {
						console.log('Graph updated:', nodes);
					}}
				/>
			</div>
		</div>
	);
};

export default TestGraph;
