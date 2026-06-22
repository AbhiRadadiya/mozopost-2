import { Router } from 'express';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, AuthedRequest } from '../middleware';
import { getAdapter } from '../couriers/adapter';

export const trackingRouter = Router();
trackingRouter.use(requireAuth);

trackingRouter.get(
  '/:awb',
  ah(async (req: AuthedRequest, res) => {
    const order = await queryOne<any>(
      `SELECT o.*, c.code as courier_code, c.name as courier_name
       FROM orders o LEFT JOIN couriers c ON c.id = o.courier_id
       WHERE o.awb_number = $1 OR o.mozopost_order_id = $1`,
      [req.params.awb],
    );
    if (!order) throw new ApiError(404, 'Shipment not found');

    // Authorization: sellers can only see their own orders
    if (req.user!.role === 'seller' && order.seller_id !== req.user!.sellerId) {
      throw new ApiError(403, 'Not authorized to view this shipment');
    }

    const storedEvents = await query(`SELECT * FROM tracking_events WHERE order_id = $1 ORDER BY event_timestamp ASC`, [order.id]);

    // Pull fresh events from courier adapter (mock or live) and persist new ones
    if (order.courier_code && order.awb_number) {
      const adapter = getAdapter(order.courier_code);
      const live = await adapter.track(order.awb_number);
      const existingDescriptions = new Set(storedEvents.map((e: any) => e.description));
      for (const ev of live.events) {
        if (!existingDescriptions.has(ev.description)) {
          await query(
            `INSERT INTO tracking_events (order_id, status, location, description, event_timestamp, source)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [order.id, ev.status, ev.location, ev.description, ev.timestamp, live.mock ? 'mock' : 'live'],
          );
        }
      }
      if (live.events.length) {
        const last = live.events[live.events.length - 1];
        await query(`UPDATE orders SET last_tracking_status = $1, last_tracking_at = $2 WHERE id = $3`, [last.status, last.timestamp, order.id]);
      }
    }

    const freshEvents = await query(`SELECT * FROM tracking_events WHERE order_id = $1 ORDER BY event_timestamp ASC`, [order.id]);

    res.json({
      order: {
        mozopostOrderId: order.mozopost_order_id,
        awbNumber: order.awb_number,
        status: order.status,
        courierName: order.courier_name,
        consigneeCity: order.consignee_city,
        consigneeState: order.consignee_state,
      },
      events: freshEvents,
    });
  }),
);
