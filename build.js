import { build } from "esbuild";
import { copy } from "esbuild-plugin-copy";

import fs from "node:fs";

fs.rmdirSync("./dist", { recursive: true });

build({
  entryPoints: ["./src/extension.ts"],
  bundle: true,
  outfile: "./dist/extension.js",
  external: ["vscode"],
  format: "esm",
  platform: "node",
  minify: process.argv.includes("--minify"),
  sourcemap: !process.argv.includes("--minify"),
  plugins: [
    copy({
      resolveFrom: "cwd",
      assets: {
        from: ["./node_modules/@surrealdb/ql-wasm/dist/surrealql/*.wasm"],
        to: ["./dist"],
      },
    }),
  ],
}).catch(() => process.exit(1));
