// Web Worker for AI model inference
let transformersLoaded = false;
let transformersError = null;

// Try to import Transformers.js via CDN
try {
  importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js');
  transformersLoaded = true;
  console.log('Transformers.js loaded successfully in worker');
} catch (error) {
  transformersError = error.message;
  console.error('Failed to load Transformers.js in worker:', error);
}

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
        case 'ping':
          return { 
            id: message.id, 
            type: 'success', 
            result: {
              status: 'pong',
              transformersLoaded,
              transformersError
            }
          };
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
  
  async loadModel(message) {
    const { id, modelId, modelPath, task } = message;
    
    if (!modelId || !modelPath || !task) {
      throw new Error('Missing required parameters for model loading');
    }
    
    // Check if already loaded
    if (this.loadedModels.has(modelId)) {
      return { id, type: 'success', result: 'Model already loaded' };
    }
    
    // Load model with progress tracking
    const model = await pipeline(task, modelPath, {
      progress_callback: (progress) => {
        if (progress && typeof progress === 'object') {
          // Handle different progress formats from Transformers.js
          let progressValue = 0;
          if ('progress' in progress && typeof progress.progress === 'number') {
            progressValue = progress.progress;
          } else if ('loaded' in progress && 'total' in progress && progress.total > 0) {
            progressValue = progress.loaded / progress.total;
          }
          
          self.postMessage({
            id,
            type: 'progress',
            progress: Math.round(progressValue * 100),
            loaded: progress.loaded || 0,
            total: progress.total || 0
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
  
  async runInference(message) {
    const { id, modelId, input, options = {} } = message;
    
    if (!modelId || input === undefined) {
      throw new Error('Missing required parameters for inference');
    }
    
    const model = this.loadedModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not loaded`);
    }
    
    // Run inference
    const result = await model(input, options);
    
    return {
      id,
      type: 'success',
      result: this.processResult(result)
    };
  }
  
  unloadModel(message) {
    const { id, modelId } = message;
    
    if (!modelId) {
      throw new Error('Missing modelId for unloading');
    }
    
    // Dispose model if it has a dispose method
    const model = this.loadedModels.get(modelId);
    if (model && typeof model.dispose === 'function') {
      model.dispose();
    }
    
    this.loadedModels.delete(modelId);
    
    return {
      id,
      type: 'success',
      result: `Model ${modelId} unloaded`
    };
  }
  
  processResult(result) {
    // Process different types of model outputs
    if (Array.isArray(result)) {
      return result.map(item => this.processResultItem(item));
    }
    return this.processResultItem(result);
  }
  
  processResultItem(item) {
    // Handle different result formats
    if (item && typeof item === 'object') {
      // Convert tensors to arrays if needed
      if (item.data && typeof item.data === 'object' && typeof item.data.length === 'number') {
        return {
          ...item,
          data: Array.from(item.data)
        };
      }
      
      // Handle classification results
      if (item.label !== undefined && typeof item.score === 'number') {
        return {
          label: item.label,
          score: item.score,
          confidence: Math.round(item.score * 100)
        };
      }
      
      // Handle generation results
      if (typeof item.generated_text === 'string') {
        return {
          text: item.generated_text,
          length: item.generated_text.length
        };
      }
      
      // Handle summarization results
      if (typeof item.summary_text === 'string') {
        return {
          text: item.summary_text,
          length: item.summary_text.length
        };
      }
      
      // Handle translation results
      if (typeof item.translation_text === 'string') {
        return {
          text: item.translation_text,
          length: item.translation_text.length
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
  const message = event.data;
  const response = await aiWorker.handleMessage(message);
  self.postMessage(response);
});