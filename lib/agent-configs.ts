import { AgentType } from './types';

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'boolean' | 'textarea';
  required?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  placeholder?: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: unknown;
}

export interface AgentConfig {
  name: string;
  description: string;
  fields: ConfigField[];
  defaultConfig: Record<string, unknown>;
}

export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  scout: {
    name: 'Scout Bee',
    description: 'Gathers input data from various sources',
    fields: [
      {
        key: 'inputType',
        label: 'Input Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Text Input', value: 'text' },
          { label: 'File Upload', value: 'file' },
          { label: 'URL Fetch', value: 'url' },
          { label: 'Clipboard', value: 'clipboard' }
        ],
        defaultValue: 'text'
      },
      {
        key: 'placeholder',
        label: 'Placeholder Text',
        type: 'text',
        placeholder: 'Enter your text here...',
        description: 'Placeholder for text input'
      },
      {
        key: 'fileTypes',
        label: 'Accepted File Types',
        type: 'text',
        placeholder: '.txt,.json,.csv',
        description: 'Comma-separated file extensions'
      },
      {
        key: 'fetchUrl',
        label: 'URL to Fetch',
        type: 'text',
        placeholder: 'https://example.com/api/data',
        description: 'URL for data fetching'
      }
    ],
    defaultConfig: {
      inputType: 'text',
      placeholder: 'Enter your text here...',
      fileTypes: '.txt,.json,.csv',
      fetchUrl: ''
    }
  },
  
  worker: {
    name: 'Worker Bee',
    description: 'Processes and transforms data',
    fields: [
      {
        key: 'operation',
        label: 'Operation Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Text Transform', value: 'transform' },
          { label: 'Parse Data', value: 'parse' },
          { label: 'Calculate', value: 'calculate' },
          { label: 'Filter', value: 'filter' }
        ],
        defaultValue: 'transform'
      },
      {
        key: 'transformType',
        label: 'Transform Type',
        type: 'select',
        options: [
          { label: 'Lowercase', value: 'lowercase' },
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'Capitalize', value: 'capitalize' },
          { label: 'Trim', value: 'trim' },
          { label: 'Extract Numbers', value: 'extract_numbers' },
          { label: 'Extract Emails', value: 'extract_emails' }
        ],
        defaultValue: 'lowercase'
      },
      {
        key: 'parseFormat',
        label: 'Parse Format',
        type: 'select',
        options: [
          { label: 'JSON', value: 'json' },
          { label: 'CSV', value: 'csv' },
          { label: 'XML', value: 'xml' },
          { label: 'Markdown', value: 'markdown' }
        ],
        defaultValue: 'json'
      },
      {
        key: 'customCode',
        label: 'Custom JavaScript',
        type: 'textarea',
        placeholder: 'return input.toUpperCase();',
        description: 'Custom JavaScript code (input variable available)'
      }
    ],
    defaultConfig: {
      operation: 'transform',
      transformType: 'lowercase',
      parseFormat: 'json',
      customCode: ''
    }
  },
  
  queen: {
    name: 'Queen Bee',
    description: 'Makes decisions and controls workflow routing',
    fields: [
      {
        key: 'decisionType',
        label: 'Decision Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Conditional Logic', value: 'conditional' },
          { label: 'Classification', value: 'classification' },
          { label: 'Pattern Matching', value: 'pattern' },
          { label: 'AI Decision', value: 'ai' }
        ],
        defaultValue: 'conditional'
      },
      {
        key: 'condition',
        label: 'Condition',
        type: 'text',
        placeholder: 'input.length > 10',
        description: 'JavaScript condition expression'
      },
      {
        key: 'trueOutput',
        label: 'True Output',
        type: 'text',
        placeholder: 'Long text',
        description: 'Output when condition is true'
      },
      {
        key: 'falseOutput',
        label: 'False Output',
        type: 'text',
        placeholder: 'Short text',
        description: 'Output when condition is false'
      },
      {
        key: 'modelName',
        label: 'Classification Model',
        type: 'select',
        options: [
          { label: 'Sentiment Analysis', value: 'sentiment' },
          { label: 'Text Classification', value: 'classification' },
          { label: 'Intent Recognition', value: 'intent' }
        ],
        defaultValue: 'sentiment'
      }
    ],
    defaultConfig: {
      decisionType: 'conditional',
      condition: 'input.length > 10',
      trueOutput: 'Long text',
      falseOutput: 'Short text',
      modelName: 'sentiment'
    }
  },
  
  builder: {
    name: 'Builder Bee',
    description: 'Generates and creates new content',
    fields: [
      {
        key: 'task',
        label: 'Generation Task',
        type: 'select',
        required: true,
        options: [
          { label: 'Text Generation', value: 'generate' },
          { label: 'Summarization', value: 'summarize' },
          { label: 'Translation', value: 'translate' },
          { label: 'Question Answering', value: 'qa' },
          { label: 'Template Fill', value: 'template' }
        ],
        defaultValue: 'generate'
      },
      {
        key: 'modelName',
        label: 'AI Model',
        type: 'select',
        options: [
          { label: 'GPT-2', value: 'gpt2' },
          { label: 'DistilGPT-2', value: 'distilgpt2' },
          { label: 'BART (Summarization)', value: 'bart-summary' },
          { label: 'NLLB (Translation)', value: 'nllb' }
        ],
        defaultValue: 'gpt2'
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        min: 1,
        max: 512,
        step: 1,
        defaultValue: 50,
        description: 'Maximum number of tokens to generate'
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        min: 0.1,
        max: 2.0,
        step: 0.1,
        defaultValue: 0.7,
        description: 'Creativity level (0.1 = focused, 2.0 = creative)'
      },
      {
        key: 'prompt',
        label: 'System Prompt',
        type: 'textarea',
        placeholder: 'You are a helpful assistant...',
        description: 'Instructions for the AI model'
      },
      {
        key: 'targetLanguage',
        label: 'Target Language',
        type: 'select',
        options: [
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' },
          { label: 'German', value: 'de' },
          { label: 'Chinese', value: 'zh' },
          { label: 'Japanese', value: 'ja' },
          { label: 'Korean', value: 'ko' }
        ],
        defaultValue: 'es'
      },
      {
        key: 'template',
        label: 'Template',
        type: 'textarea',
        placeholder: 'Hello {{name}}, welcome to {{place}}!',
        description: 'Template with {{variable}} placeholders'
      }
    ],
    defaultConfig: {
      task: 'generate',
      modelName: 'gpt2',
      maxTokens: 50,
      temperature: 0.7,
      prompt: '',
      targetLanguage: 'es',
      template: ''
    }
  },
  
  guard: {
    name: 'Guard Bee',
    description: 'Validates and filters data for security and quality',
    fields: [
      {
        key: 'validationType',
        label: 'Validation Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Schema Validation', value: 'schema' },
          { label: 'Content Filtering', value: 'content' },
          { label: 'Length Check', value: 'length' },
          { label: 'Format Validation', value: 'format' },
          { label: 'Rate Limiting', value: 'rate' }
        ],
        defaultValue: 'schema'
      },
      {
        key: 'schema',
        label: 'JSON Schema',
        type: 'textarea',
        placeholder: '{"type": "object", "required": ["name"]}',
        description: 'JSON Schema for validation'
      },
      {
        key: 'minLength',
        label: 'Minimum Length',
        type: 'number',
        min: 0,
        defaultValue: 1,
        description: 'Minimum text length'
      },
      {
        key: 'maxLength',
        label: 'Maximum Length',
        type: 'number',
        min: 1,
        defaultValue: 1000,
        description: 'Maximum text length'
      },
      {
        key: 'allowedFormats',
        label: 'Allowed Formats',
        type: 'text',
        placeholder: 'email,url,phone',
        description: 'Comma-separated format types'
      },
      {
        key: 'filterProfanity',
        label: 'Filter Profanity',
        type: 'boolean',
        defaultValue: true,
        description: 'Block inappropriate content'
      },
      {
        key: 'filterPII',
        label: 'Filter PII',
        type: 'boolean',
        defaultValue: false,
        description: 'Block personal information'
      },
      {
        key: 'rateLimit',
        label: 'Rate Limit (per minute)',
        type: 'number',
        min: 1,
        max: 1000,
        defaultValue: 60,
        description: 'Maximum executions per minute'
      }
    ],
    defaultConfig: {
      validationType: 'schema',
      schema: '',
      minLength: 1,
      maxLength: 1000,
      allowedFormats: '',
      filterProfanity: true,
      filterPII: false,
      rateLimit: 60
    }
  },
  
  messenger: {
    name: 'Messenger Bee',
    description: 'Outputs and communicates results',
    fields: [
      {
        key: 'outputType',
        label: 'Output Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Display in UI', value: 'display' },
          { label: 'Download File', value: 'download' },
          { label: 'Copy to Clipboard', value: 'clipboard' },
          { label: 'Show Notification', value: 'notification' },
          { label: 'Console Log', value: 'console' }
        ],
        defaultValue: 'display'
      },
      {
        key: 'format',
        label: 'Output Format',
        type: 'select',
        options: [
          { label: 'Plain Text', value: 'text' },
          { label: 'JSON', value: 'json' },
          { label: 'CSV', value: 'csv' },
          { label: 'HTML', value: 'html' },
          { label: 'Markdown', value: 'markdown' }
        ],
        defaultValue: 'text'
      },
      {
        key: 'filename',
        label: 'Download Filename',
        type: 'text',
        placeholder: 'output.txt',
        description: 'Filename for downloads'
      },
      {
        key: 'title',
        label: 'Display Title',
        type: 'text',
        placeholder: 'Results',
        description: 'Title for UI display'
      },
      {
        key: 'notificationTitle',
        label: 'Notification Title',
        type: 'text',
        placeholder: 'Task Completed',
        description: 'Title for notifications'
      },
      {
        key: 'autoDownload',
        label: 'Auto Download',
        type: 'boolean',
        defaultValue: false,
        description: 'Automatically trigger download'
      },
      {
        key: 'showPreview',
        label: 'Show Preview',
        type: 'boolean',
        defaultValue: true,
        description: 'Show preview in UI'
      }
    ],
    defaultConfig: {
      outputType: 'display',
      format: 'text',
      filename: 'output.txt',
      title: 'Results',
      notificationTitle: 'Task Completed',
      autoDownload: false,
      showPreview: true
    }
  }
};