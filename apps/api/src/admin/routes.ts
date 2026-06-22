import { Router } from 'express';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';
import { isCourierLive } from '../config/env';

// ════════════════════════════════════════════════════════════
// COURIERS — accessible to authenticated sellers (read-only list)
// ════════════════════════════════════════════════════════════
export const couriersRouter = Router();
couriersRouter.use(requireAuth);

couriersRouter.get(
  '/',
  ah(async (req: AuthedRequest, res) => {
    let rows;
    if (req.user!.role === 'seller' && req.user!.sellerId) {
      rows = await query(
        `SELECT c.*, mca.is_enabled, mca.priority as merchant_priority
         FROM couriers c
         LEFT JOIN merchant_courier_access mca ON mca.courier_id = c.id AND mca.seller_id = $1
         ORDER BY c.priority DESC`,
        [req.user!.sellerId],
      );
    } else {
      rows = await query(`SELECT * FROM couriers ORDER BY priority DESC`);
    }
    const withLiveFlag = rows.map((r: any) => ({ ...r, isLive: isCourierLive(r.code) }));
    res.json({ couriers: withLiveFlag });
  }),
);

// ════════════════════════════════════════════════════════════
// MASTER ADMIN — merchant management, margins, wallet control, COD
// ════════════════════════════════════════════════════════════
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

adminRouter.get(
  '/merchants',
  ah(async (req, res) => {
    const rows = await query(
      `SELECT s.id, s.business_name, s.gstin, u.email, u.status, u.kyc_status,
              w.balance as wallet_balance,
              (SELECT COUNT(*) FROM orders o WHERE o.seller_id = s.id) as order_count
       FROM sellers s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN wallets w ON w.seller_id = s.id
       ORDER BY s.created_at DESC`,
    );
    res.json({ merchants: rows });
  }),
);

adminRouter.patch(
  '/merchants/:sellerId/status',
  ah(async (req, res) => {
    const { status } = req.body; // 'active' | 'suspended'
    const seller = await queryOne<{ user_id: string }>(`SELECT user_id FROM sellers WHERE id = $1`, [req.params.sellerId]);
    if (!seller) throw new ApiError(404, 'Merchant not found');
    await query(`UPDATE users SET status = $1 WHERE id = $2`, [status, seller.user_id]);
    res.json({ message: `Merchant status updated to ${status}` });
  }),
);

adminRouter.patch(
  '/merchants/:sellerId/kyc',
  ah(async (req, res) => {
    const { kycStatus } = req.body; // 'verified' | 'rejected'
    const seller = await queryOne<{ user_id: string }>(`SELECT user_id FROM sellers WHERE id = $1`, [req.params.sellerId]);
    if (!seller) throw new ApiError(404, 'Merchant not found');
    const newUserStatus = kycStatus === 'verified' ? 'active' : 'pending_kyc';
    await query(`UPDATE users SET kyc_status = $1, status = $2 WHERE id = $3`, [kycStatus, newUserStatus, seller.user_id]);
    res.json({ message: `KYC ${kycStatus}` });
  }),
);

adminRouter.post(
  '/wallets/:sellerId/adjust',
  ah(async (req: AuthedRequest, res) => {
    const { amount, type, reason } = req.body; // type: 'credit' | 'debit'
    if (!amount || amount <= 0) throw new ApiError(400, 'amount must be positive');

    await withTransaction(async (client) => {
      const w = await client.query(`SELECT id, balance FROM wallets WHERE seller_id = $1`, [req.params.sellerId]);
      if (!w.rows[0]) throw new ApiError(404, 'Wallet not found');
      const before = parseFloat(w.rows[0].balance);
      const after = type === 'credit' ? before + amount : before - amount;
      await client.query(`UPDATE wallets SET balance = $1 WHERE id = $2`, [after, w.rows[0].id]);
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, description)
         VALUES ($1,'adjustment',$2,$3,$4,$5)`,
        [w.rows[0].id, type === 'credit' ? amount : -amount, before, after, reason || `Manual ${type} by admin`],
      );
    });

    res.json({ message: 'Wallet adjusted' });
  }),
);

adminRouter.get(
  '/margins',
  ah(async (req, res) => {
    const rows = await query(
      `SELECT m.*, c.name as courier_name, c.code as courier_code, s.business_name
       FROM margin_settings m
       LEFT JOIN couriers c ON c.id = m.courier_id
       LEFT JOIN sellers s ON s.id = m.seller_id
       ORDER BY m.created_at DESC`,
    );
    res.json({ margins: rows });
  }),
);

adminRouter.post(
  '/margins',
  ah(async (req, res) => {
    const { sellerId, courierId, marginType, marginValue } = req.body;
    const row = await queryOne(
      `INSERT INTO margin_settings (seller_id, courier_id, margin_type, margin_value)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [sellerId || null, courierId || null, marginType, marginValue],
    );
    res.status(201).json({ margin: row });
  }),
);

