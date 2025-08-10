"use client";

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Crown } from 'lucide-react';
import { BaseNode } from './base-node';
import { AgentNodeData } from '@/lib/types';

export function QueenNode(props: NodeProps) {
  return (
    <BaseNode
      
      data={props.data as unknown as AgentNodeData}
      selected={props.selected}
      icon={<Crown className="w-4 h-4 text-black" />}
      color="bg-amber-500"
    />
  );
}