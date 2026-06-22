#!/usr/bin/env node
/**
 * Applies all SQL files in packages/db/migrations/ in filename order.
 * Usage: npm run db:migrate
 * Safe to re-run — all migration SQL is idempotent.
 */
const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[trimmed.slice(0, idx).trim()] = val;
  });
  return env;
}

async function main() {
  const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
  const env = { ...loadEnv(envPath), ...process.env };
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes('CHANGE_ME')) {
    console.error('❌ DATABASE_URL not set. Run npm run db:push first.');
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No migration files found.');
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Applying ${file}...`);
    await client.query(sql);
    console.log(`  ✓ Done`);
  }

  console.log(`\n✅ ${files.length} migration(s) applied.`);
  await client.end();
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
