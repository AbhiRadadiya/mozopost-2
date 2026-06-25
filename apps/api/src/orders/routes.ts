import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';
import { calculateRate, autoAllocateCourier } from './rating';
import { runFraudCheck } from '../fraud/engine';
import { getAdapter } from '../couriers/adapter';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller account');
  return req.user!.sellerId;
}

const createOrderSchema = z.object({
  sellerOrderId: z.string().optional(),
  paymentMode: z.enum(['prepaid', 'cod']),
  codAmount: z.number().min(0).default(0),
  consigneeName: z.string().min(1),
  consigneePhone: z.string().min(10).max(15),
  consigneeEmail: z.string().email().optional().or(z.literal('')),
  consigneeAddress1: z.string().min(1),
  consigneeAddress2: z.string().optional(),
  consigneeCity: z.string().min(1),
  consigneeState: z.string().min(1),
  consigneePincode: z.string().length(6),
  warehouseId: z.string().uuid().optional(),
  deadWeightKg: z.number().positive(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  declaredValue: z.number().min(0).default(0),
  numPieces: z.number().min(1).default(1),
  itemDescription: z.string().optional(),
  courierId: z.string().uuid().optional(), // omit for auto-allocation
});

ordersRouter.post(
  '/fraud-check',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const { mobile, address, city, state, pincode, paymentMode, codAmount } = req.body;
    const result = await runFraudCheck({
      sellerId,
      mobile: mobile || '',
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      paymentMode: paymentMode === 'cod' ? 'cod' : 'prepaid',
      codAmount: codAmount || 0,
    });
    res.json(result);
  }),
);

