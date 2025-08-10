/**
 * Node Executor - Async execution handlers for different bee agent types
 * Integrates with AI service and handles agent-specific logic
 */

import { ExecutionContext, ExecutionHandler } from './execution-queue';
import { NodeResult, DataPayload, DataType, AgentType } from '@/lib/types';
import { aiService } from '@/lib/ai/ai-service';

interface NodeConfig {
  inputType?: string;
  inputValue?: unknown;
  operationType?: string;
  decisionType?: string;
  validationType?: string;
  outputFormat?: string;
  categories?: string[];
  minLength?: number;
  maxLength?: number;
  requiredFields?: string[];
  [key: string]: unknown;
}

interface ValidationReport {
  nodeId: string;
  validatedAt: string;
  validationType: string;
  passed: boolean;
  errors: unknown[];
  warnings: unknown[];
}

interface ExportInfo {
  format: string;
  exportedAt: string;
  dataSize: number;
  pretty?: boolean;
  [key: string]: unknown;
}

/**
 * Base class for agent executors
 */
abstract class BaseAgentExecutor {
  abstract execute(context: ExecutionContext): Promise<NodeResult>;

  /**
   * Create output payload
   */
  protected createOutput(context: ExecutionContext, portId: string, value: unknown, type: string): DataPayload {
    return {
      id: `${context.nodeId}_${portId}_${Date.now()}`,
      type: type as DataType,
      value,
      metadata: {
        source: context.nodeId,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Get input value by port name
   */
  protected getInput(context: ExecutionContext, portName: string): unknown {
    const entry = Object.entries(context.inputs).find(([key]) => key === portName);
    return entry ? entry[1].value : undefined;
  }

  /**
   * Create error result
   */
  protected createError(context: ExecutionContext, error: string): NodeResult {
    return {
      nodeId: context.nodeId,
      outputs: {},
      status: 'error',
      error,
      executionTime: 0
    };
  }
}

/**
 * Scout Bee - Data Collection and Input Processing
 */
class ScoutExecutor extends BaseAgentExecutor {
  async execute(context: ExecutionContext): Promise<NodeResult> {
    const startTime = Date.now();
    
    try {
      const config = context.config as NodeConfig;
      const inputType = config?.inputType || 'text';
      const inputValue = config?.inputValue || this.getInput(context, 'trigger');

      let collectedData: unknown;
      let metadata: Record<string, unknown>;

      switch (inputType) {
        case 'text':
          collectedData = { content: inputValue, type: 'text' };
          metadata = { wordCount: String(inputValue).length };
          break;

        case 'url':
          // In a real implementation, you'd fetch URL content
          collectedData = { url: inputValue, content: `Content from ${inputValue}` };
          metadata = { sourceUrl: inputValue, fetchedAt: new Date().toISOString() };
          break;

        case 'file':
          // In a real implementation, you'd read file content
          collectedData = { filename: inputValue, content: `Content of ${inputValue}` };
          metadata = { filename: inputValue, size: 1024 };
          break;

        case 'api':
          // In a real implementation, you'd make API call
          const apiUrl = config.apiUrl || 'https://api.example.com';
          collectedData = { 
            apiResponse: `Response from ${apiUrl}`,
            data: { items: [], total: 0 }
          };
          metadata = { apiUrl, requestedAt: new Date().toISOString() };
          break;

        default:
          return this.createError(context, `Unknown input type: ${inputType}`);
      }

      return {
        nodeId: context.nodeId,
        outputs: {
          collected_data: this.createOutput(context, 'collected_data', collectedData, 'object'),
          metadata: this.createOutput(context, 'metadata', metadata, 'object')
        },
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createError(context, error instanceof Error ? error.message : 'Scout execution failed');
    }
  }
}

/**
 * Worker Bee - Data Processing and Transformation
 */
class WorkerExecutor extends BaseAgentExecutor {
  async execute(context: ExecutionContext): Promise<NodeResult> {
    const startTime = Date.now();
    
    try {
      const inputData = this.getInput(context, 'input_data');
      const config = context.config as NodeConfig;
      const operationType = config?.operationType || 'transform';
      
      let processedData: unknown;
      const processingLog: string[] = [];

      processingLog.push(`Starting ${operationType} operation`);

      switch (operationType) {
        case 'transform':
          processedData = await this.transformData(inputData, config, processingLog);
          break;

        case 'filter':
          processedData = await this.filterData(inputData, config, processingLog);
          break;

        case 'aggregate':
          processedData = await this.aggregateData(inputData, config, processingLog);
          break;

        case 'analyze':
          processedData = await this.analyzeWithAI(inputData, context, processingLog);
          break;

        default:
          return this.createError(context, `Unknown operation type: ${operationType}`);
      }

      processingLog.push('Processing completed successfully');

      return {
        nodeId: context.nodeId,
        outputs: {
          processed_data: this.createOutput(context, 'processed_data', processedData, 'object'),
          processing_log: this.createOutput(context, 'processing_log', processingLog, 'array')
        },
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createError(context, error instanceof Error ? error.message : 'Worker execution failed');
    }
  }

  private async transformData(data: unknown, config: unknown, log: string[]): Promise<unknown> {
    log.push('Applying data transformations');
    // Simple transformation logic
    if (typeof data === 'object' && data !== null) {
      return {
        ...data as object,
        transformed: true,
        transformedAt: new Date().toISOString()
      };
    }
    return { original: data, transformed: true };
  }

  private async filterData(data: unknown, config: unknown, log: string[]): Promise<unknown> {
    log.push('Applying data filters');
    // Simple filtering logic
    if (Array.isArray(data)) {
      return data.filter(item => item !== null && item !== undefined);
    }
    return data;
  }

  private async aggregateData(data: unknown, config: unknown, log: string[]): Promise<unknown> {
    log.push('Aggregating data');
    if (Array.isArray(data)) {
      return {
        count: data.length,
        summary: `Aggregated ${data.length} items`
      };
    }
    return { count: 1, summary: 'Single item aggregated' };
  }

  private async analyzeWithAI(data: unknown, context: ExecutionContext, log: string[]): Promise<unknown> {
    if (!context.model) {
      throw new Error('No AI model specified for analysis');
    }

    log.push(`Using AI model: ${context.model}`);
    
    try {
      const prompt = `Analyze this data: ${JSON.stringify(data, null, 2)}`;
      const result = await aiService.runInference(context.model!, prompt);
      
      log.push('AI analysis completed');
      
      return {
        originalData: data,
        aiAnalysis: result,
        model: context.model
      };
    } catch (error) {
      log.push(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

/**
 * Queen Bee - Decision Making and Classification
 */
class QueenExecutor extends BaseAgentExecutor {
  async execute(context: ExecutionContext): Promise<NodeResult> {
    const startTime = Date.now();
    
    try {
      const decisionData = this.getInput(context, 'decision_data');
      const config = context.config as NodeConfig;
      const decisionType = config?.decisionType || 'classify';

      if (!context.model) {
        return this.createError(context, 'Queen bee requires an AI model for decision making');
      }

      let decision: unknown;
      let confidence: number;
      let alternatives: unknown[] = [];

      switch (decisionType) {
        case 'classify':
          ({ decision, confidence, alternatives } = await this.classifyData(decisionData, context, config));
          break;

        case 'prioritize':
          ({ decision, confidence, alternatives } = await this.prioritizeOptions(decisionData, context));
          break;

        case 'recommend':
          ({ decision, confidence, alternatives } = await this.makeRecommendation(decisionData, context));
          break;

        default:
          return this.createError(context, `Unknown decision type: ${decisionType}`);
      }

      return {
        nodeId: context.nodeId,
        outputs: {
          decision: this.createOutput(context, 'decision', decision, 'object'),
          confidence: this.createOutput(context, 'confidence', confidence, 'number'),
          alternatives: this.createOutput(context, 'alternatives', alternatives, 'array')
        },
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createError(context, error instanceof Error ? error.message : 'Queen execution failed');
    }
  }

  private async classifyData(data: unknown, context: ExecutionContext, config: NodeConfig): Promise<{
    decision: unknown;
    confidence: number;
    alternatives: unknown[];
  }> {
    const categories = config.categories || ['positive', 'negative', 'neutral'];
    const prompt = `Classify the following data into one of these categories: ${categories.join(', ')}\n\nData: ${JSON.stringify(data)}`;
    
    const inferenceResult = await aiService.runInference(context.model!, prompt);
    
    if (!inferenceResult.success) {
      throw new Error(inferenceResult.error || 'AI inference failed');
    }
    
    const result = inferenceResult.result as string;
    
    // Parse AI response to extract classification
    const classification = categories.find(cat => result.toLowerCase().includes(cat.toLowerCase())) || categories[0];
    
    return {
      decision: {
        category: classification,
        reasoning: result,
        data: data
      },
      confidence: 0.8,
      alternatives: categories.filter(cat => cat !== classification)
    };
  }

  private async prioritizeOptions(data: unknown, context: ExecutionContext): Promise<{
    decision: unknown;
    confidence: number;
    alternatives: unknown[];
  }> {
    const prompt = `Prioritize the following items from highest to lowest priority:\n\n${JSON.stringify(data)}`;
    const inferenceResult = await aiService.runInference(context.model!, prompt);
    
    if (!inferenceResult.success) {
      throw new Error(inferenceResult.error || 'AI inference failed');
    }
    
    return {
      decision: {
        prioritizedList: Array.isArray(data) ? data : [data],
        reasoning: inferenceResult.result
      },
      confidence: 0.75,
      alternatives: []
    };
  }

  private async makeRecommendation(data: unknown, context: ExecutionContext): Promise<{
    decision: unknown;
    confidence: number;
    alternatives: unknown[];
  }> {
    const prompt = `Based on the following data, make a recommendation:\n\n${JSON.stringify(data)}`;
    const inferenceResult = await aiService.runInference(context.model!, prompt);
    
    if (!inferenceResult.success) {
      throw new Error(inferenceResult.error || 'AI inference failed');
    }
    
    return {
      decision: {
        recommendation: inferenceResult.result,
        basedOn: data
      },
      confidence: 0.85,
      alternatives: ['Alternative recommendation 1', 'Alternative recommendation 2']
    };
  }
}

/**
 * Builder Bee - Content Generation
 */
class BuilderExecutor extends BaseAgentExecutor {
  async execute(context: ExecutionContext): Promise<NodeResult> {
    const startTime = Date.now();
    
    try {
      const prompt = this.getInput(context, 'prompt') as string;
      const contextData = this.getInput(context, 'context');
      // const config = context.config as unknown;

      if (!context.model) {
        return this.createError(context, 'Builder bee requires an AI model for content generation');
      }

      if (!prompt) {
        return this.createError(context, 'Builder bee requires a generation prompt');
      }

      let fullPrompt = prompt;
      if (contextData) {
        fullPrompt += `\n\nContext: ${JSON.stringify(contextData)}`;
      }

      const inferenceResult = await aiService.runInference(context.model!, fullPrompt);
      
      if (!inferenceResult.success) {
        return this.createError(context, inferenceResult.error || 'AI content generation failed');
      }
      
      const generatedContent = inferenceResult.result as string;

      const metadata = {
        promptLength: prompt.length,
        generatedLength: generatedContent.length,
        model: context.model,
        generatedAt: new Date().toISOString(),
        hasContext: !!contextData
      };

      return {
        nodeId: context.nodeId,
        outputs: {
          generated_content: this.createOutput(context, 'generated_content', generatedContent, 'text'),
          content_metadata: this.createOutput(context, 'content_metadata', metadata, 'object')
        },
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createError(context, error instanceof Error ? error.message : 'Builder execution failed');
    }
  }
}

/**
 * Guard Bee - Validation and Security
 */
class GuardExecutor extends BaseAgentExecutor {
  async execute(context: ExecutionContext): Promise<NodeResult> {
    const startTime = Date.now();
    
    try {
      const dataToValidate = this.getInput(context, 'data_to_validate');
      const config = context.config as NodeConfig;
      const validationType = config?.validationType || 'content';

      const validationReport: ValidationReport = {
        nodeId: context.nodeId,
        validatedAt: new Date().toISOString(),
        validationType,
        passed: false,
        errors: [],
        warnings: []
      };

      let validatedData = dataToValidate;
      let rejectedData: unknown[] = [];

      switch (validationType) {
        case 'content':
          ({ validatedData, rejectedData } = await this.validateContent(dataToValidate, config, validationReport));
          break;

        case 'schema':
          ({ validatedData, rejectedData } = await this.validateSchema(dataToValidate, config, validationReport));
          break;

        case 'security':
          ({ validatedData, rejectedData } = await this.validateSecurity(dataToValidate, config, validationReport));
          break;

        default:
          return this.createError(context, `Unknown validation type: ${validationType}`);
      }

      validationReport.passed = validationReport.errors.length === 0;

      return {
        nodeId: context.nodeId,
        outputs: {
          validated_data: this.createOutput(context, 'validated_data', validatedData, 'object'),
          validation_report: this.createOutput(context, 'validation_report', validationReport, 'object'),
          rejected_data: this.createOutput(context, 'rejected_data', rejectedData, 'array')
        },
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createError(context, error instanceof Error ? error.message : 'Guard execution failed');
    }
  }

  private async validateContent(data: unknown, config: NodeConfig, report: ValidationReport): Promise<{
    validatedData: unknown;
    rejectedData: unknown[];
  }> {
    const rejectedData: unknown[] = [];

    // Simple content validation
    if (typeof data === 'string') {
      if (data.length < (config.minLength || 0)) {
        report.errors.push('Content too short');
        rejectedData.push(data);
        return { validatedData: null, rejectedData };
      }
      if (data.length > (config.maxLength || 10000)) {
        report.warnings.push('Content exceeds recommended length');
      }
    }

    return { validatedData: data, rejectedData };
  }

  private async validateSchema(data: unknown, config: NodeConfig, report: ValidationReport): Promise<{
    validatedData: unknown;
    rejectedData: unknown[];
  }> {
    // Simple schema validation
    const requiredFields = config.requiredFields || [];
    const rejectedData: unknown[] = [];

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      for (const field of requiredFields) {
        if (!(field in obj)) {
          report.errors.push(`Missing required field: ${field}`);
        }
      }
    }

    if (report.errors.length > 0) {
      rejectedData.push(data);
      return { validatedData: null, rejectedData };
    }

    return { validatedData: data, rejectedData };
  }

  private async validateSecurity(data: unknown, config: NodeConfig, report: ValidationReport): Promise<{
    validatedData: unknown;
    rejectedData: unknown[];
  }> {
    const rejectedData: unknown[] = [];

    // Simple security validation
    if (typeof data === 'string') {
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i,
        /eval\(/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(data)) {
          report.errors.push(`Suspicious content detected: ${pattern.source}`);
          rejectedData.push(data);
          break;
        }
      }
    }

    if (report.errors.length > 0) {
      return { validatedData: null, rejectedData };
    }

    return { validatedData: data, rejectedData };
  }
}

/**
 * Messenger Bee - Output Formatting and Export
 */
class MessengerExecutor extends BaseAgentExecutor {
  async execute(context: ExecutionContext): Promise<NodeResult> {
    const startTime = Date.now();
    
    try {
      const finalData = this.getInput(context, 'final_data');
      const config = context.config as NodeConfig;
      const outputFormat = config?.outputFormat || 'json';

      let formattedOutput: string;
      const exportInfo: ExportInfo = {
        format: outputFormat,
        exportedAt: new Date().toISOString(),
        dataSize: JSON.stringify(finalData).length
      };

      switch (outputFormat) {
        case 'json':
          formattedOutput = JSON.stringify(finalData, null, 2);
          exportInfo.pretty = true;
          break;

        case 'csv':
          formattedOutput = this.formatAsCsv(finalData);
          exportInfo.delimiter = ',';
          break;

        case 'text':
          formattedOutput = this.formatAsText(finalData);
          break;

        case 'html':
          formattedOutput = this.formatAsHtml(finalData);
          exportInfo.includesStyles = true;
          break;

        default:
          return this.createError(context, `Unknown output format: ${outputFormat}`);
      }

      exportInfo.outputSize = formattedOutput.length;

      return {
        nodeId: context.nodeId,
        outputs: {
          formatted_output: this.createOutput(context, 'formatted_output', formattedOutput, 'text'),
          export_info: this.createOutput(context, 'export_info', exportInfo, 'object')
        },
        status: 'success',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return this.createError(context, error instanceof Error ? error.message : 'Messenger execution failed');
    }
  }

  private formatAsCsv(data: unknown): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0] as object).join(',');
      const rows = data.map(item => 
        Object.values(item as object).map(val => 
          typeof val === 'string' ? `"${val}"` : String(val)
        ).join(',')
      ).join('\n');
      
      return `${headers}\n${rows}`;
    }
    
    return JSON.stringify(data);
  }

  private formatAsText(data: unknown): string {
    if (typeof data === 'string') return data;
    
    return JSON.stringify(data, null, 2);
  }

  private formatAsHtml(data: unknown): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Swarm Output</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Swarm Execution Result</h1>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>
    `.trim();
  }
}

/**
 * Main Node Executor Factory
 */
export class NodeExecutor {
  private static executors: Map<AgentType, BaseAgentExecutor> = new Map([
    ['scout', new ScoutExecutor()],
    ['worker', new WorkerExecutor()],
    ['queen', new QueenExecutor()],
    ['builder', new BuilderExecutor()],
    ['guard', new GuardExecutor()],
    ['messenger', new MessengerExecutor()],
  ]);

  /**
   * Get execution handler for the execution queue
   */
  static getExecutionHandler(): ExecutionHandler {
    return async (context: ExecutionContext): Promise<NodeResult> => {
      const executor = this.executors.get(context.agentType as AgentType);
      
      if (!executor) {
        return {
          nodeId: context.nodeId,
          outputs: {},
          status: 'error',
          error: `No executor found for agent type: ${context.agentType}`,
          executionTime: 0
        };
      }

      return executor.execute(context);
    };
  }
}