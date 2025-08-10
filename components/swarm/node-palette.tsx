"use client";

import React from 'react';
import { Search, Hammer, Crown, Wrench, Shield, Send } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const nodeTypes = [
  {
    type: 'scout',
    label: 'Scout Bee',
    icon: Search,
    description: 'Input & data fetching',
    color: 'bg-yellow-400',
  },
  {
    type: 'worker',
    label: 'Worker Bee',
    icon: Hammer,
    description: 'Processing & transformation',
    color: 'bg-orange-400',
  },
  {
    type: 'queen',
    label: 'Queen Bee',
    icon: Crown,
    description: 'Decision making',
    color: 'bg-amber-500',
  },
  {
    type: 'builder',
    label: 'Builder Bee',
    icon: Wrench,
    description: 'Content generation',
    color: 'bg-yellow-500',
  },
  {
    type: 'guard',
    label: 'Guard Bee',
    icon: Shield,
    description: 'Validation & filtering',
    color: 'bg-yellow-600',
  },
  {
    type: 'messenger',
    label: 'Messenger Bee',
    icon: Send,
    description: 'Output & communication',
    color: 'bg-amber-600',
  },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-secondary/10 border-r border-border p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Agent Bees</h3>
      <div className="space-y-2">
        {nodeTypes.map((node) => {
          const Icon = node.icon;
          return (
            <Card
              key={node.type}
              className="cursor-move hover:shadow-md transition-shadow"
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
            >
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${node.color}`}>
                    <Icon className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{node.label}</CardTitle>
                    <CardDescription className="text-xs">
                      {node.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 text-xs text-muted-foreground">
        <p>Drag agents to the canvas to add them to your workflow</p>
      </div>
    </div>
  );
}