/**
 * A2A (Agent-to-Agent) Protocol Type Definitions
 * Based on https://github.com/a2aproject/A2A
 */

// ============================================================================
// Agent Discovery
// ============================================================================

export interface AgentCard {
  id: string;
  displayName: string;
  description: string;
  version?: string;
  endpoints: AgentEndpoint[];
  skills: Skill[];
  signature?: string; // Digital signature
}

export interface AgentEndpoint {
  protocol: 'json-rpc' | 'grpc' | 'rest';
  url: string;
  auth?: AuthConfig;
}

export type AuthType = 'oauth2' | 'api-key' | 'mtls' | 'none';

export interface AuthConfig {
  type: AuthType;
  scopes?: string[];
  clientId?: string;
  discoveryUrl?: string;
}

export interface Skill {
  id: string;
  description: string;
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

// ============================================================================
// Task Management
// ============================================================================

export type TaskStatus =
  | 'SUBMITTED'
  | 'WORKING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'INPUT_REQUIRED'
  | 'AUTH_REQUIRED'
  | 'REJECTED';

export interface A2ATask {
  taskId: string;
  capability: string;
  input: Record<string, unknown>;
  metadata?: TaskMetadata;
}

export interface TaskMetadata {
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeout?: number; // milliseconds
  tags?: string[];
  context?: Record<string, unknown>;
}

export interface TaskResponse {
  taskId: string;
  status: TaskStatus;
  statusUrl?: string;
  result?: Record<string, unknown>;
  error?: TaskError;
  progress?: number; // 0-100
}

export interface TaskError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// JSON-RPC 2.0 Messages
// ============================================================================

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

// ============================================================================
// Streaming & Notifications
// ============================================================================

export interface TaskUpdate {
  taskId: string;
  status: TaskStatus;
  timestamp: Date;
  progress?: number;
  logs?: string[];
}

export interface WebhookNotification {
  taskId: string;
  status: TaskStatus;
  result?: Record<string, unknown>;
  error?: TaskError;
  timestamp: Date;
}

// ============================================================================
// A2A Adapter Types
// ============================================================================

export interface A2AAdapterConfig {
  agentDiscoveryUrl?: string;
  webhookUrl?: string;
  auth?: AuthConfig;
  timeout?: number; // milliseconds
  maxRetries?: number;
  enableSSE?: boolean; // Server-Sent Events
  enableWebhooks?: boolean;
}

export interface A2AContext {
  agentId: string;
  taskId: string;
  capability: string;
  timestamp: Date;
}

export interface A2AConversionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
