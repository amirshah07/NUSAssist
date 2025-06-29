import type { Node, Edge } from '@xyflow/react';
import { Position } from '@xyflow/react';
import type { ModuleNodeData } from './CustomNode';

//Configuration options for roadmap layout algorithm
export interface LayoutConfig {
  levelSpacing?: number;
  nodeSpacing?: number;
  smartRouting?: boolean;
}

//Default layout configuration
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  levelSpacing: 250,  // Vertical space between levels
  nodeSpacing: 400,   // Horizontal space between nodes in same level
  smartRouting: true
};

//Result of layout calculation
export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

//Calculate if two nodes might have overlapping edges
const nodesHaveOverlappingPath = (
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  obstaclePos: { x: number; y: number },
  nodeWidth: number = 280,
  nodeHeight: number = 80
): boolean => {
  // Check if obstacle is roughly between source and target
  const minX = Math.min(sourcePos.x, targetPos.x) - nodeWidth / 2;
  const maxX = Math.max(sourcePos.x, targetPos.x) + nodeWidth / 2;
  const minY = Math.min(sourcePos.y, targetPos.y) - nodeHeight / 2;
  const maxY = Math.max(sourcePos.y, targetPos.y) + nodeHeight / 2;
  
  return obstaclePos.x >= minX && obstaclePos.x <= maxX &&
         obstaclePos.y >= minY && obstaclePos.y <= maxY;
};

//Roadmap layout algo
export const getRoadmapLayout = (
  nodes: Node[], 
  edges: Edge[], 
  config: Partial<LayoutConfig> = {}
): LayoutResult => {
  const layoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const { levelSpacing, nodeSpacing, smartRouting } = layoutConfig;

  // Build prerequisite relationship maps
  const prerequisites = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();
  
  // Initialize maps for all nodes
  nodes.forEach(node => {
    prerequisites.set(node.id, []);
    dependents.set(node.id, []);
  });

  // Populate prerequisite relationships from edges
  edges.forEach(edge => {
    const prereqs = prerequisites.get(edge.target) || [];
    prereqs.push(edge.source);
    prerequisites.set(edge.target, prereqs);

    const deps = dependents.get(edge.source) || [];
    deps.push(edge.target);
    dependents.set(edge.source, deps);
  });

  // Calculate prerequisite levels using topological sorting
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  
  /**
   * Recursively calculate the prerequisite level for a node
   * Level = max(prerequisite levels) + 1, or 0 if no prerequisites
   */
  const calculateLevel = (nodeId: string): number => {
    if (visited.has(nodeId)) {
      return levels.get(nodeId) || 0;
    }
    
    visited.add(nodeId);
    const prereqs = prerequisites.get(nodeId) || [];
    
    // Base case: nodes with no prerequisites are at level 0
    if (prereqs.length === 0) {
      levels.set(nodeId, 0);
      return 0;
    }

    // Recursive case: level is one more than highest prerequisite level
    const maxPrereqLevel = Math.max(...prereqs.map(prereqId => calculateLevel(prereqId)));
    const level = maxPrereqLevel + 1;
    levels.set(nodeId, level);
    return level;
  };

  // Calculate levels for all nodes
  nodes.forEach(node => calculateLevel(node.id));

  // Group nodes by their prerequisite level
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Positioning to minimize edge crossings
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
  const layoutedNodes: Node[] = [];
  const nodePositions = new Map<string, { x: number; y: number }>();

  sortedLevels.forEach((level, levelIndex) => {
    const nodesInLevel = nodesByLevel.get(level)!;
    
    // Sort nodes within level based on their connections to previous level
    if (levelIndex > 0 && smartRouting) {
      nodesInLevel.sort((a, b) => {
        // Calculate average position of prerequisites
        const aPrereqs = prerequisites.get(a.id) || [];
        const bPrereqs = prerequisites.get(b.id) || [];
        
        const getAvgPos = (prereqs: string[]) => {
          if (prereqs.length === 0) return 0;
          const positions = prereqs
            .map(id => nodePositions.get(id))
            .filter(pos => pos !== undefined);
          if (positions.length === 0) return 0;
          return positions.reduce((sum, pos) => sum + pos!.x, 0) / positions.length;
        };
        
        const aAvg = getAvgPos(aPrereqs);
        const bAvg = getAvgPos(bPrereqs);
        
        return aAvg - bAvg;
      });
    } else {
      // Default sort by module code
      nodesInLevel.sort((a, b) => {
        const aData = a.data as ModuleNodeData;
        const bData = b.data as ModuleNodeData;
        const aCode = aData.moduleCode || a.id;
        const bCode = bData.moduleCode || b.id;
        return aCode.localeCompare(bCode);
      });
    }
    
    // Calculate positioning for nodes in this level
    const levelWidth = Math.max(0, (nodesInLevel.length - 1) * nodeSpacing!);
    const startOffset = -levelWidth / 2; // Center the level

    nodesInLevel.forEach((node, nodeIndex) => {
      // Calculate position
      const x = startOffset + (nodeIndex * nodeSpacing!);
      const y = levelIndex * levelSpacing!;

      // Store position for routing
      nodePositions.set(node.id, { x, y });

      // Set handle positions for vertical layout
      const targetPosition = Position.Top;
      const sourcePosition = Position.Bottom;

      layoutedNodes.push({
        ...node,
        targetPosition,
        sourcePosition,
        position: { x, y }
      });
    });
  });

  // Enhance edges with routing
  const enhancedEdges = edges.map(edge => {
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);
    
    if (!sourcePos || !targetPos || !smartRouting) {
      return {
        ...edge,
        type: 'smoothstep' 
      };
    }

    // Check if there are nodes between source and target
    let hasObstacles = false;
    for (const [nodeId, pos] of nodePositions.entries()) {
      if (nodeId !== edge.source && nodeId !== edge.target) {
        if (nodesHaveOverlappingPath(sourcePos, targetPos, pos)) {
          hasObstacles = true;
          break;
        }
      }
    }

    // Check if nodes are directly above/below each other (need offset)
    const isDirectlyAligned = Math.abs(sourcePos.x - targetPos.x) < 50;

    // Use different edge types based on path complexity
    if (hasObstacles || isDirectlyAligned) {
      // For complex paths or aligned nodes, use custom routing
      return {
        ...edge,
        type: 'smoothstep',
        data: {
          ...edge.data,
          offset: isDirectlyAligned ? 40 : 20
        }
      };
    } else {
      // For simple paths, smoothstep works well
      return {
        ...edge,
        type: 'smoothstep'
      };
    }
  });

  return { 
    nodes: layoutedNodes, 
    edges: enhancedEdges
  };
};