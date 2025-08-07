"use client";

import React from 'react';
import { 
  BaseEdge, 
  EdgeProps, 
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow
} from '@xyflow/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateConnection, AGENT_PORTS } from '@/lib/types/data-flow';
import { AgentNodeData } from '@/lib/types';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  target,
  sourceHandleId,
  targetHandleId
}: EdgeProps) {
  const { getNodes, setEdges } = useReactFlow();
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Get the source and target nodes to validate connection
  const nodes = getNodes();
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  let isValid = true;
  let errorMessage = '';

  if (sourceNode && targetNode && sourceHandleId && targetHandleId) {
    const sourceNodeData = sourceNode.data as unknown as AgentNodeData;
    const targetNodeData = targetNode.data as unknown as AgentNodeData;
    
    const sourcePorts = AGENT_PORTS[sourceNodeData.agentType];
    const targetPorts = AGENT_PORTS[targetNodeData.agentType];
    
    const sourcePort = sourcePorts?.outputs.find(p => p.id === sourceHandleId);
    const targetPort = targetPorts?.inputs.find(p => p.id === targetHandleId);
    
    if (sourcePort && targetPort) {
      const validation = validateConnection(sourcePort, targetPort);
      isValid = validation.valid;
      errorMessage = validation.error || '';
    }
  }

  // Edge styling based on validation
  const edgeStyle = isValid 
    ? { stroke: '#6366f1', strokeWidth: 2 }
    : { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' };

  const handleDeleteEdge = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        style={edgeStyle}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-2 bg-background/90 backdrop-blur border rounded px-2 py-1 shadow-sm">
            {!isValid && (
              <div className="text-xs text-red-500 max-w-32 truncate" title={errorMessage}>
                ⚠️ {errorMessage}
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 p-0 hover:bg-destructive/10"
              onClick={handleDeleteEdge}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}