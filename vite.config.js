import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base を相対パスにすることで、https://<user>.github.io/<repo>/ のような
// サブパス配信でも、リポジトリ名に依存せずアセットを正しく読み込める。
export default defineConfig({
  base: "./",
  plugins: [react()],
});
