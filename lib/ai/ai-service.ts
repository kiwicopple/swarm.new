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
  loaded?: number;
  total?: number;
}

class AIService {
  private static instance: AIService;
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: WorkerResponse) => void;
    reject: (reason?: unknown) => void;
    onProgress?: (progress: ModelProgress) => void;
  }>();
  private messageId = 0;
  private loadedModels = new Set<string>();
  private loadingModels = new Set<string>();
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }
  
  private initWorker(): void {
    if (this.worker) return;
    
    if (typeof window === 'undefined') {
      // Server-side: don't initialize worker
      return;
    }
    
    try {
      this.worker = new Worker('/ai-worker.js');
      
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const request = this.pendingRequests.get(response.id);
        
        if (!request) return;
        
        if (response.type === 'progress' && request.onProgress) {
          const progressData: ModelProgress = {
            modelId: '', // Will be filled by caller
            status: 'downloading',
            progress: response.progress || 0,
            loaded: response.loaded || 0,
            total: response.total || 0
          };
          request.onProgress(progressData);
          return;
        }
        
        if (response.type === 'success' || response.type === 'error') {
          this.pendingRequests.delete(response.id);
          request.resolve(response);
        }
      };
      
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker error'));
        });
        this.pendingRequests.clear();
        this.worker = null;
      };
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      this.worker = null;
    }
  }
  
  private async sendMessage(message: Omit<WorkerMessage, 'id'>, onProgress?: (progress: ModelProgress) => void): Promise<WorkerResponse> {
    this.initWorker();
    
    if (!this.worker) {
      throw new Error('Worker not available. Running in server environment or worker failed to initialize.');
    }
    
    const id = (++this.messageId).toString();
    const fullMessage: WorkerMessage = { ...message, id };
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onProgress });
      this.worker!.postMessage(fullMessage);
    });
  }
  
  async loadModel(
    modelId: string,
    onProgress?: (progress: ModelProgress) => void
  ): Promise<void> {
    if (this.loadedModels.has(modelId)) {
      return; // Already loaded
    }
    
    if (this.loadingModels.has(modelId)) {
      throw new Error(`Model ${modelId} is already loading`);
    }
    
    const modelConfig = MODEL_REGISTRY[modelId];
    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found in registry`);
    }
    
    this.loadingModels.add(modelId);
    
    try {
      const progressCallback = onProgress ? (progress: ModelProgress) => {
        progress.modelId = modelId;
        onProgress(progress);
      } : undefined;
      
      const response = await this.sendMessage({
        type: 'load',
        modelId,
        modelPath: modelConfig.id,
        task: modelConfig.task
      }, progressCallback);
      
      if (response.type === 'error') {
        throw new Error(response.error || 'Failed to load model');
      }
      
      this.loadedModels.add(modelId);
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    } finally {
      this.loadingModels.delete(modelId);
    }
  }
  
  async runInference(
    modelId: string,
    input: string | string[],
    options: InferenceOptions = {}
  ): Promise<InferenceResult> {
    const startTime = Date.now();
    
    try {
      if (!this.loadedModels.has(modelId)) {
        throw new Error(`Model ${modelId} is not loaded. Please load it first.`);
      }
      
      // Process options for transformers.js format
      const processedOptions = this.processOptions(options);
      
      const response = await this.sendMessage({
        type: 'infer',
        modelId,
        input,
        options: processedOptions
      });
      
      if (response.type === 'error') {
        throw new Error(response.error || 'Inference failed');
      }
      
      return {
        success: true,
        result: response.result,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Inference error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }
  
  async unloadModel(modelId: string): Promise<void> {
    try {
      if (!this.loadedModels.has(modelId)) {
        return; // Already unloaded
      }
      
      const response = await this.sendMessage({
        type: 'unload',
        modelId
      });
      
      if (response.type === 'error') {
        console.error('Failed to unload model:', response.error);
      }
      
      this.loadedModels.delete(modelId);
    } catch (error) {
      console.error('Error unloading model:', error);
      // Still remove from our tracking
      this.loadedModels.delete(modelId);
    }
  }
  
  isModelLoaded(modelId: string): boolean {
    return this.loadedModels.has(modelId);
  }
  
  isModelLoading(modelId: string): boolean {
    return this.loadingModels.has(modelId);
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
    // Unload all models
    const modelIds = Array.from(this.loadedModels);
    modelIds.forEach(modelId => {
      this.unloadModel(modelId).catch(error => {
        console.error(`Failed to unload model ${modelId}:`, error);
      });
    });
    
    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Clear pending requests
    this.pendingRequests.clear();
  }
}

export const aiService = AIService.getInstance();
export default aiService;
export type { InferenceOptions, InferenceResult };