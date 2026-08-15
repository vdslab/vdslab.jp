# vdslab.jp - Project Overview & Guidelines

## 概要 (Project Overview)
日本大学文理学部情報科学科 尾上研究室 (Visual Database Systems Laboratory; VDSLab) の公式サイト (`https://vdslab.jp`) のリポジトリです。
情報可視化とデータサイエンス (Visualization and Data Science) を中心テーマとする研究室の紹介、ニュース、プロジェクト、プロダクト、メンバー情報を公開しています。

---

## 技術スタック (Tech Stack)
- **Framework**: [Next.js](https://nextjs.org/) (v13 App Router, React 18)
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
├── public/                     # 静的ファイル (画像、favicon、マニフェスト等)
├── src/
│   ├── api.js                  # PostgreSQL 接続 Pool & データ取得関数群
│   ├── markdown.js             # Markdown レンダラーユーティリティ
│   ├── app/                    # Next.js App Router ルーティング
│   │   ├── layout.js           # ルートレイアウト (Bulma CSS, ヘッダー, タブナビゲーション, フッター, OGP)
│   │   ├── page.js             # トップページ (About, News一覧抜粋, リンク集)
│   │   ├── members/            # メンバー一覧ページ (教員, 学生, 院生)
│   │   ├── news/               # ニュース一覧・詳細 (`/news/list`, `/news/detail/[id]`)
│   │   ├── products/           # プロダクト一覧・詳細・カテゴリ絞り込み
│   │   └── projects/           # プロジェクト一覧・詳細・カテゴリ絞り込み
│   └── components/             # 共通UIコンポーネント (タブ、タグ、記事、カード等)
├── tests/
│   └── smoke.spec.js           # Playwright による E2E スモークテスト
├── netlify.toml                # Netlify ビルド・プラグイン・リージョン設定
├── next.config.js              # Next.js 設定 (画像ドメイン設定等)
└── package.json
```

---

## 開発コマンド (Development Commands)

| コマンド | 説明 |
| :--- | :--- |
| `npm start` | 開発サーバーの起動 (`next dev`) |
| `npm run build` | 本番用ビルドの実行 (`next build`) |
| `npm run serve` | ビルド成果物のローカル配信 (`next start`) |
| `npm test` | Playwright E2E テストの実行 |
| `npm run lint` | ESLint によるコード静的検証 |

---

## 開発・運用の注意点 (Guidelines & Constraints)

1. **ブランチ運用と Pull Request (Branch Protection)**:
   - `master` ブランチは GitHub で Branch Protection が設定されており、直接の `push` は禁止されています。
   - 作業開始前に必ずリモートの最新 `master` を取得（`git fetch origin` / `git checkout master && git pull origin master`）し、最新の `master` からフィーチャーブランチ（例: `feature/xxx`, `fix/xxx`, `docs/xxx`）を作成して作業を行ってください。
   - 変更完了後はリモートにブランチを push し、`master` に向けた Pull Request を作成して CI パス後にマージします。

2. **データベース接続**:
   - `DATABASE_URL` 環境変数を介して PostgreSQL に接続します。
   - `src/api.js` の `Pool` 設定では `ssl: { rejectUnauthorized: false }` を指定してセキュアに接続します。
   - 本番/プレビュー環境で安定したデータ取得を行うため、各ページコンポーネントでは SSR / 動的フェッチ（`export const dynamic = "force-dynamic"`）を基本とします。

3. **Netlify デプロイ設定**:
   - Netlify Functions のリージョンは `ap-northeast-1` (東京) に設定されており、DB クエリのレイテンシを最小化しています。
   - `@netlify/plugin-nextjs` を使用して Next.js App Router の SSR / アセット配信を行います。

4. **スタイリングと UI**:
   - UI フレームワークには Bulma を採用しており、グローバルスタイルは `src/app/globals.css` (および `src/app/layout.js`) で読み込まれています。
   - レスポンシブデザインや Bulma クラス (`columns`, `column`, `hero`, `tabs`, `content` など) の整合性を維持してください。
   - **インラインスタイル禁止**: 原則として JSX 内での `style={{ ... }}` べた書きは禁止し、Bulma 1.0 の CSS カスタムプロパティ（`--bulma-*`）や `globals.css`、Bulma 標準ユーティリティクラス（`.tag.is-link`, `.is-sticky-top`, `.is-disabled` 等）で一元管理してください。
   - **著作権記号**: フッター等の Copyright 表示には絵文字セレクタ付き文字（`©️`）ではなく、HTML 実体参照 `&copy;` またはテキスト `©` を使用してください。

5. **Next.js App Router のベストプラクティス**:
   - `<Link>` コンポーネントの `href` には Pages Router 形式のオブジェクト（`{ pathname: "/path/[id]", query: ... }`）を渡さず、文字列テンプレート（例: ``href={`/products/${id}/1`}``）を使用してください。
   - `/news/list` → `/news/list/1` などのパスリダイレクトは、コンポーネント内だけでなく `next.config.js` の `redirects()` でも定義してください。

6. **テスト・CI**:
   - Pull Request 作成時および master への push 時に GitHub Actions で Lint と Playwright テストが自動実行されます。
   - 変更を加えた際は `npm run lint` および `npm test` が通過することを確認してください。
