"use client";

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Shield } from 'lucide-react';
import { BaseNode } from './base-node';
import { AgentNodeData } from '@/lib/types';

export function GuardNode(props: NodeProps) {
  return (
    <BaseNode
      
      data={props.data as unknown as AgentNodeData}
      selected={props.selected}
      icon={<Shield className="w-4 h-4 text-black" />}
      color="bg-yellow-600"
    />
  );
}