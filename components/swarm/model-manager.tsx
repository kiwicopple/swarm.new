"use client";

import React, { useState, useEffect } from 'react';
import { Download, Trash2, CheckCircle, Loader2, AlertCircle, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { aiService } from '@/lib/ai/ai-service';
import { MODEL_REGISTRY, ModelProgress } from '@/lib/ai/model-loader';
import { cn } from '@/lib/utils';

interface ModelStatus {
  id: string;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  progress?: number;
  error?: string;
}

export function ModelManager() {
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Initialize model statuses
    const initialStatuses: Record<string, ModelStatus> = {};
    Object.keys(MODEL_REGISTRY).forEach(modelId => {
      initialStatuses[modelId] = { id: modelId, status: 'idle' };
    });
    setModelStatuses(initialStatuses);
  }, []);

  const updateModelStatus = (modelId: string, updates: Partial<ModelStatus>) => {
    setModelStatuses(prev => ({
      ...prev,
      [modelId]: { ...prev[modelId], ...updates }
    }));
  };

  const handleLoadModel = async (modelId: string) => {
    console.log(`Starting to load model: ${modelId}`);
    updateModelStatus(modelId, { status: 'loading', progress: 0, error: undefined });

    try {
      await aiService.loadModel(modelId, (progress: ModelProgress) => {
        console.log(`Model ${modelId} progress:`, progress);
        if (progress.status === 'loading' && progress.progress !== undefined) {
          updateModelStatus(modelId, { 
            status: 'loading', 
            progress: progress.progress 
          });
        } else if (progress.status === 'error') {
          console.error(`Model ${modelId} loading error:`, progress.error);
          updateModelStatus(modelId, { 
            status: 'error', 
            error: progress.error
          });
        }
      });

      console.log(`Model ${modelId} loaded successfully`);
      updateModelStatus(modelId, { status: 'loaded', progress: 100 });
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      updateModelStatus(modelId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to load model'
      });
    }
  };

  const handleUnloadModel = async (modelId: string) => {
    try {
      await aiService.unloadModel(modelId);
      updateModelStatus(modelId, { status: 'idle', progress: undefined, error: undefined });
    } catch (error) {
      updateModelStatus(modelId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to unload model'
      });
    }
  };

  const getStatusIcon = (status: ModelStatus) => {
    switch (status.status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'loaded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Download className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ModelStatus) => {
    const variants = {
      idle: 'secondary',
      loading: 'default',
      loaded: 'default',
      error: 'destructive'
    } as const;

    const labels = {
      idle: 'Not Loaded',
      loading: 'Loading...',
      loaded: 'Loaded',
      error: 'Error'
    };

    return (
      <Badge variant={variants[status.status]} className="text-xs">
        {labels[status.status]}
      </Badge>
    );
  };

  const getTaskColor = (task: string) => {
    const colors = {
      'text-generation': 'bg-purple-100 text-purple-800',
      'text2text-generation': 'bg-blue-100 text-blue-800',
      'summarization': 'bg-green-100 text-green-800',
      'translation': 'bg-yellow-100 text-yellow-800',
      'text-classification': 'bg-red-100 text-red-800',
      'sentiment-analysis': 'bg-pink-100 text-pink-800',
      'feature-extraction': 'bg-indigo-100 text-indigo-800'
    };
    return colors[task as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const loadedCount = Object.values(modelStatuses).filter(s => s.status === 'loaded').length;
  const loadingCount = Object.values(modelStatuses).filter(s => s.status === 'loading').length;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center gap-2"
      >
        <Brain className="w-4 h-4" />
        Models ({loadedCount} loaded)
        {loadingCount > 0 && (
          <Loader2 className="w-3 h-3 animate-spin" />
        )}
      </Button>

      {/* Model Manager Panel */}
      {isVisible && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsVisible(false)}
          />
          
          {/* Panel */}
          <div className="absolute top-full right-0 mt-2 w-96 max-h-96 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI Model Manager
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                >
                  ×
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Manage AI models for your workflow agents
              </p>
            </div>

            <div className="overflow-y-auto max-h-80">
              <div className="p-4 space-y-3">
                {Object.values(MODEL_REGISTRY).map((model) => {
                  const status = modelStatuses[model.id];
                  if (!status) return null;

                  return (
                    <Card key={model.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(status)}
                            <h4 className="font-medium text-sm truncate">
                              {model.name}
                            </h4>
                            {getStatusBadge(status)}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-2">
                            {model.description}
                          </p>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getTaskColor(model.task))}
                            >
                              {model.task}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {model.size}
                            </span>
                          </div>

                          {status.status === 'loading' && status.progress !== undefined && (
                            <div className="space-y-1">
                              <Progress value={status.progress} className="h-1" />
                              <p className="text-xs text-muted-foreground">
                                {status.progress}% loaded
                              </p>
                            </div>
                          )}

                          {status.error && (
                            <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                              {status.error}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          {status.status === 'idle' || status.status === 'error' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadModel(model.id)}
                              className="text-xs h-7"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Load
                            </Button>
                          ) : status.status === 'loaded' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnloadModel(model.id)}
                              className="text-xs h-7"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Unload
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="p-3 border-t border-border bg-muted/50">
              <p className="text-xs text-muted-foreground">
                Models run locally in your browser. First load may take time.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}