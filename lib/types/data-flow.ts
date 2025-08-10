/**
 * Data Flow Types for Digital Bees Swarm
 * Defines the type system for data flowing between agent nodes
 */

// Base data types that can flow between nodes
export type DataType = 
  | 'text' 
  | 'number' 
  | 'boolean' 
  | 'object' 
  | 'array' 
  | 'file' 
  | 'url' 
  | 'json'
  | 'any';

// Port definition for node inputs and outputs
export interface Port {
  id: string;
  name: string;
  type: DataType;
  description?: string;
  required: boolean;
  multiple?: boolean; // Can accept multiple connections
}

// Data payload that flows through edges
export interface DataPayload {
  id: string;
  type: DataType;
  value: unknown;
  metadata?: {
    source?: string;
    timestamp?: number;
    size?: number;
    format?: string;
    [key: string]: unknown;
  };
}

// Node execution result
export interface NodeResult {
  nodeId: string;
  outputs: Record<string, DataPayload>;
  status: 'success' | 'error' | 'pending';
  error?: string;
  executionTime?: number;
}

// Edge connection between nodes
export interface DataEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  data?: DataPayload;
}

// Agent type specific port configurations
export const AGENT_PORTS: Record<string, { inputs: Port[]; outputs: Port[] }> = {
  scout: {
    inputs: [
      {
        id: 'trigger',
        name: 'Trigger',
        type: 'any',
        description: 'Trigger to start data collection',
        required: false
      }
    ],
    outputs: [
      {
        id: 'collected_data',
        name: 'Collected Data',
        type: 'object',
        description: 'Raw collected data',
        required: true
      },
      {
        id: 'metadata',
        name: 'Collection Metadata',
        type: 'object',
        description: 'Information about data collection',
        required: true
      }
    ]
  },

  worker: {
    inputs: [
      {
        id: 'input_data',
        name: 'Input Data',
        type: 'any',
        description: 'Data to process',
        required: true
      },
      {
        id: 'processing_config',
        name: 'Processing Config',
        type: 'object',
        description: 'Configuration for processing',
        required: false
      }
    ],
    outputs: [
      {
        id: 'processed_data',
        name: 'Processed Data',
        type: 'any',
        description: 'Transformed/processed data',
        required: true
      },
      {
        id: 'processing_log',
        name: 'Processing Log',
        type: 'array',
        description: 'Log of processing steps',
        required: false
      }
    ]
  },

  queen: {
    inputs: [
      {
        id: 'decision_data',
        name: 'Decision Data',
        type: 'any',
        description: 'Data for decision making',
        required: true
      },
      {
        id: 'criteria',
        name: 'Decision Criteria',
        type: 'object',
        description: 'Criteria for making decisions',
        required: false
      }
    ],
    outputs: [
      {
        id: 'decision',
        name: 'Decision',
        type: 'object',
        description: 'Final decision with reasoning',
        required: true
      },
      {
        id: 'confidence',
        name: 'Confidence Score',
        type: 'number',
        description: 'Confidence in the decision (0-1)',
        required: true
      },
      {
        id: 'alternatives',
        name: 'Alternative Options',
        type: 'array',
        description: 'Other possible decisions',
        required: false
      }
    ]
  },

  builder: {
    inputs: [
      {
        id: 'prompt',
        name: 'Generation Prompt',
        type: 'text',
        description: 'Instructions for content generation',
        required: true
      },
      {
        id: 'context',
        name: 'Context Data',
        type: 'any',
        description: 'Context for generation',
        required: false
      },
      {
        id: 'style_config',
        name: 'Style Configuration',
        type: 'object',
        description: 'Style and format settings',
        required: false
      }
    ],
    outputs: [
      {
        id: 'generated_content',
        name: 'Generated Content',
        type: 'text',
        description: 'Generated text content',
        required: true
      },
      {
        id: 'content_metadata',
        name: 'Content Metadata',
        type: 'object',
        description: 'Information about generated content',
        required: false
      }
    ]
  },

  guard: {
    inputs: [
      {
        id: 'data_to_validate',
        name: 'Data to Validate',
        type: 'any',
        description: 'Data that needs validation',
        required: true
      },
      {
        id: 'validation_rules',
        name: 'Validation Rules',
        type: 'object',
        description: 'Rules for validation',
        required: false
      }
    ],
    outputs: [
      {
        id: 'validated_data',
        name: 'Validated Data',
        type: 'any',
        description: 'Cleaned and validated data',
        required: true
      },
      {
        id: 'validation_report',
        name: 'Validation Report',
        type: 'object',
        description: 'Report of validation results',
        required: true
      },
      {
        id: 'rejected_data',
        name: 'Rejected Data',
        type: 'array',
        description: 'Data that failed validation',
        required: false
      }
    ]
  },

  messenger: {
    inputs: [
      {
        id: 'final_data',
        name: 'Final Data',
        type: 'any',
        description: 'Data to format and output',
        required: true
      },
      {
        id: 'format_config',
        name: 'Format Configuration',
        type: 'object',
        description: 'Output format settings',
        required: false
      }
    ],
    outputs: [
      {
        id: 'formatted_output',
        name: 'Formatted Output',
        type: 'text',
        description: 'Final formatted output',
        required: true
      },
      {
        id: 'export_info',
        name: 'Export Information',
        type: 'object',
        description: 'Information about the export',
        required: false
      }
    ]
  }
};

