import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

// ── SELLER REFERRAL ROUTES (/api/v1/referrals) ─────────────────
export const referralRouter = Router();
referralRouter.use(requireAuth, requireRole('seller'));

function sellerIdOf(req: AuthedRequest) {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller');
  return req.user!.sellerId;
}

/** GET /  — get own referral info + summary */
referralRouter.get('/', ah(async (req: AuthedRequest, res) => {
  const sellerId = sellerIdOf(req);
  const referral = await queryOne<any>(
    `SELECT r.*, COUNT(rt.id)::int AS total_transactions,
            COALESCE(SUM(rt.commission) FILTER (WHERE rt.status='paid'),0)::float AS paid_out
     FROM referrals r
     LEFT JOIN referral_transactions rt ON rt.referral_id = r.id
     WHERE r.referrer_id = $1
     GROUP BY r.id`,
    [sellerId],
  );

  if (!referral) {
    // Auto-create referral code on first visit
    const code = 'MZP' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const newRef = await queryOne(
      `INSERT INTO referrals (referrer_id, referral_code) VALUES ($1, $2)
       ON CONFLICT (referral_code) DO UPDATE SET referrer_id=$1 RETURNING *`,
      [sellerId, code],
    );
    return res.json({ referral: newRef, transactions: [], totalEarned: 0, pendingPayout: 0 });
  }

  const transactions = await query(
    `SELECT rt.*, o.mozopost_order_id FROM referral_transactions rt LEFT JOIN orders o ON o.id=rt.order_id WHERE rt.referral_id=$1 ORDER BY rt.created_at DESC LIMIT 50`,
    [referral.id],
  );

  res.json({
    referral,
    transactions,
    totalEarned: parseFloat(referral.total_commission),
    pendingPayout: parseFloat(referral.total_commission) - parseFloat(referral.paid_commission),
  });
}));

// ── ADMIN REFERRAL ROUTES (/api/v1/admin/referrals) ────────────
export const adminReferralRouter = Router();
adminReferralRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

/** GET /  — all referrals with stats */
adminReferralRouter.get('/', ah(async (req, res) => {
  const page  = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(50, parseInt((req.query.limit as string) || '20', 10));
  const total = parseInt((await queryOne<any>(`SELECT COUNT(*)::text as c FROM referrals`))?.c || '0', 10);
  const rows = await query(
    `SELECT r.*, s_referrer.business_name AS referrer_name,
            s_referred.business_name AS referred_name,
            u_referrer.email AS referrer_email
     FROM referrals r
     JOIN sellers s_referrer ON s_referrer.id = r.referrer_id
     JOIN users   u_referrer ON u_referrer.id = s_referrer.user_id
     LEFT JOIN sellers s_referred ON s_referred.id = r.referred_id
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit],
  );
  res.json({ referrals: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}));

/** GET /stats  — platform referral summary */
adminReferralRouter.get('/stats', ah(async (_req, res) => {
  res.json({
    stats: await queryOne(
      `SELECT COUNT(*) AS total_referrals,
              COUNT(*) FILTER (WHERE status='active') AS active,
              COUNT(*) FILTER (WHERE status='pending') AS pending,
              COALESCE(SUM(total_commission),0)::float AS total_commission_earned,
              COALESCE(SUM(paid_commission),0)::float AS total_paid_out,
              COALESCE(SUM(total_commission) - SUM(paid_commission),0)::float AS pending_payout
       FROM referrals`,
    ),
  });
}));

const commissionSchema = z.object({ commissionPct: z.number().min(0).max(50) });

/** PATCH /:id/commission  — update commission % for a referral */
adminReferralRouter.patch('/:id/commission', ah(async (req, res) => {
  const dto = commissionSchema.parse(req.body);
  await query(`UPDATE referrals SET commission_pct=$1, updated_at=NOW() WHERE id=$2`, [dto.commissionPct, req.params.id]);
  res.json({ message: `Commission updated to ${dto.commissionPct}%` });
}));

/** POST /:id/payout  — mark commission as paid */
adminReferralRouter.post('/:id/payout', ah(async (req, res) => {
  const referral = await queryOne<any>(`SELECT * FROM referrals WHERE id=$1`, [req.params.id]);
  if (!referral) throw new ApiError(404, 'Referral not found');
  const pendingAmt = parseFloat(referral.total_commission) - parseFloat(referral.paid_commission);
  if (pendingAmt <= 0) throw new ApiError(422, 'No pending commission to pay');

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE referrals SET paid_commission = total_commission, status='paid', updated_at=NOW() WHERE id=$1`,
      [referral.id],
    );
    await client.query(
      `UPDATE referral_transactions SET status='paid', paid_at=NOW() WHERE referral_id=$1 AND status='pending'`,
      [referral.id],
    );
    // Credit to referrer wallet
    const w = (await client.query(`SELECT id, balance FROM wallets WHERE seller_id=$1`, [referral.referrer_id])).rows[0];
    if (w) {
      const before = parseFloat(w.balance), after = before + pendingAmt;
      await client.query(`UPDATE wallets SET balance=$1 WHERE id=$2`, [after, w.id]);
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id,type,amount,balance_before,balance_after,description) VALUES ($1,'credit',$2,$3,$4,$5)`,
        [w.id, pendingAmt, before, after, `Referral commission payout ₹${pendingAmt.toFixed(2)}`],
      );
    }
  });

  res.json({ message: `₹${pendingAmt.toFixed(2)} referral commission paid and credited to wallet` });
}));
