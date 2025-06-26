import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  ReactFlow,
  ReactFlowProvider,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Position,
  MarkerType
} from '@xyflow/react';
import type {
  Node,
  Edge,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './Roadmap.css'; 
import { ZoomIn, ZoomOut } from "lucide-react";
import CustomNode from './CustomNode';
import ConfirmModal from './ConfirmModal';
import NodeInfoModal from './NodeInfoModal';
import MajorDropdown from './MajorDropdown';
import AddRemoveModuleModal from './AddRemoveModuleModal';
import Loading from '../Loading/Loading';  
import type { ModuleStatus, ModuleNodeData } from './CustomNode';
import { getRoadmapLayout } from './RoadmapLayout';
import {
  loadUserRoadmap,
  saveUserRoadmap,
  getModulesForMajor,
  buildRoadmapFromModules,
  updateUserMajor,
  getUserMajor,
  extractPrerequisiteCodes
} from './RoadmapUtils';

const ZoomControls = ({ onAddRemoveClick }: { onAddRemoveClick: () => void }) => {
  const { zoomIn, zoomOut } = useReactFlow();
  
  return (
    <Panel position="top-right">
      <button className="layout-button" onClick={onAddRemoveClick}>
        Add/Remove Module
      </button>
      <button className="zoom-button" onClick={() => zoomIn()}>
        <ZoomIn />
      </button>
      <button className="zoom-button" onClick={() => zoomOut()}>
        <ZoomOut />
      </button>
    </Panel>
  );
};

const TopControls = ({ 
  selectedMajor,
  onMajorSelect 
}: { 
  selectedMajor?: string;
  onMajorSelect: (major: string) => void;
}) => {
  return (
    <Panel position="top-left">
      <MajorDropdown 
        currentMajor={selectedMajor}
        onMajorSelect={onMajorSelect}
      />
    </Panel>
  );
};

const Roadmap = () => {
  const [user, setUser] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedMajor, setSelectedMajor] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    nodeId: string;
    currentStatus: ModuleStatus;
    title: string;
    message: string;
  } | null>(null);

  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
  const [pendingMajor, setPendingMajor] = useState<string | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<{
    moduleCode: string;
    moduleName: string;
    status: ModuleStatus;
    description: string;
    moduleCredit: number;
    prerequisite: string;
  } | null>(null);

  const [isAddRemoveModalOpen, setIsAddRemoveModalOpen] = useState(false);

  // Load user's roadmap and major on component mount
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Load user's selected major
        const major = await getUserMajor(user.id);
        if (major) {
          setSelectedMajor(major);
        }

        // Load user's roadmap
        const { nodes: loadedNodes, edges: loadedEdges } = await loadUserRoadmap(user.id);
        
        if (loadedNodes.length > 0) {
          // Apply layout to loaded nodes
          const { nodes: layoutedNodes, edges: layoutedEdges } = getRoadmapLayout(
            loadedNodes,
            loadedEdges,
            { smartRouting: true }
          );
          
          // Update node statuses based on loaded data
          const nodesWithCorrectStatuses = updateNodeStatuses(layoutedNodes, layoutedEdges);
          
          setNodes(nodesWithCorrectStatuses);
          setEdges(layoutedEdges);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user?.id]);

  // Auto-save changes
  useEffect(() => {
    const saveChanges = async () => {
      if (!user?.id || !hasUnsavedChanges || nodes.length === 0) return;
      
      await saveUserRoadmap(user.id, nodes, edges);
      setHasUnsavedChanges(false);
    };

    const debounceTimer = setTimeout(saveChanges, 500);
    return () => clearTimeout(debounceTimer);
  }, [nodes, edges, hasUnsavedChanges, user?.id]);

  // Utility functions for prerequisite logic
  const getPrerequisites = useCallback((nodeId: string, edgeList?: Edge[]): string[] => {
    const edgesToUse = edgeList || edges;
    return edgesToUse
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
  }, [edges]);

  const determineNodeStatus = useCallback((nodeId: string, currentNodes: Node[], edgeList?: Edge[]): ModuleStatus => {
    const prerequisites = getPrerequisites(nodeId, edgeList);
    
    // If no prerequisites, node is available
    if (prerequisites.length === 0) {
      return 'available';
    }

    // Check if all prerequisites are completed
    const allPrerequisitesCompleted = prerequisites.every(prereqId => {
      const prereqNode = currentNodes.find(node => node.id === prereqId);
      return prereqNode && (prereqNode.data as ModuleNodeData).status === 'completed';
    });

    return allPrerequisitesCompleted ? 'available' : 'locked';
  }, [getPrerequisites]);

  const updateNodeStatuses = useCallback((updatedNodes: Node[], edgeList?: Edge[]) => {
    const newNodes = updatedNodes.map(node => {
      const nodeData = node.data as ModuleNodeData;
      
      // Check if completed nodes still have their prerequisites satisfied
      if (nodeData.status === 'completed') {
        const prerequisites = getPrerequisites(node.id, edgeList);
        
        // If node has prerequisites, check if they're all still completed
        if (prerequisites.length > 0) {
          const allPrerequisitesCompleted = prerequisites.every(prereqId => {
            const prereqNode = updatedNodes.find(n => n.id === prereqId);
            return prereqNode && (prereqNode.data as ModuleNodeData).status === 'completed';
          });
          
          // If prerequisites are no longer satisfied, revert to locked
          if (!allPrerequisitesCompleted) {
            return {
              ...node,
              targetPosition: node.targetPosition || Position.Top,
              sourcePosition: node.sourcePosition || Position.Bottom,
              data: {
                ...nodeData,
                status: 'locked'
              }
            } as Node;
          }
        }
        
        // Keep as completed if prerequisites are still satisfied (or no prerequisites)
        return {
          ...node,
          targetPosition: node.targetPosition || Position.Top,
          sourcePosition: node.sourcePosition || Position.Bottom
        } as Node;
      }

      // For non-completed nodes, determine status normally
      const newStatus = determineNodeStatus(node.id, updatedNodes, edgeList);
      
      return {
        ...node,
        targetPosition: node.targetPosition || Position.Top,
        sourcePosition: node.sourcePosition || Position.Bottom,
        data: {
          ...nodeData,
          status: newStatus
        }
      } as Node;
    });
    
    return newNodes;
  }, [determineNodeStatus, getPrerequisites]);

  const handleMajorSelect = useCallback((major: string) => {
    setPendingMajor(major);
    setIsMajorModalOpen(true);
  }, []);

  const handleMajorConfirm = useCallback(async () => {
    if (!pendingMajor || !user?.id) return;

    setIsLoading(true);
    try {
      // Update user's major
      await updateUserMajor(user.id, pendingMajor);
      setSelectedMajor(pendingMajor);

      // Load modules for the major
      const modules = await getModulesForMajor(pendingMajor);
      const { nodes: newNodes, edges: newEdges } = buildRoadmapFromModules(modules);

      // Apply layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getRoadmapLayout(
        newNodes,
        newEdges,
        { smartRouting: true }
      );

      // Update statuses with the new edges
      const nodesWithStatuses = updateNodeStatuses(layoutedNodes, layoutedEdges);
      
      setNodes(nodesWithStatuses);
      setEdges(layoutedEdges);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error setting up major:', error);
    } finally {
      setIsLoading(false);
      setPendingMajor(null);
    }
  }, [pendingMajor, user?.id, updateNodeStatuses]);

  const handleStatusIconClick = useCallback((nodeId: string, currentStatus: ModuleStatus) => {
    // Only allow clicks on available or completed nodes
    if (currentStatus !== 'available' && currentStatus !== 'completed') {
      return;
    }

    setNodes((currentNodes) => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (!node) return currentNodes;

      const nodeData = node.data as ModuleNodeData;
      const moduleCode = nodeData.moduleCode || nodeId.toUpperCase();
      
      if (currentStatus === 'available') {
        setModalConfig({
          nodeId,
          currentStatus,
          title: 'Mark as Completed',
          message: `Have you completed ${moduleCode}?`
        });
      } else if (currentStatus === 'completed') {
        setModalConfig({
          nodeId,
          currentStatus,
          title: 'Mark as Incomplete',
          message: `Mark ${moduleCode} as not yet completed?`
        });
      }
      
      setIsModalOpen(true);
      return currentNodes;
    });
  }, []);

  const handleNodeClick = useCallback((event: MouseEvent, node: Node) => {
    const target = event.target as HTMLElement;
    const isStatusIconClick = target.closest('.status-icon') !== null;
    
    if (isStatusIconClick) {
      const nodeData = node.data as ModuleNodeData;
      if (nodeData.status === 'available' || nodeData.status === 'completed') {
        handleStatusIconClick(node.id, nodeData.status);
      }
      return;
    }

    const nodeData = node.data as ModuleNodeData;
    const moduleCode = nodeData.moduleCode || node.id.toUpperCase();
    const moduleName = nodeData.label.replace(/^[A-Z0-9]+[A-Z]?\s/, '');

    setSelectedNodeInfo({
      moduleCode,
      moduleName,
      status: nodeData.status,
      description: nodeData.description || 'No description available.',
      moduleCredit: nodeData.moduleCredit || 0,
      prerequisite: nodeData.prerequisite || 'None'
    });
    
    setIsInfoModalOpen(true);
  }, [handleStatusIconClick]);

  const handleModalConfirm = useCallback(() => {
    if (!modalConfig) return;

    const { nodeId, currentStatus } = modalConfig;
    const newStatus: ModuleStatus = currentStatus === 'available' ? 'completed' : 'available';

    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.map((node) => {
        if (node.id === nodeId) {
          return { 
            ...node,
            targetPosition: node.targetPosition || Position.Top,
            sourcePosition: node.sourcePosition || Position.Bottom, 
            data: { 
              ...(node.data as ModuleNodeData), 
              status: newStatus 
            }
          } as Node;
        }
        return {
          ...node,
          targetPosition: node.targetPosition || Position.Top,
          sourcePosition: node.sourcePosition || Position.Bottom
        } as Node;
      });

      // Update all dependent nodes based on prerequisite logic
      const finalNodes = updateNodeStatuses(updatedNodes);
      return finalNodes;
    });

    setHasUnsavedChanges(true);
    setModalConfig(null);
  }, [modalConfig, updateNodeStatuses]);

  // Highlight related nodes and edges
  const onNodeMouseEnter = useCallback(
    (_: MouseEvent, node: Node) => {
      // Get all related nodes (prerequisites and dependents)
      const relatedNodeIds = new Set<string>();
      const relatedEdgeIds = new Set<string>();
      
      // Find prerequisites (incoming edges)
      edges.forEach(edge => {
        if (edge.target === node.id) {
          relatedNodeIds.add(edge.source);
          relatedEdgeIds.add(edge.id);
        }
      });
      
      // Find dependents (outgoing edges)
      edges.forEach(edge => {
        if (edge.source === node.id) {
          relatedNodeIds.add(edge.target);
          relatedEdgeIds.add(edge.id);
        }
      });
      
      // Add hover state to container
      if (containerRef.current) {
        containerRef.current.classList.add('node-hovering');
      }
      
      // Update node classes
      setNodes((nds) =>
        nds.map((n) => {
          const isHovered = n.id === node.id;
          const isRelated = relatedNodeIds.has(n.id);
          
          let className = n.className || '';
          className = className.replace(/node-hovered|node-highlighted/g, '').trim();
          
          if (isHovered) {
            className += ' node-hovered node-highlighted';
          } else if (isRelated) {
            className += ' node-highlighted';
          }
          
          return { ...n, className: className.trim() };
        })
      );
      
      // Update edge classes
      setEdges((eds) =>
        eds.map((edge) => {
          const isRelated = relatedEdgeIds.has(edge.id);
          let className = edge.className || '';
          className = className.replace(/edge-highlighted/g, '').trim();
          
          if (isRelated) {
            className += ' edge-highlighted';
          }
          
          return {
            ...edge,
            className: className.trim(),
            animated: edge.animated !== undefined ? edge.animated : true,
            style: {
              ...edge.style,
              stroke: isRelated ? '#FF6B00' : '#6b7280',
              strokeWidth: 2
            },
            markerEnd: isRelated 
              ? { 
                  type: MarkerType.ArrowClosed, 
                  color: '#FF6B00',
                  width: 20,
                  height: 20
                }
              : { 
                  type: MarkerType.ArrowClosed, 
                  color: '#6b7280',
                  width: 20,
                  height: 20
                }
          };
        })
      );
    },
    [edges]
  );

  const onNodeMouseLeave = useCallback(() => {
    // Remove hover state from container
    if (containerRef.current) {
      containerRef.current.classList.remove('node-hovering');
    }
    
    // Remove all hover classes from nodes
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        className: (n.className || '').replace(/node-hovered|node-highlighted/g, '').trim()
      }))
    );
    
    // Remove all hover classes from edges and reset styles
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        className: (edge.className || '').replace(/edge-highlighted/g, '').trim(),
        animated: edge.animated !== undefined ? edge.animated : true,
        style: {
          ...edge.style,
          stroke: '#6b7280',
          strokeWidth: 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6b7280',
          width: 20,
          height: 20
        }
      }))
    );
  }, []);

  // Handle adding a new module 
  const handleAddModule = useCallback(async (module: {
    moduleCode: string;
    title: string;
    description: string;
    modulecredit: number;
    prerequisite?: string;
    hard_prerequisites?: any;
  }) => {
    // Create new node with all module data
    const newNode: Node = {
      id: module.moduleCode.toLowerCase().replace(/\s+/g, ''),
      type: 'customModule',
      position: { x: 0, y: 0 }, // Will be repositioned by layout
      data: {
        label: `${module.moduleCode} ${module.title || ''}`,
        status: 'available' as const,
        moduleCode: module.moduleCode,
        description: module.description || 'No description available.',
        moduleCredit: module.modulecredit,
        prerequisite: module.prerequisite || module.hard_prerequisites || 'None'
      } as ModuleNodeData
    };

    // Create edges based on prerequisites
    const newEdges: Edge[] = [];
    if (module.hard_prerequisites) {
      const moduleSet = new Set(nodes.map(n => (n.data as ModuleNodeData).moduleCode || n.id.toUpperCase()));
      moduleSet.add(module.moduleCode); // Add the new module
      
      const prereqs = extractPrerequisiteCodes(module.hard_prerequisites, moduleSet);
      prereqs.forEach((prereqCode: string) => {
        newEdges.push({
          id: `${prereqCode.toLowerCase()}-${module.moduleCode.toLowerCase()}`,
          source: prereqCode.toLowerCase().replace(/\s+/g, ''),
          target: module.moduleCode.toLowerCase().replace(/\s+/g, ''),
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6b7280',
            width: 20,
            height: 20
          }
        });
      });
    }

    // Add to current nodes and edges
    const updatedNodes = [...nodes, newNode];
    const updatedEdges = [...edges, ...newEdges];

    // Apply layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getRoadmapLayout(
      updatedNodes,
      updatedEdges,
      { smartRouting: true }
    );

    // Update statuses
    const nodesWithStatuses = updateNodeStatuses(layoutedNodes, layoutedEdges);
    
    setNodes(nodesWithStatuses);
    setEdges(layoutedEdges);
    setHasUnsavedChanges(true);
  }, [nodes, edges, updateNodeStatuses]);

  const handleRemoveModule = useCallback((moduleCode: string) => {
    const moduleId = moduleCode.toLowerCase().replace(/\s+/g, '');
    
    // Find all modules that depend on this one
    const dependentIds = new Set<string>();
    const findDependents = (targetId: string) => {
      edges.forEach(edge => {
        if (edge.source === targetId && !dependentIds.has(edge.target)) {
          dependentIds.add(edge.target);
          findDependents(edge.target); // Recursively find all dependents
        }
      });
    };
    
    findDependents(moduleId);
    
    // Remove the module and all its dependents
    const idsToRemove = new Set([moduleId, ...dependentIds]);
    const updatedNodes = nodes.filter(node => !idsToRemove.has(node.id));
    const updatedEdges = edges.filter(edge => 
      !idsToRemove.has(edge.source) && !idsToRemove.has(edge.target)
    );

    // Apply layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getRoadmapLayout(
      updatedNodes,
      updatedEdges,
      { smartRouting: true }
    );

    // Update statuses
    const nodesWithStatuses = updateNodeStatuses(layoutedNodes, layoutedEdges);
    
    setNodes(nodesWithStatuses);
    setEdges(layoutedEdges);
    setHasUnsavedChanges(true);
  }, [nodes, edges, updateNodeStatuses]);

  // Define custom node types - must be memoized to prevent re-renders
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      customModule: CustomNode,
    }),
    []
  );

  if (isLoading) {
    return <Loading />;  
  }
 
  return (
    <div className="roadmap-container" ref={containerRef}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={true}
          edgesFocusable={false}
          elementsSelectable={true}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          minZoom={0.4} 
          maxZoom={1.2} 
          style={{ backgroundColor: '#242424' }}
          proOptions={{ hideAttribution: true }}
        >
          <TopControls 
            selectedMajor={selectedMajor}
            onMajorSelect={handleMajorSelect}
          />
          <ZoomControls onAddRemoveClick={() => setIsAddRemoveModalOpen(true)} />
        </ReactFlow>
      </ReactFlowProvider>
      
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalConfig(null);
        }}
        onConfirm={handleModalConfirm}
        title={modalConfig?.title || ''}
        message={modalConfig?.message || ''}
        confirmText="Yes"
        cancelText="No"
      />

      <ConfirmModal
        isOpen={isMajorModalOpen}
        onClose={() => {
          setIsMajorModalOpen(false);
          setPendingMajor(null);
        }}
        onConfirm={handleMajorConfirm}
        title="Load Major Requirements"
        message={
          <>
            Would you like to confirm <span style={{ color: '#FF6B00', fontWeight: 600 }}>{pendingMajor}</span> as your major and add some of its core modules to your roadmap?
          </>
        }
        confirmText="Yes"
        cancelText="No"
      />
      
      <NodeInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => {
          setIsInfoModalOpen(false);
          setSelectedNodeInfo(null);
        }}
        moduleCode={selectedNodeInfo?.moduleCode || ''}
        title={selectedNodeInfo?.moduleName || ''}
        status={selectedNodeInfo?.status || 'locked'}
        description={selectedNodeInfo?.description || ''}
        moduleCredit={selectedNodeInfo?.moduleCredit || 0}
        prerequisite={selectedNodeInfo?.prerequisite || 'None'}
      />
      
      <AddRemoveModuleModal
        isOpen={isAddRemoveModalOpen}
        onClose={() => setIsAddRemoveModalOpen(false)}
        currentNodes={nodes}
        currentEdges={edges}
        onAddModule={handleAddModule}
        onRemoveModule={handleRemoveModule}
      />
    </div>
  );
};

export default Roadmap;