ordersRouter.post(
  '/',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const dto = createOrderSchema.parse(req.body);

    const volWeight = dto.lengthCm && dto.widthCm && dto.heightCm
      ? (dto.lengthCm * dto.widthCm * dto.heightCm) / 5000
      : 0;
    const billedWeight = Math.max(dto.deadWeightKg, volWeight);

    // Fraud check (stored on the order, not blocking — seller decides)
    const fraud = await runFraudCheck({
      sellerId,
      mobile: dto.consigneePhone,
      address: dto.consigneeAddress1 + ' ' + (dto.consigneeAddress2 || ''),
      city: dto.consigneeCity,
      state: dto.consigneeState,
      pincode: dto.consigneePincode,
      paymentMode: dto.paymentMode,
      codAmount: dto.codAmount,
    });

    // Resolve courier (manual or auto)
    let rate;
    if (dto.courierId) {
      rate = await calculateRate({
        courierId: dto.courierId,
        sellerId,
        weightKg: billedWeight,
        paymentMode: dto.paymentMode,
        codAmount: dto.codAmount,
      });
    } else {
      rate = await autoAllocateCourier(sellerId, dto.consigneePincode, billedWeight, dto.paymentMode, dto.codAmount);
    }
    if (!rate) throw new ApiError(422, 'No courier available for this route/weight combination');

    const wallet = await queryOne<{ id: string; balance: string; credit_outstanding: string }>(
      `SELECT id, balance, COALESCE(credit_outstanding,0) AS credit_outstanding FROM wallets WHERE seller_id = $1`,
      [sellerId],
    );
    if (!wallet) throw new ApiError(500, 'Wallet not found for seller');

    const balance     = parseFloat(wallet.balance);
    const outstanding = parseFloat(wallet.credit_outstanding);

    // Check if seller has a credit facility (postpaid wallet)
    const creditFacility = await queryOne<any>(
      `SELECT * FROM credit_facilities WHERE seller_id = $1 AND status = 'active'`,
      [sellerId],
    );

    let useCredit = false;
    let availableToSpend = balance; // prepaid only by default

    if (creditFacility) {
      const creditLimit    = parseFloat(creditFacility.credit_limit);
      const availableCredit = creditLimit - outstanding;
      availableToSpend = balance + availableCredit; // wallet + remaining credit
      useCredit = balance < rate.totalFreight; // only go to credit if wallet can't cover

      // Hard block: credit facility exhausted
      if (creditFacility.auto_block_at_limit && availableCredit <= 0 && balance < rate.totalFreight) {
        throw new ApiError(402, 'Credit limit exhausted. Please recharge your wallet.');
      }
      if (availableToSpend < rate.totalFreight) {
        throw new ApiError(402, `Insufficient balance. Wallet ₹${balance.toFixed(2)} + Available credit ₹${availableCredit.toFixed(2)} < Required ₹${rate.totalFreight}`);
      }
    } else {
      // Prepaid only — block if insufficient
      if (balance < rate.totalFreight) {
        throw new ApiError(402, `Insufficient wallet balance. Required ₹${rate.totalFreight}, available ₹${balance.toFixed(2)}`);
      }
    }

    const order = await withTransaction(async (client) => {
      const orderRes = await client.query(
        `INSERT INTO orders (
          seller_id, seller_order_id, status, payment_mode,
          consignee_name, consignee_phone, consignee_email,
          consignee_address1, consignee_address2, consignee_city, consignee_state, consignee_pincode,
          warehouse_id, dead_weight_kg, length_cm, width_cm, height_cm, volumetric_weight_kg, billed_weight_kg,
          declared_value, num_pieces, item_description,
          courier_id, auto_allocated, base_freight, cod_charge, margin_applied, total_freight, cod_amount,
          fraud_score, fraud_flags
        ) VALUES (
          $1,$2,'unprocessed',$3,
          $4,$5,$6,
          $7,$8,$9,$10,$11,
          $12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,
          $22,$23,$24,$25,$26,$27,$28,
          $29,$30
        ) RETURNING *`,
        [
          sellerId, dto.sellerOrderId || null, dto.paymentMode,
          dto.consigneeName, dto.consigneePhone, dto.consigneeEmail || null,
          dto.consigneeAddress1, dto.consigneeAddress2 || null, dto.consigneeCity, dto.consigneeState, dto.consigneePincode,
          dto.warehouseId || null, dto.deadWeightKg, dto.lengthCm || null, dto.widthCm || null, dto.heightCm || null, volWeight, billedWeight,
          dto.declaredValue, dto.numPieces, dto.itemDescription || null,
          rate.courierId, !dto.courierId, rate.baseFreight, rate.codCharge, rate.marginApplied, rate.totalFreight, dto.codAmount,
          fraud.score, JSON.stringify(fraud.flags),
        ],
      );
      const newOrder = orderRes.rows[0];

      const charge = rate.totalFreight;

      if (useCredit && creditFacility) {
        // Deduct from credit: wallet goes negative (or partial wallet + partial credit)
        const walletPays  = Math.min(balance, charge);
        const creditPays  = charge - walletPays;
        const balAfter    = balance - walletPays;
        const newOutstanding = outstanding + creditPays;

        await client.query(
          `UPDATE wallets SET balance = $1, credit_outstanding = $2 WHERE id = $3`,
          [balAfter, newOutstanding, wallet.id],
        );
        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, order_id, description)
           VALUES ($1,'credit_utilized',$2,$3,$4,$5,$6)`,
          [wallet.id, charge, balance, balAfter, newOrder.id,
           `Freight on credit — wallet ₹${walletPays.toFixed(2)}, credit ₹${creditPays.toFixed(2)} — order ${newOrder.mozopost_order_id}`],
        );
        await client.query(
          `INSERT INTO credit_transactions
             (credit_facility_id, seller_id, order_id, type, amount, outstanding_before, outstanding_after, description)
           VALUES ($1,$2,$3,'utilized',$4,$5,$6,$7)`,
          [creditFacility.id, sellerId, newOrder.id, creditPays, outstanding, newOutstanding,
           `Freight for order ${newOrder.mozopost_order_id}`],
        );
      } else {
        // Normal prepaid debit
        const balBefore = balance;
        const balAfter  = balBefore - charge;
        await client.query(`UPDATE wallets SET balance = $1 WHERE id = $2`, [balAfter, wallet.id]);
        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, order_id, description)
           VALUES ($1,'debit',$2,$3,$4,$5,$6)`,
          [wallet.id, charge, balBefore, balAfter, newOrder.id,
           `Freight charge for order ${newOrder.mozopost_order_id}`],
        );
      }

      return newOrder;
    });

    // Book AWB with courier (mock or live depending on configured keys)
    const adapter = getAdapter(rate.courierCode);
    const booking = await adapter.book({
      orderId: order.id,
      mozopostOrderId: order.mozopost_order_id,
      consigneeName: dto.consigneeName,
      consigneePhone: dto.consigneePhone,
      consigneeAddress: dto.consigneeAddress1,
      consigneeCity: dto.consigneeCity,
      consigneeState: dto.consigneeState,
      consigneePincode: dto.consigneePincode,
      originPincode: '',
      weightKg: billedWeight,
      paymentMode: dto.paymentMode,
      codAmount: dto.codAmount,
      declaredValue: dto.declaredValue,
    });

    if (booking.success) {
      await query(`UPDATE orders SET awb_number = $1, status = 'booked' WHERE id = $2`, [booking.awbNumber, order.id]);
      await query(
        `INSERT INTO tracking_events (order_id, status, location, description, source)
         VALUES ($1,'booked','Origin Hub','Shipment booked with courier',$2)`,
        [order.id, booking.mock ? 'mock' : 'live'],
      );
    }

    res.status(201).json({
      order: { ...order, awb_number: booking.awbNumber, status: booking.success ? 'booked' : 'unprocessed' },
      fraud,
      courierMock: booking.mock,
    });
  }),
);

