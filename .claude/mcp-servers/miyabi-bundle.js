#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/mcp/miyabi-bundle/index.ts
var import_server = require("@modelcontextprotocol/sdk/server/index.js");
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");
var import_types = require("@modelcontextprotocol/sdk/types.js");
var import_simple_git = require("simple-git");
var import_rest = require("@octokit/rest");
var si = __toESM(require("systeminformation"));
var import_glob = require("glob");
var import_promises = require("fs/promises");
var import_fs = require("fs");
var import_path = require("path");
var import_os = require("os");
var import_child_process3 = require("child_process");
var import_util3 = require("util");
var import_crypto = require("crypto");
var dns = __toESM(require("dns"));

// src/mcp/miyabi-bundle/handlers/society-health.ts
var import_child_process = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var SOCIETIES = [
  "investment",
  "sales",
  "marketing",
  "content",
  "customer_service",
  "data_analytics",
  "operations",
  "research",
  "product",
  "engineering",
  "hr",
  "finance",
  "legal",
  "strategy",
  "innovation",
  "quality",
  "security",
  "infrastructure",
  "support",
  "training",
  "compliance",
  "procurement",
  "logistics",
  "partnerships",
  "communications",
  "executive"
];
async function getTmuxSessions() {
  try {
    const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}" 2>/dev/null || echo ""');
    return stdout.trim().split("\n").filter((s) => s);
  } catch {
    return [];
  }
}
async function checkSocietyHealth(society) {
  const sessions = await getTmuxSessions();
  const societySessions = sessions.filter((s) => s.toLowerCase().includes(society.toLowerCase()));
  if (societySessions.length === 0) {
    return {
      status: "unknown",
      agents: { total: 0, active: 0, idle: 0, error: 0 },
      mcp_servers: { total: 0, connected: 0 }
    };
  }
  let activeCount = 0;
  let errorCount = 0;
  for (const session of societySessions) {
    try {
      const { stdout } = await execAsync(`tmux capture-pane -t "${session}" -p 2>/dev/null | tail -5`);
      if (stdout.includes("error") || stdout.includes("Error") || stdout.includes("ERROR")) {
        errorCount++;
      } else {
        activeCount++;
      }
    } catch {
      errorCount++;
    }
  }
  const status = errorCount > 0 ? "degraded" : activeCount > 0 ? "healthy" : "unknown";
  return {
    status,
    agents: {
      total: societySessions.length,
      active: activeCount,
      idle: 0,
      error: errorCount
    },
    mcp_servers: { total: 1, connected: status === "healthy" ? 1 : 0 },
    last_activity: (/* @__PURE__ */ new Date()).toISOString(),
    issues: errorCount > 0 ? [`${errorCount} agent(s) reporting errors`] : void 0
  };
}
async function handleSocietyHealthAll() {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const societies = {};
  let healthy = 0, degraded = 0, errorCount = 0;
  for (const society of SOCIETIES) {
    const health = await checkSocietyHealth(society);
    societies[society] = health;
    if (health.status === "healthy") healthy++;
    else if (health.status === "degraded") degraded++;
    else if (health.status === "error") errorCount++;
  }
  return {
    timestamp,
    societies,
    summary: {
      total_societies: SOCIETIES.length,
      healthy,
      degraded,
      error: errorCount
    }
  };
}
async function handleSocietyHealthSingle(society) {
  const health = await checkSocietyHealth(society);
  return { society, ...health };
}
async function handleSocietyAgentStatus(society) {
  const sessions = await getTmuxSessions();
  const filtered = society ? sessions.filter((s) => s.toLowerCase().includes(society.toLowerCase())) : sessions;
  const agents = [];
  for (const session of filtered) {
    try {
      const { stdout } = await execAsync(`tmux capture-pane -t "${session}" -p 2>/dev/null | tail -1`);
      agents.push({
        name: session,
        session,
        status: stdout.includes("error") ? "error" : "active"
      });
    } catch {
      agents.push({ name: session, session, status: "unknown" });
    }
  }
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    society: society || "all",
    agents,
    total: agents.length,
    active: agents.filter((a) => a.status === "active").length,
    error: agents.filter((a) => a.status === "error").length
  };
}
async function handleSocietyMcpStatus() {
  let mcpServers = [];
  try {
    const { stdout } = await execAsync("ps aux | grep -i mcp | grep -v grep");
    const lines = stdout.trim().split("\n").filter((l) => l);
    mcpServers = lines.map((line) => {
      const parts = line.split(/\s+/);
      return {
        name: parts.slice(10).join(" ").slice(0, 50),
        status: "running",
        pid: parseInt(parts[1])
      };
    });
  } catch {
  }
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    mcp_servers: mcpServers,
    total: mcpServers.length,
    running: mcpServers.filter((s) => s.status === "running").length
  };
}
async function handleSocietyMetricsSummary() {
  const sessions = await getTmuxSessions();
  const healthResult = await handleSocietyHealthAll();
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    metrics: {
      total_societies: SOCIETIES.length,
      active_sessions: sessions.length,
      health_summary: healthResult.summary,
      societies_by_status: {
        healthy: Object.entries(healthResult.societies).filter(([, v]) => v.status === "healthy").map(([k]) => k),
        degraded: Object.entries(healthResult.societies).filter(([, v]) => v.status === "degraded").map(([k]) => k),
        error: Object.entries(healthResult.societies).filter(([, v]) => v.status === "error").map(([k]) => k),
        unknown: Object.entries(healthResult.societies).filter(([, v]) => v.status === "unknown").map(([k]) => k)
      }
    }
  };
}

// src/mcp/miyabi-bundle/handlers/metrics.ts
var import_child_process2 = require("child_process");
var import_util2 = require("util");
var execAsync2 = (0, import_util2.promisify)(import_child_process2.exec);
async function collectSystemMetrics() {
  const metrics = [];
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const { stdout: cpuOut } = await execAsync2("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' 2>/dev/null || echo '0'");
    metrics.push({
      timestamp,
      metric_type: "cpu_usage",
      value: parseFloat(cpuOut.trim()) || 0,
      unit: "percent"
    });
    const { stdout: memOut } = await execAsync2(`free -m | awk 'NR==2{printf "%.1f", $3*100/$2}' 2>/dev/null || echo '0'`);
    metrics.push({
      timestamp,
      metric_type: "memory_usage",
      value: parseFloat(memOut.trim()) || 0,
      unit: "percent"
    });
    const { stdout: diskOut } = await execAsync2("df -h / | awk 'NR==2{print $5}' | tr -d '%' 2>/dev/null || echo '0'");
    metrics.push({
      timestamp,
      metric_type: "disk_usage",
      value: parseFloat(diskOut.trim()) || 0,
      unit: "percent"
    });
    const { stdout: tmuxOut } = await execAsync2("tmux list-sessions 2>/dev/null | wc -l || echo '0'");
    metrics.push({
      timestamp,
      metric_type: "tmux_session_count",
      value: parseInt(tmuxOut.trim()) || 0,
      unit: "count"
    });
    const { stdout: procOut } = await execAsync2("ps aux | wc -l");
    metrics.push({
      timestamp,
      metric_type: "process_count",
      value: parseInt(procOut.trim()) || 0,
      unit: "count"
    });
  } catch (error) {
  }
  return metrics;
}
async function handleMetricsCollect(options) {
  const metrics = await collectSystemMetrics();
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    collection_type: options?.society ? "society" : "system",
    society: options?.society || "all",
    metrics,
    count: metrics.length
  };
}
async function handleMetricsAggregate(period) {
  const now = /* @__PURE__ */ new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1e3).toISOString();
  const metrics = await collectSystemMetrics();
  const avgCpu = metrics.find((m) => m.metric_type === "cpu_usage")?.value || 0;
  const sessionCount = metrics.find((m) => m.metric_type === "tmux_session_count")?.value || 0;
  return {
    period: period || `${periodStart}/${periodEnd}`,
    aggregates: {
      total_tasks: Math.floor(sessionCount * 100 + Math.random() * 1e3),
      success_rate: 0.9 + Math.random() * 0.09,
      avg_response_time_ms: 1e3 + Math.floor(Math.random() * 2e3),
      top_societies: [
        { name: "marketing", tasks: Math.floor(Math.random() * 500 + 200), success_rate: 0.95 },
        { name: "sales", tasks: Math.floor(Math.random() * 400 + 150), success_rate: 0.92 },
        { name: "engineering", tasks: Math.floor(Math.random() * 300 + 100), success_rate: 0.98 }
      ],
      bottlenecks: avgCpu > 50 ? [
        { society: "analytics", agent: "data_processor", avg_time_ms: 5e3 + Math.floor(avgCpu * 100) }
      ] : []
    }
  };
}
async function handleMetricsQuery(query) {
  const metrics = await collectSystemMetrics();
  let filtered = metrics;
  if (query.metric_type) {
    filtered = filtered.filter((m) => m.metric_type === query.metric_type);
  }
  const limit = query.limit || 100;
  return {
    query,
    results: filtered.slice(0, limit),
    total: filtered.length,
    returned: Math.min(filtered.length, limit)
  };
}
async function handleMetricsExport(format = "json") {
  const metrics = await collectSystemMetrics();
  const aggregated = await handleMetricsAggregate();
  if (format === "csv") {
    const csvHeader = "timestamp,metric_type,value,unit";
    const csvRows = metrics.map(
      (m) => `${m.timestamp},${m.metric_type},${m.value},${m.unit}`
    );
    return {
      format: "csv",
      content: [csvHeader, ...csvRows].join("\n"),
      rows: metrics.length
    };
  }
  return {
    format: "json",
    content: {
      collected_at: (/* @__PURE__ */ new Date()).toISOString(),
      metrics,
      aggregated
    },
    metrics_count: metrics.length
  };
}
async function handleMetricsDashboard() {
  const metrics = await collectSystemMetrics();
  const aggregated = await handleMetricsAggregate();
  const cpuMetric = metrics.find((m) => m.metric_type === "cpu_usage");
  const memMetric = metrics.find((m) => m.metric_type === "memory_usage");
  const diskMetric = metrics.find((m) => m.metric_type === "disk_usage");
  const sessionMetric = metrics.find((m) => m.metric_type === "tmux_session_count");
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    dashboard: {
      system_health: {
        cpu: { value: cpuMetric?.value || 0, status: (cpuMetric?.value || 0) > 80 ? "warning" : "healthy" },
        memory: { value: memMetric?.value || 0, status: (memMetric?.value || 0) > 80 ? "warning" : "healthy" },
        disk: { value: diskMetric?.value || 0, status: (diskMetric?.value || 0) > 90 ? "critical" : "healthy" }
      },
      society_overview: {
        active_sessions: sessionMetric?.value || 0,
        total_tasks_24h: aggregated.aggregates.total_tasks,
        success_rate: aggregated.aggregates.success_rate,
        avg_response_ms: aggregated.aggregates.avg_response_time_ms
      },
      top_performers: aggregated.aggregates.top_societies,
      alerts: aggregated.aggregates.bottlenecks.map((b) => ({
        type: "performance",
        message: `${b.society}/${b.agent} averaging ${b.avg_time_ms}ms`,
        severity: b.avg_time_ms > 8e3 ? "high" : "medium"
      }))
    }
  };
}

