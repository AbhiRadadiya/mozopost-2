#!/usr/bin/env node
/**
 * Applies packages/db/schema.sql to the database at DATABASE_URL.
 * Usage: npm run db:push
 * Reads DATABASE_URL from apps/api/.env
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load .env from apps/api manually (no dependency needed for this script)
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
}

async function main() {
  const envPath = path.join(__dirname, '..', '..', 'apps', 'api', '.env');
  const env = { ...loadEnv(envPath), ...process.env };
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes('CHANGE_ME')) {
    console.error('\n❌ DATABASE_URL is not set.');
    console.error('   1. Copy apps/api/.env.example to apps/api/.env');
    console.error('   2. Set DATABASE_URL to your PostgreSQL connection string');
    console.error('   3. Run npm run db:push again\n');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });

  console.log('🔌 Connecting to database...');
  await client.connect();

  console.log('📐 Applying schema (tables, enums, seed data)...');
  await client.query(schema);

  console.log('✅ Schema applied successfully.');
  await client.end();
}

main().catch((err) => {
  console.error('\n❌ Failed to apply schema:\n', err.message);
  process.exit(1);
});
