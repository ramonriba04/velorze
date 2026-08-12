/**
 * Post-build script: creates the Vercel Build Output API structure (.vercel/output/)
 * from the TanStack Start build artifacts (dist/client/ and dist/server/).
 *
 * TanStack Start's `target: "vercel"` does not generate .vercel/output/ automatically,
 * so we create it here. The server entry (dist/server/server.js) uses the Web Standard
 * fetch API, which is compatible with Vercel Edge Functions.
 */
import { execSync } from "child_process";
import { promises as fs } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outputDir = join(root, ".vercel/output");

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  console.log("Building Vercel output structure...");

  // Clean previous output
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  // 1. Copy static assets: dist/client/ → .vercel/output/static/
  console.log("  Copying static assets...");
  await copyDir(join(root, "dist/client"), join(outputDir, "static"));

  // 2. Create Edge Function directory
  const funcDir = join(outputDir, "functions/index.func");
  await fs.mkdir(funcDir, { recursive: true });

  // 3. Bundle server into a single ESM file for Edge Functions
  console.log("  Bundling server for Edge...");
  const serverEntry = join(root, "dist/server/server.js");
  const funcEntry = join(funcDir, "index.js");

  execSync(
    [
      `"${join(root, "node_modules/.bin/esbuild")}"`,
      `"${serverEntry}"`,
      "--bundle",
      "--platform=browser",
      "--format=esm",
      "--minify",
      "--ignore-annotations", // prevent sideEffects:false from dropping needed imports
      `--outfile="${funcEntry}"`,
      // Externalize Node built-ins that the edge runtime provides natively
      "--external:node:*",
    ].join(" "),
    { cwd: root, stdio: "inherit" }
  );

  // 4. Function config: tell Vercel to use Edge runtime
  await fs.writeFile(
    join(funcDir, ".vc-config.json"),
    JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2)
  );

  // 5. Routing config: serve static files first, then fall through to the Edge Function
  const config = {
    version: 3,
    routes: [
      // Cache static assets permanently
      {
        src: "^/assets/(.+)$",
        headers: { "cache-control": "public, max-age=31536000, immutable" },
        continue: true,
      },
      // Serve static files if they exist
      { handle: "filesystem" },
      // Everything else → SSR function
      { src: "/(.*)", dest: "/index" },
    ],
  };
  await fs.writeFile(
    join(outputDir, "config.json"),
    JSON.stringify(config, null, 2)
  );

  console.log("✓ .vercel/output/ created successfully");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
