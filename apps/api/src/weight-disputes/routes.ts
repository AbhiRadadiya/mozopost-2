import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const weightDisputesRouter = Router();
weightDisputesRouter.use(requireAuth);

// ────────────────────────────────────────────────────────────────
// SELLER ROUTES  (/api/v1/weight-disputes)
// ────────────────────────────────────────────────────────────────

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller account');
  return req.user!.sellerId;
}

/** GET /  — list disputes for the authenticated seller */
weightDisputesRouter.get(
  '/',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const status = req.query.status as string | undefined;
    const params: any[] = [sellerId];
    let filter = '';
    if (status) { params.push(status); filter = `AND wd.status = $${params.length}`; }

    const rows = await query(
      `SELECT wd.*,
              o.mozopost_order_id, o.awb_number, o.consignee_city,
              c.name AS courier_name
       FROM weight_disputes wd
       JOIN orders  o ON o.id = wd.order_id
       LEFT JOIN couriers c ON c.id = wd.courier_id
       WHERE wd.seller_id = $1 ${filter}
       ORDER BY wd.created_at DESC`,
      params,
    );
    res.json({ disputes: rows });
  }),
);

/** GET /summary  — counts per status (for seller dashboard widget) */
weightDisputesRouter.get(
  '/summary',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const row = await queryOne<any>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'open')             AS open,
         COUNT(*) FILTER (WHERE status = 'under_review')     AS under_review,
         COUNT(*) FILTER (WHERE status = 'approved')         AS approved,
         COUNT(*) FILTER (WHERE status = 'rejected')         AS rejected,
         COUNT(*) FILTER (WHERE status = 'refund_pending')   AS refund_pending,
         COUNT(*) FILTER (WHERE status = 'refund_processed') AS refund_processed,
         COALESCE(SUM(disputed_amount),0)::float             AS total_disputed,
         COALESCE(SUM(approved_refund_amount),0)::float      AS total_approved,
         COUNT(*) FILTER (WHERE auto_flagged)                AS auto_flagged_count
       FROM weight_disputes WHERE seller_id = $1`,
      [sellerId],
    );
    res.json({ summary: row });
  }),
);

const raiseDisputeSchema = z.object({
  orderId: z.string().uuid(),
  courierWeightGm: z.number().int().positive(),
  reason: z.enum(['wrong_weight', 'volumetric_mismatch', 'dimensional_error', 'courier_error', 'other']).default('wrong_weight'),
  sellerRemarks: z.string().max(1000).optional(),
  proofVideoUrl: z.string().optional(),
  proofImageUrls: z.array(z.string()).optional(),
});

/** POST /  — seller raises a new weight dispute */
weightDisputesRouter.post(
  '/',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const dto = raiseDisputeSchema.parse(req.body);

    const order = await queryOne<any>(
      `SELECT o.*, c.id AS cid FROM orders o
       LEFT JOIN couriers c ON c.id = o.courier_id
       WHERE o.id = $1 AND o.seller_id = $2`,
      [dto.orderId, sellerId],
    );
    if (!order) throw new ApiError(404, 'Order not found');

    const sellerWeightGm = Math.round((parseFloat(order.dead_weight_kg) || 0) * 1000);
    const volWeightGm    = order.volumetric_weight_kg
       ? Math.round(parseFloat(order.volumetric_weight_kg) * 1000)
       : 0;
    const chargedWeightGm = dto.courierWeightGm;
    const differenceGm    = chargedWeightGm - Math.max(sellerWeightGm, volWeightGm);
    const billedPer500gm  = parseFloat(order.total_freight) / Math.ceil(Math.max(sellerWeightGm, volWeightGm) / 500);
    const extraSlabs      = Math.ceil(differenceGm / 500);
    const disputedAmount  = Math.max(0, billedPer500gm * extraSlabs);
    const differencePct   = sellerWeightGm > 0 ? (differenceGm / sellerWeightGm) * 100 : 0;

    if (differenceGm <= 0) {
      throw new ApiError(422, 'Courier charged weight is not higher than your declared weight — no dispute needed');
    }

    const existing = await queryOne(
      `SELECT id FROM weight_disputes WHERE order_id = $1 AND status NOT IN ('rejected')`,
      [dto.orderId],
    );
    if (existing) throw new ApiError(409, 'A dispute already exists for this order');

    const dispute = await withTransaction(async (client) => {
      // Insert dispute
      const result = await client.query(
        `INSERT INTO weight_disputes
           (seller_id, order_id, courier_id,
            seller_weight_gm, volumetric_weight_gm, courier_weight_gm,
            charged_weight_gm, difference_gm, difference_pct,
            seller_charged_amount, disputed_amount,
            reason, seller_remarks, auto_flagged, proof_video_url, proof_image_urls)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          sellerId, dto.orderId, order.cid,
          sellerWeightGm, volWeightGm, dto.courierWeightGm,
          chargedWeightGm, differenceGm, differencePct.toFixed(2),
          parseFloat(order.total_freight), disputedAmount,
          dto.reason, dto.sellerRemarks || null,
          differencePct >= 20,
          dto.proofVideoUrl || null,
          JSON.stringify(dto.proofImageUrls || []),
        ],
      );

      const d = result.rows[0];

      // Insert event
      await client.query(
        `INSERT INTO weight_dispute_events (dispute_id, event_type, description, user_type, user_id)
         VALUES ($1, 'created', 'Dispute raised by seller', 'seller', $2)`,
        [d.id, sellerId]
      );

      // Mark order as having a flagged discrepancy
      await client.query(
        `UPDATE orders SET
           courier_charged_weight_kg = $1,
           weight_discrepancy_gm     = $2,
           courier_extra_charge      = $3,
           weight_discrepancy_auto_flagged = $4
         WHERE id = $5`,
        [chargedWeightGm / 1000, differenceGm, disputedAmount, differencePct >= 20, dto.orderId],
      );

      return d;
    });

    res.status(201).json({ dispute });
  }),
);

