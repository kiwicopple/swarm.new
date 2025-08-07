/**
 * Execution Queue Manager for Digital Bees Swarm
 * Manages async execution of workflow nodes with concurrency control
 */

import { DAGEngine, ExecutionPlan, ExecutionNode } from './dag-engine';
import { AgentNodeData, NodeResult, DataPayload } from '@/lib/types';
import { transformData } from '@/lib/types/data-flow';

export interface ExecutionOptions {
  maxConcurrentNodes: number;
  executionTimeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface ExecutionContext {
  nodeId: string;
  inputs: Record<string, DataPayload>;
  config: Record<string, unknown>;
  agentType: string;
  model?: string;
}

export interface ExecutionEvent {
  type: 'node_started' | 'node_completed' | 'node_failed' | 'execution_completed' | 'execution_failed';
  nodeId?: string;
  timestamp: number;
  data?: unknown;
  error?: string;
}

export type ExecutionHandler = (context: ExecutionContext) => Promise<NodeResult>;
export type ExecutionEventListener = (event: ExecutionEvent) => void;

export class ExecutionQueue {
  private executionPlan: ExecutionPlan;
  private options: ExecutionOptions;
  private eventListeners: ExecutionEventListener[] = [];
  private runningTasks: Map<string, Promise<void>> = new Map();
  private nodeResults: Map<string, NodeResult> = new Map();
  private executionHandler?: ExecutionHandler;
  private isExecuting = false;
  private executionStartTime = 0;

  constructor(executionPlan: ExecutionPlan, options: Partial<ExecutionOptions> = {}) {
    this.executionPlan = executionPlan;
    this.options = {
      maxConcurrentNodes: 3,
      executionTimeout: 60000, // 1 minute
      retryAttempts: 2,
      retryDelay: 1000,
      ...options
    };
  }

