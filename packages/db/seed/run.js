#!/usr/bin/env node
/**
 * Seeds demo login accounts so you can log in immediately after deploy.
 * Usage: npm run db:seed
 *
 * Creates:
 *   seller@demo.com       / Demo@1234   (Seller — "Arjun Textiles")
 *   admin@demo.com        / Demo@1234   (Master Admin)
 *   superadmin@demo.com   / Demo@1234   (Super Admin)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
}

async function main() {
  const envPath = path.join(__dirname, '..', '..', '..', 'apps', 'api', '.env');
  const env = { ...loadEnv(envPath), ...process.env };
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes('CHANGE_ME')) {
    console.error('❌ DATABASE_URL not set. Run npm run db:push first.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  const passwordHash = await bcrypt.hash('Demo@1234', 10);

  const tenant = await client.query(`SELECT id FROM tenants WHERE slug='mozopost' LIMIT 1`);
  const tenantId = tenant.rows[0].id;

  // ── Seller account ──
  let r = await client.query(
    `INSERT INTO users (tenant_id,email,phone,password_hash,first_name,last_name,role,status,kyc_status,email_verified)
     VALUES ($1,'seller@demo.com','9876543210',$2,'Arjun','Mehta','seller','active','verified',true)
     ON CONFLICT (email) DO UPDATE SET password_hash=$2 RETURNING id`,
    [tenantId, passwordHash],
  );
  const sellerUserId = r.rows[0].id;

  r = await client.query(
    `INSERT INTO sellers (user_id,business_name,business_type,gstin)
     VALUES ($1,'Arjun Textiles Pvt Ltd','D2C Brand','24AAAAA0000A1Z5')
     ON CONFLICT (user_id) DO UPDATE SET business_name=EXCLUDED.business_name RETURNING id`,
    [sellerUserId],
  );
  const sellerId = r.rows[0].id;

  await client.query(
    `INSERT INTO warehouses (seller_id,name,contact_name,contact_phone,address_line1,city,state,pincode,is_default)
     SELECT $1,'Surat Warehouse','Ramesh Patel','9876500000','Plot 14, GIDC, Sachin','Surat','Gujarat','394230',true
     WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE seller_id=$1)`,
    [sellerId],
  );

  await client.query(
    `INSERT INTO wallets (seller_id, balance) VALUES ($1, 5000)
     ON CONFLICT (seller_id) DO NOTHING`,
    [sellerId],
  );

  // Enable all couriers for the demo seller
  await client.query(
    `INSERT INTO merchant_courier_access (seller_id, courier_id, is_enabled, priority)
     SELECT $1, id, true, priority FROM couriers
     ON CONFLICT (seller_id, courier_id) DO NOTHING`,
    [sellerId],
  );

  // ── Master admin account ──
  await client.query(
    `INSERT INTO users (tenant_id,email,phone,password_hash,first_name,last_name,role,status,email_verified)
     VALUES ($1,'admin@demo.com','9876500001',$2,'Rajesh','Kumar','master_admin','active',true)
     ON CONFLICT (email) DO UPDATE SET password_hash=$2`,
    [tenantId, passwordHash],
  );

  // ── Super admin account ──
  await client.query(
    `INSERT INTO users (tenant_id,email,phone,password_hash,first_name,last_name,role,status,email_verified)
     VALUES ($1,'superadmin@demo.com','9876500002',$2,'Super','Admin','super_admin','active',true)
     ON CONFLICT (email) DO UPDATE SET password_hash=$2`,
    [tenantId, passwordHash],
  );

  console.log('✅ Seed complete. Demo logins (password for all: Demo@1234):');
  console.log('   Seller:       seller@demo.com');
  console.log('   Master Admin: admin@demo.com');
  console.log('   Super Admin:  superadmin@demo.com');

  await client.end();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
