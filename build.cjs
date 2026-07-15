// Build script for production deployment
const { execSync } = require('child_process');
const { cpSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const root = __dirname;
const standaloneDir = join(root, '.next', 'standalone');

function run(cmd, label) {
  console.log(`\n[${label}] ${cmd}`);
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit' });
  } catch (err) {
    console.error(`[${label}] FAILED:`, err.message);
    process.exit(1);
  }
}

function copyDir(src, dest) {
  try {
    cpSync(src, dest, { recursive: true });
  } catch (err) {
    console.warn(`Warning: Could not copy ${src} -> ${dest}:`, err.message);
  }
}

console.log('=== Building Sri Krishna Mobiles Bill Generator ===');

// Step 1: Generate Prisma client
run('npx prisma generate', '1/3 Prisma Generate');

// Step 2: Build Next.js
run('npx next build', '2/3 Next.js Build');

// Step 3: Copy assets to standalone output
console.log('\n[3/3] Copying assets...');
if (existsSync(standaloneDir)) {
  copyDir(join(root, '.next', 'static'), join(standaloneDir, '.next', 'static'));
  copyDir(join(root, 'public'), join(standaloneDir, 'public'));
  console.log('  Copied static and public assets');
} else {
  console.log('  Standalone directory not found, skipping copy');
}

console.log('\n=== Build Complete ===');
