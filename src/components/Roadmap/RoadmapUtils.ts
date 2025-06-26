import { supabase } from '../../lib/supabaseClient';
import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { ModuleNodeData } from './CustomNode';

interface ModuleInfo {
  moduleCode: string;
  title: string; 
  description?: string;
  prerequisite?: string;
  modulecredit?: number;  
  hard_prerequisites?: any;
}

interface SavedNode {
  module_code: string;
  position_x: number;
  position_y: number;
  status: 'completed' | 'available' | 'locked';
}

interface SavedEdge {
  source_module: string;
  target_module: string;
}

// Load user's saved roadmap from the database
export async function loadUserRoadmap(userId: string) {
  try {
    // Load user's nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('user_roadmap_nodes')
      .select('*')
      .eq('user_id', userId);

    if (nodesError) throw nodesError;

    // Load user's edges
    const { data: edges, error: edgesError } = await supabase
      .from('user_roadmap_edges')
      .select('*')
      .eq('user_id', userId);

    if (edgesError) throw edgesError;

    // Get module details
    const moduleCodes = (nodes as SavedNode[])?.map(n => n.module_code) || [];
    
    // Only query if we have module codes
    if (moduleCodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const { data: modules, error: modulesError } = await supabase
      .from('available_mods')
      .select('moduleCode, title, description, prerequisite, modulecredit')
      .in('moduleCode', moduleCodes);

    if (modulesError) throw modulesError;

    // Create a map for quick lookup
    const moduleMap = new Map<string, ModuleInfo>();
    modules?.forEach(mod => {
      moduleMap.set(mod.moduleCode, mod as ModuleInfo);
    });

    // Convert to React Flow format
    const flowNodes: Node[] = ((nodes as SavedNode[]) || []).map(node => {
      const moduleInfo = moduleMap.get(node.module_code);
      return {
        id: node.module_code.toLowerCase().replace(/\s+/g, ''),
        type: 'customModule',
        position: { x: node.position_x, y: node.position_y },
        data: {
          label: `${node.module_code} ${moduleInfo?.title || ''}`,
          status: node.status,
          moduleCode: node.module_code,
          description: moduleInfo?.description || 'No description available.',
          moduleCredit: moduleInfo?.modulecredit || 0,  
          prerequisite: moduleInfo?.prerequisite || 'None'  
        } as ModuleNodeData
      };
    });

    const flowEdges: Edge[] = ((edges as SavedEdge[]) || []).map(edge => ({
      id: `${edge.source_module}-${edge.target_module}`,
      source: edge.source_module.toLowerCase().replace(/\s+/g, ''),
      target: edge.target_module.toLowerCase().replace(/\s+/g, ''),
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6b7280'
      }
    }));

    return { nodes: flowNodes, edges: flowEdges };
  } catch (error) {
    console.error('Error loading user roadmap:', error);
    return { nodes: [], edges: [] };
  }
}

