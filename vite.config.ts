// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro, componentTagger, VITE_* env, @ alias, dedupes, error loggers.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        {
          find: /^tslib$/,
          replacement: new URL("./src/lib/tslib-compat.js", import.meta.url).pathname,
        },
        // These packages don't declare "workerd"/"worker" export conditions,
        // so rolldown (used by nitro/vercel) fails to resolve them. Alias to the node ESM build.
        { find: /^@solana\/codecs$/, replacement: "@solana/codecs/dist/index.node.mjs" },
        { find: /^@solana\/codecs-core$/, replacement: "@solana/codecs-core/dist/index.node.mjs" },
        { find: /^@solana\/codecs-numbers$/, replacement: "@solana/codecs-numbers/dist/index.node.mjs" },
        { find: /^@solana\/codecs-strings$/, replacement: "@solana/codecs-strings/dist/index.node.mjs" },
        { find: /^@solana\/codecs-data-structures$/, replacement: "@solana/codecs-data-structures/dist/index.node.mjs" },
        { find: /^@solana\/errors$/, replacement: "@solana/errors/dist/index.node.mjs" },
        { find: /^@solana\/options$/, replacement: "@solana/options/dist/index.node.mjs" },
        { find: /^rpc-websockets$/, replacement: "rpc-websockets/dist/index.mjs" },
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
