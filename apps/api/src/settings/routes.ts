import { Router } from 'express';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole('seller'));

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller');
  return req.user!.sellerId;
}

// ─────────────────────────────────────────────────────────────────
// GET Settings
// ─────────────────────────────────────────────────────────────────
settingsRouter.get('/', ah(async (req: AuthedRequest, res) => {
  const sellerId = sellerIdOf(req);
  const userId = req.user!.id;

  const user = await queryOne(`SELECT first_name || ' ' || COALESCE(last_name, '') AS name, email, phone AS phone_number FROM users WHERE id=$1`, [userId]);
  const seller = await queryOne(`SELECT business_name, business_type, gstin, pan, bank_account_name, bank_account_number, bank_ifsc, auto_allocate_courier FROM sellers WHERE id=$1`, [sellerId]);

  const couriersRes = await query(
    `SELECT c.id, c.name, c.code, COALESCE(mca.priority, c.priority) AS priority, 
            COALESCE(mca.is_enabled, true) AS is_enabled
     FROM couriers c
     LEFT JOIN merchant_courier_access mca ON mca.courier_id = c.id AND mca.seller_id = $1
     ORDER BY priority ASC, c.name ASC`,
    [sellerId]
  );

  res.json({
    profile: {
      name: user?.name,
      email: user?.email,
      phone_number: user?.phone_number,
      business_name: seller?.business_name,
      business_type: seller?.business_type,
      gstin: seller?.gstin,
      pan: seller?.pan,
    },
    billing: {
      bank_account_name: seller?.bank_account_name,
      bank_account_number: seller?.bank_account_number,
      bank_ifsc: seller?.bank_ifsc,
    },
    couriers: couriersRes,
    auto_allocate_courier: seller?.auto_allocate_courier,
  });
}));

// ─────────────────────────────────────────────────────────────────
// PATCH Profile
// ─────────────────────────────────────────────────────────────────
settingsRouter.patch('/profile', ah(async (req: AuthedRequest, res) => {
  const sellerId = sellerIdOf(req);
  const userId = req.user!.id;
  const { name, phone_number, business_name, business_type, gstin, pan } = req.body;

  if (name !== undefined || phone_number !== undefined) {
    const userFields = [];
    const userParams = [];
    if (name !== undefined) { 
      const parts = name.split(' ');
      userParams.push(parts[0] || ''); userFields.push(`first_name=$${userParams.length}`); 
      userParams.push(parts.slice(1).join(' ')); userFields.push(`last_name=$${userParams.length}`); 
    }
    if (phone_number !== undefined) { userParams.push(phone_number); userFields.push(`phone=$${userParams.length}`); }
    if (userFields.length) {
      userParams.push(userId);
      await query(`UPDATE users SET ${userFields.join(', ')} WHERE id=$${userParams.length}`, userParams);
    }
  }

  if (business_name !== undefined || business_type !== undefined || gstin !== undefined || pan !== undefined) {
    const sellerFields = [];
    const sellerParams = [];
    if (business_name !== undefined) { sellerParams.push(business_name); sellerFields.push(`business_name=$${sellerParams.length}`); }
    if (business_type !== undefined) { sellerParams.push(business_type); sellerFields.push(`business_type=$${sellerParams.length}`); }
    if (gstin !== undefined) { sellerParams.push(gstin); sellerFields.push(`gstin=$${sellerParams.length}`); }
    if (pan !== undefined) { sellerParams.push(pan); sellerFields.push(`pan=$${sellerParams.length}`); }
    if (sellerFields.length) {
      sellerParams.push(sellerId);
      await query(`UPDATE sellers SET ${sellerFields.join(', ')} WHERE id=$${sellerParams.length}`, sellerParams);
    }
  }

  res.json({ message: 'Profile updated' });
}));

// ─────────────────────────────────────────────────────────────────
// PATCH Billing
// ─────────────────────────────────────────────────────────────────
settingsRouter.patch('/billing', ah(async (req: AuthedRequest, res) => {
  const sellerId = sellerIdOf(req);
  const { bank_account_name, bank_account_number, bank_ifsc } = req.body;

  const fields = [];
  const params = [];
  if (bank_account_name !== undefined) { params.push(bank_account_name); fields.push(`bank_account_name=$${params.length}`); }
  if (bank_account_number !== undefined) { params.push(bank_account_number); fields.push(`bank_account_number=$${params.length}`); }
  if (bank_ifsc !== undefined) { params.push(bank_ifsc); fields.push(`bank_ifsc=$${params.length}`); }
  
  if (fields.length) {
    params.push(sellerId);
    await query(`UPDATE sellers SET ${fields.join(', ')} WHERE id=$${params.length}`, params);
  }

  res.json({ message: 'Billing details updated' });
}));

// ─────────────────────────────────────────────────────────────────
// PATCH Couriers
// ─────────────────────────────────────────────────────────────────
settingsRouter.patch('/couriers', ah(async (req: AuthedRequest, res) => {
  const sellerId = sellerIdOf(req);
  const { auto_allocate_courier, priorities } = req.body; // priorities: [{ courier_id, priority }]

  if (auto_allocate_courier !== undefined) {
    await query(`UPDATE sellers SET auto_allocate_courier=$1 WHERE id=$2`, [auto_allocate_courier, sellerId]);
  }

  if (Array.isArray(priorities)) {
    for (const p of priorities) {
      // Upsert into merchant_courier_access
      await query(
        `INSERT INTO merchant_courier_access (seller_id, courier_id, priority, is_enabled)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (seller_id, courier_id) DO UPDATE SET priority = EXCLUDED.priority`,
        [sellerId, p.courier_id, p.priority]
      );
    }
  }

  res.json({ message: 'Courier priorities updated' });
}));
