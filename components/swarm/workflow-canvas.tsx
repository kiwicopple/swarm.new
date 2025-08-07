"use client";

import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  BackgroundVariant,
  Panel,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Swarm, AgentNode, AgentType } from '@/lib/types';
import { useSwarmStore } from '@/lib/storage/swarm-store';
import { NodePalette } from './node-palette';
import { ExecutionPanel } from './execution-panel';
import { NodeConfigPanel } from './node-config-panel';
import { AGENT_CONFIGS } from '@/lib/agent-configs';
import { ScoutNode } from './agent-nodes/scout-node';
import { WorkerNode } from './agent-nodes/worker-node';
import { QueenNode } from './agent-nodes/queen-node';
import { BuilderNode } from './agent-nodes/builder-node';
import { GuardNode } from './agent-nodes/guard-node';
import { MessengerNode } from './agent-nodes/messenger-node';

const nodeTypes: NodeTypes = {
  scout: ScoutNode,
  worker: WorkerNode,
  queen: QueenNode,
  builder: BuilderNode,
  guard: GuardNode,
  messenger: MessengerNode,
};

interface WorkflowCanvasProps {
  swarm: Swarm;
}

export function WorkflowCanvas({ swarm }: WorkflowCanvasProps) {
  const { updateWorkflow, setSelectedNode } = useSwarmStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(swarm.workflow.nodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(swarm.workflow.edges);
  const [isExecuting, setIsExecuting] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 350,
        y: event.clientY - 100,
      };

      const newNode: AgentNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Bee`,
          agentType: type as AgentType,
          config: AGENT_CONFIGS[type as AgentType]?.defaultConfig || {},
          inputs: [{ id: 'input', name: 'Input', type: 'any' }],
          outputs: [{ id: 'output', name: 'Output', type: 'any' }],
          status: 'idle',
        },
      };

      setNodes((nds) => nds.concat(newNode as unknown as Node));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSave = useCallback(async () => {
    await updateWorkflow(swarm.id, {
      nodes: nodes as unknown as AgentNode[],
      edges,
      variables: swarm.workflow.variables,
    });
  }, [swarm.id, nodes, edges, swarm.workflow.variables, updateWorkflow]);

  const handleExecute = () => {
    setIsExecuting(true);
    setTimeout(() => setIsExecuting(false), 3000);
  };

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="h-full w-full flex">
      <NodePalette />
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1}
            color="#fbbf24"
            style={{ opacity: 0.1 }}
          />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'scout': return '#fbbf24';
                case 'worker': return '#fb923c';
                case 'queen': return '#f59e0b';
                case 'builder': return '#eab308';
                case 'guard': return '#ca8a04';
                case 'messenger': return '#a16207';
                default: return '#999';
              }
            }}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
          />
          <Panel position="top-right" className="flex gap-2">
            <ExecutionPanel 
              isExecuting={isExecuting}
              onExecute={handleExecute}
              onSave={handleSave}
            />
          </Panel>
        </ReactFlow>
        <NodeConfigPanel />
      </div>
    </div>
  );
}