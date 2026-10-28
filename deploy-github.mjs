// deploy-github.mjs
// สคริปต์อัปโหลดโปรเจกต์ขึ้น GitHub ด้วย Single Atomic Commit และเปิดใช้งาน GitHub Pages

import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';

const GH_PATH = fs.existsSync('C:\\Program Files\\GitHub CLI\\gh.exe')
  ? 'C:\\Program Files\\GitHub CLI\\gh.exe'
  : 'gh';

const REPO_NAME = 'meeting-room-booking';

function runGh(args, inputStr) {
  return execFileSync(GH_PATH, args, {
    encoding: 'utf-8',
    input: inputStr,
    stdio: inputStr ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
  }).trim();
}

function collectFiles(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.next' ||
      entry.name === 'out' ||
      entry.name === '.git' ||
      entry.name === 'package-lock.json' ||
      entry.name === '(dashboard)'
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

async function main() {
  let username = '';
  try {
    username = JSON.parse(runGh(['api', '/user'])).login;
  } catch {
    spawnSync(
      GH_PATH,
      ['auth', 'login', '--web', '-p', 'https', '-s', 'repo,workflow'],
      { stdio: 'inherit' }
    );
    username = JSON.parse(runGh(['api', '/user'])).login;
  }

  // ดึง SHA ล่าสุดของ branch main
  const refData = JSON.parse(
    runGh(['api', `/repos/${username}/${REPO_NAME}/git/ref/heads/main`])
  );
  const latestCommitSha = refData.object.sha;

  // สร้าง Tree เดียวที่มีทุกไฟล์ (Single Atomic Commit)
  const files = collectFiles(process.cwd());
  const treeItems = files.map((file) => ({
    path: file.relPath,
    mode: '100644',
    type: 'blob',
    content: fs.readFileSync(file.fullPath, 'utf-8'),
  }));

  const newTree = JSON.parse(
    runGh(
      ['api', '-X', 'POST', `/repos/${username}/${REPO_NAME}/git/trees`, '--input', '-'],
      JSON.stringify({ tree: treeItems })
    )
  );

  const newCommit = JSON.parse(
    runGh(
      ['api', '-X', 'POST', `/repos/${username}/${REPO_NAME}/git/commits`, '--input', '-'],
      JSON.stringify({
        message: 'Deploy full styled Next.js build to GitHub Pages',
        tree: newTree.sha,
        parents: [latestCommitSha],
      })
    )
  );

  runGh(
    [
      'api',
      '-X',
      'PATCH',
      `/repos/${username}/${REPO_NAME}/git/refs/heads/main`,
      '--input',
      '-',
    ],
    JSON.stringify({ sha: newCommit.sha, force: true })
  );

  console.log(`✅ Pushed single atomic commit: ${newCommit.sha}`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
