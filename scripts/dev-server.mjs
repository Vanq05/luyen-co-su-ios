#!/usr/bin/env node
/**
 * Dev server for "Luyện Cổ Sư".
 * Builds `dist/` via `scripts/build-web.mjs` (esbuild IIFE + embedded JSONs) and serves `dist/`
 * so local testing runs the exact same classic-script bundle shipped inside the iOS `.ipa`.
 */

import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST_DIR = join(ROOT, "dist");
const PORT = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? "0.0.0.0";

execFileSync(process.execPath, [join(ROOT, "scripts", "build-web.mjs")], {
  stdio: "inherit",
});

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.(\/|\\|$))+/, "");
  const rel = clean === "/" || clean === "\\" ? "index.html" : clean.replace(/^[/\\]+/, "");

  const file = join(DIST_DIR, rel);
  if (existsSync(file) && statSync(file).isFile()) {
    return file;
  }
  return null;
}

const server = createServer((req, res) => {
  const filePath = resolveFile(req.url ?? "/");
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(readFileSync(filePath));
});

server.listen(PORT, HOST, () => {
  console.log(`[dev-server] Luyện Cổ Sư (dist/) running at http://127.0.0.1:${PORT}/ (bound ${HOST})`);
});
