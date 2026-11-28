#!/usr/bin/env node
/**
 * Tự động hóa trọn gói:
 * 1. Đọc GitHub token (GH_TOKEN hoặc tools/gh/bin/gh.exe auth token).
 * 2. Tạo/cập nhật repo `luyen-co-su-ios` qua GitHub Blobs + Trees API (không cần git.exe).
 * 3. Chạy workflow `.github/workflows/build-ios-ipa.yml` trên macos-latest (Xcode).
 * 4. Theo dõi đến khi xong, tải artifact `LuyenCoSu-iOS-IPA`, giải nén ra `LuyenCoSu.ipa` ở thư mục gốc.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const GH_EXE = join(ROOT, "tools", "gh", "bin", "gh.exe");
const REPO_NAME = "luyen-co-su-ios";
const WORKFLOW_FILE = "build-ios-ipa.yml";
const BUILD_DIR = join(ROOT, "build");
const FINAL_IPA = join(ROOT, "LuyenCoSu.ipa");
const FINAL_APK = join(ROOT, "LuyenCoSu.apk");

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
  ".gradle",
  ".properties",
  ".pro",
]);

function isTextFile(filePath) {
  const name = filePath.split(/[\\/]/).pop();
  if (name === "Podfile" || name === "gradlew" || name === ".gitignore" || name === ".gitkeep") return true;
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

async function ghApi(token, path, options = {}, attempt = 0) {
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
  if ((res.status === 403 || res.status === 429) && attempt < 4) {
    const txt = await res.text();
    if (res.status === 429 || txt.toLowerCase().includes("rate limit")) {
      const retryAfter = Number(res.headers.get("retry-after")) || (attempt + 1) * 35;
      console.log(`\n[cloud-build] GitHub rate limit hit (${res.status}), waiting ${retryAfter}s before retry...`);
      await sleep(retryAfter * 1000);
      return ghApi(token, path, options, attempt + 1);
    }
    const err = new Error(`GitHub API ${res.status} (${path}): ${txt}`);
    err.status = res.status;
    throw err;
  }
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
  walk(join(ROOT, "android"), (rel) =>
    rel === "android/.gradle" ||
    rel.startsWith("android/.gradle/") ||
    rel === "android/build" ||
    rel.startsWith("android/build/") ||
    rel === "android/app/build" ||
    rel.startsWith("android/app/build/") ||
    rel === "android/capacitor-cordova-android-plugins/build" ||
    rel.startsWith("android/capacitor-cordova-android-plugins/build/")
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

  const existingShaMap = new Map();
  try {
    const prevTree = await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/trees/${parentSha}?recursive=1`);
    for (const item of prevTree.tree ?? []) {
      if (item.type === "blob" && item.path && item.sha) {
        existingShaMap.set(item.path, item.sha);
      }
    }
  } catch {
    // Fallback to uploading all files if tree fetch fails
  }

  const computeGitBlobSha = (buf) =>
    createHash("sha1")
      .update(Buffer.from(`blob ${buf.length}\0`, "utf8"))
      .update(buf)
      .digest("hex");

  const files = collectFiles();
  const treeEntries = [];
  const toUpload = [];

  for (const absPath of files) {
    const rel = relative(ROOT, absPath).replace(/\\/g, "/");
    let buf = readFileSync(absPath);
    if (isTextFile(rel)) {
      const text = buf.toString("utf8").replace(/\r\n/g, "\n");
      buf = Buffer.from(text, "utf8");
    }
    const localSha = computeGitBlobSha(buf);
    const mode = rel.endsWith(".sh") || rel.endsWith("/gradlew") ? "100755" : "100644";
    if (existingShaMap.get(rel) === localSha) {
      treeEntries.push({ path: rel, mode, type: "blob", sha: localSha });
    } else {
      toUpload.push({ rel, mode, buf });
    }
  }

  console.log(`[cloud-build] ${files.length} files (${treeEntries.length} unchanged reused, ${toUpload.length} to upload)...`);

  for (let i = 0; i < toUpload.length; i++) {
    const item = toUpload[i];
    const blob = await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({
        content: item.buf.toString("base64"),
        encoding: "base64",
      }),
    });
    treeEntries.push({
      path: item.rel,
      mode: item.mode,
      type: "blob",
      sha: blob.sha,
    });
    process.stdout.write(`.`);
    if (i + 1 < toUpload.length) await sleep(350);
  }
  if (toUpload.length > 0) console.log("");
  console.log(`[cloud-build] Creating Git tree & commit on ${branch}...`);

  const tree = await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ tree: treeEntries }),
  });

  const pushTimeIso = new Date().toISOString();
    const commit = await ghApi(token, `/repos/${owner}/${REPO_NAME}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: "Build Luyen Co Su iOS IPA & Android APK",
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
  const targets = [
    { artifactName: "LuyenCoSu-iOS-IPA", fileName: "LuyenCoSu.ipa", outPath: FINAL_IPA, label: "IPA (iOS)" },
    { artifactName: "LuyenCoSu-Android-APK", fileName: "LuyenCoSu.apk", outPath: FINAL_APK, label: "APK (Android)" },
  ];

  mkdirSync(BUILD_DIR, { recursive: true });
  for (const t of targets) {
    const artifact = (artRes.artifacts ?? []).find((a) => a.name === t.artifactName);
    if (!artifact) {
      throw new Error(`Build thành công nhưng không tìm thấy artifact ${t.artifactName}.`);
    }

    console.log(`[cloud-build] Downloading ${t.artifactName} (${artifact.size_in_bytes} bytes)...`);
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
      if (!redirectUrl) throw new Error(`Redirect không có Location header cho ${t.artifactName}.`);
      // Không gửi Authorization header sang Azure Blob Storage
      finalZipRes = await fetch(redirectUrl);
    }

    if (!finalZipRes.ok) {
      throw new Error(`Tải artifact ${t.artifactName} thất bại: HTTP ${finalZipRes.status}`);
    }

    const zipPath = join(BUILD_DIR, `${t.artifactName}.zip`);
    const arrayBuf = await finalZipRes.arrayBuffer();
    writeFileSync(zipPath, Buffer.from(arrayBuf));

    execFileSync("tar.exe", ["-xf", zipPath, "-C", BUILD_DIR], { stdio: "inherit" });
    const extracted = join(BUILD_DIR, t.fileName);
    if (!existsSync(extracted)) {
      throw new Error(`Đã giải nén nhưng không thấy ${extracted}`);
    }

    copyFileSync(extracted, t.outPath);
    const sizeMb = (statSync(t.outPath).size / (1024 * 1024)).toFixed(2);
    console.log(`[cloud-build] SUCCESS ${t.label}: ${t.outPath} (${sizeMb} MB)`);
  }
}

main().catch((err) => {
  console.error(`[cloud-ipa] ERROR: ${err.message}`);
  process.exit(1);
});
