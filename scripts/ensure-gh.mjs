#!/usr/bin/env node
/**
 * Tải GitHub CLI (gh.exe) bản portable chính thức vào tools/gh/ mà không cần quyền admin.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const GH_DIR = join(ROOT, "tools", "gh");
const GH_EXE = join(GH_DIR, "bin", "gh.exe");
const GH_ZIP = join(ROOT, "tools", "gh.zip");

if (existsSync(GH_EXE)) {
  console.log(`[ensure-gh] Already installed: ${GH_EXE}`);
  process.exit(0);
}

console.log("[ensure-gh] Fetching latest cli/cli release metadata...");
const res = await fetch("https://api.github.com/repos/cli/cli/releases/latest", {
  headers: {
    "User-Agent": "luyen-co-su-builder",
    Accept: "application/vnd.github+json",
  },
});

if (!res.ok) {
  throw new Error(`GitHub Releases API error: ${res.status} ${await res.text()}`);
}

const release = await res.json();
const asset = (release.assets ?? []).find((a) =>
  /^gh_.*_windows_amd64\.zip$/i.test(a.name)
);
if (!asset) {
  throw new Error("Không tìm thấy gói windows_amd64.zip trong cli/cli release.");
}

console.log(`[ensure-gh] Downloading ${asset.name}...`);
mkdirSync(GH_DIR, { recursive: true });
execFileSync("curl.exe", ["-fsSL", "-o", GH_ZIP, asset.browser_download_url], {
  stdio: "inherit",
});

console.log("[ensure-gh] Extracting archive with tar.exe...");
execFileSync("tar.exe", ["-xf", GH_ZIP, "-C", GH_DIR], { stdio: "inherit" });

// Nếu tar giải nén vào thư mục con gh_x.y.z_windows_amd64/, dời bin/ lên tools/gh/bin/
if (!existsSync(GH_EXE)) {
  for (const entry of readdirSync(GH_DIR)) {
    const candidate = join(GH_DIR, entry, "bin", "gh.exe");
    if (existsSync(candidate)) {
      const subDir = join(GH_DIR, entry);
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `Move-Item -Force -Path '${subDir}\\*' -Destination '${GH_DIR}' ; Remove-Item -Force -Recurse '${subDir}'`,
        ],
        { stdio: "inherit" }
      );
      break;
    }
  }
}

if (existsSync(GH_ZIP)) {
  rmSync(GH_ZIP, { force: true });
}

if (!existsSync(GH_EXE)) {
  throw new Error(`Giải nén xong nhưng không thấy ${GH_EXE}`);
}

console.log(`[ensure-gh] Ready: ${GH_EXE}`);