// Save user's roadmap to the database
export async function saveUserRoadmap(
  userId: string, 
  nodes: Node[], 
  edges: Edge[]
) {
  try {
    // Delete existing nodes and edges for the user
    await supabase.from('user_roadmap_nodes').delete().eq('user_id', userId);
    await supabase.from('user_roadmap_edges').delete().eq('user_id', userId);

    // Prepare nodes data
    const nodesToSave = nodes.map(node => ({
      user_id: userId,
      module_code: (node.data as ModuleNodeData).moduleCode || node.id.toUpperCase(),
      position_x: node.position.x,
      position_y: node.position.y,
      status: (node.data as ModuleNodeData).status
    }));

    // Save nodes
    if (nodesToSave.length > 0) {
      const { error: nodesError } = await supabase
        .from('user_roadmap_nodes')
        .insert(nodesToSave);
      if (nodesError) throw nodesError;
    }

    // Prepare edges data
    const edgesToSave = edges.map(edge => ({
      user_id: userId,
      source_module: edge.source.toUpperCase(),
      target_module: edge.target.toUpperCase()
    }));

    // Save edges
    if (edgesToSave.length > 0) {
      const { error: edgesError } = await supabase
        .from('user_roadmap_edges')
        .insert(edgesToSave);
      if (edgesError) throw edgesError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving user roadmap:', error);
    return { success: false, error };
  }
}

// Get modules required for a specific major
export async function getModulesForMajor(majorName: string) {
  try {
    // Get required module codes for the major
    const { data: requirements, error: reqError } = await supabase
      .from('major_requirements')
      .select('module_code')
      .eq('major_name', majorName);

    if (reqError) throw reqError;

    const moduleCodes = requirements?.map(r => r.module_code) || [];

    const { data: modules, error: modError } = await supabase
      .from('available_mods')
      .select('moduleCode, title, description, prerequisite, modulecredit, hard_prerequisites')
      .in('moduleCode', moduleCodes);

    if (modError) throw modError;

    return modules || [];
  } catch (error) {
    console.error('Error getting modules for major:', error);
    return [];
  }
}

// Build roadmap nodes and edges from modules
export function buildRoadmapFromModules(modules: ModuleInfo[]): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const moduleSet = new Set(modules.map(m => m.moduleCode));

  // Create nodes
  modules.forEach(module => {
    nodes.push({
      id: module.moduleCode.toLowerCase().replace(/\s+/g, ''),
      type: 'customModule',
      position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
      data: {
        label: `${module.moduleCode} ${module.title || ''}`,
        status: 'locked' as const,  // Start all modules as locked, will be updated based on prerequisites
        moduleCode: module.moduleCode,
        description: module.description || 'No description available.',
        moduleCredit: module.modulecredit || 0,   
        prerequisite: module.prerequisite || 'None'  
      } as ModuleNodeData
    });
  });

  // Create edges based on prerequisites
  modules.forEach(module => {
    if (module.hard_prerequisites) {
      const prereqs = extractPrerequisiteCodes(module.hard_prerequisites, moduleSet);
      
      prereqs.forEach(prereqCode => {
        edges.push({
          id: `${prereqCode.toLowerCase()}-${module.moduleCode.toLowerCase()}`,
          source: prereqCode.toLowerCase().replace(/\s+/g, ''),
          target: module.moduleCode.toLowerCase().replace(/\s+/g, ''),
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6b7280'
          }
        });
      });
    }
  });

  return { nodes, edges };
}

// Extract prerequisite module codes from the parsed prerequisite structure
export function extractPrerequisiteCodes(prereqs: any, availableModules: Set<string>): string[] {
  const codes: string[] = [];

  if (typeof prereqs === 'string') {
    // Handle slash-separated modules (take first available)
    const options = prereqs.split('/');
    for (const option of options) {
      if (availableModules.has(option)) {
        codes.push(option);
        break;
      }
    }
  } else if (Array.isArray(prereqs)) {
    // Handle array of prerequisites
    prereqs.forEach(prereq => {
      codes.push(...extractPrerequisiteCodes(prereq, availableModules));
    });
  } else if (prereqs && typeof prereqs === 'object') {
    if (prereqs.type === 'or' && prereqs.requirements) {
      // For OR requirements, take the first available option
      for (const req of prereqs.requirements) {
        const extracted = extractPrerequisiteCodes(req, availableModules);
        if (extracted.length > 0) {
          codes.push(...extracted);
          break;
        }
      }
    } else if (prereqs.type === 'minimum' && prereqs.options) {
      // For minimum requirements, extract from first option
      if (prereqs.options.length > 0) {
        codes.push(...extractPrerequisiteCodes(prereqs.options[0], availableModules));
      }
    }
  }

  return codes;
}

// Update user's selected major
export async function updateUserMajor(userId: string, major: string) {
  try {
    const { error } = await supabase
      .from('user_selected_major')
      .upsert({ 
        user_id: userId, 
        major_name: major
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating user major:', error);
    return { success: false, error };
  }
}

// Get user's selected major
export async function getUserMajor(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_selected_major')
      .select('major_name')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no major selected yet, that's okay
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data?.major_name || null;
  } catch (error) {
    console.error('Error getting user major:', error);
    return null;
  }
}