/** GET /:id  — seller fetches a single dispute */
weightDisputesRouter.get(
  '/:id',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const dispute = await queryOne<any>(
      `SELECT wd.*, o.mozopost_order_id, o.awb_number, c.name AS courier_name
       FROM weight_disputes wd
       JOIN orders o ON o.id = wd.order_id
       LEFT JOIN couriers c ON c.id = wd.courier_id
       WHERE wd.id = $1 AND wd.seller_id = $2`,
      [req.params.id, sellerId],
    );
    if (!dispute) throw new ApiError(404, 'Dispute not found');
    res.json({ dispute });
  }),
);

/** PATCH /:id/accept  — seller accepts the courier charge (closes dispute) */
weightDisputesRouter.patch(
  '/:id/accept',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const dispute = await queryOne<any>(`SELECT * FROM weight_disputes WHERE id = $1 AND seller_id = $2`, [req.params.id, sellerId]);
    if (!dispute) throw new ApiError(404, 'Dispute not found');
    if (!['open', 'under_review'].includes(dispute.status)) {
      throw new ApiError(422, `Cannot accept a dispute in status: ${dispute.status}`);
    }
    
    await withTransaction(async (client) => {
      await client.query(`UPDATE weight_disputes SET status = 'rejected', admin_remarks = 'Accepted by seller' WHERE id = $1`, [req.params.id]);
      await client.query(
        `INSERT INTO weight_dispute_events (dispute_id, event_type, description, user_type, user_id)
         VALUES ($1, 'accepted_by_seller', 'Seller accepted courier charges', 'seller', $2)`,
        [dispute.id, sellerId]
      );
    });

    res.json({ message: 'Charges accepted. Dispute closed.' });
  }),
);

