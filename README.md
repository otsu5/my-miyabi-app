# my-miyabi-app
Autonomous development powered by Agentic OS with Integrated Miyabi MCP Bundle

## Features

- **Miyabi Framework**: Autonomous operations with 7 AI agents
- **A2A Protocol**: Agent-to-Agent communication for inter-agent coordination
- **Debug Agent (蛍)**: Runtime debugger with dynamic log instrumentation
- **MCP Bundle**: 172+ tools, 38 agents, 22 skills, 56 commands, 24 hooks

## MCP Servers

This project includes multiple MCP (Model Context Protocol) servers for Claude Code integration:

### 1. Miyabi Bundle (`miyabi-bundle`)
- **Tools**: 172+
- **Agents**: 38
- **Skills**: 22
- **Commands**: 56
- **Hooks**: 24
- **Integration**: https://github.com/ShunsukeHayashi/miyabi-mcp-bundle v3.7.0
- **Namespace**: `miyabi_bundle__*`
- **Source**: `src/mcp/miyabi-bundle/`

**Available Tool Categories**:
- Git operations (19 tools) - git_status, git_log, git_blame, etc.
- GitHub integration (21 tools) - create issues, manage PRs, etc.
- File operations (30+ tools) - read, write, search, watch files
- System monitoring (15+ tools) - CPU, memory, disk, processes
- Docker/Kubernetes (20+ tools) - container management
- Database tools (10+ tools) - query, analyze
- Time & Math (10+ tools) - conversions, calculations
- And more...

### 2. Miyabi CLI Integration (`miyabi`)
- **Tools**: 8
- **Purpose**: CLI command wrapping for Miyabi framework
- **Namespace**: `miyabi__*`

### 3. GitHub Enhanced (`github-enhanced`)
- **Tools**: 5
- **Purpose**: Specialized GitHub operations for agent integration

### 4. IDE Integration (`ide-integration`)
- **Tools**: 4
- **Purpose**: VS Code diagnostics and Jupyter execution

### 5. Project Context (`project-context`)
- **Tools**: 4
- **Purpose**: Project structure and dependency analysis

## Quick Start

### Installation
```bash
npm install
npm run build
```

### Check Health
```bash
npm run mcp:check
```

### Run Tests
```bash
npm test
```

### Build Miyabi Bundle
```bash
npm run build:bundle
```

## Environment Variables

```bash
GITHUB_TOKEN=ghp_xxxxx          # GitHub Personal Access Token
ANTHROPIC_API_KEY=sk-ant-xxxxx # Anthropic API Key
REPOSITORY=owner/repo           # GitHub repository
```

## Documentation

- [A2A Protocol Integration](src/a2a/README.md)
- [Debug Agent (蛍)](src/agents/debug/README.md)
- [Miyabi Bundle Integration](src/mcp/miyabi-bundle/INTEGRATION.md)
- [Claude Code Context](CLAUDE.md)

## License

This project integrates code from:
- **Miyabi MCP Bundle**: MIT License (https://github.com/ShunsukeHayashi/miyabi-mcp-bundle)
- See `src/mcp/miyabi-bundle/LICENSE` for details

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Claude Code (Frontend)                   │
└──────────────┬──────────────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────┐    ┌─────▼──────────┐
│  MCP      │    │ MCP Bundle     │
│  Servers  │    │ (172 Tools)    │
│           │    │ (38 Agents)    │
│ miyabi    │    │ (22 Skills)    │
│ github    │    │ (56 Commands)  │
│ ide       │    │ (24 Hooks)     │
│ project   │    │                │
└─────┬─────┘    └─────┬──────────┘
      │                │
      └────────┬───────┘
               │
      ┌────────▼────────────────────┐
      │  my-miyabi-app              │
      │  ├── A2A Protocol           │
      │  ├── Debug Agent (蛍)       │
      │  ├── TypeScript (strict)    │
      │  └── GitHub Integration     │
      └─────────────────────────────┘
```