adminRouter.get(
  '/cod-settlements',
  ah(async (req, res) => {
    const rows = await query(
      `SELECT cr.*, s.business_name FROM cod_remittances cr
       JOIN sellers s ON s.id = cr.seller_id
       ORDER BY cr.created_at DESC`,
    );
    res.json({ settlements: rows });
  }),
);

adminRouter.patch(
  '/cod-settlements/:id/release',
  ah(async (req, res) => {
    await query(`UPDATE cod_remittances SET status = 'settled', settled_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ message: 'COD settlement released' });
  }),
);

adminRouter.get(
  '/analytics/overview',
  ah(async (req, res) => {
    const stats = await queryOne(
      `SELECT
        (SELECT COUNT(*) FROM sellers) as total_merchants,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(total_freight),0)::float FROM orders) as total_revenue,
        (SELECT COALESCE(SUM(margin_applied),0)::float FROM orders) as total_margin,
        (SELECT COUNT(*) FROM orders WHERE status = 'delivered') as total_delivered,
        (SELECT COUNT(*) FROM orders WHERE status LIKE 'rto%') as total_rto`,
    );
    res.json(stats);
  }),
);

// ════════════════════════════════════════════════════════════
// SUPER ADMIN — courier credentials, rate cards, global settings
// ════════════════════════════════════════════════════════════
export const superAdminRouter = Router();
superAdminRouter.use(requireAuth, requireRole('super_admin'));

superAdminRouter.get(
  '/global-settings',
  ah(async (req, res) => {
    const rows = await query(`SELECT * FROM global_settings ORDER BY key`);
    res.json({ settings: rows });
  }),
);

superAdminRouter.patch(
  '/global-settings/:key',
  ah(async (req, res) => {
    await query(
      `INSERT INTO global_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [req.params.key, JSON.stringify(req.body.value)],
    );
    res.json({ message: 'Setting updated' });
  }),
);

superAdminRouter.get(
  '/rate-cards',
  ah(async (req, res) => {
    const rows = await query(
      `SELECT rc.*, c.name as courier_name, c.code as courier_code
       FROM rate_cards rc JOIN couriers c ON c.id = rc.courier_id
       ORDER BY c.priority DESC`,
    );
    res.json({ rateCards: rows });
  }),
);

superAdminRouter.put(
  '/rate-cards/:id',
  ah(async (req, res) => {
    const { baseRate, additionalRatePerKg, codChargeFixed, codChargePct } = req.body;
    await query(
      `UPDATE rate_cards SET base_rate=$1, additional_rate_per_kg=$2, cod_charge_fixed=$3, cod_charge_pct=$4 WHERE id=$5`,
      [baseRate, additionalRatePerKg, codChargeFixed, codChargePct, req.params.id],
    );
    res.json({ message: 'Rate card updated' });
  }),
);

superAdminRouter.patch(
  '/couriers/:id/status',
  ah(async (req, res) => {
    await query(`UPDATE couriers SET status = $1 WHERE id = $2`, [req.body.status, req.params.id]);
    res.json({ message: 'Courier status updated' });
  }),
);
