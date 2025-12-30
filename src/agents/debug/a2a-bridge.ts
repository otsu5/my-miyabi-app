/**
 * A2A Bridge
 * Real-time communication between Debug Agent and other Miyabi agents
 * Based on tmux pane communication
 */

import { execSync } from 'child_process';

export interface A2AEnvironment {
  MIYABI_DEBUG_PANE?: string;
  MIYABI_CODEGEN_PANE?: string;
  MIYABI_CONDUCTOR_PANE?: string;
}

export class A2ABridge {
  private a2aEnv: A2AEnvironment = {};

  constructor() {
    // Load A2A environment from process.env
    this.loadEnvironment();
  }

  /**
   * Load A2A environment variables
   */
  private loadEnvironment(): void {
    this.a2aEnv = {
      MIYABI_DEBUG_PANE: process.env.MIYABI_DEBUG_PANE,
      MIYABI_CODEGEN_PANE: process.env.MIYABI_CODEGEN_PANE,
      MIYABI_CONDUCTOR_PANE: process.env.MIYABI_CONDUCTOR_PANE,
    };
  }

  /**
   * Send message to target pane (real-time push notification)
   */
  async sendMessage(message: string, targetPaneId?: string): Promise<void> {
    const paneId = targetPaneId || this.getConductorPaneId();

    if (!paneId) {
      console.warn('[蛍→A2A] Warning: No target pane ID available');
      return;
    }

    try {
      // Send message via tmux
      execSync(`tmux send-keys -t ${paneId} '${this.escapeShellString(message)}' && sleep 0.1 && tmux send-keys -t ${paneId} Enter`, {
        stdio: 'pipe',
      });

      console.log(`[蛍→A2A] Message sent to pane ${paneId}`);
    } catch (error) {
      console.warn('[蛍→A2A] Warning: Failed to send message', error);
      // Don't throw - this is optional for A2A support
    }
  }

  /**
   * Send debug log entry to CodeGen agent
   */
  async sendDebugInfo(
    taskId: string,
    file: string,
    line: number,
    variables: Record<string, unknown>
  ): Promise<void> {
    const codegenPaneId = this.getCodeGenPaneId();

    if (!codegenPaneId) {
      return;
    }

    const message = `[蛍] DEBUG: ${taskId} @ ${file}:${line} - ${JSON.stringify(variables)}`;

    await this.sendMessage(message, codegenPaneId);
  }

  /**
   * Notify completion
   */
  async notifyCompletion(
    taskId: string,
    logCount: number,
    duration: number
  ): Promise<void> {
    const conductorPaneId = this.getConductorPaneId();

    if (!conductorPaneId) {
      return;
    }

    const message = `[蛍] COMPLETE: Task ${taskId} - ${logCount} logs in ${duration}ms`;

    await this.sendMessage(message, conductorPaneId);
  }

  /**
   * Get Debug pane ID
   */
  private getDebugPaneId(): string | undefined {
    return this.a2aEnv.MIYABI_DEBUG_PANE || process.env.MIYABI_DEBUG_PANE;
  }

  /**
   * Get CodeGen pane ID
   */
  private getCodeGenPaneId(): string | undefined {
    return this.a2aEnv.MIYABI_CODEGEN_PANE || process.env.MIYABI_CODEGEN_PANE;
  }

  /**
   * Get Conductor pane ID
   */
  private getConductorPaneId(): string | undefined {
    return this.a2aEnv.MIYABI_CONDUCTOR_PANE || process.env.MIYABI_CONDUCTOR_PANE;
  }

  /**
   * Escape shell string
   */
  private escapeShellString(str: string): string {
    return str.replace(/'/g, "'\\''");
  }

  /**
   * Check if A2A environment is available
   */
  isAvailable(): boolean {
    return !!(
      this.getDebugPaneId() ||
      this.getCodeGenPaneId() ||
      this.getConductorPaneId()
    );
  }

  /**
   * Get environment info
   */
  getEnvironmentInfo(): A2AEnvironment {
    return { ...this.a2aEnv };
  }
}
