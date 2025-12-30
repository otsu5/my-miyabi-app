#!/usr/bin/env node
/**
 * Bundle miyabi-mcp-bundle TypeScript compilation into single MCP server
 * Uses esbuild for production-quality bundling
 */
const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, '..', 'src', 'mcp', 'miyabi-bundle', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.join(__dirname, '..', '.claude', 'mcp-servers', 'miyabi-bundle.js'),
  format: 'cjs',
  external: [
    '@modelcontextprotocol/sdk',
    '@octokit/rest',
    'glob',
    'simple-git',
    'systeminformation',
    'zod'
  ],
  sourcemap: true,
}).then(() => {
  console.log('✅ miyabi-bundle.js created successfully');
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
