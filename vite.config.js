import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base を相対パスにすることで、https://<user>.github.io/<repo>/ のような
// サブパス配信でも、リポジトリ名に依存せずアセットを正しく読み込める。
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    // 0.0.0.0 で待ち受け、同一LAN等の外部端末からアクセス可能にする。
    // 注意: dev サーバは信頼できるネットワークでのみ公開すること。
    host: true,
    // /mnt/c（Windows FS）は inotify が効かず HMR が飛ばないので、ポーリングで変更検知する。
    watch: { usePolling: true, interval: 300 },
  },
});
