import { Router } from 'express';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const codRouter = Router();
codRouter.use(requireAuth, requireRole('seller'));

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller account');
  return req.user!.sellerId;
}

codRouter.get(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);

    // Get stats
    const statsRow = await queryOne<any>(
      `SELECT
         COALESCE(SUM(net_amount), 0)::float AS total_collected,
         COALESCE(SUM(net_amount) FILTER (WHERE status = 'pending'), 0)::float AS pending_release,
         MIN(due_date) FILTER (WHERE status = 'pending') AS next_settlement,
         COALESCE(SUM(net_amount) FILTER (WHERE payment_cycle = 'D2' AND status = 'pending'), 0)::float AS d2_cycle
       FROM cod_remittances
       WHERE seller_id = $1`,
      [sellerId]
    );

    // Get remittances history
    const { search, date } = req.query;
    let queryStr = `SELECT * FROM cod_remittances WHERE seller_id = $1`;
    const params: any[] = [sellerId];

    if (search) {
      // In COD remittances, there isn't a direct description field. We can search by ID or payment cycle
      params.push(`%${search}%`);
      queryStr += ` AND (id::text ILIKE $${params.length} OR payment_cycle ILIKE $${params.length})`;
    }
    if (date) {
      params.push(date as string);
      queryStr += ` AND DATE(created_at) = $${params.length}`;
    }

    queryStr += ` ORDER BY created_at DESC LIMIT 50`;
    const historyRows = await query(queryStr, params);

    res.json({
      stats: {
        totalCollected: statsRow.total_collected,
        pendingRelease: statsRow.pending_release,
        nextSettlement: statsRow.next_settlement,
        d2Cycle: statsRow.d2_cycle
      },
      remittances: historyRows
    });
  })
);

export const adminCodRouter = Router();
adminCodRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

adminCodRouter.get(
  '/',
  ah(async (req, res) => {
    const { search, date, status } = req.query;
    let queryStr = `
      SELECT cr.*, s.business_name
      FROM cod_remittances cr
      JOIN sellers s ON s.id = cr.seller_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND s.business_name ILIKE $${params.length}`;
    }
    if (date) {
      params.push(date as string);
      queryStr += ` AND DATE(cr.due_date) = $${params.length}`;
    }
    if (status) {
      params.push(status as string);
      queryStr += ` AND cr.status = $${params.length}`;
    }

    queryStr += ` ORDER BY cr.created_at DESC LIMIT 100`;
    const rows = await query(queryStr, params);
    res.json({ remittances: rows });
  })
);

adminCodRouter.patch(
  '/:id/status',
  ah(async (req, res) => {
    const { status, utrNumber, paymentMode, bankReference } = req.body;
    if (status === 'settled') {
      if (!utrNumber || !utrNumber.trim()) {
        throw new ApiError(400, 'UTR number is required before releasing a COD settlement');
      }
      await query(
        `UPDATE cod_remittances
         SET status = 'settled', settled_at = NOW(),
             utr_number = $1, payment_mode = $2, bank_reference = $3
         WHERE id = $4`,
        [utrNumber.trim(), paymentMode || 'NEFT', bankReference || null, req.params.id],
      );
    } else {
      await query(`UPDATE cod_remittances SET status = $1 WHERE id = $2`, [status, req.params.id]);
    }
    res.json({ message: 'Status updated' });
  })
);
