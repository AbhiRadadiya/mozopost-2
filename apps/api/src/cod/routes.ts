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
    const historyRows = await query(
      `SELECT * FROM cod_remittances
       WHERE seller_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [sellerId]
    );

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
    const rows = await query(
      `SELECT cr.*, s.business_name
       FROM cod_remittances cr
       JOIN sellers s ON s.id = cr.seller_id
       ORDER BY cr.created_at DESC
       LIMIT 100`
    );
    res.json({ remittances: rows });
  })
);

adminCodRouter.patch(
  '/:id/status',
  ah(async (req, res) => {
    const { status } = req.body;
    await query(`UPDATE cod_remittances SET status = $1 WHERE id = $2`, [status, req.params.id]);
    res.json({ message: 'Status updated' });
  })
);
