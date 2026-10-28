// deploy-github.mjs
// สคริปต์อัปโหลดโปรเจกต์ขึ้น GitHub และเปิดใช้งาน GitHub Pages อัตโนมัติ (ไม่ต้องง้อ git.exe)

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
      entry.name === 'package-lock.json'
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
  console.log('====================================================');
  console.log('🚀 ระบบอัปโหลดและโฮสต์เว็บขึ้น GitHub Pages อัตโนมัติ');
  console.log('====================================================\n');

  // 1. ตรวจสอบการล็อกอิน GitHub
  let username = '';
  try {
    const userJson = runGh(['api', '/user']);
    username = JSON.parse(userJson).login;
    console.log(`✅ ล็อกอินบัญชี GitHub เรียบร้อยในชื่อ: ${username}`);
  } catch {
    console.log('🔐 กรุณาล็อกอินเข้าสู่ระบบ GitHub ในเบราว์เซอร์...');
    spawnSync(
      GH_PATH,
      ['auth', 'login', '--web', '-p', 'https', '-s', 'repo,workflow'],
      { stdio: 'inherit' }
    );
    const userJson = runGh(['api', '/user']);
    username = JSON.parse(userJson).login;
    console.log(`✅ ล็อกอินสำเร็จในชื่อ: ${username}`);
  }

  // 2. สร้าง Repository บน GitHub (ถ้ายังไม่มี)
  console.log(`\n📦 กำลังเตรียม Repository "${username}/${REPO_NAME}"...`);
  try {
    runGh(['api', `/repos/${username}/${REPO_NAME}`]);
    console.log('   -> พบ Repository เดิมอยู่แล้ว');
  } catch {
    runGh(
      ['api', '-X', 'POST', '/user/repos', '--input', '-'],
      JSON.stringify({
        name: REPO_NAME,
        description: 'Smart Meeting Room Booking System (Next.js + Tailwind + Google Sheets Sync)',
        private: false,
        auto_init: true,
      })
    );
    console.log('   -> สร้าง Repository ใหม่พร้อมเริ่มต้น branch main สำเร็จ!');
    await new Promise((r) => setTimeout(r, 2500));
  }

  // 3. อัปโหลดไฟล์ทั้งหมดในโปรเจกต์ขึ้น GitHub (เอาไฟล์ workflow ไว้ท้ายสุดเพื่อให้บิลด์เมื่อไฟล์ครบแล้ว)
  const files = collectFiles(process.cwd()).sort((a, b) => {
    if (a.relPath.startsWith('.github/')) return 1;
    if (b.relPath.startsWith('.github/')) return -1;
    return a.relPath.localeCompare(b.relPath);
  });
  console.log(`\n☁️  กำลังอัปโหลดไฟล์โค้ดทั้งหมด (${files.length} ไฟล์) ขึ้น GitHub...`);

  for (const file of files) {
    const contentBase64 = fs.readFileSync(file.fullPath).toString('base64');
    let existingSha = undefined;

    try {
      const existing = JSON.parse(
        runGh(['api', `/repos/${username}/${REPO_NAME}/contents/${file.relPath}`])
      );
      existingSha = existing.sha;
    } catch {
      // ไฟล์ใหม่
    }

    const payload = {
      message: `Deploy ${file.relPath}`,
      content: contentBase64,
      ...(existingSha ? { sha: existingSha } : {}),
    };

    runGh(
      [
        'api',
        '-X',
        'PUT',
        `/repos/${username}/${REPO_NAME}/contents/${file.relPath}`,
        '--input',
        '-',
      ],
      JSON.stringify(payload)
    );
    console.log(`   ✔ อัปโหลดแล้ว: ${file.relPath}`);
  }

  // 4. เปิดใช้งาน GitHub Pages ให้รันผ่าน GitHub Actions
  console.log('\n🌐 กำลังเปิดใช้งาน GitHub Pages Hosting...');
  try {
    runGh(
      ['api', '-X', 'POST', `/repos/${username}/${REPO_NAME}/pages`, '--input', '-'],
      JSON.stringify({ build_type: 'workflow' })
    );
  } catch {
    try {
      runGh(
        ['api', '-X', 'PUT', `/repos/${username}/${REPO_NAME}/pages`, '--input', '-'],
        JSON.stringify({ build_type: 'workflow' })
      );
    } catch {
      // เปิดอยู่แล้ว
    }
  }

  // สั่ง Trigger GitHub Actions Workflow ทันที
  try {
    runGh([
      'api',
      '-X',
      'POST',
      `/repos/${username}/${REPO_NAME}/actions/workflows/deploy.yml/dispatches`,
      '--input',
      '-',
    ], JSON.stringify({ ref: 'main' }));
  } catch {
    // Workflow ถูก Trigger อัตโนมัติจากตอน Push แล้ว
  }

  console.log('\n====================================================');
  console.log('🎉 อัปโหลดและสั่ง Deploy ขึ้น GitHub Pages สำเร็จเรียบร้อย!');
  console.log(`🔗 โค้ดบน GitHub: https://github.com/${username}/${REPO_NAME}`);
  console.log(`🌍 ลิงก์หน้าเว็บของคุณ: https://${username}.github.io/${REPO_NAME}/`);
  console.log('   (รอ GitHub Actions บิลด์ประมาณ 1-2 นาที เว็บจะออนไลน์ทันที)');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('❌ เกิดข้อผิดพลาด:', err.message);
  process.exit(1);
});
