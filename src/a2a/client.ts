/**
 * A2A Protocol Client
 * Handles communication with A2A-compatible agents
 */

import * as A2ATypes from '../types/a2a';
import { A2AConverter } from './converter';

export class A2AClient {
  private config: A2ATypes.A2AAdapterConfig;
  private requestId: number = 0;
  private agentCardCache: Map<string, A2ATypes.AgentCard> = new Map();

  constructor(config: A2ATypes.A2AAdapterConfig = {}) {
    this.config = {
      timeout: 30000, // 30 seconds
      maxRetries: 3,
      enableSSE: false,
      enableWebhooks: false,
      ...config,
    };
  }

  /**
   * Discover agent by ID
   */
  async discoverAgent(agentId: string): Promise<A2ATypes.AgentCard | null> {
    // Check cache first
    if (this.agentCardCache.has(agentId)) {
      return this.agentCardCache.get(agentId) || null;
    }

    try {
      // Try to fetch from well-known endpoint
      const wellKnownUrl = `https://${agentId}/.well-known/agent-card.json`;
      const response = await this.fetchWithTimeout(wellKnownUrl, { timeout: 5000 });

      if (!response.ok) {
        console.warn(`Failed to fetch agent card for ${agentId}: ${response.status}`);
        return null;
      }

      const agentCard = (await response.json()) as A2ATypes.AgentCard;

      // Validate agent card
      if (!this.validateAgentCard(agentCard)) {
        console.warn(`Invalid agent card for ${agentId}`);
        return null;
      }

      // Cache the result
      this.agentCardCache.set(agentId, agentCard);

      return agentCard;
    } catch (error) {
      console.error(`Error discovering agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Send task to A2A-compatible agent
   */
  async sendTask(
    agentId: string,
    task: A2ATypes.A2ATask
  ): Promise<A2ATypes.TaskResponse> {
    // Discover agent
    const agent = await this.discoverAgent(agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Get endpoint
    const endpoint = agent.endpoints[0];

    if (!endpoint) {
      throw new Error(`No endpoints available for agent: ${agentId}`);
    }

    // Validate task
    const validation = A2AConverter.validateA2ATask(task);

    if (!validation.valid) {
      throw new Error(`Invalid task: ${validation.errors.join(', ')}`);
    }

    // Create JSON-RPC request
    const jsonrpcRequest = this.createJsonRpcRequest('sendTask', {
      task,
      recipientId: agentId,
    });

    try {
      // Send request
      const response = await this.sendJsonRpcRequest(endpoint.url, jsonrpcRequest, endpoint.auth);

      if (response.error) {
        throw new Error(`A2A Error: ${response.error.message}`);
      }

      // Handle result
      const result = response.result as Record<string, unknown>;

      return {
        taskId: result.taskId as string,
        status: result.status as A2ATypes.TaskStatus,
        statusUrl: result.statusUrl as string | undefined,
      };
    } catch (error) {
      console.error('Error sending task:', error);
      throw error;
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(
    agentId: string,
    taskId: string
  ): Promise<A2ATypes.TaskResponse> {
    const agent = await this.discoverAgent(agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const endpoint = agent.endpoints[0];

    if (!endpoint) {
      throw new Error(`No endpoints available for agent: ${agentId}`);
    }

    const jsonrpcRequest = this.createJsonRpcRequest('getTask', {
      taskId,
    });

    try {
      const response = await this.sendJsonRpcRequest(endpoint.url, jsonrpcRequest, endpoint.auth);

      if (response.error) {
        throw new Error(`A2A Error: ${response.error.message}`);
      }

      return response.result as A2ATypes.TaskResponse;
    } catch (error) {
      console.error('Error getting task status:', error);
      throw error;
    }
  }

  /**
   * Cancel task
   */
  async cancelTask(
    agentId: string,
    taskId: string
  ): Promise<A2ATypes.TaskResponse> {
    const agent = await this.discoverAgent(agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const endpoint = agent.endpoints[0];

    if (!endpoint) {
      throw new Error(`No endpoints available for agent: ${agentId}`);
    }

    const jsonrpcRequest = this.createJsonRpcRequest('cancelTask', {
      taskId,
    });

    try {
      const response = await this.sendJsonRpcRequest(endpoint.url, jsonrpcRequest, endpoint.auth);

      if (response.error) {
        throw new Error(`A2A Error: ${response.error.message}`);
      }

      return response.result as A2ATypes.TaskResponse;
    } catch (error) {
      console.error('Error cancelling task:', error);
      throw error;
    }
  }

  /**
   * Subscribe to task updates (SSE)
   */
  async subscribeToTaskUpdates(
    agentId: string,
    taskId: string,
    onUpdate: (update: A2ATypes.TaskUpdate) => void
  ): Promise<void> {
    const agent = await this.discoverAgent(agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const endpoint = agent.endpoints[0];

    if (!endpoint) {
      throw new Error(`No endpoints available for agent: ${agentId}`);
    }

    try {
      const eventSource = new EventSource(`${endpoint.url}/tasks/${taskId}/subscribe`);

      eventSource.addEventListener('task-update', (event) => {
        const messageEvent = event as MessageEvent;
        const update = JSON.parse(messageEvent.data) as A2ATypes.TaskUpdate;
        onUpdate(update);
      });

      eventSource.addEventListener('error', () => {
        eventSource.close();
      });
    } catch (error) {
      console.error('Error subscribing to task updates:', error);
      throw error;
    }
  }

  /**
   * Send JSON-RPC request
   */
  private async sendJsonRpcRequest(
    url: string,
    request: A2ATypes.JSONRPCRequest,
    auth?: A2ATypes.AuthConfig
  ): Promise<A2ATypes.JSONRPCResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers if needed
    if (auth) {
      if (auth.type === 'api-key' && process.env.A2A_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.A2A_API_KEY}`;
      }
    }

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as A2ATypes.JSONRPCResponse;
  }

  /**
   * Create JSON-RPC request
   */
  private createJsonRpcRequest(
    method: string,
    params: Record<string, unknown>
  ): A2ATypes.JSONRPCRequest {
    return {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params,
    };
  }

  /**
   * Validate agent card
   */
  private validateAgentCard(card: A2ATypes.AgentCard): boolean {
    return !!(card.id && card.displayName && card.endpoints && card.endpoints.length > 0);
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<Response> {
    const { timeout = this.config.timeout, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Clear agent cache
   */
  clearCache(): void {
    this.agentCardCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.agentCardCache.size;
  }
}
