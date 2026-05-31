// Build script for production deployment
// Uses CommonJS for maximum compatibility across Node.js versions

const { execSync } = require('child_process');
const { cpSync, mkdirSync, existsSync, writeFileSync } = require('fs');
const { join } = require('path');

const root = __dirname;
const standaloneDir = join(root, '.next', 'standalone');

function run(cmd, label) {
  console.log(`\n[${label}] ${cmd}`);
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, DATABASE_URL: 'file:./db/custom.db' } });
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
run('npx prisma generate', '1/5 Prisma Generate');

// Step 2: Ensure database exists
mkdirSync(join(root, 'db'), { recursive: true });
run('npx prisma db push --skip-generate', '2/5 DB Schema Push');

// Step 3: Build Next.js
run('npx next build', '3/5 Next.js Build');

// Step 4: Copy assets to standalone output
console.log('\n[4/5] Copying assets...');
if (!existsSync(standaloneDir)) {
  console.error('ERROR: Standalone directory not found. Build may have failed.');
  process.exit(1);
}

// Copy static files
copyDir(join(root, '.next', 'static'), join(standaloneDir, '.next', 'static'));

// Copy public folder
copyDir(join(root, 'public'), join(standaloneDir, 'public'));

// Step 5: Copy Prisma files
console.log('[5/5] Copying Prisma files...');

// Copy schema
mkdirSync(join(standaloneDir, 'prisma'), { recursive: true });
cpSync(
  join(root, 'prisma', 'schema.prisma'),
  join(standaloneDir, 'prisma', 'schema.prisma')
);

// Copy generated Prisma client (includes engine binary)
const prismaClientDir = join(root, 'node_modules', '.prisma', 'client');
const standalonePrismaDir = join(standaloneDir, 'node_modules', '.prisma', 'client');
if (existsSync(prismaClientDir)) {
  mkdirSync(standalonePrismaDir, { recursive: true });
  copyDir(prismaClientDir, standalonePrismaDir);
  console.log('  Copied .prisma/client');
}

// Copy @prisma/client package
const prismaClientPkg = join(root, 'node_modules', '@prisma', 'client');
const standalonePrismaPkg = join(standaloneDir, 'node_modules', '@prisma', 'client');
if (existsSync(prismaClientPkg)) {
  mkdirSync(standalonePrismaPkg, { recursive: true });
  copyDir(prismaClientPkg, standalonePrismaPkg);
  console.log('  Copied @prisma/client');
}

// Copy database file
mkdirSync(join(standaloneDir, 'db'), { recursive: true });
if (existsSync(join(root, 'db', 'custom.db'))) {
  cpSync(join(root, 'db', 'custom.db'), join(standaloneDir, 'db', 'custom.db'));
  console.log('  Copied database');
}

// Write .env for production
writeFileSync(join(standaloneDir, '.env'), [
  'DATABASE_URL=file:./db/custom.db',
  'NODE_ENV=production',
].join('\n'));

console.log('\n=== Build Complete ===');
