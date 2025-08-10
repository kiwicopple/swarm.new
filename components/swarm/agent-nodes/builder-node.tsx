"use client";

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import { BaseNode } from './base-node';
import { AgentNodeData } from '@/lib/types';

export function BuilderNode(props: NodeProps) {
  return (
    <BaseNode
      
      data={props.data as unknown as AgentNodeData}
      selected={props.selected}
      icon={<Wrench className="w-4 h-4 text-black" />}
      color="bg-yellow-500"
    />
  );
}