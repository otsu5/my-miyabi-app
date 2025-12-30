# A2A + Debug Agent (蛍) 統合セットアップガイド

## 📋 概要

このドキュメントは、**A2A フレームワーク** と **Debug Agent (蛍)** を Miyabi に統合するための完全なセットアップガイドです。

---

## 🎯 統合アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│          Miyabi Framework                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  CoordinatorAgent                                    │
│      ↓                                               │
│  ┌─────────────────────────────────────────────┐   │
│  │ A2A Adapter Layer (新規)                     │   │
│  │ ├── A2AClient      - A2A通信                │   │
│  │ ├── A2AConverter   - 形式変換                │   │
│  │ └── A2AAdapter     - 統合ロジック            │   │
│  └─────────────────────────────────────────────┘   │
│      ↓                                               │
│  Local Agents OR External A2A Agents               │
│      ↓                                               │
│  ┌─────────────────────────────────────────────┐   │
│  │ Debug Agent (蛍) - 新規                      │   │
│  │ ├── DebugAgent      - メイン                 │   │
│  │ ├── LogInstrumenter - ログ計装               │   │
│  │ └── A2ABridge       - リアルタイム通信       │   │
│  └─────────────────────────────────────────────┘   │
│      ↓                                               │
│  GitHub / External Systems                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 セットアップステップ

### Step 1: 依存関係をインストール

```bash
cd C:\Users\SH\Miyabi\my-miyabi-app

# TypeScript 依存をインストール
npm install

# 開発依存
npm install --save-dev typescript @types/node jest @types/jest ts-jest
```

### Step 2: TypeScript 設定を確認

`tsconfig.json` が存在することを確認：

```bash
ls -la tsconfig.json
```

存在しなければ、以下を作成：

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### Step 3: ビルドをテスト

```bash
npm run build
```

**期待される出力:**
```
✅ dist/ ディレクトリが作成される
✅ コンパイルエラーがない
```

### Step 4: A2A Adapter をテスト

```bash
npm run a2a:check
```

**期待される出力:**
```
A2A Adapter loaded successfully
```

### Step 5: Debug Agent をテスト

```bash
npm run debug:check
```

**期待される出力:**
```
Debug Agent loaded successfully
```

### Step 6: MCP チェック

```bash
npm run mcp:check
```

**期待される出力:**
```
✅ ide-integration: OK
✅ github-enhanced: OK
✅ project-context: OK
✅ filesystem: OK
✅ miyabi: OK
```

---

## 📊 使用方法

### A2A Adapter の使用例

```typescript
import { A2AAdapter } from './src/a2a';
import * as MiyabiTypes from './src/types/miyabi';

// Adapter を初期化
const adapter = new A2AAdapter({
  timeout: 30000,
  maxRetries: 3,
  enableSSE: true,
  enableWebhooks: true,
});

// Miyabi タスクを作成
const task: MiyabiTypes.MiyabiTask = {
  id: 'task-001',
  title: 'External API integration',
  description: 'Integrate with external API',
  type: 'add-feature',
  status: 'pending',
  priority: 'P1-High',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// 外部 A2A エージェントを呼び出し
const result = await adapter.callExternalAgent('external-agent-001', task);

if (result.success) {
  console.log('Task executed:', result.status);
  console.log('External task ID:', result.taskId);
} else {
  console.error('Task failed:', result.error);
}
```

### Debug Agent の使用例

```typescript
import { DebugAgent } from './src/agents/debug';

// Debug Agent を初期化
const debugAgent = new DebugAgent({
  timeout: 60000,
  enableA2A: true, // A2A リアルタイム通知を有効化
});

// デバッグセッションを開始
const session = await debugAgent.startSession('task-001');

// コードを計装
const points = [
  { file: './src/index.ts', line: 42, variables: ['x', 'y'] },
  { file: './src/index.ts', line: 58, variables: ['result'] },
];

await debugAgent.instrumentCode(session.sessionId, points);

// プログラムを実行して、ログを収集
const executionOutput = `
[蛍] Line 42: x: 5, y: "hello"
[蛍] Line 58: result: [1,2,3]
`;

const logs = await debugAgent.collectLogs(session.sessionId, executionOutput);

// セッションを終了してレポートを生成
const report = await debugAgent.endSession(session.sessionId);

console.log('Debug Report:', {
  logsCollected: report.logsCollectedCount,
  filesInstrumented: report.instrumentedFilesCount,
  duration: report.duration,
});
```

