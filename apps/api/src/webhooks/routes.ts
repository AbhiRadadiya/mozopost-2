import { Router } from 'express';
import { query, queryOne } from '../db/pool';
import { ah, ApiError } from '../middleware';

export const webhooksRouter = Router();

/**
 * Generic courier status webhook. In production, point your courier's
 * webhook URL at POST /api/v1/webhooks/courier-status (no auth — couriers
 * call this directly; verify with a shared secret in production).
 *
 * Body: { awbNumber, status, location?, description?, ndrReason? }
 */
webhooksRouter.post(
  '/courier-status',
  ah(async (req, res) => {
    const { awbNumber, status, location, description, ndrReason, chargedWeightKg } = req.body;
    if (!awbNumber || !status) throw new ApiError(400, 'awbNumber and status are required');

    const order = await queryOne<any>(`SELECT * FROM orders WHERE awb_number = $1`, [awbNumber]);
    if (!order) throw new ApiError(404, 'No order found for this AWB');

    await query(
      `INSERT INTO tracking_events (order_id, status, location, description, source)
       VALUES ($1,$2,$3,$4,'webhook')`,
      [order.id, status, location || '', description || status],
    );
    await query(`UPDATE orders SET status = $1, last_tracking_status = $2, last_tracking_at = NOW() WHERE id = $3`, [
      status, status, order.id,
    ]);

    // Auto-flag weight discrepancy when courier posts a charged weight
    if (chargedWeightKg && parseFloat(chargedWeightKg) > 0) {
      const sellerKg  = parseFloat(order.dead_weight_kg) || 0;
      const volKg     = parseFloat(order.volumetric_weight_kg) || 0;
      const billedKg  = Math.max(sellerKg, volKg);
      const chargedKg = parseFloat(chargedWeightKg);
      const diffGm    = Math.round((chargedKg - billedKg) * 1000);
      const diffPct   = billedKg > 0 ? ((chargedKg - billedKg) / billedKg) * 100 : 0;
      if (diffPct >= 20) {
        await query(
          `UPDATE orders SET
             courier_charged_weight_kg = $1,
             weight_discrepancy_gm = $2,
             weight_discrepancy_auto_flagged = true
           WHERE id = $3`,
          [chargedKg, diffGm, order.id],
        );
      }
    }

    if (status === 'failed' && ndrReason) {
      const lastAttempt = await queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM ndr_records WHERE order_id = $1`,
        [order.id],
      );
      const attemptNumber = parseInt(lastAttempt?.count || '0', 10) + 1;
      await query(
        `INSERT INTO ndr_records (order_id, attempt_number, ndr_reason) VALUES ($1,$2,$3)`,
        [order.id, attemptNumber, ndrReason],
      );
    }

    res.json({ message: 'Webhook processed' });
  }),
);
