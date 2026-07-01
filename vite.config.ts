// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro, componentTagger, VITE_* env, @ alias, dedupes, error loggers.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { resolve as pathResolve } from "path";
import { fileURLToPath } from "url";

const projectRoot = pathResolve(fileURLToPath(import.meta.url), "..");
const nodeAlias = (pkg: string, sub = "dist/index.node.mjs") => ({
  find: new RegExp(`^${pkg.replace(/[/\\-]/g, (m) => "\\" + m)}$`),
  replacement: pathResolve(projectRoot, "node_modules", pkg, sub),
});

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        {
          find: /^tslib$/,
          replacement: pathResolve(projectRoot, "src/lib/tslib-compat.js"),
        },
        // These packages don't declare "workerd"/"worker" export conditions so rolldown
        // (used by the vercel/nitro build) fails to resolve them. Alias to the node ESM build directly.
        nodeAlias("@solana/codecs"),
        nodeAlias("@solana/codecs-core"),
        nodeAlias("@solana/codecs-numbers"),
        nodeAlias("@solana/codecs-strings"),
        nodeAlias("@solana/codecs-data-structures"),
        nodeAlias("@solana/errors"),
        nodeAlias("@solana/options"),
        nodeAlias("rpc-websockets", "dist/index.mjs"),
      ],
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
});
