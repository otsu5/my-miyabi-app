/**
 * A2A Task Converter
 * Converts between Miyabi tasks and A2A tasks
 */

import * as A2ATypes from '../types/a2a';
import * as MiyabiTypes from '../types/miyabi';

export class A2AConverter {
  /**
   * Convert Miyabi task to A2A task
   */
  static convertMiyabiToA2A(task: MiyabiTypes.MiyabiTask): A2ATypes.A2ATask {
    return {
      taskId: task.id,
      capability: this.mapTaskTypeToCapability(task.type),
      input: {
        title: task.title,
        description: task.description,
        issueNumber: task.issueNumber,
        priority: task.priority,
        type: task.type,
        metadata: task.metadata,
      },
      metadata: {
        priority: this.mapPriorityToA2A(task.priority),
        tags: [task.type, task.status],
        context: {
          issueNumber: task.issueNumber,
          assignedAgent: task.assignedAgent,
          dependencies: task.dependencies,
        },
      },
    };
  }

  /**
   * Convert A2A task to Miyabi task
   */
  static convertA2AToMiyabi(
    a2aTask: A2ATypes.A2ATask,
    type: MiyabiTypes.MiyabiTaskType
  ): MiyabiTypes.MiyabiTask {
    const input = a2aTask.input as Record<string, unknown>;

    return {
      id: a2aTask.taskId,
      title: (input.title as string) || 'A2A Task',
      description: (input.description as string) || '',
      type,
      status: 'pending',
      priority: (input.priority as MiyabiTypes.MiyabiTask['priority']) || 'P3-Low',
      issueNumber: input.issueNumber as number | undefined,
      metadata: a2aTask.metadata?.context,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Convert A2A task response to Miyabi task status
   */
  static convertA2AResponseToMiyabiStatus(
    response: A2ATypes.TaskResponse
  ): MiyabiTypes.MiyabiTaskStatus {
    const statusMap: Record<A2ATypes.TaskStatus, MiyabiTypes.MiyabiTaskStatus> = {
      SUBMITTED: 'pending',
      WORKING: 'implementing',
      COMPLETED: 'done',
      FAILED: 'blocked',
      CANCELLED: 'paused',
      INPUT_REQUIRED: 'analyzing',
      AUTH_REQUIRED: 'blocked',
      REJECTED: 'blocked',
    };

    return statusMap[response.status] || 'pending';
  }

  /**
   * Convert Miyabi task status to A2A task status
   */
  static convertMiyabiStatusToA2A(
    status: MiyabiTypes.MiyabiTaskStatus
  ): A2ATypes.TaskStatus {
    const statusMap: Record<MiyabiTypes.MiyabiTaskStatus, A2ATypes.TaskStatus> = {
      pending: 'SUBMITTED',
      analyzing: 'WORKING',
      implementing: 'WORKING',
      reviewing: 'WORKING',
      testing: 'WORKING',
      deploying: 'WORKING',
      done: 'COMPLETED',
      blocked: 'FAILED',
      paused: 'CANCELLED',
    };

    return statusMap[status] || 'SUBMITTED';
  }

  /**
   * Map Miyabi task type to A2A capability
   */
  private static mapTaskTypeToCapability(
    taskType: MiyabiTypes.MiyabiTaskType
  ): string {
    const capabilityMap: Record<MiyabiTypes.MiyabiTaskType, string> = {
      'fix-bug': 'fix-bug',
      'add-feature': 'add-feature',
      refactor: 'refactor-code',
      deploy: 'deploy-application',
      'review-pr': 'review-pull-request',
      'security-scan': 'security-scan',
      test: 'run-tests',
      documentation: 'generate-documentation',
    };

    return capabilityMap[taskType];
  }

  /**
   * Map Miyabi priority to A2A priority
   */
  private static mapPriorityToA2A(
    priority: MiyabiTypes.MiyabiTask['priority']
  ): A2ATypes.TaskMetadata['priority'] {
    const priorityMap: Record<MiyabiTypes.MiyabiTask['priority'], A2ATypes.TaskMetadata['priority']> = {
      'P0-Critical': 'CRITICAL',
      'P1-High': 'HIGH',
      'P2-Medium': 'MEDIUM',
      'P3-Low': 'LOW',
    };

    return priorityMap[priority] || 'MEDIUM';
  }

  /**
   * Convert Miyabi DAG to A2A task batch
   */
  static convertDAGToA2ABatch(
    dag: MiyabiTypes.MiyabiDAG
  ): Array<{ level: number; tasks: A2ATypes.A2ATask[] }> {
    return dag.levels.map((taskIds, level) => ({
      level,
      tasks: dag.nodes
        .filter((node) => taskIds.includes(node.id))
        .map((node) => this.convertMiyabiToA2A(node.task)),
    }));
  }

  /**
   * Validate A2A task
   */
  static validateA2ATask(task: A2ATypes.A2ATask): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!task.taskId) {
      errors.push('taskId is required');
    }

    if (!task.capability) {
      errors.push('capability is required');
    }

    if (!task.input) {
      errors.push('input is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Miyabi task
   */
  static validateMiyabiTask(task: MiyabiTypes.MiyabiTask): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!task.id) {
      errors.push('id is required');
    }

    if (!task.title) {
      errors.push('title is required');
    }

    if (!task.type) {
      errors.push('type is required');
    }

    if (!task.status) {
      errors.push('status is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
