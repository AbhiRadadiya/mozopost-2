import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

// ────────────────────────────────────────────────────────────────
// SELLER CREDIT ROUTES  (/api/v1/credit)
// ────────────────────────────────────────────────────────────────

export const creditRouter = Router();
creditRouter.use(requireAuth, requireRole('seller'));

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller account');
  return req.user!.sellerId;
}

/** GET /  — seller's credit status + utilization */
creditRouter.get(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const facility = await queryOne<any>(
      `SELECT cf.*,
              w.balance          AS wallet_balance,
              w.credit_outstanding,
              cf.credit_limit - w.credit_outstanding AS available_credit,
              CASE WHEN cf.credit_limit > 0
                   THEN ROUND((w.credit_outstanding / cf.credit_limit * 100)::numeric, 2)
                   ELSE 0
              END                AS utilization_pct
       FROM credit_facilities cf
       JOIN wallets w ON w.seller_id = cf.seller_id
       WHERE cf.seller_id = $1`,
      [sellerId],
    );

    // If no credit facility exists, still return wallet-only view
    if (!facility) {
      const wallet = await queryOne<any>(`SELECT * FROM wallets WHERE seller_id = $1`, [sellerId]);
      return res.json({
        hasCreditFacility: false,
        wallet: { balance: wallet?.balance ?? 0 },
        creditFacility: null,
      });
    }

    res.json({
      hasCreditFacility: true,
      wallet: {
        balance: parseFloat(facility.wallet_balance),
        creditOutstanding: parseFloat(facility.credit_outstanding),
      },
      creditFacility: {
        id: facility.id,
        creditLimit: parseFloat(facility.credit_limit),
        availableCredit: parseFloat(facility.available_credit),
        utilizationPct: parseFloat(facility.utilization_pct),
        status: facility.status,
        billingCycle: facility.billing_cycle,
        autoBlockAtLimit: facility.auto_block_at_limit,
        alertThresholdPct: facility.alert_threshold_pct,
        riskBand:
          parseFloat(facility.credit_outstanding) >= parseFloat(facility.credit_limit) ? 'exhausted'
          : parseFloat(facility.utilization_pct) >= facility.alert_threshold_pct ? 'near_limit'
          : 'ok',
      },
    });
  }),
);

/** GET /transactions  — credit transaction history */
creditRouter.get(
  '/transactions',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    const rows = await query(
      `SELECT ct.*, o.mozopost_order_id, o.awb_number
       FROM credit_transactions ct
       LEFT JOIN orders o ON o.id = ct.order_id
       WHERE ct.seller_id = $1
       ORDER BY ct.created_at DESC LIMIT $2`,
      [sellerId, limit],
    );
    res.json({ transactions: rows });
  }),
);

// ────────────────────────────────────────────────────────────────
// ADMIN CREDIT ROUTES  (/api/v1/admin/credit)
// ────────────────────────────────────────────────────────────────

export const adminCreditRouter = Router();
adminCreditRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

/** GET /  — all credit facilities with live utilization */
adminCreditRouter.get(
  '/',
  ah(async (_req, res) => {
    const rows = await query(
      `SELECT cf.*,
              s.business_name,
              u.email,
              w.balance          AS wallet_balance,
              w.credit_outstanding,
              cf.credit_limit - w.credit_outstanding AS available_credit,
              CASE WHEN cf.credit_limit > 0
                   THEN ROUND((w.credit_outstanding / cf.credit_limit * 100)::numeric, 2)
                   ELSE 0
              END                AS utilization_pct
       FROM credit_facilities cf
       JOIN sellers s ON s.id = cf.seller_id
       JOIN users   u ON u.id = s.user_id
       JOIN wallets w ON w.seller_id = cf.seller_id
       ORDER BY utilization_pct DESC`,
    );
    res.json({ creditFacilities: rows });
  }),
);

/** GET /stats  — platform-wide credit exposure dashboard */
adminCreditRouter.get(
  '/stats',
  ah(async (_req, res) => {
    const row = await queryOne<any>(
      `SELECT
         COUNT(*)                                                             AS total_merchants_with_credit,
         COALESCE(SUM(cf.credit_limit),0)::float                             AS total_credit_limit,
         COALESCE(SUM(w.credit_outstanding),0)::float                        AS total_outstanding,
         COALESCE(SUM(cf.credit_limit - w.credit_outstanding),0)::float      AS total_available,
         COUNT(*) FILTER (WHERE cf.status = 'frozen')                        AS frozen_count,
         COUNT(*) FILTER (WHERE w.credit_outstanding >= cf.credit_limit)     AS exhausted_count,
         COUNT(*) FILTER (
           WHERE cf.credit_limit > 0
           AND (w.credit_outstanding / cf.credit_limit) >= 0.8
           AND w.credit_outstanding < cf.credit_limit
         )                                                                    AS near_limit_count
       FROM credit_facilities cf
       JOIN wallets w ON w.seller_id = cf.seller_id
       WHERE cf.status != 'removed'`,
    );
    res.json({ stats: row });
  }),
);

