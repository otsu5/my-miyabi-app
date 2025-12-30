# MCP Servers 設定ガイド

このディレクトリには、Claude CodeのMCP（Model Context Protocol）サーバーが含まれています。

## サーバー一覧

### 1. IDE Integration
**ファイル:** `ide-integration.js`
**状態:** ✅ 動作中
**機能:**
- TypeScript/ESLint診断取得
- コード実行（Python/JavaScript/TypeScript）
- コードフォーマット（Prettier）

**必要な依存関係:**
```bash
npm install @modelcontextprotocol/sdk
```

---

### 2. Project Context
**ファイル:** `project-context.js`
**状態:** ✅ 動作中
**機能:**
- プロジェクト構造取得
- 依存関係分析
- コードベースメトリクス
- Git変更履歴取得

**必要な依存関係:**
```bash
npm install @modelcontextprotocol/sdk
```

---

### 3. GitHub Enhanced
**ファイル:** `github-enhanced.js`
**状態:** ⚠️ 環境変数設定が必要
**機能:**
- Issue自動作成（ラベル付き）
- Agent実行タスク取得
- Issue進捗更新
- PR作成（品質レポート付き）
- PRレビューステータス取得

**必要な環境変数:**
```bash
# .envファイルに追加
GITHUB_TOKEN=ghp_your_personal_access_token_here
REPOSITORY=owner/repo
```

**GitHub Tokenの取得方法:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)"を選択
3. 以下の権限を付与:
   - `repo` (フルアクセス)
   - `workflow` (GitHub Actions)
4. トークンをコピーして`.env`ファイルに保存

**必要な依存関係:**
```bash
npm install @modelcontextprotocol/sdk @octokit/rest
```

---

### 4. Filesystem
**ファイル:** `@modelcontextprotocol/server-filesystem`（npm package）
**状態:** ✅ 動作中
**機能:**
- プロジェクトファイルシステムへのアクセス

**必要な依存関係:**
```bash
npm install @modelcontextprotocol/server-filesystem
```

---

### 5. Miyabi Integration
**ファイル:** `miyabi-integration.js`
**状態:** ✅ 動作中
**機能:**
- Miyabi CLIとの統合
- プロジェクト作成
- Agent実行
- 自動化機能

**必要な依存関係:**
```bash
npm install @modelcontextprotocol/sdk
```

---

### 6. Context Engineering
**ファイル:** `external/context-engineering-mcp/mcp-server/index.js`
**状態:** ⚪ 無効化（外部依存）
**機能:**
- AI駆動のコンテキスト分析
- コンテキスト最適化
- セマンティック検索

**有効化方法:**
1. 外部サブモジュールをクローン
2. `.claude/mcp.json`で`"disabled": false`に変更

---

## ヘルスチェック

すべてのMCPサーバーの動作状態を確認:

```bash
node .claude/mcp-servers/check-health.js
```

**出力例:**
```
🔍 MCP Servers Health Check

============================================================
✅ ide-integration: OK
⚠️ github-enhanced: EXITED (環境変数未設定)
✅ project-context: OK
✅ filesystem: OK
⚪ context-engineering: DISABLED
✅ miyabi: OK
============================================================

📊 Summary:
Total: 6
✅ OK: 4
❌ Failed: 1
⚪ Disabled: 1
```

---

## トラブルシューティング

### サーバーが起動しない場合

1. **依存関係を確認:**
   ```bash
   npm install
   ```

2. **環境変数を確認:**
   ```bash
   # .envファイルが存在するか確認
   cat .env
   ```

3. **個別サーバーをテスト:**
   ```bash
   # 例: ide-integrationをテスト
   node .claude/mcp-servers/ide-integration.js
   # Ctrl+Cで終了
   ```

### GitHub Enhancedが動作しない場合

**症状:** `GITHUB_TOKEN environment variable is required`

**解決方法:**
1. `.env`ファイルを作成
2. GitHub Personal Access Tokenを設定
3. `REPOSITORY`を設定（例: `ShunsukeHayashi/my-miyabi-app`）

### Filesystemサーバーが動作しない場合

**症状:** `spawn npx ENOENT`

**解決方法:**
```bash
npm install @modelcontextprotocol/server-filesystem
```

---

## mcp.json設定例

`.claude/mcp.json`の構造:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "ENV_VAR": "${ENV_VAR}"
      },
      "disabled": false,
      "description": "サーバーの説明"
    }
  }
}
```

**フィールド説明:**
- `command`: 実行コマンド（`node`, `python`, etc.）
- `args`: コマンド引数（配列）
- `env`: 環境変数（オブジェクト）
- `disabled`: 無効化フラグ（`true`で無効）
- `description`: サーバーの説明文

---

## サーバーの追加方法

1. **新しいサーバーファイルを作成:**
   ```javascript
   // .claude/mcp-servers/my-server.js
   const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
   // ... サーバー実装
   ```

2. **mcp.jsonに追加:**
   ```json
   {
     "mcpServers": {
       "my-server": {
         "command": "node",
         "args": [".claude/mcp-servers/my-server.js"],
         "disabled": false
       }
     }
   }
   ```

3. **ヘルスチェック実行:**
   ```bash
   node .claude/mcp-servers/check-health.js
   ```

---

## リファレンス

- [MCP Protocol仕様](https://github.com/modelcontextprotocol/specification)
- [Claude Code公式ドキュメント](https://docs.anthropic.com/claude-code)
- [Miyabi Framework](https://github.com/ShunsukeHayashi/Autonomous-Operations)
