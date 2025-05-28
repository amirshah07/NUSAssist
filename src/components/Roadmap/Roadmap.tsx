import { useCallback } from 'react';
import {
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType
} from '@xyflow/react';
import type {
  Node,
  Edge,
  Connection
} from '@xyflow/react';

import dagre from '@dagrejs/dagre';
 
import '@xyflow/react/dist/style.css';
import './Roadmap.css';
 
import { initialNodes, initialEdges } from './initialElements';
 
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
 
const nodeWidth = 220;
const nodeHeight = 70;
 
const getLayoutedElements = (
  nodes: Node[], 
  edges: Edge[], 
  direction = 'TB'
) => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: isHorizontal ? 160 : 180,
    nodesep: isHorizontal ? 80 : 120, 
    marginx: 100,  
    marginy: 100,
    acyclicer: 'greedy',
    ranker: 'network-simplex', // Better for vertical layouts
    align: 'UL' 
  });
 
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
 
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
 
  dagre.layout(dagreGraph);
 
  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
 
    return newNode;
  });
 
  return { nodes: newNodes, edges };
};
 
const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges,
  'TB' // Use vertical layout by default
);
 
const Roadmap = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds),
      ),
    [],
  );
  
  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction,
      );
 
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges],
  );

const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Update edges to highlight related ones
      setEdges((eds) =>
        eds.map((edge) => {
          const isRelated = edge.source === node.id || edge.target === node.id;
          return {
            ...edge,
            style: {
              ...edge.style,
              stroke: isRelated ? '#FF6B00' : '#6b7280',
              strokeWidth: isRelated ? 3 : 2
            },
            markerEnd: isRelated 
              ? { type: MarkerType.ArrowClosed, color: '#FF6B00' }
              : { type: MarkerType.ArrowClosed, color: '#6b7280' }
          };
        })
      );
    },
    []
  );

  const onNodeMouseLeave = useCallback(() => {
    // Reset all edges to default styling
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          stroke: '#6b7280',
          strokeWidth: 2
        }
      }))
    );
  }, [setEdges]);
 
  return (
    <div className="roadmap-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        style={{ backgroundColor: '#242424' }}
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-left">
          <button className="xy-theme__button" onClick={() => onLayout('TB')}>
            vertical layout
          </button>
          <button className="xy-theme__button" onClick={() => onLayout('LR')}>
            horizontal layout
          </button>
        </Panel>
        <Panel position="top-right">
          <button>
            Add / Remove Modules
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default Roadmap;