import { pool } from '../src/db/pool';

async function seed() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT id, business_name FROM sellers WHERE business_name ILIKE '%arjun%' OR business_name ILIKE '%urban%' LIMIT 1`);
    let sellerId = res.rows[0]?.id;
    let sellerName = res.rows[0]?.business_name;

    if (!sellerId) {
      // Create a dummy seller if none exists
      console.log('No seller found matching arjun or urban. Creating one...');
      const insertRes = await client.query(
        `INSERT INTO sellers (business_name, email, phone, status) VALUES ('Arjun Store', 'arjun@example.com', '9999999999', 'active') RETURNING id`
      );
      sellerId = insertRes.rows[0].id;
      sellerName = 'Arjun Store';
    }

    console.log(`Using seller: ${sellerName} (${sellerId})`);

    // Insert dummy COD settlement batch
    await client.query(`
      INSERT INTO cod_remittances (
        seller_id, net_amount, status, due_date, payment_cycle, 
        gross_amount, wallet_due, credit_used, adjustments
      ) VALUES (
        $1, $2, $3, NOW(), 'D2',
        $4, $5, $6, $7
      )
    `, [
      sellerId,
      238000, // net_amount = 288000 - 50000
      'pending',
      288000, // gross
      0,      // wallet
      50000,  // credit
      0       // adj
    ]);

    console.log('Successfully inserted COD settlement batch for Arjun!');
  } catch (err) {
    console.error('Error inserting data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
