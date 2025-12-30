/**
 * A2A Adapter
 * Main integration layer between Miyabi and A2A protocol
 */

import * as A2ATypes from '../types/a2a';
import * as MiyabiTypes from '../types/miyabi';
import { A2AClient } from './client';
import { A2AConverter } from './converter';

export class A2AAdapter {
  private client: A2AClient;
  private taskMapping: Map<string, string> = new Map(); // Miyabi taskId → A2A taskId
  private reverseTaskMapping: Map<string, string> = new Map(); // A2A taskId → Miyabi taskId

  constructor(config: A2ATypes.A2AAdapterConfig = {}) {
    this.client = new A2AClient(config);
  }

  /**
   * Call external A2A-compatible agent
   */
  async callExternalAgent(
    externalAgentId: string,
    miyabiTask: MiyabiTypes.MiyabiTask
  ): Promise<{
    success: boolean;
    taskId: string;
    status: MiyabiTypes.MiyabiTaskStatus;
    error?: string;
  }> {
    try {
      // Convert Miyabi task to A2A task
      const a2aTask = A2AConverter.convertMiyabiToA2A(miyabiTask);

      // Send task to external agent
      const response = await this.client.sendTask(externalAgentId, a2aTask);

      // Map task IDs
      this.taskMapping.set(miyabiTask.id, response.taskId);
      this.reverseTaskMapping.set(response.taskId, miyabiTask.id);

      // Convert status
      const status = A2AConverter.convertA2AResponseToMiyabiStatus({
        taskId: response.taskId,
        status: response.status,
      });

      return {
        success: true,
        taskId: response.taskId,
        status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`Error calling external agent ${externalAgentId}:`, errorMessage);

      return {
        success: false,
        taskId: miyabiTask.id,
        status: 'blocked',
        error: errorMessage,
      };
    }
  }

  /**
   * Get status from external agent
   */
  async getExternalTaskStatus(
    externalAgentId: string,
    a2aTaskId: string
  ): Promise<{
    status: MiyabiTypes.MiyabiTaskStatus;
    progress?: number;
    result?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const response = await this.client.getTaskStatus(externalAgentId, a2aTaskId);

      return {
        status: A2AConverter.convertA2AResponseToMiyabiStatus(response),
        progress: response.progress,
        result: response.result,
        error: response.error?.message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        status: 'blocked',
        error: errorMessage,
      };
    }
  }

  /**
   * Cancel external task
   */
  async cancelExternalTask(
    externalAgentId: string,
    a2aTaskId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.client.cancelTask(externalAgentId, a2aTaskId);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Process DAG with external agent support
   */
  async processDAGWithExternalAgents(
    dag: MiyabiTypes.MiyabiDAG,
    externalAgentConfig: Map<string, string> // taskId → externalAgentId
  ): Promise<{
    success: boolean;
    results: Map<string, { status: MiyabiTypes.MiyabiTaskStatus; result?: unknown }>;
    errors: string[];
  }> {
    const results = new Map<string, { status: MiyabiTypes.MiyabiTaskStatus; result?: unknown }>();
    const errors: string[] = [];

    // Process each level
    for (const level of dag.levels) {
      const levelTasks = dag.nodes.filter((node) => level.includes(node.id));

      // Process tasks in parallel
      const promises = levelTasks.map(async (node) => {
        const externalAgentId = externalAgentConfig.get(node.id);

        if (externalAgentId) {
          // Use external agent
          const response = await this.callExternalAgent(externalAgentId, node.task);

          if (!response.success) {
            errors.push(`${node.id}: ${response.error}`);
          }

          results.set(node.id, {
            status: response.status,
          });
        } else {
          // Use internal agent (not implemented here)
          results.set(node.id, {
            status: 'pending',
          });
        }
      });

      await Promise.all(promises);

      // Check for failures
      const hasFailed = Array.from(results.values()).some(
        (r) => r.status === 'blocked' || r.status === 'paused'
      );

      if (hasFailed) {
        return {
          success: false,
          results,
          errors,
        };
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * Create A2A adapter for specific agent
   */
  createAgentAdapter(agentId: string): AgentA2AAdapter {
    return new AgentA2AAdapter(this.client, agentId);
  }

  /**
   * Get task mapping (Miyabi → A2A)
   */
  getTaskMapping(miyabiTaskId: string): string | undefined {
    return this.taskMapping.get(miyabiTaskId);
  }

  /**
   * Get reverse task mapping (A2A → Miyabi)
   */
  getReverseTaskMapping(a2aTaskId: string): string | undefined {
    return this.reverseTaskMapping.get(a2aTaskId);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.client.clearCache();
    this.taskMapping.clear();
    this.reverseTaskMapping.clear();
  }
}

/**
 * Per-Agent A2A Adapter
 */
export class AgentA2AAdapter {
  constructor(private client: A2AClient, private agentId: string) {}

  /**
   * Execute capability
   */
  async executeCapability(
    capability: string,
    input: Record<string, unknown>
  ): Promise<A2ATypes.TaskResponse> {
    const task: A2ATypes.A2ATask = {
      taskId: `${this.agentId}-${Date.now()}`,
      capability,
      input,
    };

    return this.client.sendTask(this.agentId, task);
  }

  /**
   * Poll task status
   */
  async pollTaskStatus(
    taskId: string,
    interval: number = 1000,
    maxAttempts: number = 60
  ): Promise<A2ATypes.TaskResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.client.getTaskStatus(this.agentId, taskId);

      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
      attempts++;
    }

    throw new Error(`Task ${taskId} did not complete within timeout`);
  }

  /**
   * Execute and wait for completion
   */
  async executeAndWait(
    capability: string,
    input: Record<string, unknown>,
    options: {
      pollInterval?: number;
      maxAttempts?: number;
    } = {}
  ): Promise<A2ATypes.TaskResponse> {
    const { pollInterval = 1000, maxAttempts = 60 } = options;

    // Execute task
    const response = await this.executeCapability(capability, input);

    if (response.status === 'COMPLETED' || response.status === 'FAILED') {
      return response;
    }

    // Poll for completion
    return this.pollTaskStatus(response.taskId, pollInterval, maxAttempts);
  }

  /**
   * Get agent info
   */
  getAgentId(): string {
    return this.agentId;
  }
}
