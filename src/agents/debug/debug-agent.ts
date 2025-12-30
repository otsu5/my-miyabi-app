/**
 * DebugAgent (蛍/ほたる)
 * Lightweight runtime debugger for Miyabi agents
 * No LLM required - Uses static analysis and log instrumentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'crypto';
import { LogInstrumenter } from './log-instrumenter';
import { A2ABridge } from './a2a-bridge';

export interface InstrumentationPoint {
  file: string;
  line: number;
  variables: string[];
}

export interface DebugSession {
  sessionId: string;
  taskId: string;
  startTime: Date;
  instrumentedFiles: Map<string, string>; // filepath → original content
  logEntries: LogEntry[];
  status: 'idle' | 'instrumented' | 'collecting' | 'completed';
}

export interface LogEntry {
  timestamp: Date;
  file: string;
  line: number;
  variables: Record<string, unknown>;
  message: string;
}

export interface DebugReport {
  sessionId: string;
  taskId: string;
  duration: number;
  instrumentedFilesCount: number;
  logsCollectedCount: number;
  logEntries: LogEntry[];
  cleanedUp: boolean;
  timestamp: Date;
}

export class DebugAgent {
  private sessions: Map<string, DebugSession> = new Map();
  private instrumenter: LogInstrumenter = new LogInstrumenter();
  private bridge: A2ABridge | null = null;
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: { timeout?: number; maxRetries?: number; enableA2A?: boolean } = {}) {
    this.config = {
      timeout: 60000, // 60 seconds
      maxRetries: 1,
      enableA2A: false,
      ...config,
    };

    // Initialize A2A bridge if enabled
    if (this.config.enableA2A) {
      this.bridge = new A2ABridge();
    }
  }

  /**
   * Start debugging session
   */
  async startSession(taskId: string): Promise<DebugSession> {
    const sessionId = uuidv4();

    const session: DebugSession = {
      sessionId,
      taskId,
      startTime: new Date(),
      instrumentedFiles: new Map(),
      logEntries: [],
      status: 'idle',
    };

    this.sessions.set(sessionId, session);

    // Notify A2A bridge if enabled
    if (this.bridge) {
      await this.bridge.sendMessage(
        `[蛍→指揮郎] 開始: デバッグセッション開始 - Task ${taskId}`
      );
    }

    console.log(`[蛍] Session started: ${sessionId} for task ${taskId}`);

    // Set timeout
    const timeoutId = setTimeout(() => {
      this.endSession(sessionId).catch((err) => console.error('Session timeout cleanup error:', err));
    }, this.config.timeout);

    this.timeouts.set(sessionId, timeoutId);

    return session;
  }

  /**
   * Instrument code with log statements
   */
  async instrumentCode(sessionId: string, points: InstrumentationPoint[]): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'idle') {
      throw new Error(`Session not in idle state: ${session.status}`);
    }

    try {
      session.status = 'instrumented';

      // Group points by file
      const fileGroups = new Map<string, InstrumentationPoint[]>();

      for (const point of points) {
        if (!fileGroups.has(point.file)) {
          fileGroups.set(point.file, []);
        }

        fileGroups.get(point.file)!.push(point);
      }

      // Instrument each file
      for (const [filePath, filePoints] of fileGroups) {
        try {
          const originalContent = fs.readFileSync(filePath, 'utf-8');

          // Store original content
          session.instrumentedFiles.set(filePath, originalContent);

          // Instrument file
          const instrumentedContent = this.instrumenter.instrument(filePath, filePoints, originalContent);

          // Write instrumented file
          fs.writeFileSync(filePath, instrumentedContent, 'utf-8');

          console.log(`[蛍] Instrumented ${filePath}: ${filePoints.length} points`);
        } catch (error) {
          console.error(`[蛍] Error instrumenting ${filePath}:`, error);
          throw error;
        }
      }

      // Notify A2A bridge
      if (this.bridge) {
        await this.bridge.sendMessage(
          `[蛍→指揮郎] 計装: ${fileGroups.size}ファイル、${points.length}ポイント`
        );
      }

      return true;
    } catch (error) {
      session.status = 'idle';
      throw error;
    }
  }

  /**
   * Collect logs from execution output
   */
  async collectLogs(sessionId: string, output: string): Promise<LogEntry[]> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'collecting';

    try {
      const logEntries = this.instrumenter.parseLogOutput(output);

      session.logEntries = logEntries;

      // Notify A2A bridge
      if (this.bridge) {
        await this.bridge.sendMessage(
          `[蛍→指揮郎] ログ: ${logEntries.length}件収集 - Task ${session.taskId}`
        );
      }

      console.log(`[蛍] Collected ${logEntries.length} log entries`);

      return logEntries;
    } catch (error) {
      console.error('[蛍] Error collecting logs:', error);
      throw error;
    }
  }

  /**
   * Cleanup - restore original files
   */
  async cleanup(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Restore original files
      for (const [filePath, originalContent] of session.instrumentedFiles) {
        fs.writeFileSync(filePath, originalContent, 'utf-8');
        console.log(`[蛍] Restored ${filePath}`);
      }

      // Clear instrumented files
      session.instrumentedFiles.clear();

      return true;
    } catch (error) {
      console.error('[蛍] Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * End session and generate report
   */
  async endSession(sessionId: string): Promise<DebugReport> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Cleanup
      const cleanedUp = await this.cleanup(sessionId);

      // Generate report
      const duration = new Date().getTime() - session.startTime.getTime();

      const report: DebugReport = {
        sessionId,
        taskId: session.taskId,
        duration,
        instrumentedFilesCount: session.instrumentedFiles.size,
        logsCollectedCount: session.logEntries.length,
        logEntries: session.logEntries,
        cleanedUp,
        timestamp: new Date(),
      };

      // Notify A2A bridge
      if (this.bridge) {
        await this.bridge.sendMessage(
          `[蛍→指揮郎] 完了: デバッグ完了 - ${session.logEntries.length}件ログ、${duration}ms`
        );
      }

      console.log(`[蛍] Session completed: ${sessionId}`);
      console.log(
        `[蛍] Report: ${session.instrumentedFiles.size} files, ${session.logEntries.length} logs`
      );

      // Clear timeout
      const timeoutId = this.timeouts.get(sessionId);

      if (timeoutId) {
        clearTimeout(timeoutId);
        this.timeouts.delete(sessionId);
      }

      // Remove session
      this.sessions.delete(sessionId);

      return report;
    } catch (error) {
      console.error('[蛍] Error ending session:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cancel session
   */
  async cancelSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      await this.cleanup(sessionId);

      // Clear timeout
      const timeoutId = this.timeouts.get(sessionId);

      if (timeoutId) {
        clearTimeout(timeoutId);
        this.timeouts.delete(sessionId);
      }

      this.sessions.delete(sessionId);
    }
  }
}