// Type compatibility matrix
export const TYPE_COMPATIBILITY: Record<DataType, DataType[]> = {
  text: ['text', 'any'],
  number: ['number', 'any'],
  boolean: ['boolean', 'any'],
  object: ['object', 'json', 'any'],
  array: ['array', 'any'],
  file: ['file', 'url', 'any'],
  url: ['url', 'text', 'any'],
  json: ['json', 'object', 'text', 'any'],
  any: ['text', 'number', 'boolean', 'object', 'array', 'file', 'url', 'json', 'any']
};

// Utility functions for type checking
export function isCompatible(sourceType: DataType, targetType: DataType): boolean {
  return TYPE_COMPATIBILITY[sourceType]?.includes(targetType) ?? false;
}

export function validateConnection(
  sourcePort: Port,
  targetPort: Port
): { valid: boolean; error?: string } {
  // Check type compatibility
  if (!isCompatible(sourcePort.type, targetPort.type)) {
    return {
      valid: false,
      error: `Incompatible types: ${sourcePort.type} cannot connect to ${targetPort.type}`
    };
  }

  // Check if target port is required and source provides data
  if (targetPort.required && !sourcePort) {
    return {
      valid: false,
      error: `Required port '${targetPort.name}' needs a connection`
    };
  }

  return { valid: true };
}

// Data transformation utilities
export function transformData(
  data: DataPayload,
  targetType: DataType
): DataPayload | null {
  if (data.type === targetType) {
    return data;
  }

  try {
    let transformedValue = data.value;

    // Handle transformations
    switch (targetType) {
      case 'text':
        transformedValue = String(data.value);
        break;
      case 'number':
        const numValue = Number(data.value);
        if (isNaN(numValue)) return null;
        transformedValue = numValue;
        break;
      case 'boolean':
        transformedValue = Boolean(data.value);
        break;
      case 'json':
        transformedValue = typeof data.value === 'string' 
          ? JSON.parse(data.value) 
          : JSON.stringify(data.value);
        break;
      case 'object':
        transformedValue = typeof data.value === 'string' 
          ? JSON.parse(data.value) 
          : data.value;
        break;
      case 'array':
        transformedValue = Array.isArray(data.value) 
          ? data.value 
          : [data.value];
        break;
      case 'any':
        transformedValue = data.value;
        break;
      default:
        return null;
    }

    return {
      ...data,
      type: targetType,
      value: transformedValue,
      metadata: {
        ...data.metadata,
        transformedFrom: data.type,
        transformedAt: Date.now()
      }
    };
  } catch {
    return null;
  }
}