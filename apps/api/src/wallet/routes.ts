import { Router } from 'express';
import crypto from 'crypto';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';
import { env } from '../config/env';

export const walletRouter = Router();
walletRouter.use(requireAuth, requireRole('seller'));

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller account');
  return req.user!.sellerId;
}

walletRouter.get(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const wallet = await queryOne(`SELECT * FROM wallets WHERE seller_id = $1`, [sellerId]);
    res.json({ wallet });
  }),
);

walletRouter.get(
  '/metrics',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const wallet = await queryOne<{ id: string; credit_outstanding: string }>(`SELECT id, credit_outstanding FROM wallets WHERE seller_id = $1`, [sellerId]);
    if (!wallet) throw new ApiError(404, 'Wallet not found');

    // 1. Withdrawn Till Date (sum of all debit/withdrawal transactions)
    const withdrawnRes = await queryOne<{ total: string }>(
      `SELECT SUM(amount) as total FROM wallet_transactions WHERE wallet_id = $1 AND type = 'debit'`,
      [wallet.id]
    );
    const withdrawn = parseFloat(withdrawnRes?.total || '0');

    // 2. 7 Days Avg Payments (average daily credit over the last 7 days)
    const sevenDaysRes = await queryOne<{ avg: string }>(
      `SELECT SUM(amount) / 7.0 as avg 
       FROM wallet_transactions 
       WHERE wallet_id = $1 
         AND type = 'credit' 
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [wallet.id]
    );
    const sevenDaysAvg = parseFloat(sevenDaysRes?.avg || '0');

    res.json({
      metrics: {
        withdrawnTillDate: withdrawn,
        sevenDaysAvgPayments: sevenDaysAvg,
        outstanding: parseFloat(wallet.credit_outstanding || '0'),
      },
    });
  }),
);

walletRouter.get(
  '/transactions',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const wallet = await queryOne<{ id: string }>(`SELECT id FROM wallets WHERE seller_id = $1`, [sellerId]);
    if (!wallet) throw new ApiError(404, 'Wallet not found');

    const { search, date } = req.query;
    let queryStr = `SELECT * FROM wallet_transactions WHERE wallet_id = $1`;
    const params: any[] = [wallet.id];

    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (description ILIKE $${params.length} OR payment_gateway_txn_id ILIKE $${params.length})`;
    }
    if (date) {
      params.push(date as string);
      queryStr += ` AND DATE(created_at) = $${params.length}`;
    }

    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    params.push(limit);
    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const txns = await query(queryStr, params);
    res.json({ transactions: txns });
  }),
);

/**
 * Creates a Razorpay order for wallet recharge. If RAZORPAY keys are not
 * configured, runs in mock mode: instantly credits the wallet so you can
 * test the full flow before connecting a real payment gateway.
 */
walletRouter.post(
  '/recharge/create',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const amount = parseFloat(req.body.amount);
    if (!amount || amount < 100) throw new ApiError(400, 'Minimum recharge amount is ₹100');

    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      // ── MOCK MODE: instantly credit wallet ──
      const wallet = await queryOne<{ id: string; balance: string }>(`SELECT id, balance FROM wallets WHERE seller_id = $1`, [sellerId]);
      if (!wallet) throw new ApiError(404, 'Wallet not found');
      const before = parseFloat(wallet.balance);
      const after = before + amount;
      await query(`UPDATE wallets SET balance = $1 WHERE id = $2`, [after, wallet.id]);
      await query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, description, payment_gateway_txn_id)
         VALUES ($1,'credit',$2,$3,$4,'Wallet recharge (mock — add RAZORPAY keys for live payments)',$5)`,
        [wallet.id, amount, before, after, `mock_${Date.now()}`],
      );
      return res.json({ mock: true, message: 'Wallet credited instantly (mock mode — no payment gateway configured)', newBalance: after });
    }

    // ── LIVE MODE: create a real Razorpay order ──
    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `wallet_${sellerId}_${Date.now()}`,
    });
    res.json({ mock: false, razorpayOrderId: order.id, amount, keyId: env.RAZORPAY_KEY_ID });
  }),
);

/** Verifies Razorpay payment signature and credits the wallet. Only used in live mode. */
walletRouter.post(
  '/recharge/verify',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    if (!env.RAZORPAY_KEY_SECRET) throw new ApiError(400, 'Razorpay not configured');

    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new ApiError(400, 'Payment signature verification failed');
    }

    const wallet = await queryOne<{ id: string; balance: string }>(`SELECT id, balance FROM wallets WHERE seller_id = $1`, [sellerId]);
    if (!wallet) throw new ApiError(404, 'Wallet not found');
    const before = parseFloat(wallet.balance);
    const after = before + parseFloat(amount);
    await query(`UPDATE wallets SET balance = $1 WHERE id = $2`, [after, wallet.id]);
    await query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, description, payment_gateway_txn_id)
       VALUES ($1,'credit',$2,$3,$4,'Wallet recharge via Razorpay',$5)`,
      [wallet.id, amount, before, after, razorpay_payment_id],
    );

    res.json({ message: 'Payment verified and wallet credited', newBalance: after });
  }),
);