ordersRouter.get(
  '/',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const offset = (page - 1) * limit;

    const filters: string[] = ['o.seller_id = $1'];
    const params: any[] = [sellerId];

    if (req.query.status) { params.push(req.query.status); filters.push(`o.status = $${params.length}`); }
    if (req.query.paymentMode) { params.push(req.query.paymentMode); filters.push(`o.payment_mode = $${params.length}`); }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      filters.push(`(o.mozopost_order_id ILIKE $${params.length} OR o.awb_number ILIKE $${params.length} OR o.consignee_name ILIKE $${params.length})`);
    }

    const where = filters.join(' AND ');
    const totalRow = await queryOne<{ count: string }>(`SELECT COUNT(*)::text as count FROM orders o WHERE ${where}`, params);
    const total = parseInt(totalRow?.count || '0', 10);

    const rows = await query(
      `SELECT o.*, c.name as courier_name, c.code as courier_code
       FROM orders o LEFT JOIN couriers c ON c.id = o.courier_id
       WHERE ${where} ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    res.json({ data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }),
);

ordersRouter.get(
  '/stats',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const stats = await queryOne<any>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'unprocessed') as unprocessed,
        COUNT(*) FILTER (WHERE status IN ('booked','picked')) as picked,
        COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status::text LIKE 'rto%') as rto,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) as total,
        COALESCE(SUM(total_freight),0)::float as total_freight,
        COALESCE(SUM(cod_amount) FILTER (WHERE payment_mode = 'cod'),0)::float as total_cod
       FROM orders WHERE seller_id = $1`,
      [sellerId],
    );
    res.json(stats);
  }),
);

ordersRouter.get(
  '/:id',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const order = await queryOne<any>(
      `SELECT o.*, c.name as courier_name, c.code as courier_code
       FROM orders o LEFT JOIN couriers c ON c.id = o.courier_id
       WHERE o.seller_id = $1 AND (o.id::text = $2 OR o.mozopost_order_id = $2 OR o.awb_number = $2)`,
      [sellerId, req.params.id],
    );
    if (!order) throw new ApiError(404, 'Order not found');
    const events = await query(`SELECT * FROM tracking_events WHERE order_id = $1 ORDER BY event_timestamp ASC`, [order.id]);
    res.json({ order, trackingEvents: events });
  }),
);

ordersRouter.patch(
  '/:id/cancel',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const order = await queryOne<any>(`SELECT * FROM orders WHERE id = $1 AND seller_id = $2`, [req.params.id, sellerId]);
    if (!order) throw new ApiError(404, 'Order not found');
    if (!['unprocessed', 'booked'].includes(order.status)) {
      throw new ApiError(422, `Cannot cancel order in status: ${order.status}`);
    }

    await withTransaction(async (client) => {
      await client.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [order.id]);
      const wallet = await client.query(`SELECT id, balance FROM wallets WHERE seller_id = $1`, [sellerId]);
      const w = wallet.rows[0];
      const balBefore = parseFloat(w.balance);
      const balAfter = balBefore + parseFloat(order.total_freight);
      await client.query(`UPDATE wallets SET balance = $1 WHERE id = $2`, [balAfter, w.id]);
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, order_id, description)
         VALUES ($1,'refund',$2,$3,$4,$5,$6)`,
        [w.id, order.total_freight, balBefore, balAfter, order.id, `Refund for cancelled order ${order.mozopost_order_id}`],
      );
    });

    res.json({ message: 'Order cancelled and freight refunded' });
  }),
);
