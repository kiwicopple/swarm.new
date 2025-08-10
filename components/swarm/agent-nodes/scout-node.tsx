"use client";

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Search } from 'lucide-react';
import { BaseNode } from './base-node';
import { AgentNodeData } from '@/lib/types';

export function ScoutNode(props: NodeProps) {
  return (
    <BaseNode
      data={props.data as unknown as AgentNodeData}
      selected={props.selected}
      icon={<Search className="w-4 h-4 text-black" />}
      color="bg-yellow-400"
    />
  );
}