#!/usr/bin/env node
/**
 * Tự động hóa trọn gói:
 * 1. Đọc GitHub token (GH_TOKEN hoặc tools/gh/bin/gh.exe auth token).
 * 2. Tạo/cập nhật repo `luyen-co-su-ios` qua GitHub Blobs + Trees API (không cần git.exe).
 * 3. Chạy workflow `.github/workflows/build-ios-ipa.yml` trên macos-latest (Xcode).
 * 4. Theo dõi đến khi xong, tải artifact `LuyenCoSu-iOS-IPA`, giải nén ra `LuyenCoSu.ipa` ở thư mục gốc.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const GH_EXE = join(ROOT, "tools", "gh", "bin", "gh.exe");
const REPO_NAME = "luyen-co-su-ios";
const WORKFLOW_FILE = "build-ios-ipa.yml";
const BUILD_DIR = join(ROOT, "build");
const FINAL_IPA = join(ROOT, "LuyenCoSu.ipa");

const TEXT_EXTS = new Set([
  ".sh",
  ".yml",
  ".yaml",
  ".js",
  ".mjs",
  ".json",
  ".plist",
  ".pbxproj",
  ".swift",
  ".storyboard",
  ".html",
  ".css",
  ".md",
  ".txt",
  ".xml",
  ".webmanifest",
  ".xcconfig",
  ".entitlements",
  ".gitignore",
  ".gitkeep",
]);

function isTextFile(filePath) {
  const name = filePath.split(/[\\/]/).pop();
  if (name === "Podfile" || name === ".gitignore" || name === ".gitkeep") return true;
  return TEXT_EXTS.has(extname(filePath).toLowerCase());
}

function getToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();
  if (existsSync(GH_EXE)) {
    try {
      const tok = execFileSync(GH_EXE, ["auth", "token"], { encoding: "utf8" }).trim();
      if (tok) return tok;
    } catch {
      // ignore
    }
  }
  throw new Error("Chưa có GitHub token. Hãy chạy gh auth login trước.");
}

async function ghApi(token, path, options = {}) {
  const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "luyen-co-su-cloud-builder",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`GitHub API ${res.status} (${path}): ${txt}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? res.json() : res.text();
}

function collectFiles() {
  const files = [];
  const addFile = (absPath) => {
    if (existsSync(absPath) && statSync(absPath).isFile()) {
      files.push(absPath);
    }
  };
  const walk = (absDir, skipFn = null) => {
    if (!existsSync(absDir)) return;
    for (const entry of readdirSync(absDir)) {
      const full = join(absDir, entry);
      const rel = relative(ROOT, full).replace(/\\/g, "/");
      if (skipFn && skipFn(rel)) continue;
      if (statSync(full).isDirectory()) walk(full, skipFn);
      else files.push(full);
    }
  };

  for (const rootFile of [
    "index.html",
    "package.json",
    "package-lock.json",
    "capacitor.config.json",
    ".gitignore",
    "IPA_BUILD_GUIDE.md",
  ]) {
    addFile(join(ROOT, rootFile));
  }

  addFile(join(ROOT, ".github", "workflows", "build-ios-ipa.yml"));
  walk(join(ROOT, "ios-packaging"));
  walk(join(ROOT, "scripts"));
  walk(join(ROOT, "src"));
  walk(join(ROOT, "public"));
  walk(join(ROOT, "ios"), (rel) =>
    rel === "ios/App/Pods" ||
    rel.startsWith("ios/App/Pods/") ||
    rel === "ios/App/build" ||
    rel.startsWith("ios/App/build/")
  );

  // Chỉ lấy phần core cần thiết của pixelfx cho scripts/configure-ios.mjs
  addFile(join(ROOT, "tools", "pixelfx", "package.json"));
  walk(join(ROOT, "tools", "pixelfx", "src", "core"));
  walk(join(ROOT, "tools", "pixelfx", "tools", "lib"));

  return files;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const token = getToken();
  const user = await ghApi(token, "/user");
  const owner = user.login;
  console.log(`[cloud-ipa] Authenticated as GitHub user: ${owner}`);

  let repo;
  try {
    repo = await ghApi(token, `/repos/${owner}/${REPO_NAME}`);
    console.log(`[cloud-ipa] Using existing repo: ${repo.html_url}`);
  } catch (err) {
    if (err.status !== 404) throw err;
    console.log(`[cloud-ipa] Creating public repo ${owner}/${REPO_NAME}...`);
    repo = await ghApi(token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: REPO_NAME,
        private: false,
        auto_init: true,
        description: "Luyện Cổ Sư — iOS Action Roguelike (Capacitor + GitHub Actions IPA)",
      }),
    });
    await sleep(2500);
  }

  const branch = repo.default_branch || "main";
  const ref = await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/ref/heads/${branch}`);
  const parentSha = ref.object.sha;

  const files = collectFiles();
  console.log(`[cloud-ipa] Uploading ${files.length} files via Git Blobs API...`);

  const treeEntries = [];
  const batchSize = 8;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (absPath) => {
        const rel = relative(ROOT, absPath).replace(/\\/g, "/");
        let buf = readFileSync(absPath);
        if (isTextFile(rel)) {
          const text = buf.toString("utf8").replace(/\r\n/g, "\n");
          buf = Buffer.from(text, "utf8");
        }
        const blob = await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({
            content: buf.toString("base64"),
            encoding: "base64",
          }),
        });
        return {
          path: rel,
          mode: rel.endsWith(".sh") ? "100755" : "100644",
          type: "blob",
          sha: blob.sha,
        };
      })
    );
    treeEntries.push(...results);
    process.stdout.write(`.`);
  }
  console.log(`\n[cloud-ipa] Creating Git tree & commit on ${branch}...`);

  const tree = await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ tree: treeEntries }),
  });

  const pushTimeIso = new Date().toISOString();
  const commit = await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: "Build Luyen Co Su iOS IPA",
      tree: tree.sha,
      parents: [parentSha],
    }),
  });

  await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });
  console.log(`[cloud-ipa] Pushed commit ${commit.sha.slice(0, 7)}. Waiting for workflow run...`);

  await sleep(6000);
  let run = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const runsRes = await ghApi(token, `/repos/${owner}/${REPO_NAME}/actions/runs?per_page=5`);
    run = (runsRes.workflow_runs ?? []).find(
      (r) => r.head_sha === commit.sha || r.created_at >= pushTimeIso
    );
    if (run) break;
    if (attempt === 0) {
      try {
        await ghApi(
          token,
          `/repos/${owner}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
          { method: "POST", body: JSON.stringify({ ref: branch, inputs: { unsigned: "true" } }) }
        );
      } catch {
        // workflow might trigger automatically on push
      }
    }
    await sleep(4000);
  }

  if (!run) {
    throw new Error("Không tìm thấy GitHub Actions workflow run sau khi push.");
  }

  console.log(`[cloud-ipa] Tracking macOS Xcode build: ${run.html_url}`);

  while (run.status !== "completed") {
    await sleep(12000);
    run = await ghApi(token, `/repos/${owner}/${REPO_NAME}/actions/runs/${run.id}`);
    console.log(`[cloud-ipa] Status: ${run.status}${run.conclusion ? ` (${run.conclusion})` : ""}`);
  }

  if (run.conclusion !== "success") {
    const jobsRes = await ghApi(token, `/repos/${owner}/${REPO_NAME}/actions/runs/${run.id}/jobs`);
    for (const job of jobsRes.jobs ?? []) {
      console.error(`[cloud-ipa] Job "${job.name}" -> ${job.conclusion}`);
      if (job.conclusion !== "success") {
        try {
          const logRes = await fetch(
            `https://api.github.com/repos/${owner}/${REPO_NAME}/actions/jobs/${job.id}/logs`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "User-Agent": "luyen-co-su-cloud-builder",
              },
            }
          );
          const logText = await logRes.text();
          console.error(logText.split("\n").slice(-60).join("\n"));
        } catch {
          // ignore
        }
      }
    }
    throw new Error(`Xcode cloud build failed with conclusion: ${run.conclusion}`);
  }

  const artRes = await ghApi(token, `/repos/${owner}/${REPO_NAME}/actions/runs/${run.id}/artifacts`);
  const artifact = (artRes.artifacts ?? []).find((a) => a.name === "LuyenCoSu-iOS-IPA");
  if (!artifact) {
    throw new Error("Build thành công nhưng không tìm thấy artifact LuyenCoSu-iOS-IPA.");
  }

  console.log(`[cloud-ipa] Downloading artifact ${artifact.name} (${artifact.size_in_bytes} bytes)...`);
  const zipRes = await fetch(artifact.archive_download_url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "luyen-co-su-cloud-builder",
    },
    redirect: "manual",
  });

  let finalZipRes = zipRes;
  if (zipRes.status >= 300 && zipRes.status < 400) {
    const redirectUrl = zipRes.headers.get("location");
    if (!redirectUrl) throw new Error("Redirect không có Location header.");
    // Không gửi Authorization header sang Azure Blob Storage
    finalZipRes = await fetch(redirectUrl);
  }

  if (!finalZipRes.ok) {
    throw new Error(`Tải artifact thất bại: HTTP ${finalZipRes.status}`);
  }

  mkdirSync(BUILD_DIR, { recursive: true });
  const zipPath = join(BUILD_DIR, "LuyenCoSu-artifact.zip");
  const arrayBuf = await finalZipRes.arrayBuffer();
  writeFileSync(zipPath, Buffer.from(arrayBuf));

  execFileSync("tar.exe", ["-xf", zipPath, "-C", BUILD_DIR], { stdio: "inherit" });
  const extractedIpa = join(BUILD_DIR, "LuyenCoSu.ipa");
  if (!existsSync(extractedIpa)) {
    throw new Error(`Đã giải nén nhưng không thấy ${extractedIpa}`);
  }

  copyFileSync(extractedIpa, FINAL_IPA);
  const ipaSizeMb = (statSync(FINAL_IPA).size / (1024 * 1024)).toFixed(2);
  console.log(`[cloud-ipa] SUCCESS! File IPA sẵn sàng cài lên iPhone: ${FINAL_IPA} (${ipaSizeMb} MB)`);
}

main().catch((err) => {
  console.error(`[cloud-ipa] ERROR: ${err.message}`);
  process.exit(1);
});
