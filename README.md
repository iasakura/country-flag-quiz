# 国旗で国名当て（Flag Study）

国旗から国名を当てる学習アプリ。選択式／入力式、間隔反復の「覚えるモード」、苦手リスト／間違えがちな国旗、国の基本情報を見られる図鑑つき。国旗画像は flagcdn.com（flagpedia.net）の CDN から読み込み、国の基本情報はアプリに同梱しています。

学習データ（正誤・箱レベル・苦手リスト）はブラウザの `localStorage` に保存されます（端末・ブラウザごと）。

## ローカルで動かす

```bash
npm install
npm run dev      # 開発サーバ
npm run build    # 本番ビルド（dist/ に出力）
npm run preview  # ビルド結果の確認
```

## GitHub Pages へ公開

1. このフォルダを Git リポジトリにして push（`main` ブランチ）。
   ```bash
   git init
   git add -A
   git commit -m "init flag quiz"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
   git push -u origin main
   ```
   ※ `npm install` を一度ローカルで実行して `package-lock.json` をコミットしておくこと（ワークフローの `npm ci` に必要）。
2. GitHub のリポジトリ → **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定。
3. push すると `.github/workflows/deploy.yml` が走り、`https://<ユーザー名>.github.io/<リポジトリ名>/` に公開されます。

`vite.config.js` の `base: "./"` により、リポジトリ名に依存せずサブパス配信で動きます。

## 構成

- `src/App.jsx` … アプリ本体（基本情報データ同梱／国旗は CDN から取得）
- `src/main.jsx`, `src/index.css` … エントリと Tailwind
- `vite.config.js`, `tailwind.config.js`, `postcss.config.js`
- `.github/workflows/deploy.yml` … Pages デプロイ

## データ出典

- 国旗画像: [flagpedia.net](https://flagpedia.net/)（flagcdn.com）
- 国データ: [mledoze/countries](https://github.com/mledoze/countries)。人口は概数。

クレジットはトップページにも表示しています。
