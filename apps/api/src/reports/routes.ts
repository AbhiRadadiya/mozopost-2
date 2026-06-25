import { Router } from 'express';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

// ─── SELLER REPORTS ───────────────────────────────────────────────────────────

/** GET /reports/shipments  — seller's own shipment summary */
reportsRouter.get(
  '/shipments',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = req.user!.sellerId;
    if (!sellerId) throw new ApiError(403, 'Not a seller');
    const { from, to, courierId } = req.query as Record<string, string>;
    const params: any[] = [sellerId];
    const filters: string[] = ['o.seller_id = $1'];
    if (from)      { params.push(from);      filters.push(`o.created_at >= $${params.length}`); }
    if (to)        { params.push(to);        filters.push(`o.created_at <= $${params.length}`); }
    if (courierId) { params.push(courierId); filters.push(`o.courier_id = $${params.length}`); }
    const where = filters.join(' AND ');

    const summary = await queryOne<any>(
      `SELECT
         COUNT(*)                                     AS total,
         COUNT(*) FILTER (WHERE status='delivered')  AS delivered,
         COUNT(*) FILTER (WHERE status::text LIKE 'rto%')  AS rto,
         COUNT(*) FILTER (WHERE status='failed')     AS ndr,
         COUNT(*) FILTER (WHERE status='cancelled')  AS cancelled,
         COALESCE(SUM(total_freight),0)::float        AS total_freight,
         COALESCE(SUM(cod_amount) FILTER (WHERE payment_mode='cod'),0)::float AS total_cod,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE status='delivered') / NULLIF(COUNT(*),0), 2
         )::float AS delivery_rate,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE status::text LIKE 'rto%') / NULLIF(COUNT(*),0), 2
         )::float AS rto_rate
       FROM orders o WHERE ${where}`,
      params,
    );

    const byCourier = await query(
      `SELECT c.name AS courier_name, c.code,
              COUNT(*)::int AS orders,
              COUNT(*) FILTER (WHERE o.status='delivered')::int AS delivered,
              COALESCE(SUM(o.total_freight),0)::float AS freight
       FROM orders o JOIN couriers c ON c.id=o.courier_id
       WHERE ${where}
       GROUP BY c.id,c.name,c.code ORDER BY orders DESC`,
      params,
    );

    const daily = await query(
      `SELECT DATE(o.created_at) AS day, COUNT(*)::int AS orders,
              COALESCE(SUM(total_freight),0)::float AS freight
       FROM orders o WHERE ${where}
       GROUP BY day ORDER BY day DESC LIMIT 30`,
      params,
    );

    res.json({ summary, byCourier, daily });
  }),
);

