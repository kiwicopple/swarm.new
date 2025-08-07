import localforage from 'localforage';
import { create } from 'zustand';
import { Swarm, Workflow, AgentNode } from '@/lib/types';

localforage.config({
  name: 'SwarmWorkflow',
  storeName: 'swarms',
});

interface SwarmStore {
  swarms: Swarm[];
  currentSwarmId: string | null;
  selectedNodeId: string | null;
  loading: boolean;
  
  loadSwarms: () => Promise<void>;
  createSwarm: (name: string, description: string) => Promise<Swarm>;
  updateSwarm: (id: string, updates: Partial<Swarm>) => Promise<void>;
  deleteSwarm: (id: string) => Promise<void>;
  setCurrentSwarm: (id: string | null) => void;
  getCurrentSwarm: () => Swarm | null;
  updateWorkflow: (swarmId: string, workflow: Workflow) => Promise<void>;
  
  setSelectedNode: (nodeId: string | null) => void;
  getSelectedNode: () => AgentNode | null;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => Promise<void>;
}

const generateSwarmId = () => {
  return `swarm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const useSwarmStore = create<SwarmStore>((set, get) => ({
  swarms: [],
  currentSwarmId: null,
  selectedNodeId: null,
  loading: false,
  
  loadSwarms: async () => {
    set({ loading: true });
    try {
      const storedSwarms = await localforage.getItem<Swarm[]>('swarms');
      if (storedSwarms) {
        set({ swarms: storedSwarms });
      }
    } catch (error) {
      console.error('Failed to load swarms:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  createSwarm: async (name: string, description: string) => {
    const newSwarm: Swarm = {
      id: generateSwarmId(),
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      workflow: {
        nodes: [],
        edges: [],
        variables: {},
      },
      theme: 'honeycomb',
    };
    
    const { swarms } = get();
    const updatedSwarms = [...swarms, newSwarm];
    
    set({ swarms: updatedSwarms });
    await localforage.setItem('swarms', updatedSwarms);
    
    return newSwarm;
  },
  
  updateSwarm: async (id: string, updates: Partial<Swarm>) => {
    const { swarms } = get();
    const updatedSwarms = swarms.map(swarm => 
      swarm.id === id 
        ? { ...swarm, ...updates, updatedAt: new Date() }
        : swarm
    );
    
    set({ swarms: updatedSwarms });
    await localforage.setItem('swarms', updatedSwarms);
  },
  
  deleteSwarm: async (id: string) => {
    const { swarms, currentSwarmId } = get();
    const updatedSwarms = swarms.filter(swarm => swarm.id !== id);
    
    set({ 
      swarms: updatedSwarms,
      currentSwarmId: currentSwarmId === id ? null : currentSwarmId
    });
    await localforage.setItem('swarms', updatedSwarms);
  },
  
  setCurrentSwarm: (id: string | null) => {
    set({ currentSwarmId: id, selectedNodeId: null });
  },
  
  getCurrentSwarm: () => {
    const { swarms, currentSwarmId } = get();
    return swarms.find(swarm => swarm.id === currentSwarmId) || null;
  },
  
  updateWorkflow: async (swarmId: string, workflow: Workflow) => {
    const { swarms } = get();
    const updatedSwarms = swarms.map(swarm => 
      swarm.id === swarmId 
        ? { ...swarm, workflow, updatedAt: new Date() }
        : swarm
    );
    
    set({ swarms: updatedSwarms });
    await localforage.setItem('swarms', updatedSwarms);
  },
  
  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },
  
  getSelectedNode: () => {
    const { swarms, currentSwarmId, selectedNodeId } = get();
    const currentSwarm = swarms.find(swarm => swarm.id === currentSwarmId);
    if (!currentSwarm || !selectedNodeId) return null;
    return currentSwarm.workflow.nodes.find(node => node.id === selectedNodeId) || null;
  },
  
  updateNodeConfig: async (nodeId: string, config: Record<string, unknown>) => {
    const { swarms, currentSwarmId } = get();
    if (!currentSwarmId) return;
    
    const updatedSwarms = swarms.map(swarm => {
      if (swarm.id !== currentSwarmId) return swarm;
      
      const updatedNodes = swarm.workflow.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, config } };
        }
        return node;
      });
      
      return {
        ...swarm,
        workflow: { ...swarm.workflow, nodes: updatedNodes },
        updatedAt: new Date()
      };
    });
    
    set({ swarms: updatedSwarms });
    await localforage.setItem('swarms', updatedSwarms);
  },
}));