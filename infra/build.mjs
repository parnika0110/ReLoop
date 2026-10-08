/**
 * Bundles the Lambda handler (infra/lambda/index.ts) into infra/dist/index.mjs.
 *
 * The handler imports the REAL application modules (@/lib, @/engine, @/analysis)
 * so the deployed Lambda runs the same deterministic pipeline as local dev —
 * this build step is packaging only, not a separate implementation.
 *
 * Usage: node infra/build.mjs
 */
import { build } from "esbuild";
import { rm } from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "dist");

await rm(outDir, { recursive: true, force: true });

const result = await build({
  entryPoints: [path.join(here, "lambda", "index.ts")],
  outfile: path.join(outDir, "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: false,
  minify: false,
  legalComments: "none",
  // tsconfig.json's "@/*" → "./src/*" paths are honoured by esbuild.
  tsconfig: path.join(here, "..", "tsconfig.json"),
  // Some transitive CJS deps still call require() from the ESM graph.
  banner: {
    js: "import { createRequire as __createRequire } from 'module';\nconst require = __createRequire(import.meta.url);",
  },
  logLevel: "info",
});

const { warnings } = result;
if (warnings.length) {
  console.log(`\n${warnings.length} bundling warning(s)`);
}
console.log("Lambda bundle written to infra/dist/index.mjs");
