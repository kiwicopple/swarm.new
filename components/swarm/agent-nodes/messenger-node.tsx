"use client";

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Send } from 'lucide-react';
import { BaseNode } from './base-node';
import { AgentNodeData } from '@/lib/types';

export function MessengerNode(props: NodeProps) {
  return (
    <BaseNode
      
      data={props.data as unknown as AgentNodeData}
      selected={props.selected}
      icon={<Send className="w-4 h-4 text-black" />}
      color="bg-amber-600"
    />
  );
}