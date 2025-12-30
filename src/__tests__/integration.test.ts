/**
 * Integration Tests: A2A + Debug Agent
 */

import { A2AAdapter } from '../a2a/adapter';
import { A2AConverter } from '../a2a/converter';
import { DebugAgent } from '../agents/debug/debug-agent';
import * as MiyabiTypes from '../types/miyabi';
import * as A2ATypes from '../types/a2a';

describe('A2A + Debug Agent Integration', () => {
  let adapter: A2AAdapter;
  let debugAgent: DebugAgent;

  beforeEach(() => {
    adapter = new A2AAdapter();
    debugAgent = new DebugAgent({ enableA2A: false }); // Disable A2A in tests
  });

  describe('A2A Converter', () => {
    it('should convert Miyabi task to A2A task', () => {
      const miyabiTask: MiyabiTypes.MiyabiTask = {
        id: 'task-001',
        title: 'Fix login bug',
        description: 'User cannot log in',
        type: 'fix-bug',
        status: 'pending',
        priority: 'P1-High',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const a2aTask = A2AConverter.convertMiyabiToA2A(miyabiTask);

      expect(a2aTask.taskId).toBe('task-001');
      expect(a2aTask.capability).toBe('fix-bug');
      expect(a2aTask.input.title).toBe('Fix login bug');
      expect(a2aTask.metadata?.priority).toBe('HIGH');
    });

    it('should convert A2A status to Miyabi status', () => {
      const status = A2AConverter.convertA2AResponseToMiyabiStatus({
        taskId: 'task-001',
        status: 'WORKING',
      });

      expect(status).toBe('implementing');
    });

    it('should validate A2A task', () => {
      const validTask: A2ATypes.A2ATask = {
        taskId: 'task-001',
        capability: 'fix-bug',
        input: { title: 'Fix bug' },
      };

      const validation = A2AConverter.validateA2ATask(validTask);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject invalid A2A task', () => {
      const invalidTask = {
        taskId: '',
        capability: '',
        input: {},
      };

      const validation = A2AConverter.validateA2ATask(invalidTask as A2ATypes.A2ATask);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Debug Agent', () => {
    it('should start debug session', async () => {
      const session = await debugAgent.startSession('task-001');

      expect(session.sessionId).toBeDefined();
      expect(session.taskId).toBe('task-001');
      expect(session.status).toBe('idle');

      await debugAgent.cancelSession(session.sessionId);
    });

    it('should collect logs', async () => {
      const session = await debugAgent.startSession('task-001');

      const output = `
        [蛍] Line 42: x: 5, y: "hello"
        [蛍] Line 58: result: [1,2,3]
      `;

      const logs = await debugAgent.collectLogs(session.sessionId, output);

      expect(logs.length).toBe(2);
      expect(logs[0].line).toBe(42);
      expect(logs[1].line).toBe(58);

      await debugAgent.cancelSession(session.sessionId);
    });

    it('should end session and generate report', async () => {
      const session = await debugAgent.startSession('task-001');

      const output = '[蛍] Line 42: x: 5, y: "hello"';

      await debugAgent.collectLogs(session.sessionId, output);

      const report = await debugAgent.endSession(session.sessionId);

      expect(report.sessionId).toBe(session.sessionId);
      expect(report.taskId).toBe('task-001');
      expect(report.logsCollectedCount).toBe(1);
      expect(report.cleanedUp).toBe(true);
    });

    it('should perform health check', async () => {
      const healthy = await debugAgent.healthCheck();

      expect(healthy).toBe(true);
    });
  });

  describe('A2A Adapter', () => {
    it('should create agent adapter', () => {
      const agentAdapter = adapter.createAgentAdapter('external-agent-001');

      expect(agentAdapter.getAgentId()).toBe('external-agent-001');
    });

    it('should handle task mapping', async () => {
      const miyabiTask: MiyabiTypes.MiyabiTask = {
        id: 'miyabi-task-001',
        title: 'Test task',
        description: '',
        type: 'add-feature',
        status: 'pending',
        priority: 'P2-Medium',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate mapping
      const mapping = adapter.getTaskMapping('miyabi-task-001');

      expect(mapping).toBeUndefined(); // No mapping yet
    });

    it('should clear cache', () => {
      adapter.clearCache();

      expect(adapter.getTaskMapping('any-id')).toBeUndefined();
    });
  });

  describe('Full Integration Flow', () => {
    it('should perform complete debug session flow', async () => {
      // 1. Start session
      const session = await debugAgent.startSession('integration-test');

      expect(session.status).toBe('idle');

      // 2. Simulate log collection
      const mockOutput = `
        [蛍] Line 10: count: 0
        [蛍] Line 15: count: 1
        [蛍] Line 20: count: 2
      `;

      const logs = await debugAgent.collectLogs(session.sessionId, mockOutput);

      expect(logs.length).toBe(3);

      // 3. End session
      const report = await debugAgent.endSession(session.sessionId);

      expect(report.logsCollectedCount).toBe(3);
      expect(report.cleanedUp).toBe(true);
      expect(report.duration).toBeGreaterThan(0);
    });

    it('should convert Miyabi DAG for external execution', () => {
      const dag: MiyabiTypes.MiyabiDAG = {
        nodes: [
          {
            id: 'task-1',
            type: 'fix-bug',
            agent: 'CodeGenAgent',
            dependencies: [],
            estimate: 30,
            task: {
              id: 'task-1',
              title: 'Fix bug',
              description: '',
              type: 'fix-bug',
              status: 'pending',
              priority: 'P1-High',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
        edges: [],
        levels: [['task-1']],
        totalEstimate: 30,
      };

      const a2aBatch = A2AConverter.convertDAGToA2ABatch(dag);

      expect(a2aBatch.length).toBe(1);
      expect(a2aBatch[0].level).toBe(0);
      expect(a2aBatch[0].tasks.length).toBe(1);
    });
  });
});
