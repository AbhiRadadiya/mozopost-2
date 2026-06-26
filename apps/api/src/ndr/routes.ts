import { Router } from 'express';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const ndrRouter = Router();
ndrRouter.use(requireAuth, requireRole('seller'));

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller account');
  return req.user!.sellerId;
}

ndrRouter.get(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const rows = await query(
      `SELECT n.*, o.mozopost_order_id, o.awb_number, o.consignee_name, o.consignee_phone, c.name as courier_name
       FROM ndr_records n
       JOIN orders o ON o.id = n.order_id
       LEFT JOIN couriers c ON c.id = o.courier_id
       WHERE o.seller_id = $1 AND n.resolved_at IS NULL
       ORDER BY n.ndr_at DESC`,
      [sellerId],
    );
    res.json({ ndrRecords: rows });
  }),
);

ndrRouter.post(
  '/:orderId/action',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const { action } = req.body; // 'reattempt' | 'update_address' | 'rto' | 'hold'

    const order = await queryOne<any>(`SELECT * FROM orders WHERE id = $1 AND seller_id = $2`, [req.params.orderId, sellerId]);
    if (!order) throw new ApiError(404, 'Order not found');

    const ndr = await queryOne<any>(`SELECT * FROM ndr_records WHERE order_id = $1 AND resolved_at IS NULL ORDER BY ndr_at DESC LIMIT 1`, [order.id]);
    if (!ndr) throw new ApiError(404, 'No pending NDR for this order');

    await query(`UPDATE ndr_records SET action_taken = $1, action_at = NOW(), resolved_at = NOW() WHERE id = $2`, [action, ndr.id]);

    if (action === 'rto') {
      await query(`UPDATE orders SET status = 'rto_initiated', rto_initiated_at = NOW() WHERE id = $1`, [order.id]);
    } else if (action === 'reattempt') {
      await query(`UPDATE orders SET status = 'out_for_delivery' WHERE id = $1`, [order.id]);
    } else if (action === 'update_address') {
      await query(`UPDATE orders SET status = 'unprocessed' WHERE id = $1`, [order.id]);
    }

    res.json({ message: `NDR action '${action}' recorded` });
  }),
);

/**
 * Dev/testing helper — manually trigger an NDR on an order without waiting
 * for a real courier webhook. Useful for testing the NDR resolution flow
 * end-to-end while couriers are still in mock mode. In production, NDRs
 * normally arrive via POST /api/v1/webhooks/courier-status instead.
 */
ndrRouter.post(
  '/:orderId/simulate',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const order = await queryOne<any>(`SELECT * FROM orders WHERE id = $1 AND seller_id = $2`, [req.params.orderId, sellerId]);
    if (!order) throw new ApiError(404, 'Order not found');

    const reason = req.body.reason || 'customer_not_available';
    const lastAttempt = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM ndr_records WHERE order_id = $1`,
      [order.id],
    );
    const attemptNumber = parseInt(lastAttempt?.count || '0', 10) + 1;

    await query(`INSERT INTO ndr_records (order_id, attempt_number, ndr_reason) VALUES ($1,$2,$3)`, [
      order.id,
      attemptNumber,
      reason,
    ]);
    await query(`UPDATE orders SET status = 'failed' WHERE id = $1`, [order.id]);
    await query(
      `INSERT INTO tracking_events (order_id, status, location, description, source)
       VALUES ($1,'failed','Destination Hub',$2,'simulated')`,
      [order.id, `Delivery attempt failed: ${reason.replace(/_/g, ' ')}`],
    );

    res.status(201).json({ message: 'NDR simulated for testing', attemptNumber });
  }),
);
