import { Edge } from '@xyflow/react';

export type AgentType = 
  | 'scout'      
  | 'worker'     
  | 'queen'      
  | 'builder'    
  | 'guard'      
  | 'messenger';

export interface Port {
  id: string;
  name: string;
  type: 'text' | 'array' | 'object' | 'number' | 'boolean' | 'any';
}

export interface AgentNodeData {
  name: string;
  agentType: AgentType;
  model?: string;
  config: Record<string, unknown>;
  inputs: Port[];
  outputs: Port[];
  status?: 'idle' | 'running' | 'success' | 'error';
  result?: unknown;
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