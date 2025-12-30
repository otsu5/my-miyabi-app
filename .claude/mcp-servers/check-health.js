#!/usr/bin/env node
/**
 * MCP Servers Health Check
 * すべてのMCPサーバーの動作状態を確認
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const mcpConfigPath = path.join(__dirname, '..', 'mcp.json');
const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));

console.log('🔍 MCP Servers Health Check\n');
console.log('=' .repeat(60));

async function checkServer(name, config) {
  return new Promise((resolve) => {
    if (config.disabled) {
      console.log(`⚪ ${name}: DISABLED`);
      resolve({ name, status: 'disabled' });
      return;
    }

    // 環境変数を準備（テンプレート変数を実際の値に置換）
    const env = { ...process.env };
    if (config.env) {
      Object.entries(config.env).forEach(([key, value]) => {
        // ${VAR}形式の変数を実際の環境変数値に置換
        if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
          const envVar = value.slice(2, -1);
          env[key] = process.env[envVar] || `dummy_${envVar.toLowerCase()}`;
        } else {
          env[key] = value;
        }
      });
    }

    const serverProcess = spawn(config.command, config.args, {
      cwd: path.join(__dirname, '..', '..'),
      env,
      stdio: 'pipe',
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        console.log(`❌ ${name}: TIMEOUT (failed to start)`);
        serverProcess.kill();
        resolve({ name, status: 'timeout' });
      }
    }, 5000);

    serverProcess.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('running on stdio') || message.includes('MCP Server')) {
        started = true;
        clearTimeout(timeout);
        console.log(`✅ ${name}: OK`);
        serverProcess.kill();
        resolve({ name, status: 'ok' });
      }
    });

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ ${name}: ERROR - ${error.message}`);
      resolve({ name, status: 'error', error: error.message });
    });

    serverProcess.on('exit', (code) => {
      if (!started) {
        clearTimeout(timeout);
        console.log(`❌ ${name}: EXITED (code ${code})`);
        resolve({ name, status: 'exited', code });
      }
    });
  });
}

async function main() {
  const results = [];

  for (const [name, config] of Object.entries(mcpConfig.mcpServers)) {
    const result = await checkServer(name, config);
    results.push(result);
  }

  console.log('=' .repeat(60));
  console.log('\n📊 Summary:');
  console.log(`Total: ${results.length}`);
  console.log(`✅ OK: ${results.filter(r => r.status === 'ok').length}`);
  console.log(`❌ Failed: ${results.filter(r => r.status !== 'ok' && r.status !== 'disabled').length}`);
  console.log(`⚪ Disabled: ${results.filter(r => r.status === 'disabled').length}`);

  const failed = results.filter(r => r.status !== 'ok' && r.status !== 'disabled');
  if (failed.length > 0) {
    console.log('\n⚠️  Failed servers:');
    failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.status}${f.error ? ` (${f.error})` : ''}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All enabled MCP servers are healthy!');
    process.exit(0);
  }
}

main().catch(console.error);
