import { pipeline } from '@xenova/transformers';

// Using unknown type since Pipeline is too restrictive
type PipelineType = unknown;

export interface ModelProgress {
  status: 'loading' | 'loaded' | 'error';
  progress?: number;
  loaded?: number;
  total?: number;
  file?: string;
  error?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  task: 'text-generation' | 'text2text-generation' | 'summarization' | 'translation' | 'text-classification' | 'sentiment-analysis' | 'feature-extraction';
  description: string;
  size: string;
}

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // Text Generation
  'gpt2': {
    id: 'gpt2',
    name: 'GPT-2',
    modelId: 'Xenova/gpt2',
    task: 'text-generation',
    description: 'General purpose text generation',
    size: '500MB'
  },
  'distilgpt2': {
    id: 'distilgpt2',
    name: 'DistilGPT-2',
    modelId: 'Xenova/distilgpt2',
    task: 'text-generation',
    description: 'Smaller, faster GPT-2',
    size: '200MB'
  },
  
  // Summarization
  'bart-summary': {
    id: 'bart-summary',
    name: 'BART Summarization',
    modelId: 'Xenova/distilbart-cnn-6-6',
    task: 'summarization',
    description: 'Text summarization model',
    size: '300MB'
  },
  
  // Translation
  'nllb': {
    id: 'nllb',
    name: 'NLLB Translation',
    modelId: 'Xenova/nllb-200-distilled-600M',
    task: 'translation',
    description: 'Multi-language translation',
    size: '600MB'
  },
  
  // Classification
  'sentiment': {
    id: 'sentiment',
    name: 'Sentiment Analysis',
    modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    task: 'text-classification',
    description: 'Sentiment analysis (positive/negative)',
    size: '250MB'
  },
  'classification': {
    id: 'classification',
    name: 'Text Classification',
    modelId: 'Xenova/bert-base-uncased',
    task: 'text-classification',
    description: 'General text classification',
    size: '400MB'
  },
  
  // Embeddings
  'embeddings': {
    id: 'embeddings',
    name: 'Sentence Embeddings',
    modelId: 'Xenova/all-MiniLM-L6-v2',
    task: 'feature-extraction',
    description: 'Text embeddings for similarity',
    size: '80MB'
  }
};

class ModelLoader {
  private static instance: ModelLoader;
  private loadedModels: Map<string, PipelineType> = new Map();
  private loadingPromises: Map<string, Promise<PipelineType>> = new Map();
  private progressCallbacks: Map<string, (progress: ModelProgress) => void> = new Map();
  
  static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }
  
  async loadModel(
    modelId: string, 
    onProgress?: (progress: ModelProgress) => void
  ): Promise<PipelineType> {
    console.log(`ModelLoader: Loading model ${modelId}`);
    
    // Check if model is already loaded
    if (this.loadedModels.has(modelId)) {
      console.log(`ModelLoader: Model ${modelId} already loaded`);
      return this.loadedModels.get(modelId)!;
    }
    
    // Check if model is already loading
    if (this.loadingPromises.has(modelId)) {
      console.log(`ModelLoader: Model ${modelId} already loading`);
      return this.loadingPromises.get(modelId)!;
    }
    
    const config = MODEL_REGISTRY[modelId];
    if (!config) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    console.log(`ModelLoader: Config found for ${modelId}:`, config);
    
    // Store progress callback
    if (onProgress) {
      this.progressCallbacks.set(modelId, onProgress);
    }
    
    // Start loading
    const loadingPromise = this.loadModelInternal(config);
    this.loadingPromises.set(modelId, loadingPromise);
    
    try {
      const model = await loadingPromise;
      this.loadedModels.set(modelId, model);
      this.progressCallbacks.delete(modelId);
      this.loadingPromises.delete(modelId);
      
      if (onProgress) {
        onProgress({ status: 'loaded' });
      }
      
      return model;
    } catch (error) {
      this.progressCallbacks.delete(modelId);
      this.loadingPromises.delete(modelId);
      
      if (onProgress) {
        onProgress({ 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  }
  
  private async loadModelInternal(config: ModelConfig): Promise<PipelineType> {
    console.log(`ModelLoader: Starting internal load for ${config.id}`);
    const onProgress = this.progressCallbacks.get(config.id);
    
    if (onProgress) {
      onProgress({ status: 'loading', progress: 0 });
    }
    
    try {
      console.log(`ModelLoader: Creating pipeline for task '${config.task}' with model '${config.modelId}'`);
      
      // Create pipeline with progress callback
      const model = await pipeline(config.task, config.modelId, {
      progress_callback: (progress: unknown) => {
        if (onProgress && progress && typeof progress === 'object' && 'progress' in progress) {
          const progressObj = progress as { progress?: number; loaded?: number; total?: number; file?: string };
          const progressPercent = progressObj.progress ? Math.round(progressObj.progress * 100) : 0;
          onProgress({
            status: 'loading',
            progress: progressPercent,
            loaded: progressObj.loaded,
            total: progressObj.total,
            file: progressObj.file
          });
        }
      }
    });
    
    console.log(`ModelLoader: Pipeline created successfully for ${config.id}`);
    return model;
    } catch (error) {
      console.error(`ModelLoader: Failed to create pipeline for ${config.id}:`, error);
      throw error;
    }
  }
  
  getLoadedModel(modelId: string): PipelineType | null {
    return this.loadedModels.get(modelId) || null;
  }
  
  isModelLoaded(modelId: string): boolean {
    return this.loadedModels.has(modelId);
  }
  
  isModelLoading(modelId: string): boolean {
    return this.loadingPromises.has(modelId);
  }
  
  unloadModel(modelId: string): void {
    const model = this.loadedModels.get(modelId);
    if (model) {
      // Clean up model resources if possible
      this.loadedModels.delete(modelId);
    }
  }
  
  unloadAllModels(): void {
    this.loadedModels.clear();
    this.loadingPromises.clear();
    this.progressCallbacks.clear();
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
}

export const modelLoader = ModelLoader.getInstance();
export default modelLoader;