  /**
   * Set the execution handler for node processing
   */
  setExecutionHandler(handler: ExecutionHandler): void {
    this.executionHandler = handler;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: ExecutionEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: ExecutionEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit execution event
   */
  private emitEvent(event: ExecutionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in execution event listener:', error);
      }
    });
  }

  /**
   * Start execution of the workflow
   */
  async execute(): Promise<{
    success: boolean;
    results: Map<string, NodeResult>;
    executionTime: number;
    error?: string;
  }> {
    if (this.isExecuting) {
      throw new Error('Execution already in progress');
    }

    if (!this.executionHandler) {
      throw new Error('No execution handler set');
    }

    // Validate execution plan
    const validation = DAGEngine.validateExecutionPlan(this.executionPlan);
    if (!validation.valid) {
      return {
        success: false,
        results: new Map(),
        executionTime: 0,
        error: `Invalid execution plan: ${validation.errors.join(', ')}`
      };
    }

    this.isExecuting = true;
    this.executionStartTime = Date.now();
    this.nodeResults.clear();
    this.runningTasks.clear();

    try {
      await this.executeWorkflow();
      
      const executionTime = Date.now() - this.executionStartTime;
      
      this.emitEvent({
        type: 'execution_completed',
        timestamp: Date.now(),
        data: { executionTime, nodeCount: this.executionPlan.nodes.length }
      });

      return {
        success: true,
        results: new Map(this.nodeResults),
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - this.executionStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.emitEvent({
        type: 'execution_failed',
        timestamp: Date.now(),
        error: errorMessage
      });

      return {
        success: false,
        results: new Map(this.nodeResults),
        executionTime,
        error: errorMessage
      };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Main workflow execution loop
   */
  private async executeWorkflow(): Promise<void> {
    while (!DAGEngine.isExecutionComplete(this.executionPlan)) {
      // Check if execution is blocked
      if (DAGEngine.isExecutionBlocked(this.executionPlan)) {
        throw new Error('Execution blocked: no nodes available to run');
      }

      // Get nodes that can run in parallel
      const readyNodes = DAGEngine.getParallelExecutionBatch(this.executionPlan);
      
      if (readyNodes.length === 0) {
        // Wait for running tasks to complete
        if (this.runningTasks.size > 0) {
          await Promise.race(Array.from(this.runningTasks.values()));
          continue;
        } else {
          break; // No ready nodes and no running tasks
        }
      }

      // Limit concurrent execution
      const availableSlots = this.options.maxConcurrentNodes - this.runningTasks.size;
      const nodesToExecute = readyNodes.slice(0, availableSlots);

      // Start executing nodes
      const executionPromises = nodesToExecute.map(node => this.executeNode(node));
      
      // Wait for at least one to complete if we're at capacity
      if (this.runningTasks.size >= this.options.maxConcurrentNodes) {
        await Promise.race(Array.from(this.runningTasks.values()));
      }
    }

    // Wait for all remaining tasks to complete
    if (this.runningTasks.size > 0) {
      await Promise.all(Array.from(this.runningTasks.values()));
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(executionNode: ExecutionNode): Promise<void> {
    const { id, node } = executionNode;
    
    // Mark node as running
    DAGEngine.updateNodeStatus(this.executionPlan, id, 'running');
    
    this.emitEvent({
      type: 'node_started',
      nodeId: id,
      timestamp: Date.now()
    });

    const executeWithRetry = async (attempts: number): Promise<NodeResult> => {
      try {
        return await this.executeNodeWithTimeout(executionNode);
      } catch (error) {
        if (attempts > 0) {
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
          return executeWithRetry(attempts - 1);
        }
        throw error;
      }
    };

    const executionPromise = executeWithRetry(this.options.retryAttempts)
      .then(result => {
        // Node completed successfully
        this.nodeResults.set(id, result);
        DAGEngine.updateNodeStatus(this.executionPlan, id, 'completed');
        
        this.emitEvent({
          type: 'node_completed',
          nodeId: id,
          timestamp: Date.now(),
          data: result
        });
      })
      .catch(error => {
        // Node failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        DAGEngine.updateNodeStatus(this.executionPlan, id, 'error', errorMessage);
        
        this.emitEvent({
          type: 'node_failed',
          nodeId: id,
          timestamp: Date.now(),
          error: errorMessage
        });
      })
      .finally(() => {
        // Clean up running task
        this.runningTasks.delete(id);
      });

    this.runningTasks.set(id, executionPromise);
  }

  /**
   * Execute node with timeout
   */
  private async executeNodeWithTimeout(executionNode: ExecutionNode): Promise<NodeResult> {
    const { id, node } = executionNode;
    const nodeData = node.data as AgentNodeData;

    // Prepare inputs by collecting data from dependencies
    const inputs = await this.collectNodeInputs(executionNode);

    // Create execution context
    const context: ExecutionContext = {
      nodeId: id,
      inputs,
      config: nodeData.config,
      agentType: nodeData.agentType,
      model: nodeData.model
    };

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Node execution timeout after ${this.options.executionTimeout}ms`));
      }, this.options.executionTimeout);
    });

    const executionPromise = this.executionHandler!(context);

    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Collect inputs for a node from its dependencies
   */
  private async collectNodeInputs(executionNode: ExecutionNode): Promise<Record<string, DataPayload>> {
    const inputs: Record<string, DataPayload> = {};

    // For each dependency, get the output data
    for (const depId of executionNode.dependencies) {
      const depResult = this.nodeResults.get(depId);
      if (depResult && depResult.outputs) {
        // Merge outputs from dependency
        Object.entries(depResult.outputs).forEach(([key, payload]) => {
          // Transform data if needed based on target port requirements
          // For now, pass through as-is
          inputs[key] = payload;
        });
      }
    }

    return inputs;
  }

  /**
   * Stop execution (cancels running tasks)
   */
  async stop(): Promise<void> {
    if (!this.isExecuting) return;

    this.isExecuting = false;
    
    // Cancel all running tasks (note: this doesn't actually cancel Promises)
    // In a real implementation, you'd need proper cancellation tokens
    this.runningTasks.clear();
    
    this.emitEvent({
      type: 'execution_failed',
      timestamp: Date.now(),
      error: 'Execution stopped by user'
    });
  }

  /**
   * Get current execution progress
   */
  getProgress(): {
    total: number;
    completed: number;
    running: number;
    pending: number;
    failed: number;
    percentage: number;
  } {
    const stats = DAGEngine.getExecutionStats(this.executionPlan);
    
    return {
      total: stats.total,
      completed: stats.completed,
      running: stats.running,
      pending: stats.pending,
      failed: stats.error,
      percentage: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
    };
  }

  /**
   * Get execution plan (read-only)
   */
  getExecutionPlan(): Readonly<ExecutionPlan> {
    return this.executionPlan;
  }

  /**
   * Get node results
   */
  getNodeResults(): ReadonlyMap<string, NodeResult> {
    return new Map(this.nodeResults);
  }

  /**
   * Check if execution is currently running
   */
  isRunning(): boolean {
    return this.isExecuting;
  }
}