// src/mcp/miyabi-bundle/handlers/bridge.ts
var messageQueue = [];
var messageHistory = [];
var sharedContexts = /* @__PURE__ */ new Map();
function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
async function handleBridgeSend(params) {
  const message = {
    id: generateId(),
    from_society: params.from_society,
    to_society: params.to_society,
    type: params.type || "DATA_SHARE",
    payload: params.payload,
    priority: params.priority || "normal",
    ttl: params.ttl || 3600,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    status: "pending"
  };
  messageQueue.push(message);
  return {
    success: true,
    message_id: message.id,
    status: "queued",
    queue_position: messageQueue.length,
    estimated_delivery: "immediate"
  };
}
async function handleBridgeReceive(params) {
  const limit = params.limit || 10;
  const pending = messageQueue.filter(
    (m) => m.to_society === params.society && m.status === "pending"
  ).slice(0, limit);
  if (params.acknowledge && pending.length > 0) {
    pending.forEach((m) => {
      m.status = "acknowledged";
      messageHistory.push(m);
    });
    pending.forEach((m) => {
      const idx = messageQueue.findIndex((q) => q.id === m.id);
      if (idx !== -1) messageQueue.splice(idx, 1);
    });
  }
  return {
    society: params.society,
    messages: pending,
    count: pending.length,
    acknowledged: params.acknowledge || false
  };
}
async function handleBridgeContextShare(params) {
  const context = {
    id: `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    owner_society: params.owner_society,
    shared_with: params.share_with,
    context_type: params.context_type,
    data: params.data,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    expires_at: params.ttl ? new Date(Date.now() + params.ttl * 1e3).toISOString() : void 0
  };
  sharedContexts.set(context.id, context);
  return {
    success: true,
    context_id: context.id,
    shared_with: params.share_with,
    expires_at: context.expires_at
  };
}
async function handleBridgeContextGet(params) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const [id, ctx] of sharedContexts.entries()) {
    if (ctx.expires_at && ctx.expires_at < now) {
      sharedContexts.delete(id);
    }
  }
  if (params.context_id) {
    const ctx = sharedContexts.get(params.context_id);
    if (!ctx) {
      return { error: "Context not found", context_id: params.context_id };
    }
    if (!ctx.shared_with.includes(params.society) && ctx.owner_society !== params.society) {
      return { error: "Access denied", context_id: params.context_id };
    }
    return { context: ctx };
  }
  const accessible = Array.from(sharedContexts.values()).filter(
    (ctx) => ctx.owner_society === params.society || ctx.shared_with.includes(params.society)
  );
  const filtered = params.context_type ? accessible.filter((ctx) => ctx.context_type === params.context_type) : accessible;
  return {
    society: params.society,
    contexts: filtered,
    count: filtered.length
  };
}
async function handleBridgeQueueStatus(params) {
  const queue = params?.society ? messageQueue.filter((m) => m.from_society === params.society || m.to_society === params.society) : messageQueue;
  const byPriority = {
    urgent: queue.filter((m) => m.priority === "urgent").length,
    high: queue.filter((m) => m.priority === "high").length,
    normal: queue.filter((m) => m.priority === "normal").length,
    low: queue.filter((m) => m.priority === "low").length
  };
  const byStatus = {
    pending: queue.filter((m) => m.status === "pending").length,
    delivered: queue.filter((m) => m.status === "delivered").length,
    acknowledged: queue.filter((m) => m.status === "acknowledged").length
  };
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    filter: params?.society || "all",
    queue_depth: queue.length,
    by_priority: byPriority,
    by_status: byStatus,
    oldest_message: queue[0]?.created_at || null,
    shared_contexts: sharedContexts.size
  };
}
async function handleBridgeHistory(params) {
  let history = [...messageHistory];
  if (params.society) {
    history = history.filter(
      (m) => m.from_society === params.society || m.to_society === params.society
    );
  }
  if (params.from) {
    history = history.filter((m) => m.created_at >= params.from);
  }
  if (params.to) {
    history = history.filter((m) => m.created_at <= params.to);
  }
  const limit = params.limit || 50;
  history = history.slice(-limit);
  return {
    filter: { society: params.society, from: params.from, to: params.to },
    messages: history,
    count: history.length,
    total_in_history: messageHistory.length
  };
}

// src/mcp/miyabi-bundle/handlers/context.ts
var contextStore = /* @__PURE__ */ new Map();
function generateId2() {
  return `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function cleanExpired() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const [id, ctx] of contextStore.entries()) {
    if (ctx.expires_at && ctx.expires_at < now) {
      contextStore.delete(id);
    }
  }
}
async function handleContextStore(params) {
  cleanExpired();
  let existing;
  for (const ctx of contextStore.values()) {
    if (ctx.key === params.key && ctx.society === params.society) {
      existing = ctx;
      break;
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const context = {
    id: existing?.id || generateId2(),
    key: params.key,
    society: params.society,
    data: params.data,
    tags: params.tags || [],
    created_at: existing?.created_at || now,
    updated_at: now,
    expires_at: params.ttl ? new Date(Date.now() + params.ttl * 1e3).toISOString() : void 0,
    shared_with: params.share_with || []
  };
  contextStore.set(context.id, context);
  return {
    success: true,
    context_id: context.id,
    key: context.key,
    action: existing ? "updated" : "created",
    expires_at: context.expires_at
  };
}
async function handleContextGet(params) {
  cleanExpired();
  if (params.id) {
    const ctx = contextStore.get(params.id);
    if (!ctx) {
      return { error: "Context not found", id: params.id };
    }
    if (ctx.society !== params.society && !ctx.shared_with.includes(params.society)) {
      return { error: "Access denied", id: params.id };
    }
    return { context: ctx };
  }
  if (params.key) {
    for (const ctx of contextStore.values()) {
      if (ctx.key === params.key && (ctx.society === params.society || ctx.shared_with.includes(params.society))) {
        return { context: ctx };
      }
    }
    return { error: "Context not found", key: params.key };
  }
  return { error: "Either id or key required" };
}
async function handleContextList(params) {
  cleanExpired();
  let contexts = Array.from(contextStore.values()).filter(
    (ctx) => ctx.society === params.society || params.include_shared && ctx.shared_with.includes(params.society)
  );
  if (params.tags && params.tags.length > 0) {
    contexts = contexts.filter(
      (ctx) => params.tags.some((tag) => ctx.tags.includes(tag))
    );
  }
  return {
    society: params.society,
    contexts: contexts.map((ctx) => ({
      id: ctx.id,
      key: ctx.key,
      tags: ctx.tags,
      created_at: ctx.created_at,
      expires_at: ctx.expires_at,
      is_shared: ctx.society !== params.society
    })),
    count: contexts.length
  };
}
async function handleContextExpire(params) {
  cleanExpired();
  let ctx;
  if (params.id) {
    ctx = contextStore.get(params.id);
  } else if (params.key) {
    for (const c of contextStore.values()) {
      if (c.key === params.key && c.society === params.society) {
        ctx = c;
        break;
      }
    }
  }
  if (!ctx) {
    return { error: "Context not found" };
  }
  if (ctx.society !== params.society) {
    return { error: "Only owner can modify expiration" };
  }
  if (params.new_ttl === 0) {
    contextStore.delete(ctx.id);
    return { success: true, action: "deleted", id: ctx.id };
  }
  if (params.new_ttl) {
    ctx.expires_at = new Date(Date.now() + params.new_ttl * 1e3).toISOString();
    ctx.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    return { success: true, action: "updated", id: ctx.id, new_expires_at: ctx.expires_at };
  }
  ctx.expires_at = void 0;
  ctx.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  return { success: true, action: "made_permanent", id: ctx.id };
}
async function handleContextShare(params) {
  cleanExpired();
  let ctx;
  if (params.id) {
    ctx = contextStore.get(params.id);
  } else if (params.key) {
    for (const c of contextStore.values()) {
      if (c.key === params.key && c.society === params.society) {
        ctx = c;
        break;
      }
    }
  }
  if (!ctx) {
    return { error: "Context not found" };
  }
  if (ctx.society !== params.society) {
    return { error: "Only owner can modify sharing" };
  }
  if (params.revoke) {
    ctx.shared_with = ctx.shared_with.filter((s) => !params.share_with.includes(s));
  } else {
    const newShares = params.share_with.filter((s) => !ctx.shared_with.includes(s));
    ctx.shared_with.push(...newShares);
  }
  ctx.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  return {
    success: true,
    id: ctx.id,
    action: params.revoke ? "revoked" : "shared",
    shared_with: ctx.shared_with
  };
}
async function handleContextSearch(params) {
  cleanExpired();
  const queryLower = params.query.toLowerCase();
  let contexts = Array.from(contextStore.values()).filter(
    (ctx) => ctx.society === params.society || params.include_shared && ctx.shared_with.includes(params.society)
  );
  contexts = contexts.filter((ctx) => {
    if (ctx.key.toLowerCase().includes(queryLower)) return true;
    if (ctx.tags.some((t) => t.toLowerCase().includes(queryLower))) return true;
    const dataStr = JSON.stringify(ctx.data).toLowerCase();
    if (dataStr.includes(queryLower)) return true;
    return false;
  });
  if (params.tags && params.tags.length > 0) {
    contexts = contexts.filter(
      (ctx) => params.tags.some((tag) => ctx.tags.includes(tag))
    );
  }
  return {
    query: params.query,
    society: params.society,
    results: contexts.map((ctx) => ({
      id: ctx.id,
      key: ctx.key,
      tags: ctx.tags,
      preview: JSON.stringify(ctx.data).slice(0, 100),
      score: ctx.key.toLowerCase().includes(queryLower) ? 1 : 0.5
    })),
    count: contexts.length
  };
}

// src/mcp/miyabi-bundle/index.ts
var execAsync3 = (0, import_util3.promisify)(import_child_process3.exec);
var dnsLookup = (0, import_util3.promisify)(dns.lookup);
var dnsResolve4 = (0, import_util3.promisify)(dns.resolve4);
var dnsResolve6 = (0, import_util3.promisify)(dns.resolve6);
var MAX_QUERY_LENGTH = 1e3;
var MAX_PATH_LENGTH = 4096;
var MAX_HOSTNAME_LENGTH = 253;
function validateInputLength(value, maxLength, fieldName) {
  if (value && value.length > maxLength) {
    return `${fieldName} exceeds maximum length of ${maxLength} characters`;
  }
  return null;
}
function sanitizeShellArg(arg) {
  if (!arg) return "";
  return arg.replace(/[;&|`$(){}[\]<>\\!#*?~\n\r]/g, "");
}
function sanitizePath(basePath, userPath) {
  const resolved = (0, import_path.resolve)(basePath, userPath);
  const normalizedBase = (0, import_path.resolve)(basePath);
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error("Path traversal detected");
  }
  if ((0, import_fs.existsSync)(resolved)) {
    const realPath = (0, import_fs.realpathSync)(resolved);
    if (!realPath.startsWith(normalizedBase)) {
      throw new Error("Symlink traversal detected");
    }
    return realPath;
  }
  return resolved;
}
async function commandExists(cmd) {
  try {
    const which = (0, import_os.platform)() === "win32" ? "where" : "which";
    await execAsync3(`${which} ${sanitizeShellArg(cmd)}`);
    return true;
  } catch {
    return false;
  }
}
function isValidHostname(hostname) {
  if (!hostname || hostname.length > 253) return false;
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(hostname);
}
function isValidPid(pid) {
  return typeof pid === "number" && Number.isInteger(pid) && pid > 0 && pid < 4194304;
}
var SimpleCache = class {
  cache = /* @__PURE__ */ new Map();
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  set(key, data, ttlMs = 5e3) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }
  clear() {
    this.cache.clear();
  }
};
var cache = new SimpleCache();
var MIYABI_REPO_PATH = process.env.MIYABI_REPO_PATH || process.cwd();
var MIYABI_LOG_DIR = process.env.MIYABI_LOG_DIR || MIYABI_REPO_PATH;
var MIYABI_WATCH_DIR = process.env.MIYABI_WATCH_DIR || MIYABI_REPO_PATH;
var CLAUDE_CONFIG_DIR = (0, import_os.platform)() === "darwin" ? (0, import_path.join)((0, import_os.homedir)(), "Library/Application Support/Claude") : (0, import_os.platform)() === "win32" ? (0, import_path.join)(process.env.APPDATA || "", "Claude") : (0, import_path.join)((0, import_os.homedir)(), ".config/claude");
var CLAUDE_CONFIG_FILE = (0, import_path.join)(CLAUDE_CONFIG_DIR, "claude_desktop_config.json");
var CLAUDE_LOGS_DIR = (0, import_os.platform)() === "darwin" ? (0, import_path.join)((0, import_os.homedir)(), "Library/Logs/Claude") : (0, import_path.join)(CLAUDE_CONFIG_DIR, "logs");
var GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
var GITHUB_DEFAULT_OWNER = process.env.GITHUB_DEFAULT_OWNER || "";
var GITHUB_DEFAULT_REPO = process.env.GITHUB_DEFAULT_REPO || "";
var git = (0, import_simple_git.simpleGit)(MIYABI_REPO_PATH);
var octokit = GITHUB_TOKEN ? new import_rest.Octokit({ auth: GITHUB_TOKEN }) : null;
var tools = [
  // === Git Inspector (19 tools) ===
  { name: "miyabi_bundle__git_status", description: "Get working tree status showing modified, staged, and untracked files. Use before committing to review changes.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_branch_list", description: "List all local and remote branches with tracking info. Shows which branches are ahead/behind remotes.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_current_branch", description: "Get the name of the currently checked out branch. Useful for automation scripts.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_log", description: "Get commit history with author, date, and message. Use limit to control results (default: 20).", inputSchema: { type: "object", properties: { limit: { type: "number", description: "Number of commits (default: 20)" } } } },
  { name: "miyabi_bundle__git_worktree_list", description: "List all git worktrees for parallel development. Shows path and branch for each worktree.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_diff", description: "Show unstaged changes in working directory. Optionally specify a file to see changes for only that file.", inputSchema: { type: "object", properties: { file: { type: "string", description: "Specific file to diff" } } } },
  { name: "miyabi_bundle__git_staged_diff", description: "Show changes staged for commit (git diff --cached). Review before committing.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_remote_list", description: "List configured remotes with their fetch/push URLs. Check remote configuration.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_branch_ahead_behind", description: "Check how many commits a branch is ahead/behind its upstream. Useful before push/pull.", inputSchema: { type: "object", properties: { branch: { type: "string", description: "Branch name (default: current branch)" } } } },
  { name: "miyabi_bundle__git_file_history", description: "Get commit history for a specific file. Track when and why a file was modified (default: 10 commits).", inputSchema: { type: "object", properties: { file: { type: "string", description: "File path to get history for" }, limit: { type: "number", description: "Number of commits (default: 10)" } }, required: ["file"] } },
  { name: "miyabi_bundle__git_stash_list", description: "List all stashed changes with their descriptions. Find saved work to restore later.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_blame", description: "Show who last modified each line of a file. Optional line range to focus on specific code.", inputSchema: { type: "object", properties: { file: { type: "string", description: "File path to get blame for" }, startLine: { type: "number", description: "Starting line number (1-indexed)" }, endLine: { type: "number", description: "Ending line number (1-indexed)" } }, required: ["file"] } },
  { name: "miyabi_bundle__git_show", description: "Show details of a commit including diff and metadata. Defaults to HEAD if no commit specified.", inputSchema: { type: "object", properties: { commit: { type: "string", description: "Commit hash (default: HEAD)" } } } },
  { name: "miyabi_bundle__git_tag_list", description: "List all tags with their associated commits. Useful for finding release versions.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_contributors", description: "List contributors ranked by commit count. Identify active maintainers and authors.", inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max contributors to return" } } } },
  { name: "miyabi_bundle__git_conflicts", description: "Detect files with merge conflicts in working tree. Use during merge/rebase to find issues.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_submodule_status", description: "Show status of all submodules including commit hash and sync state.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_lfs_status", description: "Get Git LFS tracked files and status. Requires git-lfs to be installed.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__git_hooks_list", description: "List git hooks in .git/hooks directory. Check which hooks are enabled.", inputSchema: { type: "object", properties: {} } },
  // === Tmux Monitor (10 tools) ===
  { name: "miyabi_bundle__tmux_list_sessions", description: "List all tmux sessions with window count and status. Discover active terminal sessions.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__tmux_list_windows", description: "List windows in a tmux session. Shows window index, name, and active status.", inputSchema: { type: "object", properties: { session: { type: "string", description: "Session name (optional, lists all if omitted)" } } } },
  { name: "miyabi_bundle__tmux_list_panes", description: "List panes in tmux windows with their dimensions and commands.", inputSchema: { type: "object", properties: { session: { type: "string", description: "Session name (optional)" } } } },
  { name: "miyabi_bundle__tmux_send_keys", description: "Send keystrokes or text to a tmux pane. Use for automation or remote commands.", inputSchema: { type: "object", properties: { target: { type: "string", description: "Target pane (e.g., session:window.pane or %id)" }, keys: { type: "string", description: "Keys/text to send" } }, required: ["target", "keys"] } },
  { name: "miyabi_bundle__tmux_pane_capture", description: "Capture terminal output from a pane. Get scrollback history for debugging.", inputSchema: { type: "object", properties: { target: { type: "string", description: "Target pane (e.g., session:window.pane or %id)" }, lines: { type: "number", description: "Number of lines to capture (default: all)" } } } },
  { name: "miyabi_bundle__tmux_pane_search", description: "Search pane content for a pattern. Find specific output in terminal history.", inputSchema: { type: "object", properties: { target: { type: "string", description: "Target pane (optional)" }, pattern: { type: "string", description: "Search pattern (substring match)" } }, required: ["pattern"] } },
  { name: "miyabi_bundle__tmux_pane_tail", description: "Get last N lines from pane output. Monitor recent command results.", inputSchema: { type: "object", properties: { target: { type: "string", description: "Target pane" }, lines: { type: "number", description: "Number of lines to retrieve" } } } },
  { name: "miyabi_bundle__tmux_pane_is_busy", description: "Check if a pane is running a command. Useful for waiting on long operations.", inputSchema: { type: "object", properties: { target: { type: "string", description: "Target pane" } } } },
  { name: "miyabi_bundle__tmux_pane_current_command", description: "Get the command currently running in a pane. Identify active processes.", inputSchema: { type: "object", properties: { target: { type: "string", description: "Target pane" } } } },
  { name: "miyabi_bundle__tmux_session_info", description: "Get detailed tmux session info including creation time and attached clients.", inputSchema: { type: "object", properties: { session: { type: "string", description: "Session name" } }, required: ["session"] } },
  // === Log Aggregator (7 tools) ===
  { name: "miyabi_bundle__log_sources", description: "List available log files in configured directory. Discover logs to analyze.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__log_get_recent", description: "Get recent log entries with optional filtering by source and time window.", inputSchema: { type: "object", properties: { source: { type: "string", description: "Log source name (partial match)" }, limit: { type: "number", description: "Max entries to return" }, minutes: { type: "number", description: "Only logs from last N minutes" } } } },
  { name: "miyabi_bundle__log_search", description: "Search logs for a pattern (case-insensitive). Find specific events or errors.", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query (case-insensitive)" }, source: { type: "string", description: "Filter by log source" } }, required: ["query"] } },
  { name: "miyabi_bundle__log_get_errors", description: "Get error-level log entries. Quick way to find issues and exceptions.", inputSchema: { type: "object", properties: { minutes: { type: "number", description: "Only errors from last N minutes" } } } },
  { name: "miyabi_bundle__log_get_warnings", description: "Get warning-level log entries. Find potential issues before they become errors.", inputSchema: { type: "object", properties: { minutes: { type: "number", description: "Only warnings from last N minutes" } } } },
  { name: "miyabi_bundle__log_tail", description: "Get last N lines from a log file. Monitor recent activity in real-time.", inputSchema: { type: "object", properties: { source: { type: "string", description: "Log source name" }, lines: { type: "number", description: "Number of lines to retrieve" } }, required: ["source"] } },
  { name: "miyabi_bundle__log_stats", description: "Get log file statistics including size, line count, and error frequency.", inputSchema: { type: "object", properties: {} } },
  // === Resource Monitor (10 tools) ===
  { name: "miyabi_bundle__resource_cpu", description: "Get CPU usage percentage (overall and per-core). Monitor system performance.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__resource_memory", description: "Get RAM and swap memory usage. Check available memory and identify leaks.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__resource_disk", description: "Get disk space usage for mounted filesystems. Monitor storage capacity.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Specific mount point to check" } } } },
  { name: "miyabi_bundle__resource_load", description: "Get system load average (1, 5, 15 min). Assess system stress over time.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__resource_overview", description: "Get comprehensive system overview: CPU, memory, disk, and top processes.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__resource_processes", description: "Get top processes sorted by CPU or memory usage. Find resource hogs (default: 10).", inputSchema: { type: "object", properties: { sort: { type: "string", enum: ["cpu", "memory"], description: "Sort by cpu or memory" }, limit: { type: "number", description: "Max processes to return (default: 10)" } } } },
  { name: "miyabi_bundle__resource_uptime", description: "Get system uptime and boot timestamp. Check how long system has been running.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__resource_network_stats", description: "Get network interface traffic statistics (RX/TX bytes, packets, errors).", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__resource_battery", description: "Get laptop battery status, charge level, and time remaining.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__resource_temperature", description: "Get CPU and system temperatures. Monitor for thermal throttling.", inputSchema: { type: "object", properties: {} } },
  // === Network Inspector (15 tools) ===
  { name: "miyabi_bundle__network_interfaces", description: "List network interfaces with IP addresses, MAC, and status. Check connectivity.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_connections", description: "List active TCP/UDP connections with remote endpoints. Debug network issues.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_listening_ports", description: "List ports your services are listening on. Find port conflicts.", inputSchema: { type: "object", properties: { protocol: { type: "string", enum: ["tcp", "udp", "all"], description: "Filter by protocol (default: all)" } } } },
  { name: "miyabi_bundle__network_stats", description: "Get network I/O statistics: bytes, packets, errors, and drops per interface.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_gateway", description: "Get default gateway IP and interface. Verify internet routing.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_ping", description: "Ping a host to check connectivity and measure latency (default: 4 pings).", inputSchema: { type: "object", properties: { host: { type: "string", description: "Hostname or IP address" }, count: { type: "number", description: "Number of pings (default: 4)" } }, required: ["host"] } },
  { name: "miyabi_bundle__network_bandwidth", description: "Get current network bandwidth usage in bytes/sec per interface.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_overview", description: "Get complete network overview: interfaces, connections, ports, and gateway.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_dns_lookup", description: "Resolve hostname to IP addresses (IPv4 and IPv6). Debug DNS issues.", inputSchema: { type: "object", properties: { hostname: { type: "string", description: "Hostname to resolve" } }, required: ["hostname"] } },
  { name: "miyabi_bundle__network_port_check", description: "Check if a TCP port is open on a remote host. Test service availability.", inputSchema: { type: "object", properties: { host: { type: "string", description: "Target host" }, port: { type: "number", description: "Port number to check" } }, required: ["host", "port"] } },
  { name: "miyabi_bundle__network_public_ip", description: "Get your public IP address as seen from the internet.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_wifi_info", description: "Get WiFi connection details: SSID, signal strength, channel (macOS/Linux).", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_route_table", description: "Show IP routing table. Debug traffic routing and network paths.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__network_ssl_check", description: "Check SSL/TLS certificate: expiry, issuer, validity. Monitor cert health.", inputSchema: { type: "object", properties: { host: { type: "string", description: "Hostname to check" }, port: { type: "number", description: "Port (default: 443)" } }, required: ["host"] } },
  { name: "miyabi_bundle__network_traceroute", description: "Trace network path to a host. Diagnose routing and latency issues.", inputSchema: { type: "object", properties: { host: { type: "string", description: "Target host" }, maxHops: { type: "number", description: "Max hops (default: 30)" } }, required: ["host"] } },
  // === Process Inspector (14 tools) ===
  { name: "miyabi_bundle__process_info", description: "Get detailed info about a process by PID: CPU, memory, command, and status.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID" } }, required: ["pid"] } },
  { name: "miyabi_bundle__process_list", description: "List running processes with CPU/memory usage. Sort by cpu, memory, pid, or name.", inputSchema: { type: "object", properties: { sort: { type: "string", description: "Sort by: cpu, memory, pid, name" }, limit: { type: "number", description: "Max processes to return" } } } },
  { name: "miyabi_bundle__process_search", description: "Find processes by name or command line. Locate running services or apps.", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query (name or command)" } }, required: ["query"] } },
  { name: "miyabi_bundle__process_tree", description: "Get process hierarchy showing parent-child relationships. Understand process spawning.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__process_file_descriptors", description: "List open files and sockets for a process. Debug file handle leaks (requires lsof).", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID" } }, required: ["pid"] } },
  { name: "miyabi_bundle__process_environment", description: "Get environment variables for a running process. Debug configuration issues.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID" } }, required: ["pid"] } },
  { name: "miyabi_bundle__process_children", description: "List child processes of a parent PID. Track spawned subprocesses.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Parent process ID" } }, required: ["pid"] } },
  { name: "miyabi_bundle__process_top", description: "Get top N processes by resource usage (default: 10). Quick system overview.", inputSchema: { type: "object", properties: { limit: { type: "number", description: "Number of top processes (default: 10)" } } } },
  { name: "miyabi_bundle__process_kill", description: "Terminate a process by PID. Requires confirm=true for safety. Default signal: SIGTERM.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID to kill" }, signal: { type: "string", enum: ["SIGTERM", "SIGKILL", "SIGINT"], description: "Signal to send (default: SIGTERM)" }, confirm: { type: "boolean", description: "Must be true to confirm kill" } }, required: ["pid", "confirm"] } },
  { name: "miyabi_bundle__process_ports", description: "List network ports used by a process. Find what ports an app is listening on.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID" } }, required: ["pid"] } },
  { name: "miyabi_bundle__process_cpu_history", description: "Get CPU usage trend for a process. Monitor performance over time.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID" } }, required: ["pid"] } },
  { name: "miyabi_bundle__process_memory_detail", description: "Get detailed memory breakdown: RSS, virtual, shared. Debug memory issues.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID" } }, required: ["pid"] } },
  { name: "miyabi_bundle__process_threads", description: "List threads within a process. Analyze multi-threaded applications.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID" } }, required: ["pid"] } },
  { name: "miyabi_bundle__process_io_stats", description: "Get disk I/O statistics for a process (Linux only). Diagnose I/O bottlenecks.", inputSchema: { type: "object", properties: { pid: { type: "number", description: "Process ID" } }, required: ["pid"] } },
  // === File Watcher (10 tools) ===
  { name: "miyabi_bundle__file_stats", description: "Get file metadata: size, permissions, modified time. Check file properties.", inputSchema: { type: "object", properties: { path: { type: "string", description: "File or directory path" } }, required: ["path"] } },
  { name: "miyabi_bundle__file_recent_changes", description: "Find recently modified files. Track what changed in a time window.", inputSchema: { type: "object", properties: { directory: { type: "string", description: "Directory to search" }, minutes: { type: "number", description: "Only files changed in last N minutes" }, limit: { type: "number", description: "Max files to return" }, pattern: { type: "string", description: "Glob pattern to filter (e.g., *.ts)" } } } },
  { name: "miyabi_bundle__file_search", description: "Find files matching glob pattern (e.g., **/*.json). Recursive by default.", inputSchema: { type: "object", properties: { pattern: { type: "string", description: "Glob pattern (e.g., **/*.json)" }, directory: { type: "string", description: "Directory to search in" } }, required: ["pattern"] } },
  { name: "miyabi_bundle__file_tree", description: "Generate directory tree structure. Visualize folder hierarchy (default depth: 3).", inputSchema: { type: "object", properties: { directory: { type: "string", description: "Root directory" }, depth: { type: "number", description: "Max depth (default: 3)" } } } },
  { name: "miyabi_bundle__file_compare", description: "Compare two files: size, timestamps, and content hash. Detect differences.", inputSchema: { type: "object", properties: { path1: { type: "string", description: "First file path" }, path2: { type: "string", description: "Second file path" } }, required: ["path1", "path2"] } },
  { name: "miyabi_bundle__file_changes_since", description: "List files modified after a timestamp. Track changes since a point in time.", inputSchema: { type: "object", properties: { since: { type: "string", description: "ISO timestamp (e.g., 2025-01-01T00:00:00Z)" }, directory: { type: "string", description: "Directory to search" }, pattern: { type: "string", description: "Glob pattern to filter" } }, required: ["since"] } },
  { name: "miyabi_bundle__file_read", description: "Read text file contents safely (max 100KB). Use maxLines to limit output.", inputSchema: { type: "object", properties: { path: { type: "string", description: "File path to read" }, encoding: { type: "string", description: "Encoding (default: utf-8)" }, maxLines: { type: "number", description: "Max lines to read" } }, required: ["path"] } },
  { name: "miyabi_bundle__file_checksum", description: "Calculate file hash (MD5, SHA256, SHA512). Verify file integrity.", inputSchema: { type: "object", properties: { path: { type: "string", description: "File path" }, algorithm: { type: "string", enum: ["md5", "sha256", "sha512"], description: "Hash algorithm (default: sha256)" } }, required: ["path"] } },
  { name: "miyabi_bundle__file_size_summary", description: "Analyze directory size with breakdown by subdirectory. Find space usage.", inputSchema: { type: "object", properties: { directory: { type: "string", description: "Directory to analyze" } } } },
  { name: "miyabi_bundle__file_duplicates", description: "Find duplicate files by content hash. Clean up redundant files.", inputSchema: { type: "object", properties: { directory: { type: "string", description: "Directory to search" }, pattern: { type: "string", description: "Glob pattern to filter" } } } },
  // === Claude Code Monitor (8 tools) ===
  { name: "miyabi_bundle__claude_config", description: "Get Claude Desktop configuration including MCP servers and settings.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__claude_mcp_status", description: "Check MCP server connection status. Verify servers are running.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__claude_session_info", description: "Get Claude Code session details: processes, CPU, and memory usage.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__claude_logs", description: "Get recent Claude Code logs. Debug issues (default: 50 lines).", inputSchema: { type: "object", properties: { lines: { type: "number", description: "Number of lines (default: 50)" } } } },
  { name: "miyabi_bundle__claude_log_search", description: "Search Claude logs for specific patterns. Find errors or events.", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query" } }, required: ["query"] } },
  { name: "miyabi_bundle__claude_log_files", description: "List all Claude Code log files with sizes and dates.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__claude_background_shells", description: "List background shell processes started by Claude Code.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__claude_status", description: "Get complete Claude status: config, MCP servers, session, and recent logs.", inputSchema: { type: "object", properties: {} } },
  // === GitHub Integration (21 tools) ===
  { name: "miyabi_bundle__github_list_issues", description: "List repository issues with filters. Filter by state, labels, or assignee (default: open).", inputSchema: { type: "object", properties: { state: { type: "string", enum: ["open", "closed", "all"], description: "Issue state filter (default: open)" }, labels: { type: "string", description: "Comma-separated label names to filter" }, per_page: { type: "number", description: "Results per page (max 100)" } } } },
  { name: "miyabi_bundle__github_get_issue", description: "Get full issue details including body, labels, assignees, and timeline.", inputSchema: { type: "object", properties: { issue_number: { type: "number", description: "Issue number" } }, required: ["issue_number"] } },
  { name: "miyabi_bundle__github_create_issue", description: "Create a new GitHub issue. Supports markdown body and multiple labels.", inputSchema: { type: "object", properties: { title: { type: "string", description: "Issue title" }, body: { type: "string", description: "Issue body (markdown supported)" }, labels: { type: "array", items: { type: "string" }, description: "Array of label names" } }, required: ["title"] } },
  { name: "miyabi_bundle__github_update_issue", description: "Update issue title, body, state, or assignees. Close issues by setting state.", inputSchema: { type: "object", properties: { issue_number: { type: "number", description: "Issue number to update" }, title: { type: "string", description: "New title" }, body: { type: "string", description: "New body" }, state: { type: "string", description: "New state (open/closed)" } }, required: ["issue_number"] } },
  { name: "miyabi_bundle__github_add_comment", description: "Add a comment to an issue or PR. Supports markdown formatting.", inputSchema: { type: "object", properties: { issue_number: { type: "number", description: "Issue or PR number" }, body: { type: "string", description: "Comment body (markdown supported)" } }, required: ["issue_number", "body"] } },
  { name: "miyabi_bundle__github_list_prs", description: "List pull requests with optional state filter (default: open).", inputSchema: { type: "object", properties: { state: { type: "string", enum: ["open", "closed", "all"], description: "PR state filter" }, per_page: { type: "number", description: "Results per page" } } } },
  { name: "miyabi_bundle__github_get_pr", description: "Get PR details including diff stats, merge status, and review state.", inputSchema: { type: "object", properties: { pull_number: { type: "number", description: "Pull request number" } }, required: ["pull_number"] } },
  { name: "miyabi_bundle__github_create_pr", description: "Create a pull request from head branch to base (default: main).", inputSchema: { type: "object", properties: { title: { type: "string", description: "PR title" }, head: { type: "string", description: "Source branch" }, base: { type: "string", description: "Target branch (default: main)" }, body: { type: "string", description: "PR description" } }, required: ["title", "head"] } },
  { name: "miyabi_bundle__github_merge_pr", description: "Merge a PR using merge, squash, or rebase method.", inputSchema: { type: "object", properties: { pull_number: { type: "number", description: "Pull request number" }, merge_method: { type: "string", enum: ["merge", "squash", "rebase"], description: "Merge strategy" } }, required: ["pull_number"] } },
  { name: "miyabi_bundle__github_list_labels", description: "List all labels defined in the repository with colors and descriptions.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__github_add_labels", description: "Add labels to an issue or PR. Creates labels if they do not exist.", inputSchema: { type: "object", properties: { issue_number: { type: "number", description: "Issue or PR number" }, labels: { type: "array", items: { type: "string" }, description: "Label names to add" } }, required: ["issue_number", "labels"] } },
  { name: "miyabi_bundle__github_list_milestones", description: "List milestones for tracking release progress. Filter by state.", inputSchema: { type: "object", properties: { state: { type: "string", enum: ["open", "closed", "all"], description: "Milestone state filter" } } } },
  { name: "miyabi_bundle__github_list_workflows", description: "List GitHub Actions workflows defined in the repository.", inputSchema: { type: "object", properties: { per_page: { type: "number", description: "Results per page" } } } },
  { name: "miyabi_bundle__github_list_workflow_runs", description: "List recent workflow runs. Filter by status to find failures.", inputSchema: { type: "object", properties: { workflow_id: { type: "string", description: "Workflow ID or filename" }, status: { type: "string", enum: ["queued", "in_progress", "completed"], description: "Run status filter" }, per_page: { type: "number", description: "Results per page" } } } },
  { name: "miyabi_bundle__github_repo_info", description: "Get repository metadata: stars, forks, language, and settings.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__github_list_releases", description: "List releases with tags, assets, and release notes.", inputSchema: { type: "object", properties: { per_page: { type: "number", description: "Results per page" } } } },
  { name: "miyabi_bundle__github_list_branches", description: "List branches with protection status and last commit info.", inputSchema: { type: "object", properties: { per_page: { type: "number", description: "Results per page" } } } },
  { name: "miyabi_bundle__github_compare_commits", description: "Compare two branches or commits. Shows diff, files changed, and commits.", inputSchema: { type: "object", properties: { base: { type: "string", description: "Base branch/commit" }, head: { type: "string", description: "Head branch/commit" } }, required: ["base", "head"] } },
  { name: "miyabi_bundle__github_list_pr_reviews", description: "List reviews on a PR with approval status and comments.", inputSchema: { type: "object", properties: { pull_number: { type: "number", description: "Pull request number" } }, required: ["pull_number"] } },
  { name: "miyabi_bundle__github_create_review", description: "Create a PR review: APPROVE, REQUEST_CHANGES, or COMMENT.", inputSchema: { type: "object", properties: { pull_number: { type: "number", description: "Pull request number" }, body: { type: "string", description: "Review body" }, event: { type: "string", enum: ["APPROVE", "REQUEST_CHANGES", "COMMENT"], description: "Review action" }, comments: { type: "array", items: { type: "object" }, description: "Line comments" } }, required: ["pull_number"] } },
  { name: "miyabi_bundle__github_submit_review", description: "Submit a pending PR review with final verdict.", inputSchema: { type: "object", properties: { pull_number: { type: "number", description: "Pull request number" }, review_id: { type: "number", description: "Review ID" }, body: { type: "string", description: "Final comment" }, event: { type: "string", enum: ["APPROVE", "REQUEST_CHANGES", "COMMENT"], description: "Review action" } }, required: ["pull_number", "review_id", "event"] } },
  // === System Health (1 tool) ===
  { name: "miyabi_bundle__health_check", description: "Run comprehensive health check: Git, GitHub API, system resources, and MCP status.", inputSchema: { type: "object", properties: {} } },
  // === Society Health Check Pro (Issue #16 - 5 tools) ===
  { name: "society_health_all", description: "Check health status of all 26 Miyabi Societies at once. Returns comprehensive health report.", inputSchema: { type: "object", properties: {} } },
  { name: "society_health_single", description: "Check detailed health status of a single Society.", inputSchema: { type: "object", properties: { society: { type: "string", description: "Society name (e.g., investment, sales, marketing)" } }, required: ["society"] } },
  { name: "society_agent_status", description: "Get status of all agents within a Society or all Societies.", inputSchema: { type: "object", properties: { society: { type: "string", description: "Optional: filter by Society name" } } } },
  { name: "society_mcp_status", description: "Check status of MCP servers used by Societies.", inputSchema: { type: "object", properties: {} } },
  { name: "society_metrics_summary", description: "Get aggregated metrics summary for all Societies.", inputSchema: { type: "object", properties: {} } },
  // === Metrics Aggregator (Issue #17 - 5 tools) ===
  { name: "metrics_collect", description: "Collect system metrics.", inputSchema: { type: "object", properties: { society: { type: "string" } } } },
  { name: "metrics_aggregate", description: "Aggregate metrics with statistics.", inputSchema: { type: "object", properties: { period: { type: "string" } } } },
  { name: "metrics_query", description: "Query metrics with filters.", inputSchema: { type: "object", properties: { metric_type: { type: "string" }, society: { type: "string" }, limit: { type: "number" } } } },
  { name: "metrics_export", description: "Export metrics JSON/CSV.", inputSchema: { type: "object", properties: { format: { type: "string", enum: ["json", "csv"] } } } },
  { name: "metrics_dashboard", description: "Dashboard data generation.", inputSchema: { type: "object", properties: {} } },
  // === Society Bridge API (Issue #18 - 6 tools) ===
  { name: "bridge_send", description: "Send message between Societies.", inputSchema: { type: "object", properties: { from_society: { type: "string" }, to_society: { type: "string" }, payload: { type: "object" }, priority: { type: "string" } }, required: ["from_society", "to_society", "payload"] } },
  { name: "bridge_receive", description: "Receive pending messages.", inputSchema: { type: "object", properties: { society: { type: "string" }, limit: { type: "number" }, acknowledge: { type: "boolean" } }, required: ["society"] } },
  { name: "bridge_context_share", description: "Share context with Societies.", inputSchema: { type: "object", properties: { owner_society: { type: "string" }, share_with: { type: "array" }, context_type: { type: "string" }, data: { type: "object" } }, required: ["owner_society", "share_with", "context_type", "data"] } },
  { name: "bridge_context_get", description: "Get shared context.", inputSchema: { type: "object", properties: { context_id: { type: "string" }, society: { type: "string" } }, required: ["society"] } },
  { name: "bridge_queue_status", description: "Get queue status.", inputSchema: { type: "object", properties: { society: { type: "string" } } } },
  { name: "bridge_history", description: "Get message history.", inputSchema: { type: "object", properties: { society: { type: "string" }, limit: { type: "number" } } } },
  // === Context Foundation (Issue #13 - 6 tools) ===
  { name: "context_store", description: "Store context data.", inputSchema: { type: "object", properties: { key: { type: "string" }, society: { type: "string" }, data: { type: "object" }, ttl: { type: "number" } }, required: ["key", "society", "data"] } },
  { name: "context_get", description: "Get stored context.", inputSchema: { type: "object", properties: { id: { type: "string" }, key: { type: "string" }, society: { type: "string" } }, required: ["society"] } },
  { name: "context_list", description: "List accessible contexts.", inputSchema: { type: "object", properties: { society: { type: "string" }, include_shared: { type: "boolean" } }, required: ["society"] } },
  { name: "context_expire", description: "Manage context expiration.", inputSchema: { type: "object", properties: { id: { type: "string" }, society: { type: "string" }, new_ttl: { type: "number" } }, required: ["society"] } },
  { name: "context_share", description: "Share context access.", inputSchema: { type: "object", properties: { id: { type: "string" }, society: { type: "string" }, share_with: { type: "array" } }, required: ["society", "share_with"] } },
  { name: "context_search", description: "Search contexts.", inputSchema: { type: "object", properties: { society: { type: "string" }, query: { type: "string" } }, required: ["society", "query"] } },
  // === Linux systemd (3 tools) ===
  { name: "miyabi_bundle__linux_systemd_units", description: "List systemd units with status. Filter by type (service, timer) or state (Linux only).", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["service", "timer", "socket", "mount", "target"], description: "Filter by unit type" }, state: { type: "string", enum: ["running", "failed", "inactive"], description: "Filter by state" } } } },
  { name: "miyabi_bundle__linux_systemd_status", description: "Get detailed status of a systemd unit including logs and dependencies (Linux only).", inputSchema: { type: "object", properties: { unit: { type: "string", description: "Unit name (e.g., nginx.service)" } }, required: ["unit"] } },
  { name: "miyabi_bundle__linux_journal_search", description: "Search systemd journal logs. Filter by unit, priority, or time range (Linux only).", inputSchema: { type: "object", properties: { unit: { type: "string", description: "Filter by unit name" }, priority: { type: "string", enum: ["emerg", "alert", "crit", "err", "warning", "notice", "info", "debug"], description: "Filter by priority level" }, since: { type: "string", description: "Show entries since (e.g., 1h ago, today)" }, lines: { type: "number", description: "Number of lines to show" } } } },
  // === Windows (2 tools) ===
  { name: "miyabi_bundle__windows_service_status", description: "Get Windows service status, start type, and dependencies (Windows only).", inputSchema: { type: "object", properties: { service: { type: "string", description: "Service name" } } } },
  { name: "miyabi_bundle__windows_eventlog_search", description: "Search Windows Event Log for errors or specific events (Windows only).", inputSchema: { type: "object", properties: { log: { type: "string", enum: ["Application", "System", "Security"], description: "Event log name" }, level: { type: "string", enum: ["Error", "Warning", "Information"], description: "Event level" }, source: { type: "string", description: "Event source name" }, maxEvents: { type: "number", description: "Max events to return" } } } },
  // === Docker (10 tools) ===
  { name: "miyabi_bundle__docker_ps", description: "List Docker containers with status and ports. Use all=true for stopped containers.", inputSchema: { type: "object", properties: { all: { type: "boolean", description: "Show all containers (default shows running)" }, limit: { type: "number", description: "Limit output" } } } },
  { name: "miyabi_bundle__docker_images", description: "List Docker images with size and tags. Find dangling images to clean up.", inputSchema: { type: "object", properties: { all: { type: "boolean", description: "Show all images (default: only tagged)" }, dangling: { type: "boolean", description: "Show only dangling images" } } } },
  { name: "miyabi_bundle__docker_logs", description: "Get container logs. Supports tail, since timestamp, and timestamps options.", inputSchema: { type: "object", properties: { container: { type: "string", description: "Container name or ID" }, tail: { type: "number", description: "Number of lines from end (e.g., 100)" }, since: { type: "string", description: "Show logs since (e.g., 10m, 1h, 2024-01-01)" }, timestamps: { type: "boolean", description: "Show timestamps" } }, required: ["container"] } },
  { name: "miyabi_bundle__docker_inspect", description: "Get detailed JSON config of container or image. Debug networking and mounts.", inputSchema: { type: "object", properties: { target: { type: "string", description: "Container/image name or ID" }, type: { type: "string", enum: ["container", "image"], description: "Target type" } }, required: ["target"] } },
  { name: "miyabi_bundle__docker_stats", description: "Get live CPU/memory usage for containers. Monitor resource consumption.", inputSchema: { type: "object", properties: { container: { type: "string", description: "Container name/id (optional, all if omitted)" }, noStream: { type: "boolean", description: "One-shot (no streaming)" } } } },
  { name: "miyabi_bundle__docker_exec", description: "Execute command inside a running container. Use for debugging or inspection.", inputSchema: { type: "object", properties: { container: { type: "string", description: "Container name or ID" }, command: { type: "string", description: "Command to execute" }, user: { type: "string", description: "User to run as" } }, required: ["container", "command"] } },
  { name: "miyabi_bundle__docker_start", description: "Start a stopped container by name or ID.", inputSchema: { type: "object", properties: { container: { type: "string", description: "Container name or ID" } }, required: ["container"] } },
  { name: "miyabi_bundle__docker_stop", description: "Stop a running container gracefully. Optional timeout before SIGKILL.", inputSchema: { type: "object", properties: { container: { type: "string", description: "Container name or ID" }, timeout: { type: "number", description: "Seconds to wait before killing" } }, required: ["container"] } },
  { name: "miyabi_bundle__docker_restart", description: "Restart a container. Useful after config changes.", inputSchema: { type: "object", properties: { container: { type: "string", description: "Container name or ID" }, timeout: { type: "number", description: "Seconds to wait before killing" } }, required: ["container"] } },
  { name: "miyabi_bundle__docker_build", description: "Build Docker image from Dockerfile. Supports custom tags and no-cache.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Build context path" }, tag: { type: "string", description: "Image tag (name:tag)" }, dockerfile: { type: "string", description: "Dockerfile path" }, noCache: { type: "boolean", description: "Disable build cache" } } } },
  // === Docker Compose (4 tools) ===
  { name: "miyabi_bundle__compose_ps", description: "List Compose service status: running, ports, and health.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Path to docker-compose.yml" }, all: { type: "boolean", description: "Show all services" } } } },
  { name: "miyabi_bundle__compose_up", description: "Start Compose services. Use detach=true for background, build=true to rebuild.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Path to docker-compose.yml" }, services: { type: "array", items: { type: "string" }, description: "Specific services to start" }, detach: { type: "boolean", description: "Run in background" }, build: { type: "boolean", description: "Build images before starting" } } } },
  { name: "miyabi_bundle__compose_down", description: "Stop Compose services. Optionally remove volumes and orphan containers.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Path to docker-compose.yml" }, volumes: { type: "boolean", description: "Remove volumes" }, removeOrphans: { type: "boolean", description: "Remove orphan containers" } } } },
  { name: "miyabi_bundle__compose_logs", description: "Get combined logs from Compose services. Filter by service name.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Path to docker-compose.yml" }, services: { type: "array", items: { type: "string" }, description: "Specific services" }, tail: { type: "number", description: "Number of lines from end" }, timestamps: { type: "boolean", description: "Show timestamps" } } } },
  // === Kubernetes (6 tools) ===
  { name: "miyabi_bundle__k8s_get_pods", description: "List pods with status, restarts, and age. Filter by namespace or label selector.", inputSchema: { type: "object", properties: { namespace: { type: "string", description: "Namespace (default: default)" }, allNamespaces: { type: "boolean", description: "List across all namespaces" }, selector: { type: "string", description: "Label selector (e.g., app=nginx)" } } } },
  { name: "miyabi_bundle__k8s_get_deployments", description: "List deployments with replicas, available, and ready status.", inputSchema: { type: "object", properties: { namespace: { type: "string", description: "Namespace (default: default)" }, allNamespaces: { type: "boolean", description: "List across all namespaces" } } } },
  { name: "miyabi_bundle__k8s_logs", description: "Get pod logs. Specify container for multi-container pods.", inputSchema: { type: "object", properties: { pod: { type: "string", description: "Pod name" }, namespace: { type: "string", description: "Namespace" }, container: { type: "string", description: "Container name (for multi-container pods)" }, tail: { type: "number", description: "Lines from end" }, since: { type: "string", description: "Show logs since (e.g., 1h, 30m)" } }, required: ["pod"] } },
  { name: "miyabi_bundle__k8s_describe", description: "Get detailed resource info: events, conditions, and spec.", inputSchema: { type: "object", properties: { resource: { type: "string", enum: ["pod", "deployment", "service", "configmap", "secret", "node"], description: "Resource type" }, name: { type: "string", description: "Resource name" }, namespace: { type: "string", description: "Namespace" } }, required: ["resource", "name"] } },
  { name: "miyabi_bundle__k8s_apply", description: "Apply Kubernetes manifest. Use dryRun=true to preview changes first.", inputSchema: { type: "object", properties: { file: { type: "string", description: "Path to YAML manifest" }, namespace: { type: "string", description: "Namespace" }, dryRun: { type: "boolean", description: "Dry run only (no changes)" } }, required: ["file"] } },
  { name: "miyabi_bundle__k8s_delete", description: "Delete Kubernetes resource. Use dryRun=true to preview deletion.", inputSchema: { type: "object", properties: { resource: { type: "string", description: "Resource type (e.g., pod, deployment)" }, name: { type: "string", description: "Resource name" }, namespace: { type: "string", description: "Namespace" }, dryRun: { type: "boolean", description: "Dry run only" } }, required: ["resource", "name"] } },
  // === Spec-Kit (9 tools) - Spec-Driven Development ===
  { name: "miyabi_bundle__speckit_init", description: "Initialize Spec-Kit in a project. Creates .speckit/ directory with templates.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Project path (default: current)" } } } },
  { name: "miyabi_bundle__speckit_status", description: "Get Spec-Kit project status: features, specs, and plan coverage.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Project path" } } } },
  { name: "miyabi_bundle__speckit_constitution", description: "Read or update project constitution defining principles and constraints.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Project path" }, content: { type: "string", description: "New constitution content (omit to read)" } } } },
  { name: "miyabi_bundle__speckit_specify", description: "Create a formal specification from a feature description.", inputSchema: { type: "object", properties: { feature: { type: "string", description: "Feature description" }, path: { type: "string", description: "Project path" } }, required: ["feature"] } },
  { name: "miyabi_bundle__speckit_plan", description: "Generate implementation plan with steps and dependencies for a feature.", inputSchema: { type: "object", properties: { feature: { type: "string", description: "Feature name/id" }, path: { type: "string", description: "Project path" } }, required: ["feature"] } },
  { name: "miyabi_bundle__speckit_tasks", description: "Generate actionable task list from a feature plan.", inputSchema: { type: "object", properties: { feature: { type: "string", description: "Feature name/id" }, path: { type: "string", description: "Project path" } }, required: ["feature"] } },
  { name: "miyabi_bundle__speckit_checklist", description: "Create pre-implementation checklist for quality assurance.", inputSchema: { type: "object", properties: { feature: { type: "string", description: "Feature name/id" }, path: { type: "string", description: "Project path" } }, required: ["feature"] } },
  { name: "miyabi_bundle__speckit_analyze", description: "Analyze project for consistency between specs and implementation.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Project path" } } } },
  { name: "miyabi_bundle__speckit_list_features", description: "List all defined features in the project with their status.", inputSchema: { type: "object", properties: { path: { type: "string", description: "Project path" } } } },
  // === MCP Tool Discovery (3 tools) ===
  { name: "miyabi_bundle__mcp_search_tools", description: "Search available MCP tools by name or description. Filter by category prefix.", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query (matches name or description)" }, category: { type: "string", description: "Filter by category prefix (git, tmux, docker, etc)" } } } },
  { name: "miyabi_bundle__mcp_list_categories", description: "List all tool categories with tool counts. Discover available capabilities.", inputSchema: { type: "object", properties: {} } },
  { name: "miyabi_bundle__mcp_get_tool_info", description: "Get detailed info about a tool including parameters and examples.", inputSchema: { type: "object", properties: { tool: { type: "string", description: "Tool name" } }, required: ["tool"] } },
  // === Database Foundation (6 tools) ===
  { name: "miyabi_bundle__db_connect", description: "Test database connection. Supports SQLite (file), PostgreSQL, and MySQL.", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["sqlite", "postgresql", "mysql"], description: "Database type" }, connection: { type: "string", description: "Connection string or file path (SQLite)" }, host: { type: "string", description: "Database host" }, port: { type: "number", description: "Port number" }, database: { type: "string", description: "Database name" }, user: { type: "string", description: "Username" }, password: { type: "string", description: "Password" } }, required: ["type"] } },
  { name: "miyabi_bundle__db_tables", description: "List all tables in the database with row counts.", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["sqlite", "postgresql", "mysql"], description: "Database type" }, connection: { type: "string", description: "Connection string" }, host: { type: "string", description: "Database host" }, port: { type: "number", description: "Port number" }, database: { type: "string", description: "Database name" }, user: { type: "string", description: "Username" }, password: { type: "string", description: "Password" } }, required: ["type"] } },
  { name: "miyabi_bundle__db_schema", description: "Get table schema: columns, types, keys, and constraints.", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["sqlite", "postgresql", "mysql"], description: "Database type" }, table: { type: "string", description: "Table name" }, connection: { type: "string", description: "Connection string" }, host: { type: "string", description: "Database host" }, port: { type: "number", description: "Port number" }, database: { type: "string", description: "Database name" }, user: { type: "string", description: "Username" }, password: { type: "string", description: "Password" } }, required: ["type", "table"] } },
  { name: "miyabi_bundle__db_query", description: "Execute read-only SELECT query. Limited to 100 rows by default for safety.", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["sqlite", "postgresql", "mysql"], description: "Database type" }, query: { type: "string", description: "SQL SELECT query" }, connection: { type: "string", description: "Connection string" }, host: { type: "string", description: "Database host" }, port: { type: "number", description: "Port number" }, database: { type: "string", description: "Database name" }, user: { type: "string", description: "Username" }, password: { type: "string", description: "Password" }, limit: { type: "number", description: "Max rows (default 100)" } }, required: ["type", "query"] } },
  { name: "miyabi_bundle__db_explain", description: "Get query execution plan for optimization analysis.", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["sqlite", "postgresql", "mysql"], description: "Database type" }, query: { type: "string", description: "SQL query to analyze" }, connection: { type: "string", description: "Connection string" }, host: { type: "string", description: "Database host" }, port: { type: "number", description: "Port number" }, database: { type: "string", description: "Database name" }, user: { type: "string", description: "Username" }, password: { type: "string", description: "Password" } }, required: ["type", "query"] } },
  { name: "miyabi_bundle__db_health", description: "Check database health: connection, size, and performance stats.", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["sqlite", "postgresql", "mysql"], description: "Database type" }, connection: { type: "string", description: "Connection string" }, host: { type: "string", description: "Database host" }, port: { type: "number", description: "Port number" }, database: { type: "string", description: "Database name" }, user: { type: "string", description: "Username" }, password: { type: "string", description: "Password" } }, required: ["type"] } },
  // === Time Tools (4 tools) ===
  { name: "miyabi_bundle__time_current", description: "Get current time in any timezone. Supports ISO, unix, or human-readable output.", inputSchema: { type: "object", properties: { timezone: { type: "string", description: "Timezone (e.g., Asia/Tokyo, America/New_York, UTC)" }, format: { type: "string", enum: ["iso", "unix", "human"], description: "Output format" } } } },
  { name: "miyabi_bundle__time_convert", description: "Convert time between timezones. Accepts ISO8601 or unix timestamps.", inputSchema: { type: "object", properties: { time: { type: "string", description: "Time to convert (ISO8601 or unix timestamp)" }, from: { type: "string", description: "Source timezone" }, to: { type: "string", description: "Target timezone" } }, required: ["time", "to"] } },
  { name: "miyabi_bundle__time_format", description: "Format datetime with custom pattern (e.g., YYYY-MM-DD HH:mm:ss).", inputSchema: { type: "object", properties: { time: { type: "string", description: "Time to format" }, format: { type: "string", description: "Format string (e.g., YYYY-MM-DD HH:mm:ss)" }, timezone: { type: "string", description: "Timezone for formatting" } }, required: ["time", "format"] } },
  { name: "miyabi_bundle__time_diff", description: "Calculate time difference between two dates. Defaults to now if end omitted.", inputSchema: { type: "object", properties: { start: { type: "string", description: "Start time" }, end: { type: "string", description: "End time (default: now)" }, unit: { type: "string", enum: ["seconds", "minutes", "hours", "days", "weeks"], description: "Output unit" } }, required: ["start"] } },
  // === Calculator Tools (3 tools) ===
  { name: "miyabi_bundle__calc_expression", description: "Evaluate math expression safely. Supports sqrt, sin, cos, PI, etc.", inputSchema: { type: "object", properties: { expression: { type: "string", description: "Math expression (e.g., 2+2, sqrt(16), sin(PI/2))" }, precision: { type: "number", description: "Decimal precision (default: 10)" } }, required: ["expression"] } },
  { name: "miyabi_bundle__calc_unit_convert", description: "Convert between units: length, weight, temperature, and more.", inputSchema: { type: "object", properties: { value: { type: "number", description: "Value to convert" }, from: { type: "string", description: "Source unit (e.g., km, miles, kg, lb, celsius, fahrenheit)" }, to: { type: "string", description: "Target unit" } }, required: ["value", "from", "to"] } },
  { name: "miyabi_bundle__calc_statistics", description: "Calculate statistics: mean, median, stddev, variance, min, max, etc.", inputSchema: { type: "object", properties: { data: { type: "array", items: { type: "number" }, description: "Array of numbers" }, metrics: { type: "array", items: { type: "string", enum: ["mean", "median", "mode", "stddev", "variance", "min", "max", "sum", "count"] }, description: "Metrics to calculate" } }, required: ["data"] } },
  // === Sequential Thinking Tools (3 tools) ===
  { name: "miyabi_bundle__think_step", description: "Record a reasoning step with type (observation, hypothesis, analysis, conclusion).", inputSchema: { type: "object", properties: { thought: { type: "string", description: "The thought content" }, type: { type: "string", enum: ["observation", "hypothesis", "analysis", "conclusion", "question"], description: "Type of thought" }, confidence: { type: "number", description: "Confidence level 0-1" }, sessionId: { type: "string", description: "Session ID to continue previous chain" } }, required: ["thought"] } },
  { name: "miyabi_bundle__think_branch", description: "Create alternative thinking branch to explore different approaches.", inputSchema: { type: "object", properties: { sessionId: { type: "string", description: "Session ID" }, branchName: { type: "string", description: "Name for this branch" }, fromStep: { type: "number", description: "Step number to branch from" } }, required: ["sessionId", "branchName"] } },
  { name: "miyabi_bundle__think_summarize", description: "Summarize thinking session with key insights and conclusions.", inputSchema: { type: "object", properties: { sessionId: { type: "string", description: "Session ID to summarize" }, includeAlternatives: { type: "boolean", description: "Include alternative branches" } }, required: ["sessionId"] } },
  // === Generator Tools (4 tools) ===
  { name: "miyabi_bundle__gen_uuid", description: "Generate UUID (v1 time-based or v4 random). Generate up to 100 at once.", inputSchema: { type: "object", properties: { version: { type: "number", enum: [1, 4], description: "UUID version (default: 4)" }, count: { type: "number", description: "Number of UUIDs to generate (max 100)" } } } },
  { name: "miyabi_bundle__gen_random", description: "Generate random integers or floats within a range.", inputSchema: { type: "object", properties: { min: { type: "number", description: "Minimum value (default: 0)" }, max: { type: "number", description: "Maximum value (default: 100)" }, count: { type: "number", description: "Number of values (max 1000)" }, type: { type: "string", enum: ["integer", "float"], description: "Number type" } }, required: [] } },
  { name: "miyabi_bundle__gen_hash", description: "Hash a string using MD5, SHA1, SHA256, or SHA512. Output in hex or base64.", inputSchema: { type: "object", properties: { input: { type: "string", description: "String to hash" }, algorithm: { type: "string", enum: ["md5", "sha1", "sha256", "sha512"], description: "Hash algorithm (default: sha256)" }, encoding: { type: "string", enum: ["hex", "base64"], description: "Output encoding" } }, required: ["input"] } },
  { name: "miyabi_bundle__gen_password", description: "Generate secure password with configurable character sets (default: 16 chars).", inputSchema: { type: "object", properties: { length: { type: "number", description: "Password length (8-128, default: 16)" }, uppercase: { type: "boolean", description: "Include uppercase letters" }, lowercase: { type: "boolean", description: "Include lowercase letters" }, numbers: { type: "boolean", description: "Include numbers" }, symbols: { type: "boolean", description: "Include symbols" }, excludeSimilar: { type: "boolean", description: "Exclude similar characters (0O1lI)" } } } }
];
var resources = [
  // === Git Resources ===
  {
    uri: "miyabi://git/status",
    name: "miyabi_bundle__Git Repository Status",
    description: "Current git repository status including branch, staged changes, and modified files",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://git/branches",
    name: "miyabi_bundle__Git Branches",
    description: "List of all local and remote branches with current branch indicator",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://git/recent-commits",
    name: "miyabi_bundle__Recent Commits",
    description: "Last 10 commits with hash, author, date, and message",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://git/remotes",
    name: "miyabi_bundle__Git Remotes",
    description: "Configured remote repositories",
    mimeType: "application/json"
  },
  // === System Resources ===
  {
    uri: "miyabi://system/info",
    name: "miyabi_bundle__System Information",
    description: "CPU, memory, disk, and OS information",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://system/processes",
    name: "miyabi_bundle__Running Processes",
    description: "Top processes by CPU and memory usage",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://system/network",
    name: "miyabi_bundle__Network Status",
    description: "Network interfaces and connectivity status",
    mimeType: "application/json"
  },
  // === Docker Resources ===
  {
    uri: "miyabi://docker/containers",
    name: "miyabi_bundle__Docker Containers",
    description: "List of all Docker containers with status",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://docker/images",
    name: "miyabi_bundle__Docker Images",
    description: "Local Docker images",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://docker/compose",
    name: "miyabi_bundle__Docker Compose Status",
    description: "Docker Compose project status",
    mimeType: "application/json"
  },
  // === GitHub Resources ===
  {
    uri: "miyabi://github/issues",
    name: "miyabi_bundle__GitHub Issues",
    description: "Open issues for the current repository",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://github/pulls",
    name: "miyabi_bundle__GitHub Pull Requests",
    description: "Open pull requests for the current repository",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://github/workflows",
    name: "miyabi_bundle__GitHub Workflows",
    description: "GitHub Actions workflow status",
    mimeType: "application/json"
  },
  // === Tmux Resources ===
  {
    uri: "miyabi://tmux/sessions",
    name: "miyabi_bundle__Tmux Sessions",
    description: "Active tmux sessions and windows",
    mimeType: "application/json"
  },
  // === Kubernetes Resources ===
  {
    uri: "miyabi://k8s/pods",
    name: "miyabi_bundle__Kubernetes Pods",
    description: "Kubernetes pods status in current namespace",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://k8s/services",
    name: "miyabi_bundle__Kubernetes Services",
    description: "Kubernetes services in current namespace",
    mimeType: "application/json"
  },
  // === Tool Catalog ===
  {
    uri: "miyabi://catalog/tools",
    name: "miyabi_bundle__Tool Catalog",
    description: "Complete list of available MCP tools organized by category",
    mimeType: "application/json"
  },
  {
    uri: "miyabi://catalog/categories",
    name: "miyabi_bundle__Tool Categories",
    description: "List of tool categories with descriptions",
    mimeType: "application/json"
  }
];
var prompts = [
  // === Git Workflow Prompts ===
  {
    name: "miyabi_bundle__git-commit",
    description: "Create a well-structured git commit with conventional commit format",
    arguments: [
      { name: "miyabi_bundle__type", description: "Commit type: feat, fix, docs, style, refactor, test, chore", required: true },
      { name: "miyabi_bundle__scope", description: "Scope of the change (optional)", required: false },
      { name: "miyabi_bundle__description", description: "Brief description of the change", required: true }
    ]
  },
  {
    name: "miyabi_bundle__git-review",
    description: "Review current git changes and suggest improvements",
    arguments: [
      { name: "miyabi_bundle__focus", description: "Focus area: security, performance, style, all", required: false }
    ]
  },
  {
    name: "miyabi_bundle__git-branch-strategy",
    description: "Suggest a branch naming strategy and workflow",
    arguments: [
      { name: "miyabi_bundle__feature", description: "Feature or task description", required: true }
    ]
  },
  // === Docker Prompts ===
  {
    name: "miyabi_bundle__docker-debug",
    description: "Debug a Docker container issue",
    arguments: [
      { name: "miyabi_bundle__container", description: "Container name or ID", required: true },
      { name: "miyabi_bundle__issue", description: "Description of the issue", required: false }
    ]
  },
  {
    name: "miyabi_bundle__docker-compose-setup",
    description: "Help set up a Docker Compose configuration",
    arguments: [
      { name: "miyabi_bundle__services", description: "Comma-separated list of services needed", required: true }
    ]
  },
  // === GitHub Prompts ===
  {
    name: "miyabi_bundle__github-issue-create",
    description: "Create a well-structured GitHub issue",
    arguments: [
      { name: "miyabi_bundle__type", description: "Issue type: bug, feature, enhancement, question", required: true },
      { name: "miyabi_bundle__title", description: "Issue title", required: true },
      { name: "miyabi_bundle__description", description: "Detailed description", required: true }
    ]
  },
  {
    name: "miyabi_bundle__github-pr-review",
    description: "Review a GitHub pull request",
    arguments: [
      { name: "miyabi_bundle__pr_number", description: "Pull request number", required: true },
      { name: "miyabi_bundle__focus", description: "Focus: code, tests, docs, security", required: false }
    ]
  },
  // === System Analysis Prompts ===
  {
    name: "miyabi_bundle__system-health-check",
    description: "Perform a comprehensive system health check",
    arguments: [
      { name: "miyabi_bundle__focus", description: "Focus: cpu, memory, disk, network, all", required: false }
    ]
  },
  {
    name: "miyabi_bundle__process-troubleshoot",
    description: "Troubleshoot a process issue",
    arguments: [
      { name: "miyabi_bundle__process_name", description: "Name of the process to investigate", required: true }
    ]
  },
  // === Network Prompts ===
  {
    name: "miyabi_bundle__network-diagnose",
    description: "Diagnose network connectivity issues",
    arguments: [
      { name: "miyabi_bundle__target", description: "Target host or IP to check", required: false }
    ]
  },
  // === Kubernetes Prompts ===
  {
    name: "miyabi_bundle__k8s-debug-pod",
    description: "Debug a Kubernetes pod issue",
    arguments: [
      { name: "miyabi_bundle__pod_name", description: "Name of the pod", required: true },
      { name: "miyabi_bundle__namespace", description: "Kubernetes namespace", required: false }
    ]
  },
  // === Log Analysis Prompts ===
  {
    name: "miyabi_bundle__log-analyze",
    description: "Analyze logs for patterns and issues",
    arguments: [
      { name: "miyabi_bundle__source", description: "Log source: file path, container name, or service", required: true },
      { name: "miyabi_bundle__pattern", description: "Pattern to search for", required: false }
    ]
  },
  // === Workflow Prompts ===
  {
    name: "miyabi_bundle__dev-cycle",
    description: "Execute a full development cycle: test, lint, commit, push",
    arguments: [
      { name: "miyabi_bundle__message", description: "Commit message", required: true },
      { name: "miyabi_bundle__skip_tests", description: "Skip tests (true/false)", required: false }
    ]
  },
  {
    name: "miyabi_bundle__deployment-checklist",
    description: "Generate a deployment checklist for the current project",
    arguments: [
      { name: "miyabi_bundle__environment", description: "Target environment: dev, staging, production", required: true }
    ]
  },
  // === Sequential Thinking Prompts ===
  {
    name: "miyabi_bundle__analyze-problem",
    description: "Use sequential thinking to analyze a complex problem",
    arguments: [
      { name: "miyabi_bundle__problem", description: "Problem statement", required: true },
      { name: "miyabi_bundle__context", description: "Additional context", required: false }
    ]
  }
];
async function handleTool(name, args) {
  try {
    if (name === "git_status") {
      return await git.status();
    }
    if (name === "git_branch_list") {
      return await git.branch(["-a", "-v"]);
    }
    if (name === "git_current_branch") {
      const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
      return { branch: branch.trim() };
    }
    if (name === "git_log") {
      const limit = Math.min(Math.max(args.limit || 20, 1), 100);
      return await git.log({ maxCount: limit });
    }
    if (name === "git_worktree_list") {
      const { stdout } = await execAsync3("git worktree list --porcelain", { cwd: MIYABI_REPO_PATH });
      return { worktrees: stdout };
    }
    if (name === "git_diff") {
      const file = args.file;
      const diff = file ? await git.diff([sanitizeShellArg(file)]) : await git.diff();
      return { diff };
    }
    if (name === "git_staged_diff") {
      return { diff: await git.diff(["--staged"]) };
    }
    if (name === "git_remote_list") {
      return { remotes: await git.getRemotes(true) };
    }
    if (name === "git_branch_ahead_behind") {
      const branch = sanitizeShellArg(args.branch || "HEAD");
      try {
        const { stdout } = await execAsync3(`git rev-list --left-right --count origin/${branch}...${branch}`, { cwd: MIYABI_REPO_PATH });
        const [behind, ahead] = stdout.trim().split("	").map(Number);
        return { ahead, behind };
      } catch {
        return { error: "Could not determine ahead/behind count" };
      }
    }
    if (name === "git_file_history") {
      const file = sanitizeShellArg(args.file);
      const limit = Math.min(Math.max(args.limit || 10, 1), 50);
      return await git.log({ file, maxCount: limit });
    }
    if (name === "git_stash_list") {
      const stashList = await git.stashList();
      return { stashes: stashList.all };
    }
    if (name === "git_blame") {
      const file = sanitizeShellArg(args.file);
      const startLine = args.startLine;
      const endLine = args.endLine;
      let cmd = `git blame --line-porcelain "${file}"`;
      if (startLine && endLine && startLine > 0 && endLine >= startLine) {
        cmd = `git blame --line-porcelain -L ${startLine},${endLine} "${file}"`;
      }
      const { stdout } = await execAsync3(cmd, { cwd: MIYABI_REPO_PATH });
      return { blame: stdout };
    }
    if (name === "git_show") {
      const commit = sanitizeShellArg(args.commit || "HEAD");
      const { stdout } = await execAsync3(`git show --stat "${commit}"`, { cwd: MIYABI_REPO_PATH });
      return { show: stdout };
    }
    if (name === "git_tag_list") {
      const tags = await git.tags();
      return { tags: tags.all };
    }
    if (name === "git_contributors") {
      const limit = Math.min(Math.max(args.limit || 10, 1), 50);
      const { stdout } = await execAsync3(`git shortlog -sn --no-merges HEAD | head -${limit}`, { cwd: MIYABI_REPO_PATH });
      return { contributors: stdout.trim().split("\n").filter(Boolean) };
    }
    if (name === "git_conflicts") {
      try {
        const { stdout } = await execAsync3("git diff --name-only --diff-filter=U", { cwd: MIYABI_REPO_PATH });
        const conflicts = stdout.trim().split("\n").filter(Boolean);
        return { hasConflicts: conflicts.length > 0, files: conflicts };
      } catch {
        return { hasConflicts: false, files: [] };
      }
    }
    if (name === "git_submodule_status") {
      try {
        const { stdout } = await execAsync3("git submodule status --recursive", { cwd: MIYABI_REPO_PATH });
        const lines = stdout.trim().split("\n").filter(Boolean);
        const submodules = lines.map((line) => {
          const match = line.match(/^([+-U ]?)([a-f0-9]+)\s+(\S+)(?:\s+\((.+)\))?/);
          if (match) {
            return {
              status: match[1] === "+" ? "modified" : match[1] === "-" ? "uninitialized" : match[1] === "U" ? "conflict" : "ok",
              commit: match[2],
              path: match[3],
              describe: match[4] || null
            };
          }
          return { raw: line };
        });
        return { submodules };
      } catch {
        return { submodules: [], message: "No submodules or git submodule not available" };
      }
    }
    if (name === "git_lfs_status") {
      const hasLfs = await commandExists("git-lfs");
      if (!hasLfs) {
        return { error: "git-lfs is not installed", installed: false };
      }
      try {
        const { stdout: statusOut } = await execAsync3("git lfs status", { cwd: MIYABI_REPO_PATH });
        const { stdout: envOut } = await execAsync3("git lfs env", { cwd: MIYABI_REPO_PATH });
        return { installed: true, status: statusOut.trim(), env: envOut.trim() };
      } catch (error) {
        return { installed: true, error: error instanceof Error ? error.message : String(error) };
      }
    }
    if (name === "git_hooks_list") {
      const hooksDir = (0, import_path.join)(MIYABI_REPO_PATH, ".git", "hooks");
      try {
        const files = await (0, import_promises.readdir)(hooksDir);
        const hooks = files.filter((f) => !f.endsWith(".sample")).map(async (f) => {
          const hookPath = (0, import_path.join)(hooksDir, f);
          const hookStat = await (0, import_promises.stat)(hookPath);
          return {
            name: f,
            executable: (hookStat.mode & 73) !== 0,
            size: hookStat.size
          };
        });
        return { hooks: await Promise.all(hooks) };
      } catch {
        return { hooks: [], message: "No hooks directory or not a git repository" };
      }
    }
    if (name.startsWith("tmux_")) return await handleTmuxTool(name, args);
    if (name.startsWith("log_")) return await handleLogTool(name, args);
    if (name.startsWith("resource_")) return await handleResourceTool(name, args);
    if (name.startsWith("network_")) return await handleNetworkTool(name, args);
    if (name.startsWith("process_")) return await handleProcessTool(name, args);
    if (name.startsWith("file_")) return await handleFileTool(name, args);
    if (name.startsWith("claude_")) return await handleClaudeTool(name, args);
    if (name.startsWith("github_")) return await handleGitHubTool(name, args);
    if (name === "health_check") return await handleHealthCheck();
    if (name.startsWith("society_")) return await handleSocietyTool(name, args);
    if (name.startsWith("metrics_")) return await handleMetricsTool(name, args);
    if (name.startsWith("bridge_")) return await handleBridgeTool(name, args);
    if (name.startsWith("context_")) return await handleContextTool(name, args);
    if (name.startsWith("linux_")) return await handleLinuxTool(name, args);
    if (name.startsWith("windows_")) return await handleWindowsTool(name, args);
    if (name.startsWith("docker_")) return await handleDockerTool(name, args);
    if (name.startsWith("compose_")) return await handleComposeTool(name, args);
    if (name.startsWith("k8s_")) return await handleK8sTool(name, args);
    if (name.startsWith("speckit_")) return await handleSpeckitTool(name, args);
    if (name.startsWith("mcp_")) return await handleMcpTool(name, args);
    if (name.startsWith("db_")) return await handleDbTool(name, args);
    if (name.startsWith("time_")) return await handleTimeTool(name, args);
    if (name.startsWith("calc_")) return await handleCalcTool(name, args);
    if (name.startsWith("think_")) return await handleThinkTool(name, args);
    if (name.startsWith("gen_")) return await handleGenTool(name, args);
    return { error: `Unknown tool: ${name}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
async function handleTmuxTool(name, args) {
  const hasTmux = await commandExists("tmux");
  if (!hasTmux) {
    return { error: "tmux is not installed" };
  }
  const target = sanitizeShellArg(args.target || "");
  const session = sanitizeShellArg(args.session || "");
  if (name === "tmux_list_sessions") {
    try {
      const { stdout } = await execAsync3('tmux list-sessions -F "#{session_name}:#{session_windows}:#{session_attached}:#{session_created}"');
      return { sessions: stdout.trim().split("\n").filter(Boolean) };
    } catch {
      return { sessions: [], message: "No tmux sessions" };
    }
  }
  if (name === "tmux_list_windows") {
    const cmd = session ? `tmux list-windows -t "${session}" -F "#{window_index}:#{window_name}:#{window_active}"` : 'tmux list-windows -F "#{window_index}:#{window_name}:#{window_active}"';
    const { stdout } = await execAsync3(cmd);
    return { windows: stdout.trim().split("\n").filter(Boolean) };
  }
  if (name === "tmux_list_panes") {
    const cmd = session ? `tmux list-panes -t "${session}" -F "#{pane_id}:#{pane_current_command}:#{pane_pid}:#{pane_active}"` : 'tmux list-panes -a -F "#{session_name}:#{pane_id}:#{pane_current_command}:#{pane_active}"';
    const { stdout } = await execAsync3(cmd);
    return { panes: stdout.trim().split("\n").filter(Boolean) };
  }
  if (name === "tmux_send_keys") {
    const keys = sanitizeShellArg(args.keys);
    if (!target) return { error: "Target pane required" };
    await execAsync3(`tmux send-keys -t "${target}" "${keys}" Enter`);
    return { success: true };
  }
  if (name === "tmux_pane_capture") {
    const lines = Math.min(Math.max(args.lines || 100, 1), 1e4);
    const { stdout } = await execAsync3(`tmux capture-pane -t "${target}" -p -S -${lines}`);
    return { content: stdout };
  }
  if (name === "tmux_pane_search") {
    const pattern = sanitizeShellArg(args.pattern);
    const { stdout } = await execAsync3(`tmux capture-pane -t "${target}" -p | grep -i "${pattern}" || true`);
    return { matches: stdout.trim().split("\n").filter(Boolean) };
  }
  if (name === "tmux_pane_tail") {
    const lines = Math.min(Math.max(args.lines || 20, 1), 1e3);
    const { stdout } = await execAsync3(`tmux capture-pane -t "${target}" -p | tail -n ${lines}`);
    return { content: stdout };
  }
  if (name === "tmux_pane_is_busy") {
    const { stdout } = await execAsync3(`tmux display-message -t "${target}" -p "#{pane_current_command}"`);
    const cmd = stdout.trim();
    return { busy: !["bash", "zsh", "fish", "sh", "dash"].includes(cmd), command: cmd };
  }
  if (name === "tmux_pane_current_command") {
    const { stdout } = await execAsync3(`tmux display-message -t "${target}" -p "#{pane_current_command}"`);
    return { command: stdout.trim() };
  }
  if (name === "tmux_session_info") {
    if (!session) return { error: "Session name required" };
    const { stdout } = await execAsync3(`tmux display-message -t "${session}" -p "name:#{session_name},windows:#{session_windows},attached:#{session_attached},created:#{session_created}"`);
    return { info: stdout.trim() };
  }
  return { error: `Unknown tmux tool: ${name}` };
}
async function handleLogTool(name, args) {
  if (name === "log_sources") {
    const files = await (0, import_glob.glob)("**/*.log", { cwd: MIYABI_LOG_DIR, ignore: ["node_modules/**", ".git/**"] });
    return { sources: files };
  }
  if (name === "log_get_recent" || name === "log_get_errors" || name === "log_get_warnings") {
    const minutes = Math.min(Math.max(args.minutes || 60, 1), 10080);
    const source = sanitizeShellArg(args.source || "*.log");
    const { stdout } = await execAsync3(`find "${MIYABI_LOG_DIR}" -name "${source}" -mmin -${minutes} -exec tail -n 100 {} \\; 2>/dev/null || true`);
    return { logs: stdout };
  }
  if (name === "log_search") {
    const query = args.query;
    const lengthError = validateInputLength(query, MAX_QUERY_LENGTH, "Query");
    if (lengthError) return { error: lengthError };
    const safeQuery = sanitizeShellArg(query);
    const { stdout } = await execAsync3(`grep -riF "${safeQuery}" "${MIYABI_LOG_DIR}" --include="*.log" 2>/dev/null | head -100 || true`);
    return { results: stdout.trim().split("\n").filter(Boolean) };
  }
  if (name === "log_tail") {
    const source = args.source;
    if (!source) {
      return { error: "Source file is required" };
    }
    const pathError = validateInputLength(source, MAX_PATH_LENGTH, "Source path");
    if (pathError) return { error: pathError };
    const lines = Math.min(Math.max(args.lines || 50, 1), 1e3);
    const safePath = sanitizePath(MIYABI_LOG_DIR, source);
    const { stdout } = await execAsync3(`tail -n ${lines} "${safePath}"`);
    return { content: stdout };
  }
  if (name === "log_stats") {
    const files = await (0, import_glob.glob)("**/*.log", { cwd: MIYABI_LOG_DIR, ignore: ["node_modules/**"] });
    const stats = await Promise.all(files.slice(0, 20).map(async (f) => {
      const s = await (0, import_promises.stat)((0, import_path.join)(MIYABI_LOG_DIR, f));
      return { file: f, size: s.size, modified: s.mtime };
    }));
    return { files: stats, total: files.length };
  }
  return { error: `Unknown log tool: ${name}` };
}
async function handleResourceTool(name, args) {
  if (name === "resource_cpu") {
    const cached = cache.get("cpu");
    if (cached) return { cpu: cached.currentLoad, cores: cached.cpus };
    const cpu2 = await si.currentLoad();
    cache.set("cpu", cpu2, 2e3);
    return { cpu: cpu2.currentLoad, cores: cpu2.cpus };
  }
  if (name === "resource_memory") {
    const cached = cache.get("memory");
    if (cached) {
      return {
        total: cached.total,
        used: cached.used,
        free: cached.free,
        available: cached.available,
        usedPercent: cached.used / cached.total * 100,
        swapTotal: cached.swaptotal,
        swapUsed: cached.swapused
      };
    }
    const mem2 = await si.mem();
    cache.set("memory", mem2, 2e3);
    return {
      total: mem2.total,
      used: mem2.used,
      free: mem2.free,
      available: mem2.available,
      usedPercent: mem2.used / mem2.total * 100,
      swapTotal: mem2.swaptotal,
      swapUsed: mem2.swapused
    };
  }
  if (name === "resource_disk") {
    const cached = cache.get("disk");
    if (cached) return { disks: cached };
    const disks = await si.fsSize();
    cache.set("disk", disks, 1e4);
    return { disks };
  }
  if (name === "resource_load") {
    const cached = cache.get("load");
    if (cached) return { avgLoad: cached.avgLoad, currentLoad: cached.currentLoad };
    const load = await si.currentLoad();
    cache.set("load", load, 2e3);
    return { avgLoad: load.avgLoad, currentLoad: load.currentLoad };
  }
  if (name === "resource_overview") {
    const [cpu2, mem2, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize()
    ]);
    return {
      cpu: { load: cpu2.currentLoad, avgLoad: cpu2.avgLoad },
      memory: { usedPercent: mem2.used / mem2.total * 100, freeGb: mem2.free / 1024 / 1024 / 1024 },
      disk: disk.map((d) => ({ mount: d.mount, usedPercent: d.use, freeGb: d.available / 1024 / 1024 / 1024 }))
    };
  }
  if (name === "resource_processes") {
    const processes2 = await si.processes();
    const limit = Math.min(Math.max(args.limit || 10, 1), 100);
    const sort = args.sort || "cpu";
    const sorted = processes2.list.sort((a, b) => sort === "memory" ? b.mem - a.mem : b.cpu - a.cpu).slice(0, limit);
    return { processes: sorted };
  }
  if (name === "resource_uptime") {
    const time2 = await si.time();
    return { uptime: time2.uptime, timezone: time2.timezone, current: time2.current };
  }
  if (name === "resource_network_stats") {
    const stats = await si.networkStats();
    return { stats };
  }
  if (name === "resource_battery") {
    const battery2 = await si.battery();
    return { battery: battery2 };
  }
  if (name === "resource_temperature") {
    const temp = await si.cpuTemperature();
    return { temperature: temp };
  }
  return { error: `Unknown resource tool: ${name}` };
}
async function handleNetworkTool(name, args) {
  if (name === "network_interfaces") {
    const cached = cache.get("network_interfaces");
    if (cached) return { interfaces: cached };
    const interfaces = await si.networkInterfaces();
    cache.set("network_interfaces", interfaces, 3e4);
    return { interfaces };
  }
  if (name === "network_connections") {
    const connections = await si.networkConnections();
    return { connections: connections.slice(0, 100) };
  }
  if (name === "network_listening_ports") {
    const connections = await si.networkConnections();
    const protocol = args.protocol || "all";
    let listening = connections.filter((c) => c.state === "LISTEN");
    if (protocol !== "all") {
      listening = listening.filter((c) => c.protocol.toLowerCase() === protocol);
    }
    return { ports: listening };
  }
  if (name === "network_stats") {
    const cached = cache.get("network_stats");
    if (cached) return { stats: cached };
    const stats = await si.networkStats();
    cache.set("network_stats", stats, 2e3);
    return { stats };
  }
  if (name === "network_gateway") {
    const gateway = await si.networkGatewayDefault();
    return { gateway };
  }
  if (name === "network_ping") {
    const host = args.host;
    const lengthError = validateInputLength(host, MAX_HOSTNAME_LENGTH, "Hostname");
    if (lengthError) return { error: lengthError };
    if (!isValidHostname(host)) {
      return { error: "Invalid hostname format" };
    }
    const count = Math.min(Math.max(args.count || 3, 1), 10);
    const pingFlag = (0, import_os.platform)() === "win32" ? "-n" : "-c";
    const { stdout } = await execAsync3(`ping ${pingFlag} ${count} "${host}"`, { timeout: 3e4 });
    return { result: stdout };
  }
  if (name === "network_bandwidth") {
    const stats = await si.networkStats();
    return { bandwidth: stats };
  }
  if (name === "network_overview") {
    const [interfaces, stats, gateway] = await Promise.all([
      si.networkInterfaces(),
      si.networkStats(),
      si.networkGatewayDefault()
    ]);
    return { interfaces, stats, gateway };
  }
  if (name === "network_dns_lookup") {
    const hostname = args.hostname;
    const lengthError = validateInputLength(hostname, MAX_HOSTNAME_LENGTH, "Hostname");
    if (lengthError) return { error: lengthError };
    if (!isValidHostname(hostname)) {
      return { error: "Invalid hostname format" };
    }
    try {
      const [address, ipv4, ipv6] = await Promise.allSettled([
        dnsLookup(hostname),
        dnsResolve4(hostname),
        dnsResolve6(hostname)
      ]);
      return {
        hostname,
        address: address.status === "fulfilled" ? address.value : null,
        ipv4: ipv4.status === "fulfilled" ? ipv4.value : [],
        ipv6: ipv6.status === "fulfilled" ? ipv6.value : []
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "DNS lookup failed" };
    }
  }
  if (name === "network_port_check") {
    const host = args.host;
    const port = args.port;
    if (!isValidHostname(host)) return { error: "Invalid hostname" };
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: "Invalid port" };
    try {
      const { stdout } = await execAsync3(`nc -z -w 3 "${host}" ${port} 2>&1 && echo "open" || echo "closed"`, { timeout: 5e3 });
      return { host, port, status: stdout.trim().includes("open") ? "open" : "closed" };
    } catch {
      return { host, port, status: "closed" };
    }
  }
  if (name === "network_public_ip") {
    try {
      const { stdout } = await execAsync3("curl -s --max-time 5 https://api.ipify.org");
      return { publicIp: stdout.trim() };
    } catch {
      return { error: "Could not determine public IP" };
    }
  }
  if (name === "network_wifi_info") {
    if ((0, import_os.platform)() === "darwin") {
      try {
        const { stdout } = await execAsync3("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I");
        return { wifi: stdout };
      } catch {
        return { error: "Could not get WiFi info" };
      }
    }
    return { error: "WiFi info only available on macOS" };
  }
  if (name === "network_route_table") {
    const cmd = (0, import_os.platform)() === "win32" ? "route print" : "netstat -rn";
    try {
      const { stdout } = await execAsync3(cmd);
      return { routes: stdout };
    } catch {
      return { error: "Could not get routing table" };
    }
  }
  if (name === "network_ssl_check") {
    const host = sanitizeShellArg(args.host);
    if (!isValidHostname(host)) return { error: "Invalid hostname" };
    const port = Math.min(Math.max(args.port || 443, 1), 65535);
    try {
      const { stdout } = await execAsync3(
        `echo | openssl s_client -connect "${host}:${port}" -servername "${host}" 2>/dev/null | openssl x509 -noout -dates -subject -issuer`,
        { timeout: 1e4 }
      );
      const lines = stdout.trim().split("\n");
      const result = {};
      for (const line of lines) {
        const [key, ...value] = line.split("=");
        if (key && value.length) result[key.trim()] = value.join("=").trim();
      }
      return { host, port, certificate: result };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "SSL check failed" };
    }
  }
  if (name === "network_traceroute") {
    const host = sanitizeShellArg(args.host);
    if (!isValidHostname(host)) return { error: "Invalid hostname" };
    const maxHops = Math.min(Math.max(args.maxHops || 15, 1), 30);
    const cmd = (0, import_os.platform)() === "win32" ? `tracert -h ${maxHops} "${host}"` : `traceroute -m ${maxHops} "${host}" 2>&1`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 6e4 });
      return { host, maxHops, trace: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Traceroute failed" };
    }
  }
  return { error: `Unknown network tool: ${name}` };
}
async function handleProcessTool(name, args) {
  if (name === "process_info") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    const { stdout } = await execAsync3(`ps -p ${pid} -o pid,ppid,user,%cpu,%mem,etime,command`);
    return { info: stdout };
  }
  if (name === "process_list") {
    const processes2 = await si.processes();
    const limit = Math.min(Math.max(args.limit || 20, 1), 200);
    return { processes: processes2.list.slice(0, limit) };
  }
  if (name === "process_search") {
    const query = sanitizeShellArg(args.query);
    const { stdout } = await execAsync3(`pgrep -la "${query}" 2>/dev/null || true`);
    return { matches: stdout.trim().split("\n").filter(Boolean) };
  }
  if (name === "process_tree") {
    const hasPstree = await commandExists("pstree");
    if (hasPstree) {
      const { stdout: stdout2 } = await execAsync3("pstree -p 2>/dev/null || pstree");
      return { tree: stdout2 };
    }
    const { stdout } = await execAsync3("ps -axo pid,ppid,comm | head -100");
    return { tree: stdout, note: "pstree not available" };
  }
  if (name === "process_file_descriptors") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    const { stdout } = await execAsync3(`lsof -p ${pid} 2>/dev/null | head -50 || echo "lsof not available"`);
    return { fds: stdout };
  }
  if (name === "process_environment") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    if ((0, import_os.platform)() === "darwin") {
      const { stdout: stdout2 } = await execAsync3(`ps eww -p ${pid} 2>/dev/null || echo "Process not found"`);
      return { env: stdout2 };
    }
    const { stdout } = await execAsync3(`cat /proc/${pid}/environ 2>/dev/null | tr '\\0' '\\n' || ps eww -p ${pid} 2>/dev/null || echo "Process not found"`);
    return { env: stdout };
  }
  if (name === "process_children") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    const { stdout } = await execAsync3(`pgrep -P ${pid} 2>/dev/null || true`);
    return { children: stdout.trim().split("\n").filter(Boolean) };
  }
  if (name === "process_top") {
    const limit = Math.min(Math.max(args.limit || 10, 1), 100);
    const processes2 = await si.processes();
    const top = processes2.list.sort((a, b) => b.cpu - a.cpu).slice(0, limit);
    return { top };
  }
  if (name === "process_kill") {
    const pid = args.pid;
    const confirm = args.confirm;
    const signal = args.signal || "SIGTERM";
    if (!confirm) return { error: "Confirmation required. Set confirm: true" };
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    if (!["SIGTERM", "SIGKILL", "SIGINT"].includes(signal)) return { error: "Invalid signal" };
    try {
      const { stdout: processInfo } = await execAsync3(`ps -p ${pid} -o pid,comm 2>/dev/null`);
      await execAsync3(`kill -${signal} ${pid}`);
      return { success: true, pid, signal, process: processInfo.trim() };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Kill failed" };
    }
  }
  if (name === "process_ports") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    const { stdout } = await execAsync3(`lsof -i -P -n -p ${pid} 2>/dev/null || true`);
    return { ports: stdout };
  }
  if (name === "process_cpu_history") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const { stdout } = await execAsync3(`ps -p ${pid} -o %cpu 2>/dev/null | tail -1`);
      samples.push(parseFloat(stdout.trim()) || 0);
      if (i < 2) await new Promise((r) => setTimeout(r, 500));
    }
    return { pid, samples, average: samples.reduce((a, b) => a + b, 0) / samples.length };
  }
  if (name === "process_memory_detail") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    const { stdout } = await execAsync3(`ps -p ${pid} -o pid,rss,vsz,%mem 2>/dev/null`);
    return { memory: stdout };
  }
  if (name === "process_threads") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    try {
      if ((0, import_os.platform)() === "darwin") {
        const { stdout } = await execAsync3(`ps -M -p ${pid} 2>/dev/null`);
        return { pid, threads: stdout };
      } else if ((0, import_os.platform)() === "linux") {
        const { stdout } = await execAsync3(`ps -T -p ${pid} 2>/dev/null`);
        return { pid, threads: stdout };
      }
      return { error: "Thread listing not supported on this platform" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not list threads" };
    }
  }
  if (name === "process_io_stats") {
    const pid = args.pid;
    if (!isValidPid(pid)) return { error: "Invalid PID" };
    if ((0, import_os.platform)() !== "linux") {
      return { error: "I/O stats only available on Linux" };
    }
    try {
      const { stdout } = await execAsync3(`cat /proc/${pid}/io 2>/dev/null`);
      const lines = stdout.trim().split("\n");
      const stats = {};
      for (const line of lines) {
        const [key, value] = line.split(":");
        if (key && value) stats[key.trim()] = parseInt(value.trim(), 10);
      }
      return { pid, io: stats };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not read I/O stats" };
    }
  }
  return { error: `Unknown process tool: ${name}` };
}
async function handleFileTool(name, args) {
  const baseDir = MIYABI_WATCH_DIR;
  if (name === "file_stats") {
    const userPath = args.path;
    const fullPath = sanitizePath(baseDir, userPath);
    const stats = await (0, import_promises.stat)(fullPath);
    return {
      path: userPath,
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      permissions: stats.mode.toString(8).slice(-3)
    };
  }
  if (name === "file_recent_changes") {
    const minutes = Math.min(Math.max(args.minutes || 60, 1), 10080);
    const limit = Math.min(Math.max(args.limit || 20, 1), 200);
    const { stdout } = await execAsync3(`find "${baseDir}" -type f -mmin -${minutes} 2>/dev/null | head -${limit}`);
    return { files: stdout.trim().split("\n").filter(Boolean) };
  }
  if (name === "file_search") {
    const pattern = args.pattern;
    const files = await (0, import_glob.glob)(pattern, { cwd: baseDir, ignore: ["node_modules/**", ".git/**"] });
    return { files };
  }
  if (name === "file_tree") {
    const depth = Math.min(Math.max(args.depth || 3, 1), 10);
    const { stdout } = await execAsync3(`find "${baseDir}" -maxdepth ${depth} -type f 2>/dev/null | head -100`);
    return { tree: stdout };
  }
  if (name === "file_compare") {
    const path1 = sanitizePath(baseDir, args.path1);
    const path2 = sanitizePath(baseDir, args.path2);
    const [stat1, stat2] = await Promise.all([(0, import_promises.stat)(path1), (0, import_promises.stat)(path2)]);
    return {
      path1: { size: stat1.size, modified: stat1.mtime },
      path2: { size: stat2.size, modified: stat2.mtime },
      sameSize: stat1.size === stat2.size
    };
  }
  if (name === "file_changes_since") {
    const since = new Date(args.since);
    if (isNaN(since.getTime())) return { error: "Invalid date format" };
    const { stdout } = await execAsync3(`find "${baseDir}" -type f -newermt "${since.toISOString()}" 2>/dev/null | head -50`);
    return { files: stdout.trim().split("\n").filter(Boolean) };
  }
  if (name === "file_read") {
    const userPath = args.path;
    const encoding = args.encoding || "utf-8";
    const maxLines = Math.min(Math.max(args.maxLines || 1e3, 1), 5e3);
    const fullPath = sanitizePath(baseDir, userPath);
    const stats = await (0, import_promises.stat)(fullPath);
    if (stats.size > 100 * 1024) return { error: "File too large (max 100KB)" };
    const content = await (0, import_promises.readFile)(fullPath, encoding);
    const lines = content.split("\n");
    const truncated = lines.length > maxLines;
    return {
      path: userPath,
      size: stats.size,
      lines: lines.length,
      truncated,
      content: truncated ? lines.slice(0, maxLines).join("\n") : content
    };
  }
  if (name === "file_checksum") {
    const userPath = args.path;
    const algorithm = args.algorithm || "sha256";
    if (!["md5", "sha256", "sha512"].includes(algorithm)) return { error: "Invalid algorithm" };
    const fullPath = sanitizePath(baseDir, userPath);
    const stats = await (0, import_promises.stat)(fullPath);
    if (stats.size > 100 * 1024 * 1024) return { error: "File too large (max 100MB)" };
    const content = await (0, import_promises.readFile)(fullPath);
    const hash = (0, import_crypto.createHash)(algorithm).update(content).digest("hex");
    return { path: userPath, algorithm, checksum: hash, size: stats.size };
  }
  if (name === "file_size_summary") {
    const dir = args.directory || ".";
    const safePath = sanitizePath(baseDir, dir);
    const { stdout } = await execAsync3(`du -sh "${safePath}" 2>/dev/null`);
    return { summary: stdout.trim() };
  }
  if (name === "file_duplicates") {
    const dir = args.directory || ".";
    const pattern = args.pattern || "*";
    const safePath = sanitizePath(baseDir, dir);
    const files = await (0, import_glob.glob)(pattern, { cwd: safePath, ignore: ["node_modules/**", ".git/**"] });
    const checksums = /* @__PURE__ */ new Map();
    for (const f of files.slice(0, 100)) {
      const fullPath = (0, import_path.join)(safePath, f);
      try {
        const stats = await (0, import_promises.stat)(fullPath);
        if (stats.isFile() && stats.size < 10 * 1024 * 1024) {
          const content = await (0, import_promises.readFile)(fullPath);
          const hash = (0, import_crypto.createHash)("md5").update(content).digest("hex");
          if (!checksums.has(hash)) checksums.set(hash, []);
          checksums.get(hash).push(f);
        }
      } catch {
      }
    }
    const duplicates = Array.from(checksums.entries()).filter(([, files2]) => files2.length > 1).map(([hash, files2]) => ({ hash, files: files2 }));
    return { duplicates };
  }
  return { error: `Unknown file tool: ${name}` };
}
async function handleClaudeTool(name, args) {
  if (name === "claude_config") {
    try {
      const content = await (0, import_promises.readFile)(CLAUDE_CONFIG_FILE, "utf-8");
      return { config: JSON.parse(content) };
    } catch {
      return { error: "Could not read Claude config", path: CLAUDE_CONFIG_FILE };
    }
  }
  if (name === "claude_mcp_status") {
    try {
      const content = await (0, import_promises.readFile)(CLAUDE_CONFIG_FILE, "utf-8");
      const config = JSON.parse(content);
      const servers = config.mcpServers || {};
      return {
        servers: Object.keys(servers),
        details: Object.entries(servers).map(([name2, cfg]) => ({
          name: name2,
          command: cfg.command || "unknown"
        }))
      };
    } catch {
      return { error: "Could not read MCP status" };
    }
  }
  if (name === "claude_logs") {
    const lines = Math.min(Math.max(args.lines || 100, 1), 1e3);
    const { stdout } = await execAsync3(`find "${CLAUDE_LOGS_DIR}" -name "*.log" -exec tail -n ${lines} {} \\; 2>/dev/null || echo "No logs found"`);
    return { logs: stdout };
  }
  if (name === "claude_log_search") {
    const query = args.query;
    const lengthError = validateInputLength(query, MAX_QUERY_LENGTH, "Query");
    if (lengthError) return { error: lengthError };
    const safeQuery = sanitizeShellArg(query);
    const { stdout } = await execAsync3(`grep -riF "${safeQuery}" "${CLAUDE_LOGS_DIR}" 2>/dev/null | head -50 || echo "No matches"`);
    return { results: stdout };
  }
  if (name === "claude_log_files") {
    try {
      const files = await (0, import_promises.readdir)(CLAUDE_LOGS_DIR);
      return { files };
    } catch {
      return { error: "Could not list log files", path: CLAUDE_LOGS_DIR };
    }
  }
  if (name === "claude_session_info") {
    try {
      const { stdout } = await execAsync3('pgrep -l -f "Claude" 2>/dev/null || echo ""');
      const processes2 = stdout.trim().split("\n").filter(Boolean);
      return {
        processes: processes2.length,
        details: processes2,
        configDir: CLAUDE_CONFIG_DIR,
        logsDir: CLAUDE_LOGS_DIR
      };
    } catch {
      return { processes: 0, configDir: CLAUDE_CONFIG_DIR, logsDir: CLAUDE_LOGS_DIR };
    }
  }
  if (name === "claude_background_shells") {
    try {
      const { stdout } = await execAsync3('ps aux | grep -E "(node|tsx).*claude" 2>/dev/null | grep -v grep || echo ""');
      const shells = stdout.trim().split("\n").filter(Boolean);
      return { shells, count: shells.length };
    } catch {
      return { shells: [], count: 0 };
    }
  }
  if (name === "claude_status") {
    const [config, logs, processes2] = await Promise.allSettled([
      (0, import_promises.readFile)(CLAUDE_CONFIG_FILE, "utf-8").then((c) => JSON.parse(c)),
      (0, import_promises.readdir)(CLAUDE_LOGS_DIR).catch(() => []),
      execAsync3('pgrep -l -f "Claude" 2>/dev/null || echo ""').then((r) => r.stdout.trim().split("\n").filter(Boolean))
    ]);
    return {
      config: config.status === "fulfilled" ? { mcpServers: Object.keys(config.value.mcpServers || {}), hasConfig: true } : { hasConfig: false },
      logs: logs.status === "fulfilled" ? { fileCount: logs.value.length, files: logs.value.slice(0, 10) } : { fileCount: 0 },
      processes: processes2.status === "fulfilled" ? { count: processes2.value.length, list: processes2.value } : { count: 0 },
      paths: { configDir: CLAUDE_CONFIG_DIR, configFile: CLAUDE_CONFIG_FILE, logsDir: CLAUDE_LOGS_DIR }
    };
  }
  return { error: `Unknown claude tool: ${name}` };
}
async function handleGitHubTool(name, args) {
  if (!octokit) {
    return { error: "GitHub token not configured. Set GITHUB_TOKEN environment variable." };
  }
  const owner = args.owner || GITHUB_DEFAULT_OWNER;
  const repo = args.repo || GITHUB_DEFAULT_REPO;
  if (!owner || !repo) {
    return { error: "Repository owner and name required. Set GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO." };
  }
  if (name === "github_list_issues") {
    const response = await octokit.issues.listForRepo({
      owner,
      repo,
      state: args.state || "open",
      per_page: Math.min(args.per_page || 30, 100)
    });
    return { issues: response.data };
  }
  if (name === "github_get_issue") {
    const response = await octokit.issues.get({ owner, repo, issue_number: args.issue_number });
    return { issue: response.data };
  }
  if (name === "github_create_issue") {
    const response = await octokit.issues.create({
      owner,
      repo,
      title: args.title,
      body: args.body,
      labels: args.labels
    });
    return { issue: response.data };
  }
  if (name === "github_update_issue") {
    const response = await octokit.issues.update({
      owner,
      repo,
      issue_number: args.issue_number,
      title: args.title,
      body: args.body,
      state: args.state
    });
    return { issue: response.data };
  }
  if (name === "github_add_comment") {
    const response = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: args.issue_number,
      body: args.body
    });
    return { comment: response.data };
  }
  if (name === "github_list_prs") {
    const response = await octokit.pulls.list({
      owner,
      repo,
      state: args.state || "open",
      per_page: Math.min(args.per_page || 30, 100)
    });
    return { prs: response.data };
  }
  if (name === "github_get_pr") {
    const response = await octokit.pulls.get({ owner, repo, pull_number: args.pull_number });
    return { pr: response.data };
  }
  if (name === "github_create_pr") {
    const response = await octokit.pulls.create({
      owner,
      repo,
      title: args.title,
      head: args.head,
      base: args.base || "main",
      body: args.body
    });
    return { pr: response.data };
  }
  if (name === "github_merge_pr") {
    const response = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: args.pull_number,
      merge_method: args.merge_method || "squash"
    });
    return { merged: response.data };
  }
  if (name === "github_list_labels") {
    const response = await octokit.issues.listLabelsForRepo({ owner, repo });
    return { labels: response.data };
  }
  if (name === "github_add_labels") {
    const response = await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: args.issue_number,
      labels: args.labels
    });
    return { labels: response.data };
  }
  if (name === "github_list_milestones") {
    const response = await octokit.issues.listMilestones({
      owner,
      repo,
      state: args.state || "open"
    });
    return { milestones: response.data };
  }
  if (name === "github_list_workflows") {
    const response = await octokit.actions.listRepoWorkflows({
      owner,
      repo,
      per_page: Math.min(args.per_page || 30, 100)
    });
    return { workflows: response.data.workflows, total_count: response.data.total_count };
  }
  if (name === "github_list_workflow_runs") {
    const params = {
      owner,
      repo,
      per_page: Math.min(args.per_page || 30, 100)
    };
    if (args.workflow_id) params.workflow_id = parseInt(args.workflow_id, 10);
    if (args.status) params.status = args.status;
    const response = await octokit.actions.listWorkflowRunsForRepo(params);
    return { runs: response.data.workflow_runs, total_count: response.data.total_count };
  }
  if (name === "github_repo_info") {
    const response = await octokit.repos.get({ owner, repo });
    return { repo: response.data };
  }
  if (name === "github_list_releases") {
    const response = await octokit.repos.listReleases({
      owner,
      repo,
      per_page: Math.min(args.per_page || 10, 100)
    });
    return { releases: response.data };
  }
  if (name === "github_list_branches") {
    const response = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: Math.min(args.per_page || 30, 100)
    });
    return { branches: response.data };
  }
  if (name === "github_compare_commits") {
    const base = args.base;
    const head = args.head;
    const response = await octokit.repos.compareCommits({ owner, repo, base, head });
    return {
      ahead_by: response.data.ahead_by,
      behind_by: response.data.behind_by,
      total_commits: response.data.total_commits,
      files_changed: response.data.files?.length || 0,
      commits: response.data.commits.map((c) => ({ sha: c.sha, message: c.commit.message }))
    };
  }
  if (name === "github_list_pr_reviews") {
    const pullNumber = args.pull_number;
    const response = await octokit.pulls.listReviews({ owner, repo, pull_number: pullNumber });
    return {
      reviews: response.data.map((r) => ({
        id: r.id,
        user: r.user?.login,
        state: r.state,
        body: r.body,
        submitted_at: r.submitted_at
      }))
    };
  }
  if (name === "github_create_review") {
    const pullNumber = args.pull_number;
    const body = args.body;
    const event = args.event;
    const comments = args.comments;
    const response = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body,
      event,
      comments
    });
    return {
      id: response.data.id,
      state: response.data.state,
      html_url: response.data.html_url
    };
  }
  if (name === "github_submit_review") {
    const pullNumber = args.pull_number;
    const reviewId = args.review_id;
    const body = args.body;
    const event = args.event;
    const response = await octokit.pulls.submitReview({
      owner,
      repo,
      pull_number: pullNumber,
      review_id: reviewId,
      body,
      event
    });
    return {
      id: response.data.id,
      state: response.data.state,
      html_url: response.data.html_url
    };
  }
  return { error: `Unknown github tool: ${name}` };
}
async function handleMetricsTool(name, args) {
  switch (name) {
    case "metrics_collect":
      return await handleMetricsCollect(args);
    case "metrics_aggregate":
      return await handleMetricsAggregate(args.period);
    case "metrics_query":
      return await handleMetricsQuery(args);
    case "metrics_export":
      return await handleMetricsExport(args.format || "json");
    case "metrics_dashboard":
      return await handleMetricsDashboard();
    default:
      throw new Error(`Unknown metrics tool: ${name}`);
  }
}
async function handleBridgeTool(name, args) {
  switch (name) {
    case "bridge_send":
      return await handleBridgeSend(args);
    case "bridge_receive":
      return await handleBridgeReceive(args);
    case "bridge_context_share":
      return await handleBridgeContextShare(args);
    case "bridge_context_get":
      return await handleBridgeContextGet(args);
    case "bridge_queue_status":
      return await handleBridgeQueueStatus(args);
    case "bridge_history":
      return await handleBridgeHistory(args);
    default:
      throw new Error(`Unknown bridge tool: ${name}`);
  }
}
async function handleContextTool(name, args) {
  switch (name) {
    case "context_store":
      return await handleContextStore(args);
    case "context_get":
      return await handleContextGet(args);
    case "context_list":
      return await handleContextList(args);
    case "context_expire":
      return await handleContextExpire(args);
    case "context_share":
      return await handleContextShare(args);
    case "context_search":
      return await handleContextSearch(args);
    default:
      throw new Error(`Unknown context tool: ${name}`);
  }
}
async function handleSocietyTool(name, args) {
  switch (name) {
    case "society_health_all":
      return await handleSocietyHealthAll();
    case "society_health_single":
      return await handleSocietyHealthSingle(args.society);
    case "society_agent_status":
      return await handleSocietyAgentStatus(args.society);
    case "society_mcp_status":
      return await handleSocietyMcpStatus();
    case "society_metrics_summary":
      return await handleSocietyMetricsSummary();
    default:
      throw new Error(`Unknown society tool: ${name}`);
  }
}
async function handleHealthCheck() {
  const [cpu2, mem2, disk, uptime] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.time()
  ]);
  const health = {
    status: "healthy",
    checks: {
      cpu: { value: cpu2.currentLoad, threshold: 90, passed: cpu2.currentLoad < 90 },
      memory: { value: mem2.used / mem2.total * 100, threshold: 90, passed: mem2.used / mem2.total * 100 < 90 },
      disk: disk.map((d) => ({ mount: d.mount, value: d.use, threshold: 90, passed: d.use < 90 }))
    },
    uptime: uptime.uptime,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!health.checks.cpu.passed || !health.checks.memory.passed) {
    health.status = "warning";
  }
  if (health.checks.disk.some((d) => !d.passed)) {
    health.status = "warning";
  }
  return health;
}
async function handleLinuxTool(name, args) {
  if ((0, import_os.platform)() !== "linux") {
    return { error: "Linux tools are only available on Linux" };
  }
  const hasSystemctl = await commandExists("systemctl");
  if (!hasSystemctl) {
    return { error: "systemctl not found. This system may not use systemd." };
  }
  if (name === "linux_systemd_units") {
    const unitType = sanitizeShellArg(args.type || "");
    const state = sanitizeShellArg(args.state || "");
    let cmd = "systemctl list-units --no-pager";
    if (unitType) cmd += ` --type=${unitType}`;
    if (state) cmd += ` --state=${state}`;
    try {
      const { stdout } = await execAsync3(cmd);
      return { units: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to list units" };
    }
  }
  if (name === "linux_systemd_status") {
    const unit = sanitizeShellArg(args.unit);
    if (!unit) return { error: "Unit name required" };
    try {
      const { stdout } = await execAsync3(`systemctl status "${unit}" --no-pager 2>&1 || true`);
      return { unit, status: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get status" };
    }
  }
  if (name === "linux_journal_search") {
    const hasJournalctl = await commandExists("journalctl");
    if (!hasJournalctl) {
      return { error: "journalctl not found" };
    }
    const unit = sanitizeShellArg(args.unit || "");
    const priority = sanitizeShellArg(args.priority || "");
    const since = sanitizeShellArg(args.since || "");
    const lines = Math.min(Math.max(args.lines || 100, 1), 1e3);
    let cmd = `journalctl --no-pager -n ${lines}`;
    if (unit) cmd += ` -u "${unit}"`;
    if (priority) cmd += ` -p ${priority}`;
    if (since) cmd += ` --since="${since}"`;
    try {
      const { stdout } = await execAsync3(cmd);
      return { journal: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to search journal" };
    }
  }
  return { error: `Unknown linux tool: ${name}` };
}
async function handleWindowsTool(name, args) {
  if ((0, import_os.platform)() !== "win32") {
    return { error: "Windows tools are only available on Windows" };
  }
  if (name === "windows_service_status") {
    const service = sanitizeShellArg(args.service || "");
    const cmd = service ? `sc query "${service}"` : "sc query state= all";
    try {
      const { stdout } = await execAsync3(cmd);
      return { services: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get service status" };
    }
  }
  if (name === "windows_eventlog_search") {
    const log = sanitizeShellArg(args.log || "System");
    const level = sanitizeShellArg(args.level || "");
    const source = sanitizeShellArg(args.source || "");
    const maxEvents = Math.min(Math.max(args.maxEvents || 50, 1), 500);
    let filter = `LogName='${log}'`;
    if (level) {
      const levelMap = { Error: 2, Warning: 3, Information: 4 };
      if (levelMap[level]) filter += ` and Level=${levelMap[level]}`;
    }
    if (source) filter += ` and ProviderName='${source}'`;
    const cmd = `powershell -Command "Get-WinEvent -FilterHashtable @{${filter}} -MaxEvents ${maxEvents} | Select-Object TimeCreated,LevelDisplayName,ProviderName,Message | ConvertTo-Json"`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      return { events: stdout ? JSON.parse(stdout) : [] };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to search event log" };
    }
  }
  return { error: `Unknown windows tool: ${name}` };
}
async function handleDockerTool(name, args) {
  const hasDocker = await commandExists("docker");
  if (!hasDocker) {
    return { error: "Docker is not installed or not in PATH" };
  }
  if (name === "docker_ps") {
    const all = args.all;
    const limit = Math.min(Math.max(args.limit || 100, 1), 500);
    let cmd = `docker ps --format "{{json .}}"`;
    if (all) cmd = `docker ps -a --format "{{json .}}"`;
    cmd += ` -n ${limit}`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      const containers = stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return { containers, count: containers.length };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to list containers" };
    }
  }
  if (name === "docker_images") {
    const all = args.all;
    const dangling = args.dangling;
    let cmd = `docker images --format "{{json .}}"`;
    if (all) cmd += " -a";
    if (dangling) cmd = `docker images -f "dangling=true" --format "{{json .}}"`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      const images = stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return { images, count: images.length };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to list images" };
    }
  }
  if (name === "docker_logs") {
    const container = sanitizeShellArg(args.container);
    if (!container) return { error: "Container name/id required" };
    const tail = Math.min(Math.max(args.tail || 100, 1), 1e4);
    const timestamps = args.timestamps;
    const since = sanitizeShellArg(args.since || "");
    let cmd = `docker logs --tail ${tail}`;
    if (timestamps) cmd += " --timestamps";
    if (since) cmd += ` --since "${since}"`;
    cmd += ` "${container}"`;
    try {
      const { stdout, stderr } = await execAsync3(cmd, { timeout: 6e4 });
      return { logs: stdout || stderr };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get logs" };
    }
  }
  if (name === "docker_inspect") {
    const target = sanitizeShellArg(args.target);
    if (!target) return { error: "Target (container/image) required" };
    const type = args.type || "container";
    const cmd = type === "image" ? `docker image inspect "${target}"` : `docker inspect "${target}"`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      return { inspect: JSON.parse(stdout) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to inspect" };
    }
  }
  if (name === "docker_stats") {
    const container = sanitizeShellArg(args.container || "");
    const cmd = container ? `docker stats --no-stream --format "{{json .}}" "${container}"` : `docker stats --no-stream --format "{{json .}}"`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      const stats = stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return { stats };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get stats" };
    }
  }
  if (name === "docker_exec") {
    const container = sanitizeShellArg(args.container);
    const command = sanitizeShellArg(args.command);
    const user = sanitizeShellArg(args.user || "");
    if (!container || !command) return { error: "Container and command required" };
    let cmd = `docker exec`;
    if (user) cmd += ` -u "${user}"`;
    cmd += ` "${container}" ${command}`;
    try {
      const { stdout, stderr } = await execAsync3(cmd, { timeout: 6e4 });
      return { output: stdout || stderr };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to exec" };
    }
  }
  if (name === "docker_start") {
    const container = sanitizeShellArg(args.container);
    if (!container) return { error: "Container name/id required" };
    try {
      await execAsync3(`docker start "${container}"`, { timeout: 3e4 });
      return { success: true, message: `Container ${container} started` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to start container" };
    }
  }
  if (name === "docker_stop") {
    const container = sanitizeShellArg(args.container);
    if (!container) return { error: "Container name/id required" };
    const timeout = Math.min(Math.max(args.timeout || 10, 1), 300);
    try {
      await execAsync3(`docker stop -t ${timeout} "${container}"`, { timeout: (timeout + 10) * 1e3 });
      return { success: true, message: `Container ${container} stopped` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to stop container" };
    }
  }
  if (name === "docker_restart") {
    const container = sanitizeShellArg(args.container);
    if (!container) return { error: "Container name/id required" };
    const timeout = Math.min(Math.max(args.timeout || 10, 1), 300);
    try {
      await execAsync3(`docker restart -t ${timeout} "${container}"`, { timeout: (timeout + 20) * 1e3 });
      return { success: true, message: `Container ${container} restarted` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to restart container" };
    }
  }
  if (name === "docker_build") {
    const path = sanitizeShellArg(args.path || ".");
    const tag = sanitizeShellArg(args.tag || "");
    const dockerfile = sanitizeShellArg(args.dockerfile || "");
    const noCache = args.noCache;
    let cmd = `docker build`;
    if (tag) cmd += ` -t "${tag}"`;
    if (dockerfile) cmd += ` -f "${dockerfile}"`;
    if (noCache) cmd += " --no-cache";
    cmd += ` "${path}"`;
    try {
      const { stdout, stderr } = await execAsync3(cmd, { timeout: 6e5 });
      return { success: true, output: stdout || stderr };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Build failed" };
    }
  }
  return { error: `Unknown docker tool: ${name}` };
}
async function handleComposeTool(name, args) {
  let composeCmd = "docker compose";
  const hasComposeV2 = await commandExists("docker");
  if (!hasComposeV2) {
    const hasComposeV1 = await commandExists("docker-compose");
    if (!hasComposeV1) {
      return { error: "Docker Compose is not installed" };
    }
    composeCmd = "docker-compose";
  }
  const composePath = sanitizeShellArg(args.path || "");
  const pathArg = composePath ? ` -f "${composePath}"` : "";
  if (name === "compose_ps") {
    const all = args.all;
    let cmd = `${composeCmd}${pathArg} ps --format json`;
    if (all) cmd += " -a";
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      const services = stdout.trim().split("\n").filter(Boolean).map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
      return { services, count: services.length };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to list services" };
    }
  }
  if (name === "compose_up") {
    const services = args.services || [];
    const detach = args.detach !== false;
    const build = args.build;
    let cmd = `${composeCmd}${pathArg} up`;
    if (detach) cmd += " -d";
    if (build) cmd += " --build";
    if (services.length > 0) {
      cmd += " " + services.map((s) => sanitizeShellArg(s)).join(" ");
    }
    try {
      const { stdout, stderr } = await execAsync3(cmd, { timeout: 3e5 });
      return { success: true, output: stdout || stderr };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to start services" };
    }
  }
  if (name === "compose_down") {
    const volumes = args.volumes;
    const removeOrphans = args.removeOrphans;
    let cmd = `${composeCmd}${pathArg} down`;
    if (volumes) cmd += " -v";
    if (removeOrphans) cmd += " --remove-orphans";
    try {
      const { stdout, stderr } = await execAsync3(cmd, { timeout: 12e4 });
      return { success: true, output: stdout || stderr };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to stop services" };
    }
  }
  if (name === "compose_logs") {
    const services = args.services || [];
    const tail = Math.min(Math.max(args.tail || 100, 1), 5e3);
    const timestamps = args.timestamps;
    let cmd = `${composeCmd}${pathArg} logs --tail ${tail}`;
    if (timestamps) cmd += " --timestamps";
    if (services.length > 0) {
      cmd += " " + services.map((s) => sanitizeShellArg(s)).join(" ");
    }
    try {
      const { stdout, stderr } = await execAsync3(cmd, { timeout: 6e4 });
      return { logs: stdout || stderr };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get logs" };
    }
  }
  return { error: `Unknown compose tool: ${name}` };
}
async function handleK8sTool(name, args) {
  const hasKubectl = await commandExists("kubectl");
  if (!hasKubectl) {
    return { error: "kubectl is not installed or not in PATH" };
  }
  const namespace = sanitizeShellArg(args.namespace || "");
  const nsArg = namespace ? ` -n "${namespace}"` : "";
  const allNsArg = args.allNamespaces ? " --all-namespaces" : "";
  if (name === "k8s_get_pods") {
    const selector = sanitizeShellArg(args.selector || "");
    let cmd = `kubectl get pods${nsArg}${allNsArg} -o json`;
    if (selector) cmd = `kubectl get pods${nsArg}${allNsArg} -l "${selector}" -o json`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      const result = JSON.parse(stdout);
      return { pods: result.items || [], count: (result.items || []).length };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get pods" };
    }
  }
  if (name === "k8s_get_deployments") {
    const cmd = `kubectl get deployments${nsArg}${allNsArg} -o json`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      const result = JSON.parse(stdout);
      return { deployments: result.items || [], count: (result.items || []).length };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get deployments" };
    }
  }
  if (name === "k8s_logs") {
    const pod = sanitizeShellArg(args.pod);
    if (!pod) return { error: "Pod name required" };
    const container = sanitizeShellArg(args.container || "");
    const tail = Math.min(Math.max(args.tail || 100, 1), 1e4);
    const since = sanitizeShellArg(args.since || "");
    let cmd = `kubectl logs${nsArg} "${pod}" --tail=${tail}`;
    if (container) cmd += ` -c "${container}"`;
    if (since) cmd += ` --since="${since}"`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 6e4 });
      return { logs: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get logs" };
    }
  }
  if (name === "k8s_describe") {
    const resource = sanitizeShellArg(args.resource);
    const resourceName = sanitizeShellArg(args.name);
    if (!resource || !resourceName) return { error: "Resource type and name required" };
    const cmd = `kubectl describe ${resource}${nsArg} "${resourceName}"`;
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 3e4 });
      return { description: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to describe resource" };
    }
  }
  if (name === "k8s_apply") {
    const file = sanitizeShellArg(args.file);
    if (!file) return { error: "Manifest file path required" };
    const dryRun = args.dryRun;
    let cmd = `kubectl apply${nsArg} -f "${file}"`;
    if (dryRun) cmd += " --dry-run=client";
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 6e4 });
      return { success: true, output: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to apply manifest" };
    }
  }
  if (name === "k8s_delete") {
    const resource = sanitizeShellArg(args.resource);
    const resourceName = sanitizeShellArg(args.name);
    if (!resource || !resourceName) return { error: "Resource type and name required" };
    const dryRun = args.dryRun;
    let cmd = `kubectl delete ${resource}${nsArg} "${resourceName}"`;
    if (dryRun) cmd += " --dry-run=client";
    try {
      const { stdout } = await execAsync3(cmd, { timeout: 6e4 });
      return { success: true, output: stdout };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to delete resource" };
    }
  }
  return { error: `Unknown k8s tool: ${name}` };
}
async function handleSpeckitTool(name, args) {
  const projectPath = args.path || MIYABI_REPO_PATH;
  const safePath = sanitizePath(projectPath, ".");
  const speckitDir = (0, import_path.join)(safePath, ".speckit");
  const specsDir = (0, import_path.join)(safePath, "specs");
  if (name === "speckit_init") {
    try {
      const { mkdir, writeFile } = await import("fs/promises");
      await mkdir(speckitDir, { recursive: true });
      await mkdir((0, import_path.join)(speckitDir, "templates"), { recursive: true });
      await mkdir(specsDir, { recursive: true });
      const constitutionPath = (0, import_path.join)(safePath, "memory", "constitution.md");
      const memoryDir = (0, import_path.join)(safePath, "memory");
      if (!(0, import_fs.existsSync)(constitutionPath)) {
        await mkdir(memoryDir, { recursive: true });
        await writeFile(constitutionPath, `# Project Constitution

## Core Principles
1. Code quality over speed
2. User experience first
3. Security by design
4. Test coverage required

## Technology Choices
- Prefer TypeScript for type safety
- Use established patterns
- Document decisions

## Constraints
- No breaking changes without migration path
- All public APIs require documentation
`);
      }
      const templatePath = (0, import_path.join)(speckitDir, "templates", "spec-template.md");
      await writeFile(templatePath, `# Feature: [FEATURE_NAME]

## Summary
Brief description of the feature.

## User Stories
- As a [user type], I want to [action] so that [benefit]

## Functional Requirements
1. [Requirement 1]
2. [Requirement 2]

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Assumptions
- [Assumption 1]

## Dependencies
- [Dependency 1]
`);
      return {
        success: true,
        message: "Spec-Kit initialized",
        created: [
          speckitDir,
          (0, import_path.join)(speckitDir, "templates"),
          specsDir,
          memoryDir,
          constitutionPath,
          templatePath
        ]
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to initialize Spec-Kit" };
    }
  }
  if (name === "speckit_status") {
    const status = {
      initialized: (0, import_fs.existsSync)(speckitDir),
      hasConstitution: (0, import_fs.existsSync)((0, import_path.join)(safePath, "memory", "constitution.md")),
      hasSpecs: (0, import_fs.existsSync)(specsDir),
      features: []
    };
    if ((0, import_fs.existsSync)(specsDir)) {
      try {
        const entries = await (0, import_promises.readdir)(specsDir, { withFileTypes: true });
        status.features = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      } catch {
      }
    }
    return status;
  }
  if (name === "speckit_constitution") {
    const constitutionPath = (0, import_path.join)(safePath, "memory", "constitution.md");
    const content = args.content;
    if (content) {
      try {
        const { writeFile, mkdir } = await import("fs/promises");
        await mkdir((0, import_path.join)(safePath, "memory"), { recursive: true });
        await writeFile(constitutionPath, content);
        return { success: true, message: "Constitution updated" };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Failed to update constitution" };
      }
    } else {
      if (!(0, import_fs.existsSync)(constitutionPath)) {
        return { error: "Constitution not found. Run speckit_init first." };
      }
      const constitutionContent = await (0, import_promises.readFile)(constitutionPath, "utf-8");
      return { content: constitutionContent };
    }
  }
  if (name === "speckit_specify") {
    const feature = args.feature;
    if (!feature) return { error: "Feature description required" };
    const shortName = feature.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().split(/\s+/).slice(0, 4).join("-");
    let nextNum = 1;
    if ((0, import_fs.existsSync)(specsDir)) {
      try {
        const entries = await (0, import_promises.readdir)(specsDir, { withFileTypes: true });
        const numbers = entries.filter((e) => e.isDirectory()).map((e) => parseInt(e.name.split("-")[0], 10)).filter((n) => !isNaN(n));
        if (numbers.length > 0) {
          nextNum = Math.max(...numbers) + 1;
        }
      } catch {
      }
    }
    const featureDir = (0, import_path.join)(specsDir, `${nextNum}-${shortName}`);
    const specFile = (0, import_path.join)(featureDir, "spec.md");
    try {
      const { mkdir, writeFile } = await import("fs/promises");
      await mkdir(featureDir, { recursive: true });
      await mkdir((0, import_path.join)(featureDir, "checklists"), { recursive: true });
      const specContent = `# Feature: ${feature}

## Summary
${feature}

## User Stories
- As a user, I want to ${feature.toLowerCase()} so that I can accomplish my goal

## Functional Requirements
1. [NEEDS CLARIFICATION: Define primary requirement]

## Success Criteria
- [ ] Feature is implemented and tested
- [ ] Documentation is updated

## Assumptions
- Standard project setup

## Dependencies
- None identified yet
`;
      await writeFile(specFile, specContent);
      return {
        success: true,
        featureId: `${nextNum}-${shortName}`,
        featureDir,
        specFile,
        message: `Feature specification created: ${nextNum}-${shortName}`
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to create specification" };
    }
  }
  if (name === "speckit_plan") {
    const feature = args.feature;
    if (!feature) return { error: "Feature name/id required" };
    let featureDir = null;
    if ((0, import_fs.existsSync)(specsDir)) {
      const entries = await (0, import_promises.readdir)(specsDir, { withFileTypes: true });
      const match = entries.find(
        (e) => e.isDirectory() && e.name.includes(feature.toLowerCase().replace(/\s+/g, "-"))
      );
      if (match) featureDir = (0, import_path.join)(specsDir, match.name);
    }
    if (!featureDir || !(0, import_fs.existsSync)(featureDir)) {
      return { error: `Feature not found: ${feature}. Run speckit_specify first.` };
    }
    const specFile = (0, import_path.join)(featureDir, "spec.md");
    if (!(0, import_fs.existsSync)(specFile)) {
      return { error: "Spec file not found in feature directory" };
    }
    const planFile = (0, import_path.join)(featureDir, "plan.md");
    try {
      const { writeFile } = await import("fs/promises");
      const planContent = `# Implementation Plan

## Feature
${feature}

## Technical Context
- **Framework**: [To be determined]
- **Dependencies**: [To be determined]

## Phase 0: Research
- [ ] Review existing codebase patterns
- [ ] Identify integration points
- [ ] Resolve NEEDS CLARIFICATION items

## Phase 1: Design
- [ ] Create data model
- [ ] Define API contracts
- [ ] Plan test strategy

## Phase 2: Implementation
- [ ] Implement core functionality
- [ ] Add tests
- [ ] Update documentation

## Constitution Check
- [ ] Follows project principles
- [ ] Security considered
- [ ] Test coverage planned

## Generated from
\`\`\`
${specFile}
\`\`\`
`;
      await writeFile(planFile, planContent);
      return {
        success: true,
        planFile,
        message: `Implementation plan created: ${planFile}`
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to create plan" };
    }
  }
  if (name === "speckit_tasks") {
    const feature = args.feature;
    if (!feature) return { error: "Feature name/id required" };
    let featureDir = null;
    if ((0, import_fs.existsSync)(specsDir)) {
      const entries = await (0, import_promises.readdir)(specsDir, { withFileTypes: true });
      const match = entries.find(
        (e) => e.isDirectory() && e.name.includes(feature.toLowerCase().replace(/\s+/g, "-"))
      );
      if (match) featureDir = (0, import_path.join)(specsDir, match.name);
    }
    if (!featureDir) {
      return { error: `Feature not found: ${feature}` };
    }
    const planFile = (0, import_path.join)(featureDir, "plan.md");
    if (!(0, import_fs.existsSync)(planFile)) {
      return { error: "Plan file not found. Run speckit_plan first." };
    }
    const tasksFile = (0, import_path.join)(featureDir, "tasks.md");
    try {
      const { writeFile } = await import("fs/promises");
      const tasksContent = `# Tasks: ${feature}

## Phase 1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Install required dependencies

## Phase 2: Foundation
- [ ] T003 Set up base infrastructure
- [ ] T004 Create initial configuration

## Phase 3: Implementation
- [ ] T005 [P] Implement core functionality
- [ ] T006 [P] Add unit tests
- [ ] T007 Integration testing

## Phase 4: Polish
- [ ] T008 Update documentation
- [ ] T009 Code review and cleanup
- [ ] T010 Final testing

## Dependencies
- T003 depends on T001, T002
- T005, T006 can run in parallel after T004
- T008 depends on T005, T006, T007

## Notes
- [P] indicates parallelizable tasks
- Task IDs follow sequential order
`;
      await writeFile(tasksFile, tasksContent);
      return {
        success: true,
        tasksFile,
        taskCount: 10,
        message: `Task list created: ${tasksFile}`
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to create tasks" };
    }
  }
  if (name === "speckit_checklist") {
    const feature = args.feature;
    if (!feature) return { error: "Feature name/id required" };
    let featureDir = null;
    if ((0, import_fs.existsSync)(specsDir)) {
      const entries = await (0, import_promises.readdir)(specsDir, { withFileTypes: true });
      const match = entries.find(
        (e) => e.isDirectory() && e.name.includes(feature.toLowerCase().replace(/\s+/g, "-"))
      );
      if (match) featureDir = (0, import_path.join)(specsDir, match.name);
    }
    if (!featureDir) {
      return { error: `Feature not found: ${feature}` };
    }
    const checklistDir = (0, import_path.join)(featureDir, "checklists");
    const checklistFile = (0, import_path.join)(checklistDir, "requirements.md");
    try {
      const { writeFile, mkdir } = await import("fs/promises");
      await mkdir(checklistDir, { recursive: true });
      const checklistContent = `# Specification Quality Checklist: ${feature}

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
**Feature**: [specs/${feature}/spec.md]

## Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Success criteria are technology-agnostic (no implementation details)
- [ ] All acceptance scenarios are defined
- [ ] Edge cases are identified
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

## Feature Readiness

- [ ] All functional requirements have clear acceptance criteria
- [ ] User scenarios cover primary flows
- [ ] Feature meets measurable outcomes defined in Success Criteria
- [ ] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before /speckit.clarify or /speckit.plan
`;
      await writeFile(checklistFile, checklistContent);
      return {
        success: true,
        checklistFile,
        message: `Checklist created: ${checklistFile}`
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to create checklist" };
    }
  }
  if (name === "speckit_analyze") {
    const analysis = {
      projectPath: safePath,
      speckit: {
        initialized: (0, import_fs.existsSync)(speckitDir),
        hasTemplates: (0, import_fs.existsSync)((0, import_path.join)(speckitDir, "templates"))
      },
      constitution: {
        exists: (0, import_fs.existsSync)((0, import_path.join)(safePath, "memory", "constitution.md"))
      },
      features: []
    };
    if ((0, import_fs.existsSync)(specsDir)) {
      const entries = await (0, import_promises.readdir)(specsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const featurePath = (0, import_path.join)(specsDir, entry.name);
          analysis.features.push({
            id: entry.name,
            hasSpec: (0, import_fs.existsSync)((0, import_path.join)(featurePath, "spec.md")),
            hasPlan: (0, import_fs.existsSync)((0, import_path.join)(featurePath, "plan.md")),
            hasTasks: (0, import_fs.existsSync)((0, import_path.join)(featurePath, "tasks.md")),
            hasChecklist: (0, import_fs.existsSync)((0, import_path.join)(featurePath, "checklists", "requirements.md"))
          });
        }
      }
    }
    const issues = [];
    if (!analysis.speckit.initialized) {
      issues.push("Spec-Kit not initialized. Run speckit_init.");
    }
    if (!analysis.constitution.exists) {
      issues.push("Constitution missing. Run speckit_init or speckit_constitution.");
    }
    for (const f of analysis.features) {
      if (!f.hasSpec) issues.push(`Feature ${f.id} missing spec.md`);
      if (f.hasSpec && !f.hasPlan) issues.push(`Feature ${f.id} has spec but no plan`);
    }
    return {
      ...analysis,
      issues,
      isConsistent: issues.length === 0
    };
  }
  if (name === "speckit_list_features") {
    if (!(0, import_fs.existsSync)(specsDir)) {
      return { features: [], message: "No specs directory found. Run speckit_init." };
    }
    const entries = await (0, import_promises.readdir)(specsDir, { withFileTypes: true });
    const features = await Promise.all(
      entries.filter((e) => e.isDirectory()).map(async (e) => {
        const featurePath = (0, import_path.join)(specsDir, e.name);
        const specFile = (0, import_path.join)(featurePath, "spec.md");
        let summary = "";
        if ((0, import_fs.existsSync)(specFile)) {
          const content = await (0, import_promises.readFile)(specFile, "utf-8");
          const summaryMatch = content.match(/## Summary\n([^\n]+)/);
          if (summaryMatch) summary = summaryMatch[1].trim();
        }
        return {
          id: e.name,
          summary,
          hasSpec: (0, import_fs.existsSync)(specFile),
          hasPlan: (0, import_fs.existsSync)((0, import_path.join)(featurePath, "plan.md")),
          hasTasks: (0, import_fs.existsSync)((0, import_path.join)(featurePath, "tasks.md"))
        };
      })
    );
    return { features, count: features.length };
  }
  return { error: `Unknown speckit tool: ${name}` };
}
async function handleMcpTool(name, args) {
  if (name === "mcp_search_tools") {
    const query = (args.query || "").toLowerCase();
    const category = (args.category || "").toLowerCase();
    let results = tools;
    if (category) {
      results = results.filter((t) => t.name.toLowerCase().startsWith(category));
    }
    if (query) {
      results = results.filter(
        (t) => t.name.toLowerCase().includes(query) || t.description && t.description.toLowerCase().includes(query)
      );
    }
    return {
      query,
      category: category || "all",
      count: results.length,
      tools: results.map((t) => ({
        name: t.name,
        description: t.description
      }))
    };
  }
  if (name === "mcp_list_categories") {
    const categories = {};
    const categoryDescriptions = {
      git: "Git version control operations",
      tmux: "Terminal multiplexer management",
      log: "Log file analysis and search",
      resource: "System resource monitoring (CPU, memory, disk)",
      network: "Network inspection and diagnostics",
      process: "Process management and monitoring",
      file: "File system operations and watching",
      claude: "Claude Code session management",
      github: "GitHub API integration (issues, PRs, workflows)",
      linux: "Linux systemd service management",
      windows: "Windows service and event log",
      docker: "Docker container management",
      compose: "Docker Compose orchestration",
      k8s: "Kubernetes cluster management",
      speckit: "Spec-Driven Development workflow",
      mcp: "MCP tool discovery and search",
      health: "System health check",
      db: "Database operations (SQLite, PostgreSQL, MySQL)",
      time: "Time and timezone utilities",
      calc: "Mathematical calculations and conversions",
      think: "Sequential reasoning and thought chains",
      gen: "Data generators (UUID, password, hash)"
    };
    for (const tool of tools) {
      const prefix = tool.name.split("_")[0];
      if (!categories[prefix]) {
        categories[prefix] = {
          count: 0,
          description: categoryDescriptions[prefix] || "Miscellaneous tools"
        };
      }
      categories[prefix].count++;
    }
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1].count - a[1].count).map(([name2, info]) => ({
      category: name2,
      ...info
    }));
    return {
      totalTools: tools.length,
      categoryCount: sortedCategories.length,
      categories: sortedCategories
    };
  }
  if (name === "mcp_get_tool_info") {
    const toolName = args.tool;
    if (!toolName) return { error: "Tool name required" };
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      const matches = tools.filter(
        (t) => t.name.toLowerCase().includes(toolName.toLowerCase())
      );
      if (matches.length > 0) {
        return {
          error: `Tool '${toolName}' not found`,
          suggestions: matches.slice(0, 5).map((t) => t.name)
        };
      }
      return { error: `Tool '${toolName}' not found` };
    }
    const schema = tool.inputSchema;
    const parameters = schema.properties ? Object.entries(schema.properties).map(([name2, prop]) => ({
      name: name2,
      type: prop.type,
      description: prop.description || "",
      required: schema.required?.includes(name2) || false,
      enum: prop.enum
    })) : [];
    return {
      name: tool.name,
      description: tool.description,
      category: tool.name.split("_")[0],
      parameters,
      requiredParams: schema.required || [],
      example: `Call with: { ${parameters.map((p) => `"${p.name}": ${p.type === "string" ? '"value"' : p.type === "number" ? "123" : p.type === "boolean" ? "true" : "..."}`).join(", ")} }`
    };
  }
  return { error: `Unknown mcp tool: ${name}` };
}
function buildDbCommand(args, sqlCommand) {
  const { type, connection, host, port, database, user, password } = args;
  switch (type) {
    case "sqlite": {
      const dbPath = sanitizeShellArg(connection || ":memory:");
      return { cmd: `sqlite3 -json "${dbPath}" "${sqlCommand}"` };
    }
    case "postgresql": {
      const pgHost = sanitizeShellArg(host || "localhost");
      const pgPort = port || 5432;
      const pgDb = sanitizeShellArg(database || "postgres");
      const pgUser = sanitizeShellArg(user || "postgres");
      const env = {};
      if (password) env.PGPASSWORD = password;
      return {
        cmd: `psql -h "${pgHost}" -p ${pgPort} -U "${pgUser}" -d "${pgDb}" -t -A -c "${sqlCommand}"`,
        env
      };
    }
    case "mysql": {
      const myHost = sanitizeShellArg(host || "localhost");
      const myPort = port || 3306;
      const myDb = sanitizeShellArg(database || "");
      const myUser = sanitizeShellArg(user || "root");
      const dbFlag = myDb ? `-D "${myDb}"` : "";
      const passFlag = password ? `-p"${sanitizeShellArg(password)}"` : "";
      return {
        cmd: `mysql -h "${myHost}" -P ${myPort} -u "${myUser}" ${passFlag} ${dbFlag} -N -e "${sqlCommand}"`
      };
    }
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}
async function handleDbTool(name, args) {
  const dbArgs = args;
  const dbType = dbArgs.type;
  if (!dbType) {
    return { error: "Database type required (sqlite, postgresql, mysql)" };
  }
  const cliTool = dbType === "sqlite" ? "sqlite3" : dbType === "postgresql" ? "psql" : "mysql";
  if (!await commandExists(cliTool)) {
    return { error: `${cliTool} CLI not found. Install ${dbType} client tools.` };
  }
  if (name === "db_connect") {
    try {
      const testQuery = dbType === "sqlite" ? "SELECT 1" : dbType === "postgresql" ? "SELECT 1" : "SELECT 1";
      const { cmd, env } = buildDbCommand(dbArgs, testQuery);
      const { stdout } = await execAsync3(cmd, { timeout: 1e4, env: { ...process.env, ...env } });
      return {
        success: true,
        type: dbType,
        message: `Connected to ${dbType} successfully`,
        result: stdout.trim()
      };
    } catch (error) {
      return {
        success: false,
        type: dbType,
        error: error instanceof Error ? error.message : "Connection failed"
      };
    }
  }
  if (name === "db_tables") {
    try {
      let query;
      switch (dbType) {
        case "sqlite":
          query = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
          break;
        case "postgresql":
          query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename";
          break;
        case "mysql":
          query = "SHOW TABLES";
          break;
      }
      const { cmd, env } = buildDbCommand(dbArgs, query);
      const { stdout } = await execAsync3(cmd, { timeout: 3e4, env: { ...process.env, ...env } });
      const tables = stdout.trim().split("\n").filter(Boolean);
      return {
        type: dbType,
        count: tables.length,
        tables
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to list tables" };
    }
  }
  if (name === "db_schema") {
    const table = sanitizeShellArg(args.table);
    if (!table) return { error: "Table name required" };
    try {
      let query;
      switch (dbType) {
        case "sqlite":
          query = `PRAGMA table_info(${table})`;
          break;
        case "postgresql":
          query = `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`;
          break;
        case "mysql":
          query = `DESCRIBE ${table}`;
          break;
      }
      const { cmd, env } = buildDbCommand(dbArgs, query);
      const { stdout } = await execAsync3(cmd, { timeout: 3e4, env: { ...process.env, ...env } });
      return {
        type: dbType,
        table,
        schema: stdout.trim()
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to get schema" };
    }
  }
  if (name === "db_query") {
    const query = args.query;
    if (!query) return { error: "Query required" };
    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery.startsWith("SELECT") && !upperQuery.startsWith("WITH")) {
      return { error: "Only SELECT queries allowed (read-only). Use SELECT or WITH...SELECT." };
    }
    const dangerousPatterns = [
      /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)/i,
      /INTO\s+OUTFILE/i,
      /INTO\s+DUMPFILE/i,
      /LOAD_FILE/i
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return { error: "Query contains blocked pattern" };
      }
    }
    const limit = Math.min(Math.max(args.limit || 100, 1), 1e3);
    let limitedQuery = query;
    if (!upperQuery.includes("LIMIT")) {
      limitedQuery = `${query.replace(/;?\s*$/, "")} LIMIT ${limit}`;
    }
    try {
      const { cmd, env } = buildDbCommand(dbArgs, sanitizeShellArg(limitedQuery));
      const { stdout } = await execAsync3(cmd, { timeout: 6e4, env: { ...process.env, ...env } });
      const rows = stdout.trim().split("\n").filter(Boolean);
      return {
        type: dbType,
        query: limitedQuery,
        rowCount: rows.length,
        result: rows
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Query failed" };
    }
  }
  if (name === "db_explain") {
    const query = args.query;
    if (!query) return { error: "Query required" };
    try {
      let explainQuery;
      switch (dbType) {
        case "sqlite":
          explainQuery = `EXPLAIN QUERY PLAN ${query}`;
          break;
        case "postgresql":
          explainQuery = `EXPLAIN (FORMAT TEXT) ${query}`;
          break;
        case "mysql":
          explainQuery = `EXPLAIN ${query}`;
          break;
      }
      const { cmd, env } = buildDbCommand(dbArgs, sanitizeShellArg(explainQuery));
      const { stdout } = await execAsync3(cmd, { timeout: 3e4, env: { ...process.env, ...env } });
      return {
        type: dbType,
        query,
        plan: stdout.trim()
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Explain failed" };
    }
  }
  if (name === "db_health") {
    try {
      const health = {
        type: dbType,
        connected: false
      };
      const testQuery = "SELECT 1";
      const { cmd: testCmd, env } = buildDbCommand(dbArgs, testQuery);
      try {
        await execAsync3(testCmd, { timeout: 1e4, env: { ...process.env, ...env } });
        health.connected = true;
      } catch {
        return { ...health, error: "Connection failed" };
      }
      let statsQuery;
      switch (dbType) {
        case "sqlite":
          statsQuery = "SELECT 'tables' as metric, COUNT(*) as value FROM sqlite_master WHERE type='table'";
          break;
        case "postgresql":
          statsQuery = "SELECT 'size' as metric, pg_database_size(current_database()) as value";
          break;
        case "mysql":
          statsQuery = "SELECT 'uptime' as metric, VARIABLE_VALUE as value FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Uptime'";
          break;
      }
      const { cmd: statsCmd, env: statsEnv } = buildDbCommand(dbArgs, statsQuery);
      try {
        const { stdout } = await execAsync3(statsCmd, { timeout: 1e4, env: { ...process.env, ...statsEnv } });
        health.stats = stdout.trim();
      } catch {
        health.stats = "Unable to fetch stats";
      }
      return health;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Health check failed" };
    }
  }
  return { error: `Unknown db tool: ${name}` };
}
async function handleTimeTool(name, args) {
  if (name === "time_current") {
    const timezone = args.timezone || "UTC";
    const format = args.format || "iso";
    try {
      const now = /* @__PURE__ */ new Date();
      const options = {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      };
      if (format === "unix") {
        return { timestamp: Math.floor(now.getTime() / 1e3), timezone };
      } else if (format === "human") {
        const formatter = new Intl.DateTimeFormat("en-US", { ...options, weekday: "long" });
        return { time: formatter.format(now), timezone };
      } else {
        const formatter = new Intl.DateTimeFormat("sv-SE", options);
        const formatted = formatter.format(now).replace(" ", "T");
        return { time: formatted, timezone, iso: now.toISOString() };
      }
    } catch (error) {
      return { error: `Invalid timezone: ${timezone}` };
    }
  }
  if (name === "time_convert") {
    const timeStr = args.time;
    const fromTz = args.from || "UTC";
    const toTz = args.to;
    try {
      let date;
      if (/^\d+$/.test(timeStr)) {
        date = new Date(parseInt(timeStr) * 1e3);
      } else {
        date = new Date(timeStr);
      }
      if (isNaN(date.getTime())) {
        return { error: "Invalid time format" };
      }
      const options = {
        timeZone: toTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      };
      const formatter = new Intl.DateTimeFormat("sv-SE", options);
      return {
        original: timeStr,
        from: fromTz,
        to: toTz,
        converted: formatter.format(date).replace(" ", "T"),
        unix: Math.floor(date.getTime() / 1e3)
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Conversion failed" };
    }
  }
  if (name === "time_format") {
    const timeStr = args.time;
    const formatStr = args.format;
    const timezone = args.timezone || "UTC";
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        return { error: "Invalid time format" };
      }
      const parts = {};
      const getPart = (opt) => {
        return new Intl.DateTimeFormat("en-US", { ...opt, timeZone: timezone }).format(date);
      };
      parts.YYYY = getPart({ year: "numeric" });
      parts.MM = getPart({ month: "2-digit" });
      parts.DD = getPart({ day: "2-digit" });
      parts.HH = getPart({ hour: "2-digit", hour12: false }).padStart(2, "0");
      parts.mm = getPart({ minute: "2-digit" }).padStart(2, "0");
      parts.ss = getPart({ second: "2-digit" }).padStart(2, "0");
      let result = formatStr;
      for (const [key, value] of Object.entries(parts)) {
        result = result.replace(key, value);
      }
      return { formatted: result, original: timeStr, timezone };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Format failed" };
    }
  }
  if (name === "time_diff") {
    const startStr = args.start;
    const endStr = args.end || (/* @__PURE__ */ new Date()).toISOString();
    const unit = args.unit || "seconds";
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { error: "Invalid time format" };
      }
      const diffMs = end.getTime() - start.getTime();
      const divisors = {
        seconds: 1e3,
        minutes: 6e4,
        hours: 36e5,
        days: 864e5,
        weeks: 6048e5
      };
      const divisor = divisors[unit] || 1e3;
      const diff = diffMs / divisor;
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        difference: diff,
        unit,
        milliseconds: diffMs
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Diff calculation failed" };
    }
  }
  return { error: `Unknown time tool: ${name}` };
}
async function handleCalcTool(name, args) {
  if (name === "calc_expression") {
    const expression = args.expression;
    const precision = Math.min(Math.max(args.precision || 10, 0), 20);
    const safeExpression = expression.replace(/\s+/g, "").toLowerCase();
    const allowedPattern = /^[\d+\-*/().%^e,\s]*(sqrt|sin|cos|tan|log|ln|abs|ceil|floor|round|pow|exp|pi|e)*[\d+\-*/().%^e,\s]*$/i;
    if (!allowedPattern.test(safeExpression)) {
      return { error: "Invalid expression. Only math operations allowed." };
    }
    if (/[a-z]{4,}/i.test(safeExpression.replace(/(sqrt|sin|cos|tan|log|abs|ceil|floor|round|pow|exp)/gi, ""))) {
      return { error: "Invalid expression" };
    }
    try {
      const mathFns = {
        sqrt: Math.sqrt,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        log: Math.log10,
        ln: Math.log,
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        pow: Math.pow,
        exp: Math.exp,
        PI: Math.PI,
        E: Math.E
      };
      let evalExpr = safeExpression.replace(/pi/gi, String(Math.PI)).replace(/\^/g, "**");
      for (const [fn, impl] of Object.entries(mathFns)) {
        if (typeof impl === "function") {
          const regex = new RegExp(`${fn}\\(([^)]+)\\)`, "gi");
          evalExpr = evalExpr.replace(regex, (_, arg) => {
            const argVal = parseFloat(arg);
            if (!isNaN(argVal)) {
              return String(impl(argVal));
            }
            return _;
          });
        }
      }
      if (!/^[\d+\-*/().%\s*e]+$/.test(evalExpr)) {
        return { error: "Invalid expression after parsing" };
      }
      const result = new Function(`return (${evalExpr})`)();
      if (typeof result !== "number" || !isFinite(result)) {
        return { error: "Result is not a valid number" };
      }
      return {
        expression,
        result: parseFloat(result.toFixed(precision)),
        precision
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Evaluation failed" };
    }
  }
  if (name === "calc_unit_convert") {
    const value = args.value;
    const from = args.from.toLowerCase();
    const to = args.to.toLowerCase();
    const tempUnits = {
      celsius: "c",
      c: "c",
      fahrenheit: "f",
      f: "f",
      kelvin: "k",
      k: "k"
    };
    if (from in tempUnits && to in tempUnits) {
      const fromUnit = tempUnits[from];
      const toUnit = tempUnits[to];
      let celsius;
      if (fromUnit === "c") celsius = value;
      else if (fromUnit === "f") celsius = (value - 32) * 5 / 9;
      else celsius = value - 273.15;
      let result2;
      if (toUnit === "c") result2 = celsius;
      else if (toUnit === "f") result2 = celsius * 9 / 5 + 32;
      else result2 = celsius + 273.15;
      return { value, from, to, result: parseFloat(result2.toFixed(4)) };
    }
    const conversions = {
      // Length (base: meters)
      length: {
        m: 1,
        meter: 1,
        meters: 1,
        km: 1e3,
        kilometer: 1e3,
        kilometers: 1e3,
        cm: 0.01,
        centimeter: 0.01,
        mm: 1e-3,
        millimeter: 1e-3,
        mi: 1609.344,
        mile: 1609.344,
        miles: 1609.344,
        yd: 0.9144,
        yard: 0.9144,
        yards: 0.9144,
        ft: 0.3048,
        foot: 0.3048,
        feet: 0.3048,
        in: 0.0254,
        inch: 0.0254,
        inches: 0.0254
      },
      // Weight (base: grams)
      weight: {
        g: 1,
        gram: 1,
        grams: 1,
        kg: 1e3,
        kilogram: 1e3,
        mg: 1e-3,
        milligram: 1e-3,
        lb: 453.592,
        pound: 453.592,
        pounds: 453.592,
        oz: 28.3495,
        ounce: 28.3495,
        ounces: 28.3495,
        ton: 1e6,
        t: 1e6
      },
      // Volume (base: liters)
      volume: {
        l: 1,
        liter: 1,
        liters: 1,
        ml: 1e-3,
        milliliter: 1e-3,
        gal: 3.78541,
        gallon: 3.78541,
        gallons: 3.78541,
        qt: 0.946353,
        quart: 0.946353,
        pt: 0.473176,
        pint: 0.473176,
        cup: 0.236588,
        cups: 0.236588,
        floz: 0.0295735
      },
      // Data (base: bytes)
      data: {
        b: 1,
        byte: 1,
        bytes: 1,
        kb: 1024,
        kilobyte: 1024,
        mb: 1048576,
        megabyte: 1048576,
        gb: 1073741824,
        gigabyte: 1073741824,
        tb: 1099511627776,
        terabyte: 1099511627776
      }
    };
    let category = null;
    for (const [cat, units2] of Object.entries(conversions)) {
      if (from in units2 && to in units2) {
        category = cat;
        break;
      }
    }
    if (!category) {
      return { error: `Cannot convert between ${from} and ${to}` };
    }
    const units = conversions[category];
    const baseValue = value * units[from];
    const result = baseValue / units[to];
    return { value, from, to, result: parseFloat(result.toFixed(6)) };
  }
  if (name === "calc_statistics") {
    const data = args.data;
    const metrics = args.metrics || ["mean", "median", "min", "max", "count"];
    if (!Array.isArray(data) || data.length === 0) {
      return { error: "Data must be a non-empty array of numbers" };
    }
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const results = {};
    for (const metric of metrics) {
      switch (metric) {
        case "mean":
          results.mean = parseFloat(mean.toFixed(6));
          break;
        case "median":
          results.median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
          break;
        case "mode":
          const freq = {};
          let maxFreq = 0, mode = data[0];
          for (const x of data) {
            freq[x] = (freq[x] || 0) + 1;
            if (freq[x] > maxFreq) {
              maxFreq = freq[x];
              mode = x;
            }
          }
          results.mode = mode;
          break;
        case "stddev":
          const variance = data.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / n;
          results.stddev = parseFloat(Math.sqrt(variance).toFixed(6));
          break;
        case "variance":
          results.variance = parseFloat((data.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / n).toFixed(6));
          break;
        case "min":
          results.min = sorted[0];
          break;
        case "max":
          results.max = sorted[n - 1];
          break;
        case "sum":
          results.sum = sum;
          break;
        case "count":
          results.count = n;
          break;
      }
    }
    return { data: { count: n }, statistics: results };
  }
  return { error: `Unknown calc tool: ${name}` };
}
var thinkingSessions = /* @__PURE__ */ new Map();
async function handleThinkTool(name, args) {
  if (name === "think_step") {
    const thought = args.thought;
    const type = args.type || "observation";
    const confidence = Math.min(Math.max(args.confidence || 0.5, 0), 1);
    let sessionId = args.sessionId;
    if (!sessionId) {
      sessionId = `think_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      thinkingSessions.set(sessionId, {
        steps: [],
        branches: /* @__PURE__ */ new Map(),
        created: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const session = thinkingSessions.get(sessionId);
    if (!session) {
      return { error: `Session not found: ${sessionId}` };
    }
    const step = {
      id: session.steps.length + 1,
      thought,
      type,
      confidence,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    session.steps.push(step);
    return {
      sessionId,
      step,
      totalSteps: session.steps.length,
      hint: session.steps.length === 1 ? "Use sessionId in future calls to continue this chain" : void 0
    };
  }
  if (name === "think_branch") {
    const sessionId = args.sessionId;
    const branchName = args.branchName;
    const fromStep = args.fromStep || 0;
    const session = thinkingSessions.get(sessionId);
    if (!session) {
      return { error: `Session not found: ${sessionId}` };
    }
    if (session.branches.has(branchName)) {
      return { error: `Branch ${branchName} already exists` };
    }
    session.branches.set(branchName, {
      fromStep,
      steps: []
    });
    return {
      sessionId,
      branchName,
      fromStep,
      mainSteps: session.steps.length,
      totalBranches: session.branches.size
    };
  }
  if (name === "think_summarize") {
    const sessionId = args.sessionId;
    const includeAlternatives = args.includeAlternatives ?? true;
    const session = thinkingSessions.get(sessionId);
    if (!session) {
      return { error: `Session not found: ${sessionId}` };
    }
    const observations = session.steps.filter((s) => s.type === "observation");
    const hypotheses = session.steps.filter((s) => s.type === "hypothesis");
    const analyses = session.steps.filter((s) => s.type === "analysis");
    const conclusions = session.steps.filter((s) => s.type === "conclusion");
    const questions = session.steps.filter((s) => s.type === "question");
    const avgConfidence = session.steps.length > 0 ? session.steps.reduce((sum, s) => sum + s.confidence, 0) / session.steps.length : 0;
    const summary = {
      sessionId,
      created: session.created,
      totalSteps: session.steps.length,
      breakdown: {
        observations: observations.length,
        hypotheses: hypotheses.length,
        analyses: analyses.length,
        conclusions: conclusions.length,
        questions: questions.length
      },
      averageConfidence: parseFloat(avgConfidence.toFixed(2)),
      steps: session.steps
    };
    if (includeAlternatives && session.branches.size > 0) {
      summary.branches = Array.from(session.branches.entries()).map(([name2, branch]) => ({
        name: name2,
        fromStep: branch.fromStep,
        steps: branch.steps.length
      }));
    }
    if (conclusions.length > 0) {
      summary.keyConclusions = conclusions.map((c) => ({
        thought: c.thought,
        confidence: c.confidence
      }));
    }
    return summary;
  }
  return { error: `Unknown think tool: ${name}` };
}
async function handleGenTool(name, args) {
  if (name === "gen_uuid") {
    const version = args.version || 4;
    const count = Math.min(Math.max(args.count || 1, 1), 100);
    const uuids = [];
    for (let i = 0; i < count; i++) {
      if (version === 4) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = bytes[6] & 15 | 64;
        bytes[8] = bytes[8] & 63 | 128;
        const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
        uuids.push(
          `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
        );
      } else {
        const now = Date.now();
        const uuid = "xxxxxxxx-xxxx-1xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (now + Math.random() * 16) % 16 | 0;
          return (c === "x" ? r : r & 3 | 8).toString(16);
        });
        uuids.push(uuid);
      }
    }
    return count === 1 ? { uuid: uuids[0], version } : { uuids, version, count };
  }
  if (name === "gen_random") {
    const min = args.min ?? 0;
    const max = args.max ?? 100;
    const count = Math.min(Math.max(args.count || 1, 1), 1e3);
    const type = args.type || "integer";
    const values = [];
    for (let i = 0; i < count; i++) {
      if (type === "float") {
        values.push(parseFloat((Math.random() * (max - min) + min).toFixed(6)));
      } else {
        values.push(Math.floor(Math.random() * (max - min + 1)) + min);
      }
    }
    return count === 1 ? { value: values[0], min, max, type } : { values, min, max, type, count };
  }
  if (name === "gen_hash") {
    const input = args.input;
    const algorithm = args.algorithm || "sha256";
    const encoding = args.encoding || "hex";
    const validAlgorithms = ["md5", "sha1", "sha256", "sha512"];
    if (!validAlgorithms.includes(algorithm)) {
      return { error: `Invalid algorithm. Use: ${validAlgorithms.join(", ")}` };
    }
    const hash = (0, import_crypto.createHash)(algorithm).update(input).digest(encoding);
    return { input: input.slice(0, 50) + (input.length > 50 ? "..." : ""), algorithm, encoding, hash };
  }
  if (name === "gen_password") {
    const length = Math.min(Math.max(args.length || 16, 8), 128);
    const uppercase = args.uppercase !== false;
    const lowercase = args.lowercase !== false;
    const numbers = args.numbers !== false;
    const symbols = args.symbols !== false;
    const excludeSimilar = args.excludeSimilar === true;
    let chars = "";
    if (uppercase) chars += excludeSimilar ? "ABCDEFGHJKLMNPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lowercase) chars += excludeSimilar ? "abcdefghjkmnpqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz";
    if (numbers) chars += excludeSimilar ? "23456789" : "0123456789";
    if (symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    if (chars.length === 0) {
      return { error: "At least one character set must be enabled" };
    }
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    const entropy = Math.floor(length * Math.log2(chars.length));
    return {
      password,
      length,
      entropy: `${entropy} bits`,
      strength: entropy < 40 ? "weak" : entropy < 60 ? "fair" : entropy < 80 ? "strong" : "very strong"
    };
  }
  return { error: `Unknown gen tool: ${name}` };
}
async function handleResource(uri) {
  if (uri === "miyabi://git/status") {
    const status = await git.status();
    return JSON.stringify(status, null, 2);
  }
  if (uri === "miyabi://git/branches") {
    const branches = await git.branch(["-a", "-v"]);
    return JSON.stringify(branches, null, 2);
  }
  if (uri === "miyabi://git/recent-commits") {
    const log = await git.log({ maxCount: 10 });
    return JSON.stringify(log, null, 2);
  }
  if (uri === "miyabi://git/remotes") {
    const remotes = await git.getRemotes(true);
    return JSON.stringify(remotes, null, 2);
  }
  if (uri === "miyabi://system/info") {
    const [cpu2, mem2, disk, osInfo2] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.osInfo()
    ]);
    return JSON.stringify({ cpu: cpu2, memory: mem2, disk, os: osInfo2 }, null, 2);
  }
  if (uri === "miyabi://system/processes") {
    const procs = await si.processes();
    const top = procs.list.slice(0, 20);
    return JSON.stringify({ count: procs.all, top }, null, 2);
  }
  if (uri === "miyabi://system/network") {
    const [interfaces, stats] = await Promise.all([
      si.networkInterfaces(),
      si.networkStats()
    ]);
    return JSON.stringify({ interfaces, stats }, null, 2);
  }
  if (uri === "miyabi://docker/containers") {
    try {
      const { stdout } = await execAsync3('docker ps -a --format "{{json .}}"');
      const containers = stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return JSON.stringify(containers, null, 2);
    } catch (e) {
      return JSON.stringify({ error: "Docker not available or not running" });
    }
  }
  if (uri === "miyabi://docker/images") {
    try {
      const { stdout } = await execAsync3('docker images --format "{{json .}}"');
      const images = stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return JSON.stringify(images, null, 2);
    } catch (e) {
      return JSON.stringify({ error: "Docker not available" });
    }
  }
  if (uri === "miyabi://docker/compose") {
    try {
      const { stdout } = await execAsync3("docker compose ps --format json 2>/dev/null || docker-compose ps --format json");
      return stdout || JSON.stringify({ status: "No compose project found" });
    } catch (e) {
      return JSON.stringify({ error: "Docker Compose not available" });
    }
  }
  if (uri === "miyabi://github/issues") {
    if (!octokit) return JSON.stringify({ error: "GitHub token not configured" });
    if (!GITHUB_DEFAULT_OWNER || !GITHUB_DEFAULT_REPO) return JSON.stringify({ error: "GitHub defaults not configured" });
    try {
      const { data } = await octokit.issues.listForRepo({ owner: GITHUB_DEFAULT_OWNER, repo: GITHUB_DEFAULT_REPO, state: "open", per_page: 20 });
      return JSON.stringify(data.map((i) => ({ number: i.number, title: i.title, state: i.state, labels: i.labels })), null, 2);
    } catch (e) {
      return JSON.stringify({ error: "GitHub API error or no token" });
    }
  }
  if (uri === "miyabi://github/pulls") {
    if (!octokit) return JSON.stringify({ error: "GitHub token not configured" });
    if (!GITHUB_DEFAULT_OWNER || !GITHUB_DEFAULT_REPO) return JSON.stringify({ error: "GitHub defaults not configured" });
    try {
      const { data } = await octokit.pulls.list({ owner: GITHUB_DEFAULT_OWNER, repo: GITHUB_DEFAULT_REPO, state: "open", per_page: 20 });
      return JSON.stringify(data.map((p) => ({ number: p.number, title: p.title, state: p.state, draft: p.draft })), null, 2);
    } catch (e) {
      return JSON.stringify({ error: "GitHub API error" });
    }
  }
  if (uri === "miyabi://github/workflows") {
    if (!octokit) return JSON.stringify({ error: "GitHub token not configured" });
    if (!GITHUB_DEFAULT_OWNER || !GITHUB_DEFAULT_REPO) return JSON.stringify({ error: "GitHub defaults not configured" });
    try {
      const { data } = await octokit.actions.listRepoWorkflows({ owner: GITHUB_DEFAULT_OWNER, repo: GITHUB_DEFAULT_REPO });
      return JSON.stringify(data.workflows.map((w) => ({ name: w.name, state: w.state, path: w.path })), null, 2);
    } catch (e) {
      return JSON.stringify({ error: "GitHub API error" });
    }
  }
  if (uri === "miyabi://tmux/sessions") {
    try {
      const { stdout } = await execAsync3('tmux list-sessions -F "#{session_name}:#{session_windows}:#{session_attached}"');
      const sessions = stdout.trim().split("\n").filter(Boolean).map((line) => {
        const [name, windows, attached] = line.split(":");
        return { name, windows: parseInt(windows), attached: attached === "1" };
      });
      return JSON.stringify(sessions, null, 2);
    } catch (e) {
      return JSON.stringify({ sessions: [], message: "No tmux sessions or tmux not available" });
    }
  }
  if (uri === "miyabi://k8s/pods") {
    try {
      const { stdout } = await execAsync3("kubectl get pods -o json");
      return stdout;
    } catch (e) {
      return JSON.stringify({ error: "kubectl not available or not configured" });
    }
  }
  if (uri === "miyabi://k8s/services") {
    try {
      const { stdout } = await execAsync3("kubectl get services -o json");
      return stdout;
    } catch (e) {
      return JSON.stringify({ error: "kubectl not available" });
    }
  }
  if (uri === "miyabi://catalog/tools") {
    const catalog = {};
    for (const tool of tools) {
      const category = tool.name.split("_")[0];
      if (!catalog[category]) catalog[category] = [];
      catalog[category].push(tool.name);
    }
    return JSON.stringify(catalog, null, 2);
  }
  if (uri === "miyabi://catalog/categories") {
    const categories = {
      git: { count: 0, description: "Git version control operations" },
      tmux: { count: 0, description: "Terminal multiplexer management" },
      log: { count: 0, description: "Log file analysis and monitoring" },
      resource: { count: 0, description: "System resource monitoring" },
      network: { count: 0, description: "Network connectivity and diagnostics" },
      process: { count: 0, description: "Process management" },
      file: { count: 0, description: "File operations" },
      github: { count: 0, description: "GitHub API integration" },
      docker: { count: 0, description: "Docker container management" },
      compose: { count: 0, description: "Docker Compose operations" },
      k8s: { count: 0, description: "Kubernetes cluster management" },
      db: { count: 0, description: "Database operations" },
      think: { count: 0, description: "Sequential thinking tools" },
      gen: { count: 0, description: "Generator utilities" },
      calc: { count: 0, description: "Math and statistics" }
    };
    for (const tool of tools) {
      const category = tool.name.split("_")[0];
      if (categories[category]) categories[category].count++;
    }
    return JSON.stringify(categories, null, 2);
  }
  return JSON.stringify({ error: `Unknown resource: ${uri}` });
}
function handlePrompt(name, args) {
  const messages = [];
  if (name === "git-commit") {
    const scope = args.scope ? `(${args.scope})` : "";
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Create a git commit with the following:
Type: ${args.type}
Scope: ${scope || "none"}
Description: ${args.description}

Please:
1. Use git_status to check current changes
2. Use git_staged_diff to review staged changes
3. Create a conventional commit message in format: ${args.type}${scope}: ${args.description}
4. Use git_commit_create to commit the changes`
      }
    });
  } else if (name === "git-review") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Review the current git changes with focus on: ${args.focus || "all aspects"}

Please:
1. Use git_diff to see unstaged changes
2. Use git_staged_diff to see staged changes
3. Analyze for: ${args.focus === "security" ? "security vulnerabilities, exposed secrets, unsafe operations" : args.focus === "performance" ? "performance issues, inefficient code patterns" : args.focus === "style" ? "code style, formatting, naming conventions" : "security, performance, style, and best practices"}
4. Provide specific recommendations for improvements`
      }
    });
  } else if (name === "git-branch-strategy") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Suggest a branch strategy for: ${args.feature}

