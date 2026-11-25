#!/usr/bin/env node
/**
 * Build static web bundle into dist/ ready for Capacitor iOS sync (`npx cap sync ios`)
 * or direct browser hosting. Zero external dependencies.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = join(ROOT, "dist");

if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true, force: true });
}
mkdirSync(DIST, { recursive: true });

// 1. Copy entry HTML
cpSync(join(ROOT, "index.html"), join(DIST, "index.html"));

// 2. Copy game source modules
cpSync(join(ROOT, "src"), join(DIST, "src"), { recursive: true });

// 3. Copy public/ contents into dist root (dist/assets/..., dist/manifest.webmanifest)
const PUBLIC_DIR = join(ROOT, "public");
if (existsSync(PUBLIC_DIR)) {
  cpSync(PUBLIC_DIR, DIST, { recursive: true });
}

function countFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      count += countFiles(full);
    } else {
      count += 1;
    }
  }
  return count;
}

const total = countFiles(DIST);
console.log(`[build-web] Packaged ${total} files into ${DIST}`);
