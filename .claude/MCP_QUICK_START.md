# MCP サーバー クイックスタートガイド

## 📋 現在の状態

| サーバー | 状態 | 説明 |
|---------|------|------|
| ✅ ide-integration | 動作中 | VS Code診断・コード実行 |
| ⚠️ github-enhanced | 要設定 | GitHub操作（環境変数必要） |
| ✅ project-context | 動作中 | プロジェクト情報取得 |
| ✅ filesystem | 動作中 | ファイルシステムアクセス |
| ⚪ context-engineering | 無効 | AI駆動コンテキスト分析 |
| ✅ miyabi | 動作中 | Miyabi CLI統合 |

---

## 🚀 3ステップ セットアップ

### Step 1: 依存関係インストール

```bash
cd C:\Users\SH\Miyabi\my-miyabi-app
npm install
```

### Step 2: 環境変数設定（GitHub Enhanced用）

**`.env`ファイルを作成:**

```bash
# .envファイルをコピー
cp .env.example .env
```

**`.env`の内容を編集:**

```env
GITHUB_TOKEN=ghp_your_actual_token_here
REPOSITORY=your-username/your-repo
```

**GitHubトークン取得:**
1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. スコープ: `repo`, `workflow`
4. トークンをコピーして`.env`に貼り付け

### Step 3: 動作確認

```bash
npm run mcp:check
```

**期待される出力:**

```
✅ ide-integration: OK
✅ github-enhanced: OK  ← ここがOKになればOK!
✅ project-context: OK
✅ filesystem: OK
⚪ context-engineering: DISABLED
✅ miyabi: OK
```

---

## 🔧 よく使うコマンド

### MCPサーバーの状態確認

```bash
npm run mcp:check
```

### MCP設定の確認

```bash
npm run mcp:list
```

### 設定ファイルを直接編集

```bash
# Windows
notepad .claude\mcp.json

# VSCode
code .claude\mcp.json
```

---

## 🛠️ トラブルシューティング

### Q1: `github-enhanced`が起動しない

**症状:**
```
❌ github-enhanced: EXITED (code 1)
```

**原因:** 環境変数未設定

**解決方法:**

1. `.env`ファイルを確認:
   ```bash
   cat .env
   ```

2. `GITHUB_TOKEN`と`REPOSITORY`が設定されているか確認

3. Claude Codeを再起動

---

### Q2: `filesystem`が起動しない

**症状:**
```
❌ filesystem: ERROR - spawn npx ENOENT
```

**解決方法:**

```bash
npm install @modelcontextprotocol/server-filesystem
```

---

### Q3: Claude Codeでサーバーが認識されない

**解決方法:**

1. Claude Codeを完全に終了
2. MCPサーバーの設定を確認:
   ```bash
   npm run mcp:check
   ```
3. Claude Codeを再起動

---

## 📁 重要なファイルパス

| ファイル | パス |
|---------|------|
| MCP設定 | `C:\Users\SH\Miyabi\my-miyabi-app\.claude\mcp.json` |
| 環境変数 | `C:\Users\SH\Miyabi\my-miyabi-app\.env` |
| ヘルスチェック | `C:\Users\SH\Miyabi\my-miyabi-app\.claude\mcp-servers\check-health.js` |
| サーバー実装 | `C:\Users\SH\Miyabi\my-miyabi-app\.claude\mcp-servers\*.js` |

---

## 🎯 次のステップ

### 有効なサーバーを使ってみる

Claude Codeで以下を試してみましょう:

1. **プロジェクト構造を取得:**
   ```
   @project-context プロジェクト構造を教えて
   ```

2. **TypeScript診断を実行:**
   ```
   @ide-integration TypeScriptのエラーをチェックして
   ```

3. **Issueを作成（GitHub Enhanced有効化後）:**
   ```
   @github-enhanced 新しいIssueを作成して
   ```

---

## 📚 詳細ドキュメント

- **完全なガイド:** `.claude/mcp-servers/README.md`
- **MCP設定:** `.claude/mcp.json`
- **プロジェクト情報:** `CLAUDE.md`

---

## ✅ チェックリスト

- [ ] 依存関係をインストール (`npm install`)
- [ ] `.env`ファイルを作成
- [ ] `GITHUB_TOKEN`を設定
- [ ] `REPOSITORY`を設定
- [ ] `npm run mcp:check`で全サーバー確認
- [ ] Claude Codeを再起動
- [ ] MCPサーバーがClaude Codeで使用可能か確認

---

🌸 **Miyabi Framework** - Beauty in Autonomous Development
