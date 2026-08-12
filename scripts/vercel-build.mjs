/**
 * Post-build script: creates the Vercel Build Output API structure (.vercel/output/)
 * from the TanStack Start build artifacts (dist/client/ and dist/server/).
 *
 * TanStack Start's `target: "vercel"` does not generate .vercel/output/ automatically,
 * so we create it here. The server entry (dist/server/server.js) exports a Cloudflare
 * Worker-style { fetch } handler, which we wrap for Vercel Node.js serverless.
 * Node.js runtime is required because the Nitro SSR bundle uses node:stream internally.
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

  // 2. Create Serverless Function directory
  const funcDir = join(outputDir, "functions/index.func");
  await fs.mkdir(funcDir, { recursive: true });

  // 3. Write a shim that adapts the { fetch } export to a Node.js HTTP handler.
  //    Vercel's Node.js launcher calls the default export as handler(req, res) and
  //    expects res.end() to be called — returning a Response object is not enough.
  const shimPath = join(root, "dist/server/_vercel-shim.mjs");
  await fs.writeFile(
    shimPath,
    `import _s from "./server.js";

export default async function handler(req, res) {
  const proto = (req.headers["x-forwarded-proto"] ?? "https").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", proto + "://" + host);

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length > 0) body = Buffer.concat(chunks);
  }

  const webRequest = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body,
  });

  const response = await _s.fetch(webRequest);

  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  res.end();
}
`
  );

  // 4. Bundle server into a single ESM file for Node.js Serverless
  console.log("  Bundling server for Node.js...");
  const funcEntry = join(funcDir, "index.js");

  execSync(
    [
      `"${join(root, "node_modules/.bin/esbuild")}"`,
      `"${shimPath}"`,
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--minify",
      "--ignore-annotations", // prevent sideEffects:false from dropping needed imports
      // Inject a require() shim so CJS dependencies work inside ESM output
      `--banner:js="import{createRequire}from'module';const require=createRequire(import.meta.url);"`,
      `--outfile="${funcEntry}"`,
    ].join(" "),
    { cwd: root, stdio: "inherit" }
  );

  await fs.rm(shimPath, { force: true });

  // 5. Mark function directory as ESM so Node.js loads index.js with import support
  await fs.writeFile(
    join(funcDir, "package.json"),
    JSON.stringify({ type: "module" })
  );

  // 6. Function config: Node.js runtime with Web API support
  await fs.writeFile(
    join(funcDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs22.x",
        handler: "index.js",
        launcherType: "Nodejs",
        supportsResponseStreaming: true,
      },
      null,
      2
    )
  );

  // 7. Routing config: serve static files first, then fall through to the Serverless Function
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
