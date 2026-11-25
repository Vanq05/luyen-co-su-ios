#!/usr/bin/env node
/**
 * Lightweight zero-dependency static dev server for "Luyện Cổ Sư".
 * Serves index.html, src/, and maps public/ paths (e.g. /assets/..., /manifest.webmanifest).
 * Listens on 0.0.0.0 so both desktop browser and iPhone Safari on local Wi-Fi can test touch controls.
 */

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_DIR = join(ROOT, "public");
const PORT = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.(\/|\\|$))+/, "");
  const rel = clean === "/" || clean === "\\" ? "index.html" : clean.replace(/^[/\\]+/, "");

  const candidates = [join(PUBLIC_DIR, rel), join(ROOT, rel)];
  for (const file of candidates) {
    if (existsSync(file) && statSync(file).isFile()) {
      return file;
    }
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
  console.log(`[dev-server] Luyện Cổ Sư running at http://127.0.0.1:${PORT}/ (bound ${HOST})`);
});
