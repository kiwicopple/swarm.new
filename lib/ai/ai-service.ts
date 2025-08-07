import { ModelProgress, ModelConfig, MODEL_REGISTRY } from './model-loader';

interface InferenceOptions {
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  numBeams?: number;
  doSample?: boolean;
  srcLang?: string;
  tgtLang?: string;
  maxLength?: number;
  minLength?: number;
}

interface InferenceResult {
  success: boolean;
  result?: unknown;
  error?: string;
  processingTime?: number;
}

class AIService {
  private static instance: AIService;
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: ModelProgress) => void;
  }> = new Map();
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }
  
  private initWorker() {
    if (this.worker) return;
    
    // Create worker from the ai-worker.ts file
    const workerCode = `
      ${this.getWorkerCode()}
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    
    this.worker.onmessage = (event) => {
      const response = event.data;
      const request = this.pendingRequests.get(response.id);
      
      if (!request) return;
      
      if (response.type === 'progress') {
        request.onProgress?.({
          status: 'loading',
          progress: response.progress
        });
      } else {
        this.pendingRequests.delete(response.id);
        
        if (response.type === 'success') {
          request.resolve(response.result);
        } else {
          request.reject(new Error(response.error));
        }
      }
    };
    
    this.worker.onerror = (error) => {
      console.error('AI Worker error:', error);
      // Reject all pending requests
      for (const [, request] of this.pendingRequests) {
        request.reject(new Error('Worker error'));
      }
      this.pendingRequests.clear();
    };
  }
  
  private getWorkerCode(): string {
    // In a real implementation, you'd import this from the worker file
    // For now, we'll embed the worker code directly
    return `
      importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.10.0/dist/transformers.min.js');
      
      class AIWorker {
        constructor() {
          this.loadedModels = new Map();
        }
        
        async handleMessage(message) {
          try {
            switch (message.type) {
              case 'load':
                return await this.loadModel(message);
              case 'infer':
                return await this.runInference(message);
              case 'unload':
                return this.unloadModel(message);
              default:
                throw new Error('Unknown message type: ' + message.type);
            }
          } catch (error) {
            return {
              id: message.id,
              type: 'error',
              error: error.message || 'Unknown error'
            };
          }
        }
        
        async loadModel(message) {
          const { id, modelId, modelPath, task } = message;
          
          if (this.loadedModels.has(modelId)) {
            return { id, type: 'success', result: 'Model already loaded' };
          }
          
          const model = await Transformers.pipeline(task, modelPath, {
            progress_callback: (progress) => {
              if (progress?.progress) {
                self.postMessage({
                  id,
                  type: 'progress',
                  progress: Math.round(progress.progress * 100)
                });
              }
            }
          });
          
          this.loadedModels.set(modelId, model);
          return { id, type: 'success', result: 'Model loaded successfully' };
        }
        
        async runInference(message) {
          const { id, modelId, input, options = {} } = message;
          
          const model = this.loadedModels.get(modelId);
          if (!model) {
            throw new Error('Model ' + modelId + ' not loaded');
          }
          
          const result = await model(input, options);
          return { id, type: 'success', result };
        }
        
        unloadModel(message) {
          const { id, modelId } = message;
          this.loadedModels.delete(modelId);
          return { id, type: 'success', result: 'Model unloaded' };
        }
      }
      
      const aiWorker = new AIWorker();
      
      self.addEventListener('message', async (event) => {
        const message = event.data;
        const response = await aiWorker.handleMessage(message);
        self.postMessage(response);
      });
    `;
  }
  
  private sendMessage(message: Record<string, unknown>, onProgress?: (progress: ModelProgress) => void): Promise<unknown> {
    this.initWorker();
    
    const id = `msg_${++this.messageId}`;
    message.id = id;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onProgress });
      this.worker!.postMessage(message);
    });
  }
  
  async loadModel(
    modelId: string,
    onProgress?: (progress: ModelProgress) => void
  ): Promise<void> {
    const config = MODEL_REGISTRY[modelId];
    if (!config) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    
    await this.sendMessage({
      type: 'load',
      modelId,
      modelPath: config.modelId,
      task: config.task
    }, onProgress);
  }
  
  async runInference(
    modelId: string,
    input: string | string[],
    options: InferenceOptions = {}
  ): Promise<InferenceResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.sendMessage({
        type: 'infer',
        modelId,
        input,
        options: this.processOptions(options)
      });
      
      return {
        success: true,
        result,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }
  
  async unloadModel(modelId: string): Promise<void> {
    await this.sendMessage({
      type: 'unload',
      modelId
    });
  }
  
  private processOptions(options: InferenceOptions): Record<string, unknown> {
    const processed: Record<string, unknown> = {};
    
    // Map our options to transformers.js format
    if (options.maxTokens !== undefined) {
      processed.max_new_tokens = options.maxTokens;
    }
    
    if (options.temperature !== undefined) {
      processed.temperature = options.temperature;
    }
    
    if (options.topK !== undefined) {
      processed.top_k = options.topK;
    }
    
    if (options.topP !== undefined) {
      processed.top_p = options.topP;
    }
    
    if (options.numBeams !== undefined) {
      processed.num_beams = options.numBeams;
    }
    
    if (options.doSample !== undefined) {
      processed.do_sample = options.doSample;
    }
    
    if (options.srcLang !== undefined) {
      processed.src_lang = options.srcLang;
    }
    
    if (options.tgtLang !== undefined) {
      processed.tgt_lang = options.tgtLang;
    }
    
    if (options.maxLength !== undefined) {
      processed.max_length = options.maxLength;
    }
    
    if (options.minLength !== undefined) {
      processed.min_length = options.minLength;
    }
    
    return processed;
  }
  
  getModelInfo(modelId: string): ModelConfig | null {
    return MODEL_REGISTRY[modelId] || null;
  }
  
  getAllModels(): ModelConfig[] {
    return Object.values(MODEL_REGISTRY);
  }
  
  getModelsByTask(task: string): ModelConfig[] {
    return Object.values(MODEL_REGISTRY).filter(model => model.task === task);
  }
  
  cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

export const aiService = AIService.getInstance();
export default aiService;
export type { InferenceOptions, InferenceResult };