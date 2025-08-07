"use client";

import React, { useState, useEffect } from 'react';
import { Download, Trash2, CheckCircle, Loader2, AlertCircle, Brain, TestTube } from 'lucide-react';
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
  loaded?: number;
  total?: number;
  error?: string;
}

export function ModelManager() {
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [isVisible, setIsVisible] = useState(false);

  // Helper function to format bytes to MB
  const formatMB = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return '0';
    return (bytes / (1024 * 1024)).toFixed(1);
  };

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
        if (progress.status === 'loading') {
          updateModelStatus(modelId, { 
            status: 'loading', 
            progress: progress.progress || 0,
            loaded: progress.loaded,
            total: progress.total
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

  const handleTestModel = async (modelId: string) => {
    try {
      const config = MODEL_REGISTRY[modelId];
      let testInput = '';
      
      // Choose appropriate test input based on task
      switch (config.task) {
        case 'text-generation':
          testInput = 'The future of AI is';
          break;
        case 'text-classification':
        case 'sentiment-analysis':
          testInput = 'I love this amazing technology!';
          break;
        case 'summarization':
          testInput = 'Artificial intelligence is rapidly advancing. Machine learning models are becoming more sophisticated. They can now perform complex tasks like natural language understanding and generation.';
          break;
        case 'translation':
          testInput = 'Hello, how are you today?';
          break;
        default:
          testInput = 'This is a test input.';
      }
      
      console.log(`Testing model ${modelId} with input: "${testInput}"`);
      const result = await aiService.runInference(modelId, testInput);
      console.log(`Test result for ${modelId}:`, result);
      
      if (result.success) {
        alert(`✅ Model test successful!\n\nModel: ${config.name}\nInput: ${testInput}\nResult: ${JSON.stringify(result.result, null, 2)}`);
      } else {
        alert(`❌ Model test failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`Test failed for ${modelId}:`, error);
      alert(`❌ Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

                          {status.status === 'loading' && (
                            <div className="space-y-1">
                              <Progress 
                                value={
                                  status.loaded && status.total && status.total > 0
                                    ? Math.min(100, (status.loaded / status.total) * 100)
                                    : status.progress || 0
                                } 
                                className="h-1" 
                              />
                              <p className="text-xs text-muted-foreground">
                                {status.loaded && status.total ? (
                                  `${formatMB(status.loaded)} MB / ${formatMB(status.total)} MB`
                                ) : status.progress !== undefined ? (
                                  `${Math.round(status.progress)}% loaded`
                                ) : (
                                  'Loading...'
                                )}
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
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTestModel(model.id)}
                                className="text-xs h-7"
                              >
                                <TestTube className="w-3 h-3 mr-1" />
                                Test
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnloadModel(model.id)}
                                className="text-xs h-7"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Unload
                              </Button>
                            </>
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