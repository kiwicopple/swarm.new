/**
 * DAG (Directed Acyclic Graph) Execution Engine for Digital Bees Swarm
 * Handles workflow execution order, dependency resolution, and parallel execution
 */

import { AgentNode, DataEdge } from '@/lib/types';

export interface ExecutionNode {
  id: string;
  node: AgentNode;
  dependencies: string[];
  dependents: string[];
  level: number; // Execution level for parallel processing
  status: 'pending' | 'ready' | 'running' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface ExecutionPlan {
  nodes: ExecutionNode[];
  levels: string[][]; // Nodes grouped by execution level for parallel execution
  totalLevels: number;
  hasCycles: boolean;
  cycles?: string[][];
}

export class DAGEngine {
  /**
   * Create an execution plan from workflow nodes and edges
   */
  static createExecutionPlan(nodes: AgentNode[], edges: DataEdge[]): ExecutionPlan {
    // Build dependency graph
    const dependencyMap = new Map<string, Set<string>>();
    const dependentMap = new Map<string, Set<string>>();
    
    // Initialize maps
    nodes.forEach(node => {
      dependencyMap.set(node.id, new Set());
      dependentMap.set(node.id, new Set());
    });

    // Build dependency relationships from edges
    edges.forEach(edge => {
      const sourceDeps = dependentMap.get(edge.source);
      const targetDeps = dependencyMap.get(edge.target);
      
      if (sourceDeps && targetDeps) {
        sourceDeps.add(edge.target);
        targetDeps.add(edge.source);
      }
    });

    // Detect cycles using DFS
    const { hasCycles, cycles } = this.detectCycles(nodes, dependencyMap);
    
    if (hasCycles) {
      return {
        nodes: [],
        levels: [],
        totalLevels: 0,
        hasCycles: true,
        cycles
      };
    }

    // Perform topological sort to get execution levels
    const levels = this.topologicalSort(nodes, dependencyMap);
    
    // Create execution nodes
    const executionNodes: ExecutionNode[] = nodes.map(node => ({
      id: node.id,
      node,
      dependencies: Array.from(dependencyMap.get(node.id) || []),
      dependents: Array.from(dependentMap.get(node.id) || []),
      level: this.getNodeLevel(node.id, levels),
      status: 'pending'
    }));

    return {
      nodes: executionNodes,
      levels,
      totalLevels: levels.length,
      hasCycles: false
    };
  }