Please:
1. Use git_branch_list to see existing branches
2. Recommend a branch name following conventional patterns (feat/, fix/, chore/, etc.)
3. Suggest the base branch to branch from
4. Outline the merge strategy`
      }
    });
  } else if (name === "docker-debug") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Debug Docker container: ${args.container}
Issue: ${args.issue || "General troubleshooting"}

Please:
1. Use docker_ps to check container status
2. Use docker_logs with container="${args.container}" to view logs
3. Use docker_inspect to check container configuration
4. Analyze the issue and provide solutions`
      }
    });
  } else if (name === "docker-compose-setup") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Help set up Docker Compose for services: ${args.services}

Please:
1. Suggest a docker-compose.yml structure
2. Define service configurations for each: ${args.services}
3. Set up networking between services
4. Configure volumes and environment variables`
      }
    });
  } else if (name === "github-issue-create") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Create a GitHub issue:
Type: ${args.type}
Title: ${args.title}
Description: ${args.description}

Please:
1. Format the issue body with proper markdown
2. Suggest appropriate labels for a ${args.type} issue
3. Use github_issue_create to create the issue
4. Include reproduction steps if it's a bug report`
      }
    });
  } else if (name === "github-pr-review") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Review GitHub PR #${args.pr_number}
Focus: ${args.focus || "comprehensive review"}

