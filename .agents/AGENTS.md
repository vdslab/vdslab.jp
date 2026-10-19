# vdslab.jp - Project Overview & Guidelines

## 概要 (Project Overview)
日本大学文理学部情報科学科 尾上研究室 (Visual Database Systems Laboratory; VDSLab) の公式サイト (`https://vdslab.jp`) のリポジトリです。
情報可視化とデータサイエンス (Visualization and Data Science) を中心テーマとする研究室の紹介、ニュース、プロジェクト、プロダクト、メンバー情報を公開しています。
また、外部エージェント（Antigravity 等）からコンテンツの更新・管理を行うためのリモート MCP (Model Context Protocol) サーバー機能および画像配信パイプラインを提供しています。

---

## 技術スタック (Tech Stack)
- **Framework**: [Next.js](https://nextjs.org/) (v13 App Router, React 18)
- **Remote MCP**: `@modelcontextprotocol/sdk` (Streamable HTTP, JSON-RPC, 27ツール)
- **Validation**: `zod`
- **CSS / UI**: [Bulma](https://bulma.io/) (v1.0.4)
- **Database**: PostgreSQL (Node.js `pg` Pool クライアント)
- **Markdown Rendering**: `markdown-it`
- **Hosting / Infra**: [Netlify](https://www.netlify.com/) (`@netlify/plugin-nextjs`, リージョン: `ap-northeast-1`)
- **Runtime**: Node.js (`.nvmrc`: `v20.18.3`)
- **Testing**: Playwright (`@playwright/test`)
- **Linter & Formatter**: ESLint (v9 flat config), Prettier

---

## ディレクトリ構成 (Directory Structure)

```
vdslab.jp/
├── .agents/
│   └── AGENTS.md               # エージェント向けプロジェクト仕様・ルール
├── .github/
│   └── workflows/
│       └── playwright.yml      # CI (ESLint + Playwright E2Eテスト)
├── db/
│   └── schema.sql              # PostgreSQL テーブル定義 (7ドメイン + images テーブル)
├── public/                     # 静的ファイル (画像、favicon、マニフェスト等)
├── src/
│   ├── config/
│   │   └── images.js           # 外部画像ドメイン設定 (next.config.js と共有)
│   ├── db/
│   │   └── pool.js             # PostgreSQL 接続 Pool & トランザクションユーティリティ
│   ├── api.js                  # 公開ページ用データ取得 & 画像バイナリ取得
│   ├── markdown.js             # Markdown レンダラーユーティリティ
│   ├── mcp/                    # MCP サーバーロジック
│   │   ├── auth.js             # Bearer トークン認証 (crypto.timingSafeEqual)
│   │   ├── image-utils.js      # バッファヘッダー解析 (PNG/JPEG/WebP/GIF) & サイズ検証
│   │   ├── schemas.js          # Zod バリデーションスキーマ群
│   │   ├── server.js           # McpServer インスタンスファクトリ
│   │   └── tools/              # MCP ツール実装 (全27ツール)
│   │       ├── categories.js   # カテゴリ操作 (4ツール)
│   │       ├── images.js       # 画像操作 (3ツール)
│   │       ├── members.js      # メンバー操作 (5ツール)
│   │       ├── news.js         # ニュース操作 (5ツール)
│   │       ├── products.js     # プロダクト操作 (5ツール)
│   │       ├── projects.js     # プロジェクト操作 (5ツール)
│   │       └── utils.js        # ツール共通ヘルパー (画像参照解決・レスポンス生成)
│   ├── app/                    # Next.js App Router ルーティング
│   │   ├── api/
│   │   │   ├── images/
│   │   │   │   └── [imageId]/
│   │   │   │       └── route.js # 画像配信 GET エンドポイント
│   │   │   └── mcp/
│   │   │       └── route.js    # MCP Streamable HTTP POST エンドポイント
│   │   ├── layout.js           # ルートレイアウト (Bulma CSS, ヘッダー, タブナビゲーション, フッター, OGP)
│   │   ├── page.js             # トップページ (About, News一覧抜粋, リンク集)
│   │   ├── members/            # メンバー一覧ページ (教員, 学生, 院生)
│   │   ├── news/               # ニュース一覧・詳細 (`/news/list`, `/news/detail/[id]`)
│   │   ├── products/           # プロダクト一覧・詳細・カテゴリ絞り込み
│   │   └── projects/           # プロジェクト一覧・詳細・カテゴリ絞り込み
│   └── components/             # 共通UIコンポーネント (タブ、タグ、記事、カード等)
├── tests/
│   ├── smoke.spec.js           # Playwright UI スモークテスト
│   └── mcp.spec.js             # Playwright MCP E2E・画像パイプラインテスト
├── netlify.toml                # Netlify ビルド・プラグイン・リージョン設定
├── next.config.js              # Next.js 設定 (画像ドメイン・外部パッケージ設定等)
└── package.json
```

---

## 開発コマンド (Development Commands)

| コマンド | 説明 |
| :--- | :--- |
| `npm start` | 開発サーバーの起動 (`next dev`) |
| `npm run build` | 本番用ビルドの実行 (`next build`) |
| `npm run serve` | ビルド成果物のローカル配信 (`next start`) |
| `npm test` | Playwright E2E テストの実行 (Smoke + MCP) |
| `npm run lint` | ESLint によるコード静的検証 |

---

## 開発・運用の注意点 (Guidelines & Constraints)

1. **ブランチ運用と Pull Request (Branch Protection)**:
   - `master` ブランチは GitHub で Branch Protection が設定されており、直接の `push` は禁止されています。
   - 作業開始前に必ずリモートの最新 `master` を取得（`git fetch origin` / `git checkout master && git pull origin master`）し、最新の `master` からフィーチャーブランチ（例: `feature/xxx`, `fix/xxx`, `docs/xxx`）を作成して作業を行ってください。
   - 変更完了後はリモートにブランチを push し、`master` に向けた Pull Request を作成して CI パス後にマージします。

2. **データベース接続 & トランザクション**:
   - `DATABASE_URL` 環境変数を介して PostgreSQL に接続します。
   - `src/db/pool.js` で `globalThis` キャッシュされた `pg.Pool` を管理し、`ssl: { rejectUnauthorized: false }` を指定します。
   - 複数テーブルの更新を伴う処理（プロジェクト/プロダクトとカテゴリの紐付け更新等）は `withTransaction` を使用してアトミックに実行します。
   - 本番/プレビュー環境で安定したデータ取得を行うため、各ページコンポーネントおよび Route Handler では SSR / 動的フェッチ（`export const dynamic = "force-dynamic"`）を基本とします。

3. **リモート MCP サーバーと画像配信**:
   - `POST /api/mcp` エンドポイントは、`MCP_API_KEY` 環境変数を用いた Bearer トークン認証を行います（未設定時は 503、不一致時は 401）。
   - トークン比較には SHA-256 ダイジェスト化の上で `crypto.timingSafeEqual` を使用し、タイミング攻撃および長さ不一致による例外を防止します。
   - ステートレス仕様に従い、`GET` および `DELETE` メソッドは `405 Method Not Allowed` を返却します。
   - 画像は `upload_image` ツールによりバイナリ検証（PNG/JPEG/WebP/GIF、上限4MB）を経て PostgreSQL の `images` テーブルに格納され、`/api/images/[imageId]` から `Cache-Control: public, max-age=31536000, immutable` で高速配信されます。
   - Write 系ツール実行時には Next.js の `revalidatePath` をトリガーし、キャッシュを即座に破棄します。

4. **Netlify デプロイ設定**:
   - Netlify Functions のリージョンは `ap-northeast-1` (東京) に設定されており、DB クエリのレイテンシを最小化しています。
   - `@netlify/plugin-nextjs` を使用して Next.js App Router の SSR / アセット配信を行います。

5. **スタイリングと UI**:
   - UI フレームワークには Bulma を採用しており、グローバルスタイルは `src/app/globals.css` (および `src/app/layout.js`) で読み込まれています。
   - レスポンシブデザインや Bulma クラス (`columns`, `column`, `hero`, `tabs`, `content` など) の整合性を維持してください。
   - **インラインスタイル禁止**: 原則として JSX 内での `style={{ ... }}` べた書きは禁止し、Bulma 1.0 の CSS カスタムプロパティ（`--bulma-*`）や `globals.css`、Bulma 標準ユーティリティクラス（`.tag.is-link`, `.is-sticky-top`, `.is-disabled` 等）で一元管理してください。
   - **著作権記号**: フッター等の Copyright 表示には絵文字セレクタ付き文字（`©️`）ではなく、HTML 実体参照 `&copy;` またはテキスト `©` を使用してください。

6. **Next.js App Router のベストプラクティス**:
   - `<Link>` コンポーネントの `href` には Pages Router 形式のオブジェクト（`{ pathname: "/path/[id]", query: ... }`）を渡さず、文字列テンプレート（例: ``href={`/products/${id}/1`}``）を使用してください。
   - `/news/list` → `/news/list/1` などのパスリダイレクトは、コンポーネント内だけでなく `next.config.js` の `redirects()` でも定義してください。

7. **テスト・CI**:
   - Pull Request 作成時および master への push 時に GitHub Actions で Lint と Playwright テストが自動実行されます。
   - 変更を加えた際は `npm run lint`、`npm run build`、`npm test` が通過することを確認してください。
