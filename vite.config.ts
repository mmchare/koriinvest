// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro, componentTagger, VITE_* env, @ alias, dedupes, error loggers.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "module";
import { dirname, resolve as pathResolve } from "path";

const require = createRequire(import.meta.url);
const nodeAlias = (pkg: string, sub = "dist/index.node.mjs") => {
  const dir = dirname(require.resolve(`${pkg}/package.json`));
  return { find: new RegExp(`^${pkg.replace(/[/\\-]/g, (m) => "\\" + m)}$`), replacement: pathResolve(dir, sub) };
};

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        {
          find: /^tslib$/,
          replacement: new URL("./src/lib/tslib-compat.js", import.meta.url).pathname,
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