const assignCreditSchema = z.object({
  sellerId: z.string().uuid(),
  creditLimit: z.number().positive(),
  billingCycle: z.enum(['daily', 'D1', 'D2', 'weekly', 'fortnightly', 'monthly']).default('D2'),
  autoBlockAtLimit: z.boolean().default(true),
  alertThresholdPct: z.number().min(1).max(100).default(80),
});

/** POST /assign  — admin assigns credit to a merchant */
adminCreditRouter.post(
  '/assign',
  ah(async (req: AuthedRequest, res) => {
    const dto = assignCreditSchema.parse(req.body);
    const row = await queryOne(
      `INSERT INTO credit_facilities
         (seller_id, credit_limit, billing_cycle, auto_block_at_limit, alert_threshold_pct, assigned_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (seller_id) DO UPDATE SET
         credit_limit = EXCLUDED.credit_limit,
         billing_cycle = EXCLUDED.billing_cycle,
         auto_block_at_limit = EXCLUDED.auto_block_at_limit,
         alert_threshold_pct = EXCLUDED.alert_threshold_pct,
         status = 'active',
         assigned_by = EXCLUDED.assigned_by,
         updated_at = NOW()
       RETURNING *`,
      [dto.sellerId, dto.creditLimit, dto.billingCycle, dto.autoBlockAtLimit, dto.alertThresholdPct, req.user!.sub],
    );
    res.status(201).json({ creditFacility: row, message: `Credit facility of ₹${dto.creditLimit} assigned` });
  }),
);

/** PATCH /:id/limit  — change credit limit */
adminCreditRouter.patch(
  '/:id/limit',
  ah(async (req: AuthedRequest, res) => {
    const { creditLimit } = req.body;
    if (!creditLimit || creditLimit < 0) throw new ApiError(400, 'creditLimit must be >= 0');
    await query(`UPDATE credit_facilities SET credit_limit = $1, updated_at = NOW() WHERE id = $2`, [creditLimit, req.params.id]);
    res.json({ message: `Credit limit updated to ₹${creditLimit}` });
  }),
);

const creditStatusSchema = z.object({
  action: z.enum(['freeze', 'unfreeze', 'remove']),
  reason: z.string().max(500).optional(),
});

/** PATCH /:id/status  — freeze, unfreeze, or remove credit */
adminCreditRouter.patch(
  '/:id/status',
  ah(async (req: AuthedRequest, res) => {
    const dto = creditStatusSchema.parse(req.body);
    const statusMap = { freeze: 'frozen', unfreeze: 'active', remove: 'removed' } as const;
    await query(
      `UPDATE credit_facilities SET status = $1, updated_at = NOW() WHERE id = $2`,
      [statusMap[dto.action], req.params.id],
    );
    res.json({ message: `Credit facility ${dto.action}d` });
  }),
);

/**
 * POST /:id/recover-from-cod
 * Admin triggers COD recovery — deducts outstanding credit from
 * an incoming COD settlement and releases the remainder to the merchant.
 */
adminCreditRouter.post(
  '/:id/recover-from-cod',
  ah(async (req: AuthedRequest, res) => {
    const { codSettlementAmount } = req.body;
    if (!codSettlementAmount || codSettlementAmount <= 0) throw new ApiError(400, 'codSettlementAmount must be > 0');

    const facility = await queryOne<any>(
      `SELECT cf.*, w.id AS wallet_id, w.balance, w.credit_outstanding
       FROM credit_facilities cf
       JOIN wallets w ON w.seller_id = cf.seller_id
       WHERE cf.id = $1`,
      [req.params.id],
    );
    if (!facility) throw new ApiError(404, 'Credit facility not found');

    const outstanding = parseFloat(facility.credit_outstanding);
    const settlement  = parseFloat(codSettlementAmount);
    const recover     = Math.min(outstanding, settlement);
    const release     = settlement - recover;

    await withTransaction(async (client) => {
      const balBefore = parseFloat(facility.balance);
      const balAfter  = balBefore + release;
      const newOutstanding = outstanding - recover;

      await client.query(`UPDATE wallets SET balance = $1, credit_outstanding = $2 WHERE id = $3`, [
        balAfter, newOutstanding, facility.wallet_id,
      ]);

      if (recover > 0) {
        await client.query(
          `INSERT INTO credit_transactions
             (credit_facility_id, seller_id, type, amount, outstanding_before, outstanding_after, description)
           VALUES ($1,$2,'cod_recovered',$3,$4,$5,$6)`,
          [facility.id, facility.seller_id, recover, outstanding, newOutstanding,
           `Auto-recovered ₹${recover.toFixed(2)} from COD settlement of ₹${settlement.toFixed(2)}`],
        );
        await client.query(
          `INSERT INTO wallet_transactions
             (wallet_id, type, amount, balance_before, balance_after, description)
           VALUES ($1,'credit_cod_recovered',$2,$3,$4,$5)`,
          [facility.wallet_id, release, balBefore, balAfter,
           `COD settlement ₹${settlement.toFixed(2)} — credit recovered ₹${recover.toFixed(2)}, released ₹${release.toFixed(2)}`],
        );
      }
    });

    res.json({
      message: `COD recovery complete`,
      recovered: recover,
      releasedToMerchant: release,
      newOutstanding: outstanding - recover,
    });
  }),
);