/** PATCH /:id/escalate  — seller escalates an open dispute */
weightDisputesRouter.patch(
  '/:id/escalate',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE weight_disputes SET escalated = true, status = 'under_review' WHERE id = $1 AND seller_id = $2`,
        [req.params.id, sellerId],
      );
      await client.query(
        `INSERT INTO weight_dispute_events (dispute_id, event_type, description, user_type, user_id)
         VALUES ($1, 'escalated', 'Dispute escalated to admin', 'seller', $2)`,
        [req.params.id, sellerId]
      );
    });

    res.json({ message: 'Dispute escalated to admin' });
  }),
);

/** GET /:id/history  — get dispute history timeline */
weightDisputesRouter.get(
  '/:id/history',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const dispute = await queryOne<any>(`SELECT id FROM weight_disputes WHERE id = $1 AND seller_id = $2`, [req.params.id, sellerId]);
    if (!dispute) throw new ApiError(404, 'Dispute not found');
    
    const events = await query(
      `SELECT * FROM weight_dispute_events WHERE dispute_id = $1 ORDER BY created_at ASC`,
      [dispute.id]
    );
    res.json({ events });
  }),
);

// ────────────────────────────────────────────────────────────────
// ADMIN ROUTES  (/api/v1/admin/weight-disputes)
// ────────────────────────────────────────────────────────────────

export const adminWeightDisputesRouter = Router();
adminWeightDisputesRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

/** GET /  — all disputes with filters */
adminWeightDisputesRouter.get(
  '/',
  ah(async (req, res) => {
    const status   = req.query.status as string | undefined;
    const courierId = req.query.courierId as string | undefined;
    const params: any[] = [];
    const filters: string[] = [];
    if (status)   { params.push(status);    filters.push(`wd.status = $${params.length}`); }
    if (courierId){ params.push(courierId); filters.push(`wd.courier_id = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await query(
      `SELECT wd.*, s.business_name, o.mozopost_order_id, o.awb_number, c.name AS courier_name
       FROM weight_disputes wd
       JOIN sellers  s ON s.id = wd.seller_id
       JOIN orders   o ON o.id = wd.order_id
       LEFT JOIN couriers c ON c.id = wd.courier_id
       ${where}
       ORDER BY wd.auto_flagged DESC, wd.created_at DESC`,
      params,
    );
    res.json({ disputes: rows });
  }),
);

