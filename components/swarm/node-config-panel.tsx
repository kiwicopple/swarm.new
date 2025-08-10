"use client";

import React, { useEffect, useState } from 'react';
import { X, Settings, Bug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectOption } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSwarmStore } from '@/lib/storage/swarm-store';
import { AGENT_CONFIGS, ConfigField } from '@/lib/agent-configs';
import { cn } from '@/lib/utils';

export function NodeConfigPanel() {
  const { selectedNodeId, getSelectedNode, updateNodeConfig, setSelectedNode } = useSwarmStore();
  const selectedNode = getSelectedNode();
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!!selectedNodeId);
    if (selectedNode) {
      setConfig(selectedNode.data.config || {});
    } else {
      setConfig({});
    }
  }, [selectedNodeId, selectedNode]);

  const handleClose = () => {
    setSelectedNode(null);
    setIsOpen(false);
  };

  const handleConfigChange = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    if (selectedNodeId) {
      updateNodeConfig(selectedNodeId, newConfig);
    }
  };

  const renderField = (field: ConfigField) => {
    const value = config[field.key] ?? field.defaultValue ?? '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value as string}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value as string}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );
      
      case 'select':
        return (
          <Select
            value={value as string}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
          >
            {field.options?.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </Select>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => handleConfigChange(field.key, parseFloat(e.target.value) || 0)}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value as boolean}
              onCheckedChange={(checked) => handleConfigChange(field.key, checked)}
            />
            <span className="text-sm">Enabled</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!selectedNode) return null;

  const agentConfig = AGENT_CONFIGS[selectedNode.data.agentType];
  const agentTypeColors = {
    scout: 'bg-yellow-400',
    worker: 'bg-orange-400',
    queen: 'bg-amber-500',
    builder: 'bg-yellow-500',
    guard: 'bg-yellow-600',
    messenger: 'bg-amber-600',
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={handleClose}
        />
      )}
      
      {/* Sliding Panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-96 bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded', agentTypeColors[selectedNode.data.agentType])}>
                <Settings className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="font-semibold">{selectedNode.data.name}</h3>
                <p className="text-sm text-muted-foreground">{agentConfig.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Agent Description */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  About This Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {agentConfig.description}
              </CardContent>
            </Card>

            {/* Node Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Node Name</label>
              <Input
                value={selectedNode.data.name}
                onChange={() => {
                  // This would need to update the node's name directly
                  // We'll implement this in the next iteration
                }}
                placeholder="Enter node name"
              />
            </div>

            {/* Configuration Fields */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold border-b border-border pb-2">Configuration</h4>
              {agentConfig.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                  </div>
                  {renderField(field)}
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Debug Info */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Debug Info</CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <div className="space-y-1">
                  <div><strong>Node ID:</strong> {selectedNode.id}</div>
                  <div><strong>Type:</strong> {selectedNode.data.agentType}</div>
                  <div><strong>Status:</strong> {selectedNode.data.status || 'idle'}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}