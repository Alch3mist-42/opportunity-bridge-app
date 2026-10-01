// Bundles each server/*.ts endpoint into a self-contained /api/*.js file for Vercel.
// Run from the project folder: node server/build.mjs  (needs esbuild: npx esbuild works too)
import { build } from "esbuild"
const endpoints = ["health", "eti", "week", "placement", "places", "selfcheck"]
await build({
  entryPoints: endpoints.map((e) => `server/${e}.ts`),
  outdir: "api",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  banner: { js: "// Built from /server by server/build.mjs. Edit the files in /server, not this one." },
})
console.log("Built", endpoints.map((e) => `api/${e}.js`).join(", "))
