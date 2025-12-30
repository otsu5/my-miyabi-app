/**
 * Miyabi Framework Type Definitions
 */

// ============================================================================
// Miyabi Task Types
// ============================================================================

export type MiyabiTaskType =
  | 'fix-bug'
  | 'add-feature'
  | 'refactor'
  | 'deploy'
  | 'review-pr'
  | 'security-scan'
  | 'test'
  | 'documentation';

export type MiyabiTaskStatus =
  | 'pending'
  | 'analyzing'
  | 'implementing'
  | 'reviewing'
  | 'testing'
  | 'deploying'
  | 'done'
  | 'blocked'
  | 'paused';

export interface MiyabiTask {
  id: string;
  issueNumber?: number;
  title: string;
  description: string;
  type: MiyabiTaskType;
  status: MiyabiTaskStatus;
  assignedAgent?: string;
  priority: 'P0-Critical' | 'P1-High' | 'P2-Medium' | 'P3-Low';
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface MiyabiDAGNode {
  id: string;
  type: MiyabiTaskType;
  agent: string; // Agent name
  dependencies: string[];
  estimate: number; // minutes
  task: MiyabiTask;
}

export interface MiyabiDAG {
  nodes: MiyabiDAGNode[];
  edges: Array<{ from: string; to: string }>;
  levels: string[][]; // Task IDs grouped by execution level
  totalEstimate: number; // minutes
}

export interface ExecutionContext {
  dagId: string;
  currentLevel: number;
  totalLevels: number;
  tasksCompleted: number;
  tasksFailed: number;
  startTime: Date;
}

// ============================================================================
// GitHub Integration Types
// ============================================================================

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'completed' | 'failed';
  currentTask?: string;
}

export interface CoordinatorAgentResult {
  dag: MiyabiDAG;
  executionPlan: string[];
  estimatedDuration: number;
}

export interface CodeGenAgentResult {
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  tests: Array<{
    path: string;
    content: string;
  }>;
}

export interface ReviewAgentResult {
  score: number; // 0-100
  passed: boolean;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    file?: string;
    line?: number;
  }>;
}

export interface TestAgentResult {
  passed: boolean;
  coverage: number;
  results: Array<{
    testName: string;
    passed: boolean;
    duration: number;
  }>;
}

export interface DeploymentAgentResult {
  deploymentId: string;
  environment: 'staging' | 'production';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  logs: string[];
}