/** GET /stats  — admin dashboard numbers */
adminWeightDisputesRouter.get(
  '/stats',
  ah(async (_req, res) => {
    const row = await queryOne<any>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'open')             AS open,
         COUNT(*) FILTER (WHERE status = 'under_review')     AS under_review,
         COUNT(*) FILTER (WHERE status = 'refund_pending')   AS refund_pending,
         COUNT(*) FILTER (WHERE status = 'refund_processed') AS refund_processed,
         COUNT(*) FILTER (WHERE auto_flagged)                AS auto_flagged,
         COALESCE(SUM(disputed_amount),0)::float             AS total_disputed,
         COALESCE(SUM(approved_refund_amount) FILTER (WHERE status='refund_pending'),0)::float  AS refund_pending_amt,
         COALESCE(SUM(approved_refund_amount) FILTER (WHERE status='refund_processed'),0)::float AS refund_done_amt
       FROM weight_disputes`,
    );
    res.json({ stats: row });
  }),
);

const resolveSchema = z.object({
  action: z.enum(['approve', 'reject', 'on_hold']),
  approvedAmount: z.number().min(0).optional(),
  adminRemarks: z.string().max(1000).optional(),
  declineReason: z.string().max(1000).optional(),
}).refine(
  (d) => d.action !== 'reject' || (d.declineReason && d.declineReason.trim().length > 0),
  { message: 'Decline reason is required when rejecting a dispute', path: ['declineReason'] },
);

/** PATCH /:id/resolve  — admin approves, rejects or puts on hold */
adminWeightDisputesRouter.patch(
  '/:id/resolve',
  ah(async (req: AuthedRequest, res) => {
    const dto = resolveSchema.parse(req.body);
    const dispute = await queryOne<any>(`SELECT * FROM weight_disputes WHERE id = $1`, [req.params.id]);
    if (!dispute) throw new ApiError(404, 'Dispute not found');

    if (dto.action === 'approve') {
      const refundAmt = dto.approvedAmount ?? parseFloat(dispute.disputed_amount);
      await query(
        `UPDATE weight_disputes SET
           status = 'refund_pending', approved_refund_amount = $1,
           admin_remarks = $2, resolved_by = $3
         WHERE id = $4`,
        [refundAmt, dto.adminRemarks || null, req.user!.sub, req.params.id],
      );
      res.json({ message: `Dispute approved — ₹${refundAmt.toFixed(2)} refund pending` });
    } else if (dto.action === 'on_hold') {
      await query(
        `UPDATE weight_disputes SET
           status = 'under_review', admin_remarks = $1,
           resolved_by = $2
         WHERE id = $3`,
        [`[ON HOLD] ${dto.adminRemarks || 'Pending further review'}`, req.user!.sub, req.params.id],
      );
      res.json({ message: 'Dispute placed on hold — under review' });
    } else {
      await query(
        `UPDATE weight_disputes SET
           status = 'rejected', admin_remarks = $1,
           resolved_by = $2, resolved_at = NOW()
         WHERE id = $3`,
        [`[DECLINED] ${dto.declineReason}${dto.adminRemarks ? ' | ' + dto.adminRemarks : ''}`, req.user!.sub, req.params.id],
      );
      res.json({ message: 'Dispute declined with reason provided to seller' });
    }
  }),
);

/** POST /:id/refund  — admin processes the refund back to seller wallet */
adminWeightDisputesRouter.post(
  '/:id/refund',
  ah(async (req: AuthedRequest, res) => {
    const dispute = await queryOne<any>(`SELECT * FROM weight_disputes WHERE id = $1`, [req.params.id]);
    if (!dispute) throw new ApiError(404, 'Dispute not found');
    if (dispute.status !== 'refund_pending') throw new ApiError(422, 'Dispute is not in refund_pending status');

    const refundAmt = parseFloat(dispute.approved_refund_amount);

    await withTransaction(async (client) => {
      // Credit the seller wallet
      const w = await client.query(`SELECT id, balance FROM wallets WHERE seller_id = $1`, [dispute.seller_id]);
      const wallet = w.rows[0];
      const balBefore = parseFloat(wallet.balance);
      const balAfter  = balBefore + refundAmt;
      await client.query(`UPDATE wallets SET balance = $1 WHERE id = $2`, [balAfter, wallet.id]);
      await client.query(
        `INSERT INTO wallet_transactions
           (wallet_id, type, amount, balance_before, balance_after, order_id, description)
         VALUES ($1,'refund',$2,$3,$4,$5,$6)`,
        [wallet.id, refundAmt, balBefore, balAfter, dispute.order_id,
         `Weight dispute refund — dispute #${dispute.id.slice(0,8)}`],
      );

      // Mark dispute as done
      await client.query(
        `UPDATE weight_disputes SET
           status = 'refund_processed', refunded_at = NOW(),
           resolved_at = NOW(), resolved_by = $1
         WHERE id = $2`,
        [req.user!.sub, dispute.id],
      );
    });

    res.json({ message: `₹${refundAmt.toFixed(2)} refunded to seller wallet` });
  }),
);

/** GET /courier-report  — grouped stats per courier (for admin analytics) */
adminWeightDisputesRouter.get(
  '/courier-report',
  ah(async (_req, res) => {
    const rows = await query(
      `SELECT c.name AS courier_name, c.code AS courier_code,
              COUNT(*)                                              AS total_disputes,
              COUNT(*) FILTER (WHERE wd.status = 'open')           AS open,
              COUNT(*) FILTER (WHERE wd.status = 'approved'
                               OR wd.status = 'refund_pending'
                               OR wd.status = 'refund_processed')  AS approved,
              COUNT(*) FILTER (WHERE wd.status = 'rejected')       AS rejected,
              COALESCE(SUM(wd.disputed_amount),0)::float            AS total_disputed_amt,
              COALESCE(SUM(wd.approved_refund_amount),0)::float     AS total_refunded_amt,
              ROUND(AVG(wd.difference_pct)::numeric, 2)             AS avg_diff_pct
       FROM weight_disputes wd
       LEFT JOIN couriers c ON c.id = wd.courier_id
       GROUP BY c.id, c.name, c.code
       ORDER BY total_disputes DESC`,
    );
    res.json({ report: rows });
  }),
);
