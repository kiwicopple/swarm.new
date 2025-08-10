"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentNodeData } from '@/lib/types';
import { AGENT_PORTS } from '@/lib/types/data-flow';
import { cn } from '@/lib/utils';

interface BaseNodeProps {
  data: AgentNodeData;
  icon: React.ReactNode;
  color: string;
  selected?: boolean;
}

export function BaseNode({ data, icon, color, selected }: BaseNodeProps) {
  const statusColors = {
    idle: 'border-gray-300',
    running: 'border-yellow-500 animate-pulse',
    success: 'border-green-500',
    error: 'border-red-500',
  };

  const agentPorts = AGENT_PORTS[data.agentType];
  const inputPorts = agentPorts?.inputs || [];
  const outputPorts = agentPorts?.outputs || [];

  // Type colors for ports
  const getPortColor = (type: string) => {
    const colors = {
      text: 'bg-blue-500',
      number: 'bg-green-500',
      boolean: 'bg-purple-500',
      object: 'bg-orange-500',
      array: 'bg-pink-500',
      file: 'bg-gray-500',
      url: 'bg-cyan-500',
      json: 'bg-yellow-500',
      any: 'bg-slate-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-400';
  };

  return (
    <div className="relative">
      <Card className={cn(
        'min-w-[220px] transition-all relative',
        selected && 'ring-2 ring-primary',
        statusColors[data.status || 'idle'],
        'border-2'
      )}>
        <CardHeader className="p-3">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded', color)}>
              {icon}
            </div>
            <CardTitle className="text-sm">{data.name}</CardTitle>
          </div>
        </CardHeader>
        
        {data.result !== undefined && data.result !== null && (
          <CardContent className="p-3 pt-0">
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Status: {data.result.status}
              {data.result.error && (
                <div className="text-red-500 mt-1">{data.result.error}</div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Input Ports */}
      <div className="absolute left-0 top-12 -ml-2 space-y-2">
        {inputPorts.map((port, index) => (
          <div key={port.id} className="flex items-center">
            <Handle
              type="target"
              position={Position.Left}
              id={port.id}
              className={cn(
                'w-3 h-3 rounded-full border-2 border-white',
                getPortColor(port.type)
              )}
              style={{ 
                top: `${60 + index * 30}px`,
                left: '0px'
              }}
            />
            <div className="ml-3 text-xs bg-background/90 px-1 py-0.5 rounded border whitespace-nowrap">
              <div className="font-medium">{port.name}</div>
              <div className="text-muted-foreground">{port.type}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Output Ports */}
      <div className="absolute right-0 top-12 -mr-2 space-y-2">
        {outputPorts.map((port, index) => (
          <div key={port.id} className="flex items-center justify-end">
            <div className="mr-3 text-xs bg-background/90 px-1 py-0.5 rounded border whitespace-nowrap text-right">
              <div className="font-medium">{port.name}</div>
              <div className="text-muted-foreground">{port.type}</div>
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id={port.id}
              className={cn(
                'w-3 h-3 rounded-full border-2 border-white',
                getPortColor(port.type)
              )}
              style={{ 
                top: `${60 + index * 30}px`,
                right: '0px'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}