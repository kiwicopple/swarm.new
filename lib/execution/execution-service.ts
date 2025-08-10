/**
 * Main Execution Service - Coordinates workflow execution with state tracking
 * Primary interface for UI components to execute workflows
 */

import { DAGEngine } from './dag-engine';
import { ExecutionQueue, ExecutionOptions, ExecutionEvent } from './execution-queue';
import { NodeExecutor } from './node-executor';
import { Workflow, NodeResult } from '@/lib/types';
import { DataEdge } from '@/lib/types/data-flow';

export interface ExecutionState {
  id: string;
  workflowId: string;
  status: 'idle' | 'preparing' | 'running' | 'paused' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    running: number;
    pending: number;
    failed: number;
    percentage: number;
  };
  startTime?: number;
  endTime?: number;
  executionTime?: number;
  results: Map<string, NodeResult>;
  events: ExecutionEvent[];
  error?: string;
}

export interface ExecutionConfig {
  maxConcurrentNodes?: number;
  executionTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableEventLogging?: boolean;
  maxEventHistory?: number;
}

export type ExecutionStateListener = (state: ExecutionState) => void;

export class ExecutionService {
  private static instance: ExecutionService | null = null;
  private executions = new Map<string, ExecutionState>();
  private executionQueues = new Map<string, ExecutionQueue>();
  private stateListeners = new Set<ExecutionStateListener>();
  private config: Required<ExecutionConfig>;