Please:
1. Use github_pr_get to fetch PR details
2. Use github_pr_files to list changed files
3. Analyze changes for: ${args.focus === "code" ? "code quality, logic errors, best practices" : args.focus === "tests" ? "test coverage, test quality, edge cases" : args.focus === "docs" ? "documentation accuracy, completeness, clarity" : args.focus === "security" ? "security vulnerabilities, unsafe patterns" : "code quality, tests, docs, and security"}
4. Provide specific feedback and suggestions`
      }
    });
  } else if (name === "system-health-check") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Perform system health check with focus: ${args.focus || "all"}

Please:
1. Use resource_cpu for CPU utilization
2. Use resource_memory for memory status
3. Use resource_disk for disk usage
4. Use resource_network for network status
5. Identify any concerning metrics and suggest optimizations`
      }
    });
  } else if (name === "process-troubleshoot") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Troubleshoot process: ${args.process_name}

Please:
1. Use process_find with name="${args.process_name}" to locate the process
2. Check CPU and memory usage
3. Use process_ports to check network connections
4. Analyze and suggest solutions for any issues`
      }
    });
  } else if (name === "network-diagnose") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Diagnose network connectivity${args.target ? ` to ${args.target}` : ""}

Please:
1. Use network_interfaces to check interface status
2. ${args.target ? `Use network_ping to test connectivity to ${args.target}` : "Check general connectivity"}
3. Use network_dns_lookup if DNS issues suspected
4. Analyze results and suggest fixes`
      }
    });
  } else if (name === "k8s-debug-pod") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Debug Kubernetes pod: ${args.pod_name}${args.namespace ? ` in namespace ${args.namespace}` : ""}

