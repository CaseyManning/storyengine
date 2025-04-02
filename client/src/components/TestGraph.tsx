import React from 'react';
import ForceGraph from './ForceGraph';

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
				<ForceGraph
					nodes={[
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
					links={[
						{ source: 'node-1', target: 'node-2', label: 'connects to', directional: true },
						{ source: 'node-3', target: 'node-2', label: 'refers to', directional: true },
					]}
					width={window.innerWidth}
					height={window.innerHeight}
				/>
			</div>
		</div>
	);
};

export default TestGraph;
