import { ModelProgress, ModelConfig, MODEL_REGISTRY, modelLoader } from './model-loader';

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
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }
  
  async loadModel(
    modelId: string,
    onProgress?: (progress: ModelProgress) => void
  ): Promise<void> {
    try {
      await modelLoader.loadModel(modelId, onProgress);
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }
  
  async runInference(
    modelId: string,
    input: string | string[],
    options: InferenceOptions = {}
  ): Promise<InferenceResult> {
    const startTime = Date.now();
    
    try {
      // Get the loaded model
      const model = modelLoader.getLoadedModel(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} is not loaded. Please load it first.`);
      }
      
      // Process options for transformers.js format
      const processedOptions = this.processOptions(options);
      
      // Run inference directly on main thread
      const result = await this.executeModel(model, input, processedOptions);
      
      return {
        success: true,
        result: this.processResult(result),
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
  
  private async executeModel(model: unknown, input: string | string[], options: Record<string, unknown>): Promise<unknown> {
    // Type assertion for the model function call
    const modelFn = model as (input: string | string[], options?: Record<string, unknown>) => Promise<unknown>;
    return await modelFn(input, options);
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
      
      // Handle summarization results
      if ('summary_text' in obj && typeof obj.summary_text === 'string') {
        return {
          text: obj.summary_text,
          length: obj.summary_text.length
        };
      }
      
      // Handle translation results
      if ('translation_text' in obj && typeof obj.translation_text === 'string') {
        return {
          text: obj.translation_text,
          length: obj.translation_text.length
        };
      }
      
      // Handle embeddings (feature extraction)
      if ('data' in obj && Array.isArray(obj.data)) {
        return {
          embeddings: obj.data,
          dimensions: obj.data.length
        };
      }
    }
    
    return item;
  }
  
  async unloadModel(modelId: string): Promise<void> {
    modelLoader.unloadModel(modelId);
  }
  
  isModelLoaded(modelId: string): boolean {
    return modelLoader.isModelLoaded(modelId);
  }
  
  isModelLoading(modelId: string): boolean {
    return modelLoader.isModelLoading(modelId);
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
    modelLoader.unloadAllModels();
  }
}

export const aiService = AIService.getInstance();
export default aiService;
export type { InferenceOptions, InferenceResult };