---

## 🔧 環境変数設定（A2A Bridge 用）

A2A リアルタイム通信を有効化する場合、以下の環境変数を設定：

```bash
# .env ファイルに追加、または直接設定

# Debug Agent の tmux pane ID
export MIYABI_DEBUG_PANE="window.0"

# CodeGen Agent の tmux pane ID
export MIYABI_CODEGEN_PANE="window.1"

# Conductor Agent の tmux pane ID
export MIYABI_CONDUCTOR_PANE="window.2"
```

または、スクリプトで設定：

```bash
#!/bin/bash

# tmux セッション内で実行
export MIYABI_DEBUG_PANE=$(tmux display-message -p '#{pane_id}')

# CodeGen ペーンに切り替えて実行
tmux send-keys -t window.1 'export MIYABI_CODEGEN_PANE=$(tmux display-message -p "#{pane_id}")' Enter

# Conductor ペーンに切り替えて実行
tmux send-keys -t window.2 'export MIYABI_CONDUCTOR_PANE=$(tmux display-message -p "#{pane_id}")' Enter
```

---

## ✅ 検証チェックリスト

セットアップが完了したか、以下で確認：

- [ ] `npm install` が成功
- [ ] `npm run build` がエラーなし
- [ ] `npm run a2a:check` が正常
- [ ] `npm run debug:check` が正常
- [ ] `npm run mcp:check` がすべて OK
- [ ] Git status が clean
- [ ] A2A 型定義が正しく import できる
- [ ] Debug Agent が正しく instantiate できる

全て OK なら、準備完了です！ ✅

---

## 📝 トラブルシューティング

### 問題 1: TypeScript コンパイルエラー

**症状**: `npm run build` でエラー

**解決策**:
```bash
# キャッシュをクリア
rm -rf dist/
npm run build
```

### 問題 2: A2A クライアントが fetch を見つけられない

**症状**: `ReferenceError: fetch is not defined`

**解決策**:
```bash
# Node.js 18+ で実行（fetch は標準）
node --version  # v18 以上を確認

# または、polyfill をインストール
npm install node-fetch
```

### 問題 3: MCP サーバーが起動しない

**症状**: `npm run mcp:check` でエラー

**解決策**:
```bash
# .env ファイルで GITHUB_TOKEN が設定されているか確認
cat .env | grep GITHUB_TOKEN

# なければ設定
echo "GITHUB_TOKEN=ghp_xxxxx" >> .env
```

### 問題 4: A2A Bridge が tmux コマンド を見つけられない

**症状**: `execSync` エラー

**解決策**:
```bash
# tmux がインストールされているか確認
which tmux

# macOS/Linux なら：
brew install tmux  # or apt-get install tmux

# Windows なら WSL2 で実行する必要があります
```

---

## 🎓 次のステップ

1. **GitHub Actions ワークフローを確認**:
   - `.github/workflows/` の各種ワークフロー
   - A2A Adapter が GitHub Actions と統合可能

2. **Claude Code コマンドを登録**:
   - `/debug-session` - デバッグセッション開始
   - `/a2a-call` - 外部 A2A エージェント呼び出し

3. **本番環境へのデプロイ**:
   - `npm run build` で TypeScript をコンパイル
   - `dist/` ディレクトリをデプロイ

4. **モニタリング設定**:
   - Debug ログを収集・分析
   - A2A タスク進捗を追跡

---

## 📚 参考資料

- [A2A Protocol Specification](https://github.com/a2aproject/A2A)
- [Miyabi Framework Documentation](./CLAUDE.md)
- [Debug Agent Implementation](./src/agents/debug/)
- [A2A Adapter Code](./src/a2a/)

---

**セットアップが完了しました！次は、実際のワークフローで使用を開始できます。** 🚀