  /**
   * Detect cycles in the dependency graph using DFS
   */
  private static detectCycles(
    nodes: AgentNode[], 
    dependencyMap: Map<string, Set<string>>
  ): { hasCycles: boolean; cycles: string[][] } {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found cycle - extract it from path
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart).concat(nodeId));
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const dependencies = dependencyMap.get(nodeId) || new Set();
      for (const dep of dependencies) {
        if (dfs(dep, [...path])) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    let hasCycles = false;
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id, [])) {
          hasCycles = true;
        }
      }
    }

    return { hasCycles, cycles };
  }

  /**
   * Perform topological sort using Kahn's algorithm
   * Returns nodes grouped by execution level
   */
  private static topologicalSort(
    nodes: AgentNode[], 
    dependencyMap: Map<string, Set<string>>
  ): string[][] {
    const levels: string[][] = [];
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    // Calculate in-degrees
    nodes.forEach(node => {
      inDegree.set(node.id, (dependencyMap.get(node.id) || new Set()).size);
      
      // Nodes with no dependencies can start immediately
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });

    // Process nodes level by level
    while (queue.length > 0) {
      const currentLevel: string[] = [];
      const levelSize = queue.length;
      
      // Process all nodes at current level
      for (let i = 0; i < levelSize; i++) {
        const nodeId = queue.shift()!;
        currentLevel.push(nodeId);
        
        // Update dependencies for dependent nodes
        nodes.forEach(node => {
          const deps = dependencyMap.get(node.id);
          if (deps && deps.has(nodeId)) {
            const newInDegree = (inDegree.get(node.id) || 0) - 1;
            inDegree.set(node.id, newInDegree);
            
            if (newInDegree === 0) {
              queue.push(node.id);
            }
          }
        });
      }
      
      if (currentLevel.length > 0) {
        levels.push(currentLevel);
      }
    }

    return levels;
  }

  /**
   * Get the execution level for a specific node
   */
  private static getNodeLevel(nodeId: string, levels: string[][]): number {
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].includes(nodeId)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get nodes ready for execution (all dependencies completed)
   */
  static getReadyNodes(executionPlan: ExecutionPlan): ExecutionNode[] {
    return executionPlan.nodes.filter(node => {
      if (node.status !== 'pending') return false;
      
      // Check if all dependencies are completed
      return node.dependencies.every(depId => {
        const depNode = executionPlan.nodes.find(n => n.id === depId);
        return depNode?.status === 'completed';
      });
    });
  }

  /**
   * Get nodes that can run in parallel at the current execution state
   */
  static getParallelExecutionBatch(executionPlan: ExecutionPlan): ExecutionNode[] {
    const readyNodes = this.getReadyNodes(executionPlan);
    
    if (readyNodes.length === 0) return [];
    
    // Get the minimum level among ready nodes
    const minLevel = Math.min(...readyNodes.map(node => node.level));
    
    // Return all ready nodes at the minimum level (can run in parallel)
    return readyNodes.filter(node => node.level === minLevel);
  }

  /**
   * Check if execution is complete
   */
  static isExecutionComplete(executionPlan: ExecutionPlan): boolean {
    return executionPlan.nodes.every(node => 
      node.status === 'completed' || node.status === 'error'
    );
  }

  /**
   * Check if execution is blocked (no ready nodes but execution not complete)
   */
  static isExecutionBlocked(executionPlan: ExecutionPlan): boolean {
    if (this.isExecutionComplete(executionPlan)) return false;
    
    const readyNodes = this.getReadyNodes(executionPlan);
    const runningNodes = executionPlan.nodes.filter(n => n.status === 'running');
    
    return readyNodes.length === 0 && runningNodes.length === 0;
  }

  /**
   * Update node status in execution plan
   */
  static updateNodeStatus(
    executionPlan: ExecutionPlan, 
    nodeId: string, 
    status: ExecutionNode['status'],
    error?: string
  ): void {
    const node = executionPlan.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = status;
      if (error) node.error = error;
      
      if (status === 'running') {
        node.startTime = Date.now();
      } else if (status === 'completed' || status === 'error') {
        node.endTime = Date.now();
      }
    }
  }

  /**
   * Get execution statistics
   */
  static getExecutionStats(executionPlan: ExecutionPlan) {
    const stats = {
      total: executionPlan.nodes.length,
      pending: 0,
      ready: 0,
      running: 0,
      completed: 0,
      error: 0,
      totalExecutionTime: 0,
      parallelizationFactor: 0
    };

    executionPlan.nodes.forEach(node => {
      stats[node.status]++;
      
      if (node.startTime && node.endTime) {
        stats.totalExecutionTime += node.endTime - node.startTime;
      }
    });

    // Calculate ready nodes
    stats.ready = this.getReadyNodes(executionPlan).length;
    
    // Calculate parallelization factor (average nodes per level)
    if (executionPlan.levels.length > 0) {
      const totalNodesInLevels = executionPlan.levels.reduce((sum, level) => sum + level.length, 0);
      stats.parallelizationFactor = totalNodesInLevels / executionPlan.levels.length;
    }

    return stats;
  }

  /**
   * Validate execution plan
   */
  static validateExecutionPlan(executionPlan: ExecutionPlan): { 
    valid: boolean; 
    errors: string[] 
  } {
    const errors: string[] = [];

    // Check for cycles
    if (executionPlan.hasCycles) {
      errors.push(`Workflow contains cycles: ${JSON.stringify(executionPlan.cycles)}`);
    }

    // Check for orphaned nodes (no path to completion)
    const reachableNodes = new Set<string>();
    executionPlan.levels.forEach(level => {
      level.forEach(nodeId => reachableNodes.add(nodeId));
    });

    executionPlan.nodes.forEach(node => {
      if (!reachableNodes.has(node.id)) {
        errors.push(`Node ${node.id} is not reachable in execution plan`);
      }
    });

    // Check for missing dependencies
    executionPlan.nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        if (!executionPlan.nodes.find(n => n.id === depId)) {
          errors.push(`Node ${node.id} depends on missing node ${depId}`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}