  private constructor(config: ExecutionConfig = {}) {
    this.config = {
      maxConcurrentNodes: 3,
      executionTimeout: 60000,
      retryAttempts: 2,
      retryDelay: 1000,
      enableEventLogging: true,
      maxEventHistory: 100,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ExecutionConfig): ExecutionService {
    if (!this.instance) {
      this.instance = new ExecutionService(config);
    }
    return this.instance;
  }

  /**
   * Add state listener
   */
  addStateListener(listener: ExecutionStateListener): void {
    this.stateListeners.add(listener);
  }

  /**
   * Remove state listener
   */
  removeStateListener(listener: ExecutionStateListener): void {
    this.stateListeners.delete(listener);
  }

  /**
   * Notify all state listeners
   */
  private notifyStateListeners(state: ExecutionState): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in execution state listener:', error);
      }
    });
  }

  /**
   * Create execution state
   */
  private createExecutionState(executionId: string, workflowId: string): ExecutionState {
    return {
      id: executionId,
      workflowId,
      status: 'idle',
      progress: {
        total: 0,
        completed: 0,
        running: 0,
        pending: 0,
        failed: 0,
        percentage: 0
      },
      results: new Map(),
      events: []
    };
  }

  /**
   * Update execution state
   */
  private updateExecutionState(executionId: string, updates: Partial<ExecutionState>): void {
    const state = this.executions.get(executionId);
    if (!state) return;

    Object.assign(state, updates);
    this.notifyStateListeners(state);
  }

  /**
   * Add event to execution state
   */
  private addExecutionEvent(executionId: string, event: ExecutionEvent): void {
    const state = this.executions.get(executionId);
    if (!state || !this.config.enableEventLogging) return;

    state.events.push(event);
    
    // Limit event history
    if (state.events.length > this.config.maxEventHistory) {
      state.events = state.events.slice(-this.config.maxEventHistory);
    }

    this.notifyStateListeners(state);
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    workflow: Workflow,
    workflowId: string,
    options: Partial<ExecutionOptions> = {}
  ): Promise<{
    executionId: string;
    success: boolean;
    results?: Map<string, NodeResult>;
    error?: string;
  }> {
    const executionId = `exec_${workflowId}_${Date.now()}`;
    
    try {
      // Create execution state
      const state = this.createExecutionState(executionId, workflowId);
      this.executions.set(executionId, state);

      // Update status to preparing
      this.updateExecutionState(executionId, { 
        status: 'preparing',
        startTime: Date.now()
      });

      // Validate workflow
      const validationResult = this.validateWorkflow(workflow);
      if (!validationResult.valid) {
        throw new Error(`Workflow validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Create execution plan
      const executionPlan = DAGEngine.createExecutionPlan(
        workflow.nodes,
        workflow.edges as DataEdge[]
      );

      if (executionPlan.hasCycles) {
        throw new Error(`Workflow contains cycles: ${JSON.stringify(executionPlan.cycles)}`);
      }

      // Create execution queue
      const queueOptions: ExecutionOptions = {
        maxConcurrentNodes: this.config.maxConcurrentNodes,
        executionTimeout: this.config.executionTimeout,
        retryAttempts: this.config.retryAttempts,
        retryDelay: this.config.retryDelay,
        ...options
      };

      const executionQueue = new ExecutionQueue(executionPlan, queueOptions);
      executionQueue.setExecutionHandler(NodeExecutor.getExecutionHandler());
      this.executionQueues.set(executionId, executionQueue);

      // Setup event listeners
      executionQueue.addEventListener((event) => {
        this.handleExecutionEvent(executionId, event);
      });

      // Update initial progress
      const progress = executionQueue.getProgress();
      this.updateExecutionState(executionId, { 
        status: 'running',
        progress 
      });

      // Start execution
      const result = await executionQueue.execute();

      // Update final state
      const finalProgress = executionQueue.getProgress();
      const endTime = Date.now();
      
      this.updateExecutionState(executionId, {
        status: result.success ? 'completed' : 'failed',
        progress: finalProgress,
        results: result.results,
        endTime,
        executionTime: result.executionTime,
        error: result.error
      });

      return {
        executionId,
        success: result.success,
        results: result.results,
        error: result.error
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateExecutionState(executionId, {
        status: 'failed',
        error: errorMessage,
        endTime: Date.now()
      });

      return {
        executionId,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Handle execution events from queue
   */
  private handleExecutionEvent(executionId: string, event: ExecutionEvent): void {
    this.addExecutionEvent(executionId, event);

    const executionQueue = this.executionQueues.get(executionId);
    if (!executionQueue) return;

    // Update progress on node events
    if (['node_started', 'node_completed', 'node_failed'].includes(event.type)) {
      const progress = executionQueue.getProgress();
      this.updateExecutionState(executionId, { progress });
    }

    // Handle specific events
    switch (event.type) {
      case 'node_started':
        console.log(`Node ${event.nodeId} started execution`);
        break;
        
      case 'node_completed':
        console.log(`Node ${event.nodeId} completed successfully`);
        break;
        
      case 'node_failed':
        console.error(`Node ${event.nodeId} failed:`, event.error);
        break;
        
      case 'execution_completed':
        console.log('Workflow execution completed successfully');
        break;
        
      case 'execution_failed':
        console.error('Workflow execution failed:', event.error);
        break;
    }
  }

  /**
   * Stop execution
   */
  async stopExecution(executionId: string): Promise<boolean> {
    const executionQueue = this.executionQueues.get(executionId);
    const state = this.executions.get(executionId);
    
    if (!executionQueue || !state) return false;
    
    try {
      await executionQueue.stop();
      
      this.updateExecutionState(executionId, {
        status: 'failed',
        error: 'Execution stopped by user',
        endTime: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error stopping execution:', error);
      return false;
    }
  }

  /**
   * Get execution state
   */
  getExecutionState(executionId: string): ExecutionState | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get all execution states
   */
  getAllExecutionStates(): ExecutionState[] {
    return Array.from(this.executions.values());
  }

  /**
   * Clear completed executions
   */
  clearCompletedExecutions(): void {
    const completedIds: string[] = [];
    
    this.executions.forEach((state, id) => {
      if (state.status === 'completed' || state.status === 'failed') {
        completedIds.push(id);
      }
    });

    completedIds.forEach(id => {
      this.executions.delete(id);
      this.executionQueues.delete(id);
    });
  }

  /**
   * Validate workflow before execution
   */
  private validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if workflow has nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Validate node configurations
    workflow.nodes.forEach((node, index) => {
      if (!node.id) {
        errors.push(`Node at index ${index} is missing ID`);
      }
      
      if (!node.data.agentType) {
        errors.push(`Node ${node.id} is missing agent type`);
      }

      // Check if nodes requiring AI models have them
      const requiresModel = ['queen', 'builder'].includes(node.data.agentType);
      if (requiresModel && !node.data.model) {
        errors.push(`Node ${node.id} of type ${node.data.agentType} requires an AI model`);
      }
    });

    // Validate edges
    if (workflow.edges) {
      workflow.edges.forEach((edge, index) => {
        if (!edge.source || !edge.target) {
          errors.push(`Edge at index ${index} is missing source or target`);
        }

        const sourceExists = workflow.nodes.some(n => n.id === edge.source);
        const targetExists = workflow.nodes.some(n => n.id === edge.target);
        
        if (!sourceExists) {
          errors.push(`Edge references non-existent source node: ${edge.source}`);
        }
        
        if (!targetExists) {
          errors.push(`Edge references non-existent target node: ${edge.target}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): {
    totalExecutions: number;
    activeExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    const states = Array.from(this.executions.values());
    const completedStates = states.filter(s => s.executionTime !== undefined);
    
    const averageExecutionTime = completedStates.length > 0
      ? completedStates.reduce((sum, s) => sum + (s.executionTime || 0), 0) / completedStates.length
      : 0;

    return {
      totalExecutions: states.length,
      activeExecutions: states.filter(s => s.status === 'running' || s.status === 'preparing').length,
      completedExecutions: states.filter(s => s.status === 'completed').length,
      failedExecutions: states.filter(s => s.status === 'failed').length,
      averageExecutionTime
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<ExecutionConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): Readonly<Required<ExecutionConfig>> {
    return { ...this.config };
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    // Stop all running executions
    this.executionQueues.forEach(async (queue) => {
      if (queue.isRunning()) {
        await queue.stop();
      }
    });

    // Clear all data
    this.executions.clear();
    this.executionQueues.clear();
    this.stateListeners.clear();
    
    ExecutionService.instance = null;
  }
}