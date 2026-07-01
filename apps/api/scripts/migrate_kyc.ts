import { pool } from '../src/db/pool';

async function migrate() {
  console.log('Starting KYC migration...');
  
  try {
    // Check if columns exist, if not add them
    await pool.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS payment_cycle VARCHAR(50) DEFAULT 'Weekly',
      ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_recover_cod BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS account_manager_id UUID NULL,
      ADD COLUMN IF NOT EXISTS sales_manager_id UUID NULL;
    `);
    console.log('Successfully added columns to sellers table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
