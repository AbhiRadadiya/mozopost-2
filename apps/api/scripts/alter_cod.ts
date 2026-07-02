import { pool } from '../src/db/pool';

async function up() {
  console.log('Starting migration to add net-off fields to cod_remittances...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add gross_amount, wallet_due, credit_used, adjustments
    await client.query(`
      ALTER TABLE cod_remittances
      ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS wallet_due NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS credit_used NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS adjustments NUMERIC(10,2) DEFAULT 0;
    `);

    // Backfill gross_amount with net_amount for existing rows where gross_amount might be 0
    await client.query(`
      UPDATE cod_remittances
      SET gross_amount = net_amount
      WHERE gross_amount = 0;
    `);

    await client.query('COMMIT');
    console.log('Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

up();