/** GET /reports/wallet  — seller wallet report */
reportsRouter.get(
  '/wallet',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = req.user!.sellerId;
    if (!sellerId) throw new ApiError(403, 'Not a seller');
    const wallet = await queryOne<{ id: string }>(`SELECT id FROM wallets WHERE seller_id=$1`, [sellerId]);
    if (!wallet) throw new ApiError(404, 'Wallet not found');

    const summary = await queryOne(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type='credit'),0)::float AS total_credits,
         COALESCE(SUM(amount) FILTER (WHERE type='debit'),0)::float  AS total_debits,
         COALESCE(SUM(amount) FILTER (WHERE type='refund'),0)::float AS total_refunds,
         COUNT(*)::int AS total_transactions
       FROM wallet_transactions WHERE wallet_id=$1`,
      [wallet.id],
    );

    const monthly = await query(
      `SELECT TO_CHAR(created_at,'YYYY-MM') AS month,
              COALESCE(SUM(amount) FILTER (WHERE type='credit'),0)::float AS credits,
              COALESCE(SUM(amount) FILTER (WHERE type='debit'),0)::float  AS debits
       FROM wallet_transactions WHERE wallet_id=$1
       GROUP BY month ORDER BY month DESC LIMIT 12`,
      [wallet.id],
    );

    res.json({ summary, monthly });
  }),
);

// ─── ADMIN / PLATFORM REPORTS ─────────────────────────────────────────────────

/** GET /reports/admin/pnl  — merchant P&L for admin and super admin */
reportsRouter.get(
  '/admin/pnl',
  requireRole('master_admin', 'super_admin'),
  ah(async (req, res) => {
    const { from, to, sellerId } = req.query as Record<string, string>;
    const params: any[] = [];
    const filters: string[] = [];
    if (from)     { params.push(from);     filters.push(`o.created_at >= $${params.length}`); }
    if (to)       { params.push(to);       filters.push(`o.created_at <= $${params.length}`); }
    if (sellerId) { params.push(sellerId); filters.push(`o.seller_id = $${params.length}`); }
    const where = filters.length ? `AND ${filters.join(' AND ')}` : '';

    // Platform-level summary
    const platform = await queryOne<any>(
      `SELECT
         COUNT(DISTINCT o.seller_id)::int          AS active_merchants,
         COUNT(*)::int                              AS total_orders,
         COALESCE(SUM(o.total_freight),0)::float   AS total_revenue,
         COALESCE(SUM(o.base_freight + o.cod_charge),0)::float AS courier_cost_approx,
         COALESCE(SUM(o.margin_applied),0)::float  AS total_margin,
         COALESCE(SUM(o.cod_amount) FILTER (WHERE o.payment_mode='cod'),0)::float AS total_cod,
         COUNT(*) FILTER (WHERE o.status::text LIKE 'rto%')::int AS rto_count,
         COALESCE(SUM(o.total_freight) FILTER (WHERE o.status::text LIKE 'rto%'),0)::float AS rto_loss,
         COALESCE(SUM(wd.disputed_amount) FILTER (WHERE wd.status NOT IN ('rejected')),0)::float AS weight_dispute_amt,
         COALESCE(SUM(wd.approved_refund_amount) FILTER (WHERE wd.status='refund_processed'),0)::float AS weight_refunded
       FROM orders o
       LEFT JOIN weight_disputes wd ON wd.order_id=o.id
       WHERE o.status != 'cancelled' ${where}`,
      params,
    );

    // Per-merchant P&L
    const merchants = await query(
      `SELECT
         s.id AS seller_id,
         s.business_name,
         COUNT(o.id)::int                                    AS orders,
         COALESCE(SUM(o.total_freight),0)::float            AS revenue,
         COALESCE(SUM(o.base_freight + o.cod_charge),0)::float AS courier_cost,
         COALESCE(SUM(o.margin_applied),0)::float           AS gross_profit,
         COALESCE(SUM(o.cod_amount) FILTER (WHERE o.payment_mode='cod'),0)::float AS cod_volume,
         COUNT(o.id) FILTER (WHERE o.status::text LIKE 'rto%')::int AS rto_count,
         COALESCE(SUM(o.total_freight) FILTER (WHERE o.status::text LIKE 'rto%'),0)::float AS rto_loss,
         COALESCE(SUM(wd.disputed_amount) FILTER (WHERE wd.status NOT IN ('rejected')),0)::float AS disputed_amt,
         COALESCE(SUM(wd.approved_refund_amount) FILTER (WHERE wd.status='refund_processed'),0)::float AS refunded_amt,
         ROUND(
           100.0 * COUNT(o.id) FILTER (WHERE o.status='delivered') / NULLIF(COUNT(o.id),0), 2
         )::float AS delivery_rate,
         ROUND(
           100.0 * COUNT(o.id) FILTER (WHERE o.status::text LIKE 'rto%') / NULLIF(COUNT(o.id),0), 2
         )::float AS rto_rate
       FROM sellers s
       JOIN orders o ON o.seller_id=s.id AND o.status != 'cancelled' ${where}
       LEFT JOIN weight_disputes wd ON wd.order_id=o.id
       GROUP BY s.id,s.business_name
       ORDER BY gross_profit DESC`,
      params,
    );

    // Add net_profit and margin_pct, health_score to each merchant row
    const enriched = merchants.map((m: any) => {
      const netProfit = m.gross_profit - m.rto_loss - m.refunded_amt;
      const marginPct = m.revenue > 0 ? (netProfit / m.revenue) * 100 : 0;
      let healthScore = 100;
      if (m.rto_rate > 15) healthScore -= 30;
      else if (m.rto_rate > 8) healthScore -= 15;
      if (m.delivery_rate < 75) healthScore -= 25;
      else if (m.delivery_rate < 85) healthScore -= 10;
      if (marginPct < 0) healthScore -= 30;
      else if (marginPct < 3) healthScore -= 15;
      if (m.disputed_amt > 5000) healthScore -= 10;
      healthScore = Math.max(0, Math.min(100, healthScore));
      const healthBand = healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : healthScore >= 50 ? 'risk' : 'loss_making';
      return { ...m, netProfit, marginPct: parseFloat(marginPct.toFixed(2)), healthScore, healthBand };
    });

    // Per-courier P&L
    const couriers = await query(
      `SELECT
         c.name AS courier_name, c.code,
         COUNT(o.id)::int                                   AS orders,
         COALESCE(SUM(o.total_freight),0)::float           AS revenue,
         COALESCE(SUM(o.base_freight),0)::float            AS base_cost,
         COALESCE(SUM(o.margin_applied),0)::float          AS margin,
         COUNT(o.id) FILTER (WHERE o.status::text LIKE 'rto%')::int AS rto_count,
         COALESCE(SUM(wd.disputed_amount) FILTER (WHERE wd.status NOT IN ('rejected')),0)::float AS disputes_amt
       FROM couriers c
       JOIN orders o ON o.courier_id=c.id AND o.status != 'cancelled' ${where}
       LEFT JOIN weight_disputes wd ON wd.order_id=o.id
       GROUP BY c.id,c.name,c.code
       ORDER BY revenue DESC`,
      params,
    );

    res.json({ platform, merchants: enriched, couriers });
  }),
);

/** GET /reports/admin/courier-performance */
reportsRouter.get(
  '/admin/courier-performance',
  requireRole('master_admin', 'super_admin'),
  ah(async (_req, res) => {
    const rows = await query(
      `SELECT
         c.name, c.code,
         COUNT(o.id)::int AS total_orders,
         COUNT(*) FILTER (WHERE o.status='delivered')::int AS delivered,
         COUNT(*) FILTER (WHERE o.status='failed')::int AS ndr,
         COUNT(*) FILTER (WHERE o.status::text LIKE 'rto%')::int AS rto,
         ROUND(100.0*COUNT(*) FILTER (WHERE o.status='delivered')/NULLIF(COUNT(*),0),2)::float AS delivery_rate,
         ROUND(AVG(EXTRACT(EPOCH FROM (
           te_del.event_timestamp - o.created_at
         ))/86400),2)::float AS avg_transit_days
       FROM couriers c
       LEFT JOIN orders o ON o.courier_id=c.id
       LEFT JOIN LATERAL (
         SELECT event_timestamp FROM tracking_events
         WHERE order_id=o.id AND status='delivered'
         ORDER BY event_timestamp LIMIT 1
       ) te_del ON true
       GROUP BY c.id,c.name,c.code
       ORDER BY delivery_rate DESC NULLS LAST`,
    );
    res.json({ couriers: rows });
  }),
);

/** GET /reports/admin/merchant-growth */
reportsRouter.get(
  '/admin/merchant-growth',
  requireRole('master_admin', 'super_admin'),
  ah(async (_req, res) => {
    const monthly = await query(
      `SELECT TO_CHAR(created_at,'YYYY-MM') AS month,
              COUNT(*)::int AS new_merchants
       FROM sellers
       GROUP BY month ORDER BY month DESC LIMIT 12`,
    );
    const topMerchants = await query(
      `SELECT s.business_name,
              COUNT(o.id)::int AS orders,
              COALESCE(SUM(o.total_freight),0)::float AS revenue
       FROM sellers s
       LEFT JOIN orders o ON o.seller_id=s.id
       GROUP BY s.id,s.business_name
       ORDER BY revenue DESC LIMIT 10`,
    );
    res.json({ monthly, topMerchants });
  }),
);

/** GET /reports/analytics  — seller dashboard chart data */
reportsRouter.get(
  '/analytics',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = req.user!.sellerId;
    if (!sellerId) throw new ApiError(403, 'Not a seller');
    const days = Math.min(parseInt((req.query.days as string) || '30', 10), 90);

    const [daily, byCourier, topStates, topCities, futureCod] = await Promise.all([
      query(
        `SELECT DATE(created_at) AS day,
                COUNT(*)::int AS orders,
                COUNT(*) FILTER (WHERE status='delivered')::int AS delivered,
                COUNT(*) FILTER (WHERE status::text LIKE 'rto%')::int AS rto,
                COALESCE(SUM(total_freight),0)::float AS freight
         FROM orders WHERE seller_id=$1 AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY day ORDER BY day ASC`,
        [sellerId],
      ),
      query(
        `SELECT c.name AS courier_name, c.code,
                COUNT(o.id)::int AS orders,
                COUNT(*) FILTER (WHERE o.status='delivered')::int AS delivered,
                ROUND(100.0*COUNT(*) FILTER (WHERE o.status='delivered')/NULLIF(COUNT(*),0),2)::float AS delivery_rate
         FROM orders o JOIN couriers c ON c.id=o.courier_id
         WHERE o.seller_id=$1 AND o.created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY c.id,c.name,c.code ORDER BY orders DESC`,
        [sellerId],
      ),
      query(
        `SELECT consignee_state AS state, COUNT(*)::int AS orders,
                ROUND(100.0*COUNT(*) FILTER (WHERE status='delivered')/NULLIF(COUNT(*),0),2)::float AS delivery_rate
         FROM orders WHERE seller_id=$1 AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY consignee_state ORDER BY orders DESC LIMIT 10`,
        [sellerId],
      ),
      query(
        `SELECT consignee_city AS city, consignee_state AS state, COUNT(*)::int AS orders
         FROM orders WHERE seller_id=$1 AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY consignee_city, consignee_state ORDER BY orders DESC LIMIT 10`,
        [sellerId],
      ),
      // Future COD: pending delivered COD not yet settled
      queryOne(
        `SELECT COALESCE(SUM(cod_amount),0)::float AS upcoming_cod
         FROM orders WHERE seller_id=$1 AND payment_mode='cod' AND status='delivered'`,
        [sellerId],
      ),
    ]);

    // Best courier (highest delivery rate with >5 orders)
    const bestCourier = byCourier.find((c: any) => c.orders >= 5) || byCourier[0] || null;

    res.json({ daily, byCourier, topStates, topCities, futureCod, bestCourier });
  }),
);
