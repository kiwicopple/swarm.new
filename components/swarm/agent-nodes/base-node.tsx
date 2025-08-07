"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentNodeData } from '@/lib/types';
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

  return (
    <Card className={cn(
      'min-w-[200px] transition-all',
      selected && 'ring-2 ring-primary',
      statusColors[data.status || 'idle'],
      'border-2'
    )}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary"
      />
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
            {JSON.stringify(data.result).substring(0, 50)}...
          </div>
        </CardContent>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary"
      />
    </Card>
  );
}