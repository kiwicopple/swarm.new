"use client";

import React from 'react';
import { Play, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExecutionPanelProps {
  isExecuting: boolean;
  onExecute: () => void;
  onSave: () => void;
}

export function ExecutionPanel({ isExecuting, onExecute, onSave }: ExecutionPanelProps) {
  return (
    <div className="flex gap-2 bg-background/95 backdrop-blur rounded-lg p-2 shadow-lg border">
      <Button
        onClick={onSave}
        size="sm"
        variant="outline"
      >
        <Save className="w-4 h-4 mr-2" />
        Save
      </Button>
      <Button
        onClick={onExecute}
        size="sm"
        disabled={isExecuting}
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Execute
          </>
        )}
      </Button>
    </div>
  );
}