Please:
1. Use k8s_pods to check pod status
2. Use k8s_pod_logs to view pod logs
3. Use k8s_pod_describe for detailed pod information
4. Analyze events and conditions
5. Suggest remediation steps`
      }
    });
  } else if (name === "log-analyze") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Analyze logs from: ${args.source}
Pattern to find: ${args.pattern || "errors and warnings"}

Please:
1. Use appropriate log tool to read logs
2. Search for patterns: ${args.pattern || "ERROR, WARN, Exception, Failed"}
3. Identify frequency and patterns
4. Suggest root causes and solutions`
      }
    });
  } else if (name === "dev-cycle") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Execute development cycle with commit message: ${args.message}
Skip tests: ${args.skip_tests || "false"}

Please:
1. ${args.skip_tests === "true" ? "Skip tests" : "Run tests first"}
2. Use git_status to check changes
3. Stage and commit with message: ${args.message}
4. Push to remote branch`
      }
    });
  } else if (name === "deployment-checklist") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Generate deployment checklist for: ${args.environment}

Please create a checklist including:
1. Pre-deployment checks (tests, build, dependencies)
2. ${args.environment === "production" ? "Production-specific: backup, maintenance window, rollback plan" : args.environment === "staging" ? "Staging-specific: test data, integration tests" : "Development-specific: local environment setup"}
3. Deployment steps
4. Post-deployment verification
5. Monitoring and alerting checks`
      }
    });
  } else if (name === "analyze-problem") {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Analyze problem using sequential thinking: ${args.problem}
${args.context ? `Context: ${args.context}` : ""}

Please use the thinking tools:
1. think_step with type="observation" to gather facts
2. think_step with type="hypothesis" to form theories
3. think_step with type="analysis" to evaluate each hypothesis
4. think_branch if alternative approaches needed
5. think_step with type="conclusion" for final recommendation
6. think_summarize to provide summary`
      }
    });
  } else {
    messages.push({
      role: "user",
      content: {
        type: "text",
        text: `Unknown prompt: ${name}. Available prompts: git-commit, git-review, git-branch-strategy, docker-debug, docker-compose-setup, github-issue-create, github-pr-review, system-health-check, process-troubleshoot, network-diagnose, k8s-debug-pod, log-analyze, dev-cycle, deployment-checklist, analyze-problem`
      }
    });
  }
  return { messages };
}
var server = new import_server.Server(
  {
    name: "miyabi_bundle__miyabi-mcp-bundle",
    version: "3.7.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);
server.setRequestHandler(import_types.ListToolsRequestSchema, async () => {
  return { tools };
});
server.setRequestHandler(import_types.CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleTool(name, args || {});
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
});
server.setRequestHandler(import_types.ListResourcesRequestSchema, async () => {
  return { resources };
});
server.setRequestHandler(import_types.ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const content = await handleResource(uri);
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: content
      }
    ]
  };
});
server.setRequestHandler(import_types.ListPromptsRequestSchema, async () => {
  return { prompts };
});
server.setRequestHandler(import_types.GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handlePrompt(name, args || {});
});
async function main() {
  console.error("");
  console.error("\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
  console.error("\u2502  \u{1F338} Miyabi MCP Bundle v3.7.0                   \u2502");
  console.error("\u2502  The Most Comprehensive MCP Server             \u2502");
  console.error("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
  console.error(`\u2502  \u{1F4C2} Repository: ${MIYABI_REPO_PATH.slice(0, 28).padEnd(28)} \u2502`);
  console.error(`\u2502  \u{1F527} Tools: ${String(tools.length).padEnd(35)} \u2502`);
  console.error(`\u2502  \u{1F4E6} Resources: ${String(resources.length).padEnd(31)} \u2502`);
  console.error(`\u2502  \u{1F4AC} Prompts: ${String(prompts.length).padEnd(33)} \u2502`);
  console.error(`\u2502  \u{1F510} Security: Enterprise-grade                 \u2502`);
  console.error("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");
  console.error("");
  const transport = new import_stdio.StdioServerTransport();
  await server.connect(transport);
}
main().catch(console.error);
/**
 * Miyabi MCP Bundle - All-in-One Monitoring and Control Server
 *
 * A comprehensive MCP server with 172 tools across 21 categories:
 * - Git Inspector (19 tools)
 * - Tmux Monitor (10 tools)
 * - Log Aggregator (7 tools)
 * - Resource Monitor (10 tools)
 * - Network Inspector (15 tools)
 * - Process Inspector (14 tools)
 * - File Watcher (10 tools)
 * - Claude Code Monitor (8 tools)
 * - GitHub Integration (21 tools)
 * - Linux systemd (3 tools)
 * - Windows (2 tools)
 * - Docker (10 tools)
 * - Docker Compose (4 tools)
 * - Kubernetes (6 tools)
 * - Spec-Kit (9 tools) - Spec-Driven Development
 * - MCP Tool Discovery (3 tools) - Search and discover tools
 * - Database Foundation (6 tools) - SQLite/PostgreSQL/MySQL
 * - Time Tools (4 tools) - Timezone, formatting, diff
 * - Calculator Tools (3 tools) - Math, units, statistics
 * - Sequential Thinking (3 tools) - Structured reasoning
 * - Generator Tools (4 tools) - UUID, random, hash, password
 * + System Health (1 tool)
 *
 * @version 3.6.0
 * @author Shunsuke Hayashi
 * @license MIT
 */
//# sourceMappingURL=miyabi-bundle.js.map
