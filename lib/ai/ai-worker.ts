// Web Worker for AI model inference
import { pipeline } from '@xenova/transformers';

// Using unknown type since Pipeline is too restrictive
type PipelineType = unknown;

interface WorkerMessage {
  id: string;
  type: 'load' | 'infer' | 'unload';
  modelId?: string;
  modelPath?: string;
  task?: string;
  input?: unknown;
  options?: unknown;
}

interface WorkerResponse {
  id: string;
  type: 'success' | 'error' | 'progress';
  result?: unknown;
  error?: string;
  progress?: number;
}

class AIWorker {
  private loadedModels: Map<string, PipelineType> = new Map();
  
  async handleMessage(message: WorkerMessage): Promise<WorkerResponse> {
    try {
      switch (message.type) {
        case 'load':
          return await this.loadModel(message);
        case 'infer':
          return await this.runInference(message);
        case 'unload':
          return this.unloadModel(message);
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      return {
        id: message.id,
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async loadModel(message: WorkerMessage): Promise<WorkerResponse> {
    const { id, modelId, modelPath, task } = message;
    
    if (!modelId || !modelPath || !task) {
      throw new Error('Missing required parameters for model loading');
    }
    
    // Check if already loaded
    if (this.loadedModels.has(modelId)) {
      return { id, type: 'success', result: 'Model already loaded' };
    }
    
    // Load model with progress tracking
    const model = await pipeline(task as never, modelPath, {
      progress_callback: (progress: unknown) => {
        if (progress && typeof progress === 'object' && 'progress' in progress) {
          const progressObj = progress as { progress: number };
          self.postMessage({
            id,
            type: 'progress',
            progress: Math.round(progressObj.progress * 100)
          });
        }
      }
    });
    
    this.loadedModels.set(modelId, model);
    
    return {
      id,
      type: 'success',
      result: `Model ${modelId} loaded successfully`
    };
  }
  
  private async runInference(message: WorkerMessage): Promise<WorkerResponse> {
    const { id, modelId, input, options = {} } = message;
    
    if (!modelId || !input) {
      throw new Error('Missing required parameters for inference');
    }
    
    const model = this.loadedModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not loaded`);
    }
    
    // Run inference
    const result = await (model as (input: unknown, options?: unknown) => Promise<unknown>)(input, options);
    
    return {
      id,
      type: 'success',
      result: this.processResult(result)
    };
  }
  
  private unloadModel(message: WorkerMessage): WorkerResponse {
    const { id, modelId } = message;
    
    if (!modelId) {
      throw new Error('Missing modelId for unloading');
    }
    
    this.loadedModels.delete(modelId);
    
    return {
      id,
      type: 'success',
      result: `Model ${modelId} unloaded`
    };
  }
  
  private processResult(result: unknown): unknown {
    // Process different types of model outputs
    if (Array.isArray(result)) {
      return result.map(item => this.processResultItem(item));
    }
    return this.processResultItem(result);
  }
  
  private processResultItem(item: unknown): unknown {
    // Handle different result formats
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      
      // Convert tensors to arrays if needed
      if ('data' in obj && obj.data && typeof obj.data === 'object' && 'length' in (obj.data as object)) {
        return {
          ...obj,
          data: Array.from(obj.data as ArrayLike<unknown>)
        };
      }
      
      // Handle classification results
      if ('label' in obj && 'score' in obj && typeof obj.score === 'number') {
        return {
          label: obj.label,
          score: obj.score,
          confidence: Math.round(obj.score * 100)
        };
      }
      
      // Handle generation results
      if ('generated_text' in obj && typeof obj.generated_text === 'string') {
        return {
          text: obj.generated_text,
          length: obj.generated_text.length
        };
      }
    }
    
    return item;
  }
}

// Initialize worker
const aiWorker = new AIWorker();

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const message: WorkerMessage = event.data;
  const response = await aiWorker.handleMessage(message);
  self.postMessage(response);
});