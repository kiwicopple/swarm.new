import { Edge } from '@xyflow/react';

export type AgentType = 
  | 'scout'      
  | 'worker'     
  | 'queen'      
  | 'builder'    
  | 'guard'      
  | 'messenger';

// Re-export data flow types
export { 
  type Port, 
  type DataType, 
  type DataPayload, 
  type DataEdge 
} from './types/data-flow';

// Import for local use
import type { DataPayload } from './types/data-flow';

export interface NodeResult {
  nodeId: string;
  outputs: Record<string, DataPayload>;
  status: 'success' | 'error' | 'pending';
  error?: string;
  executionTime?: number;
}

export interface AgentNodeData {
  name: string;
  agentType: AgentType;
  model?: string;
  config: Record<string, unknown>;
  status?: 'idle' | 'running' | 'success' | 'error';
  result?: NodeResult;
}

export interface AgentNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: AgentNodeData;
}

export interface Workflow {
  nodes: AgentNode[];
  edges: Edge[];
  variables: Record<string, unknown>;
}

export interface Swarm {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  workflow: Workflow;
  theme: 'honeycomb' | 'garden' | 'hive';
}

export interface ExecutionResult {
  nodeId: string;
  status: 'success' | 'error';
  output?: unknown;
  error?: string;
  executedAt: Date;
}