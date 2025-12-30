# miyabi-mcp-bundle 統合ドキュメント

## 統合情報

- **元リポジトリ**: https://github.com/ShunsukeHayashi/miyabi-mcp-bundle
- **バージョン**: 3.7.0
- **コミットハッシュ**: dd00f7124a261cfabe185c88995176f2f836aec0
- **統合日**: 2025-12-31
- **統合方法**: コード全体をコピーして直接組み込む（上流リポジトリとの接続遮断）

## アーキテクチャ

### ファイル配置
- **ソースコード**: `src/mcp/miyabi-bundle/` (TypeScript)
- **コンパイル済み**: `.claude/mcp-servers/miyabi-bundle.js` (CommonJS, esbuild バンドル)
- **設定**: `.claude/mcp.json` (MCP サーバー登録)

### ツール命名規則
すべてのツールは `miyabi_bundle__*` というプレフィックスで始まります。

**理由**: 既存の `miyabi__*` (Miyabi CLI統合) ツールとの名前空間分離

### 依存関係
新たに追加された依存関係:
- `glob@^13.0.0` - ファイルパターンマッチング
- `simple-git@^3.30.0` - Git操作
- `systeminformation@^5.28.5` - システム情報取得
- `zod@^4.2.1` - スキーマバリデーション

**バージョン競合の解決**:
- `@modelcontextprotocol/sdk`: 既存の `^1.25.1` を使用（最新、後方互換）
- `@octokit/rest`: 既存の `^22.0.1` を使用（最新、後方互換）

## 統合理由

1. **全機能統合**: 172ツール + 38エージェント + 22スキル + 56コマンド + 24フックを統合
2. **上流リポジトリからの独立**: 一時クローン後に削除し、完全に独立したコードベース
3. **npm パッケージ不使用**: 直接コード統合により、バージョン管理と修正が容易

## ビルドプロセス

### ビルドコマンド
```bash
npm run build:bundle   # miyabi-bundle MCP サーバーをビルド
npm run build         # メインプロジェクト + miyabi-bundle をビルド
```

### ビルド処理の詳細
1. TypeScript コンパイル: `src/mcp/miyabi-bundle/*.ts` → `.claude/mcp-servers/miyabi-bundle-build/`
2. esbuild バンドリング: すべてのモジュールを単一ファイルに結合
3. 出力: `.claude/mcp-servers/miyabi-bundle.js` (213KB)

### ビルド設定
**ファイル**: `tsconfig.bundle.json`
- CommonJS 形式出力（MCP サーバー互換性）
- 外部依存関係は除外（node_modules で実行時に解決）
- Source Map 有効化（デバッグ用）

## MCP サーバー登録

### 設定ファイル
**ファイル**: `.claude/mcp.json`

```json
{
  "miyabi-bundle": {
    "command": "node",
    "args": [".claude/mcp-servers/miyabi-bundle.js"],
    "env": {
      "GITHUB_TOKEN": "${GITHUB_TOKEN}",
      "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
      "REPOSITORY": "${REPOSITORY}"
    },
    "disabled": false,
    "description": "Miyabi MCP Bundle - 172 tools + 38 agents + 22 skills"
  }
}
```

### 環境変数
`.env` ファイルで以下を設定:
```bash
GITHUB_TOKEN=ghp_xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
REPOSITORY=owner/repo
```

## ライセンスコンプライアンス

### MIT ライセンス
このコードは MIT ライセンスの下で提供されています。

**ファイル**: `LICENSE` (オリジナルの MIT ライセンス全文)

### 著作権表示
- **元著作権**: © 2024 Shunsuke Hayashi
- **原著作権**: https://github.com/ShunsukeHayashi/miyabi-mcp-bundle

MIT ライセンス要件に従い、オリジナルの著作権表示を保持しています。

## 技術的な詳細

### ツール命名規則の実装
すべてのツール定義は以下のパターンに従っています:
```javascript
{
  name: 'miyabi_bundle__tool_name',
  description: '...',
  inputSchema: { ... }
}
```

### バンドリング戦略
- **エントリポイント**: `src/mcp/miyabi-bundle/index.ts`
- **バンドラー**: esbuild (production-quality bundling)
- **外部依存**: node_modules から実行時に解決
- **ファイルサイズ**: 213KB (圧縮可能)

### MCP プロトコル互換性
- **標準**: Model Context Protocol (Anthropic)
- **通信**: stdio (標準入出力)
- **バージョン**: MCP SDK v1.25.1

## メンテナンス

### 上流リポジトリからの更新

上流リポジトリの更新を取り込みたい場合:

1. 上流をクローン: `git clone https://github.com/ShunsukeHayashi/miyabi-mcp-bundle.git`
2. 変更を確認: `git diff` で差分を確認
3. 手動統合: このディレクトリにコピー
4. テスト: `npm run build:bundle` でコンパイル確認
5. コミット: 変更をコミット

### ツール追加
新しいツールを追加する場合:

1. `src/mcp/miyabi-bundle/index.ts` のツール配列に追加
2. 名前は必ず `miyabi_bundle__` プレフィックス付き
3. `npm run build:bundle` で再ビルド
4. `npm run mcp:check` でヘルスチェック

### トラブルシューティング

#### MCP サーバーが起動しない
```bash
# 直接実行してエラーメッセージを確認
node .claude/mcp-servers/miyabi-bundle.js
```

#### ツールが見つからない
```bash
# ツール名のプレフィックスを確認
grep "name: 'miyabi_bundle__" .claude/mcp-servers/miyabi-bundle.js | wc -l
```

#### ビルドエラー
```bash
# TypeScript エラーを確認
tsc -p tsconfig.bundle.json --noEmit
```

## 統計情報

- **ソースコード行数**: ~6000+ (TypeScript)
- **コンパイル済みサイズ**: 213KB
- **ツール総数**: 172+
- **エージェント数**: 38
- **スキル数**: 22
- **コマンド数**: 56
- **フック数**: 24

## 関連リンク

- **原著作権**: https://github.com/ShunsukeHayashi/miyabi-mcp-bundle
- **MCP 仕様**: https://modelcontextprotocol.io/
- **本プロジェクト**: https://github.com/otsu5/my-miyabi-app

---

**注**: このドキュメントは統合時点での情報です。
最新の変更については git log を確認してください。
