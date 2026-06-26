import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

// ── FUTURE COD (/api/v1/future-cod) ───────────────────────────
export const futureCodRouter = Router();
futureCodRouter.use(requireAuth);

function sellerId(req: AuthedRequest) {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller');
  return req.user!.sellerId;
}

/** GET /  — seller's future COD requests */
futureCodRouter.get('/', requireRole('seller'), ah(async (req: AuthedRequest, res) => {
  const sid = sellerId(req);
  const requests = await query(
    `SELECT * FROM future_cod_requests WHERE seller_id=$1 ORDER BY created_at DESC`,
    [sid],
  );

  // Also get pending COD that could be requested
  const pending = await queryOne<any>(
    `SELECT COALESCE(SUM(cod_amount),0)::float AS total_pending_cod,
            COUNT(*) FILTER (WHERE status='delivered') AS delivered_orders
     FROM orders WHERE seller_id=$1 AND payment_mode='cod' AND status='delivered'`,
    [sid],
  );

  res.json({ requests, pendingCod: pending });
}));

const requestSchema = z.object({
  requestedAmt: z.number().positive().max(500000),
});

/** POST /  — seller requests advance COD release */
futureCodRouter.post('/', requireRole('seller'), ah(async (req: AuthedRequest, res) => {
  const sid = sellerId(req);
  const dto = requestSchema.parse(req.body);

  // Check no pending request already
  const existing = await queryOne(
    `SELECT id FROM future_cod_requests WHERE seller_id=$1 AND status='pending'`,
    [sid],
  );
  if (existing) throw new ApiError(409, 'You already have a pending Future COD request');

  const feePct   = 1.50;
  const feeAmt   = (dto.requestedAmt * feePct) / 100;
  const netAmt   = dto.requestedAmt - feeAmt;

  const row = await queryOne(
    `INSERT INTO future_cod_requests (seller_id, requested_amt, fee_pct, fee_amount, net_amount)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [sid, dto.requestedAmt, feePct, feeAmt, netAmt],
  );
  res.status(201).json({ request: row, message: 'Future COD request submitted for admin review' });
}));

// ── ADMIN FUTURE COD (/api/v1/admin/future-cod) ────────────────
export const adminFutureCodRouter = Router();
adminFutureCodRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

adminFutureCodRouter.get('/', ah(async (req, res) => {
  const status = req.query.status as string | undefined;
  const params: any[] = [];
  let where = '';
  if (status) { params.push(status); where = `WHERE fcr.status=$1`; }
  const rows = await query(
    `SELECT fcr.*, s.business_name, u.email,
            w.balance AS wallet_balance
     FROM future_cod_requests fcr
     JOIN sellers s ON s.id = fcr.seller_id
     JOIN users   u ON u.id = s.user_id
     JOIN wallets w ON w.seller_id = fcr.seller_id
     ${where}
     ORDER BY fcr.created_at DESC`,
    params,
  );
  res.json({ requests: rows });
}));

const reviewSchema = z.object({
  action:       z.enum(['approve', 'reject']),
  approvedAmt:  z.number().positive().optional(),
  adminNotes:   z.string().max(500).optional(),
});

adminFutureCodRouter.patch('/:id/review', ah(async (req: AuthedRequest, res) => {
  const dto = reviewSchema.parse(req.body);
  const fcr = await queryOne<any>(`SELECT * FROM future_cod_requests WHERE id=$1`, [req.params.id]);
  if (!fcr) throw new ApiError(404, 'Request not found');
  if (fcr.status !== 'pending') throw new ApiError(422, `Request is already ${fcr.status}`);

  if (dto.action === 'reject') {
    await query(
      `UPDATE future_cod_requests SET status='rejected', admin_notes=$1, reviewed_by=$2, reviewed_at=NOW() WHERE id=$3`,
      [dto.adminNotes || null, req.user!.sub, req.params.id],
    );
    return res.json({ message: 'Future COD request rejected' });
  }

  const approvedAmt = dto.approvedAmt ?? parseFloat(fcr.requested_amt);
  const feePct  = parseFloat(fcr.fee_pct);
  const feeAmt  = (approvedAmt * feePct) / 100;
  const netAmt  = approvedAmt - feeAmt;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE future_cod_requests SET status='approved', approved_amt=$1, fee_amount=$2, net_amount=$3,
       admin_notes=$4, reviewed_by=$5, reviewed_at=NOW() WHERE id=$6`,
      [approvedAmt, feeAmt, netAmt, dto.adminNotes || null, req.user!.sub, req.params.id],
    );
    // Credit wallet
    const w = (await client.query(`SELECT id,balance FROM wallets WHERE seller_id=$1`, [fcr.seller_id])).rows[0];
    if (!w) throw new ApiError(500, 'Wallet not found');
    const before = parseFloat(w.balance), after = before + netAmt;
    await client.query(`UPDATE wallets SET balance=$1 WHERE id=$2`, [after, w.id]);
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id,type,amount,balance_before,balance_after,description) VALUES ($1,'credit',$2,$3,$4,$5)`,
      [w.id, netAmt, before, after, `Future COD advance — ₹${approvedAmt.toFixed(2)} requested, ₹${feeAmt.toFixed(2)} fee, ₹${netAmt.toFixed(2)} credited`],
    );
    await client.query(`UPDATE future_cod_requests SET status='disbursed', disbursed_at=NOW() WHERE id=$1`, [req.params.id]);
  });

  res.json({ message: `₹${netAmt.toFixed(2)} credited to seller wallet (after ${feePct}% fee)`, netAmount: netAmt });
}));

// ── LABEL SETTINGS (/api/v1/labels/settings) ──────────────────
export const labelSettingsRouter = Router();
labelSettingsRouter.use(requireAuth, requireRole('seller'));

labelSettingsRouter.get('/settings', ah(async (req: AuthedRequest, res) => {
  const sid = sellerId(req);
  let settings = await queryOne(
    `SELECT ls.*, s.phone AS phone_number 
     FROM label_settings ls 
     JOIN sellers s ON s.id = ls.seller_id 
     WHERE ls.seller_id=$1`, [sid],
  );
  if (!settings) {
    const fresh = await queryOne(
      `INSERT INTO label_settings (seller_id) VALUES ($1) RETURNING *`, [sid],
    );
    const seller = await queryOne(`SELECT phone FROM sellers WHERE id=$1`, [sid]);
    settings = { ...fresh, phone_number: seller?.phone || '' };
  }
  res.json({ settings });
}));

const labelSettingsSchema = z.object({
  showLogo:       z.boolean().optional(),
  showBrandName:  z.boolean().optional(),
  showGst:        z.boolean().optional(),
  showReturnAddr: z.boolean().optional(),
  labelSize:      z.enum(['4x6','3x5','A5','A6']).optional(),
  templateId:     z.number().int().min(1).max(6).optional(),
  logoUrl:        z.string().url().optional().or(z.literal('')),
  brandName:      z.string().max(100).optional(),
  returnAddress:  z.string().max(500).optional(),
  showMobile:     z.boolean().optional(),
  labelImageUrl:  z.string().max(500).optional().or(z.literal('')),
});

labelSettingsRouter.patch('/settings', ah(async (req: AuthedRequest, res) => {
  const sid = sellerId(req);
  const dto = labelSettingsSchema.parse(req.body);
  const fields: string[] = [];
  const params: any[] = [];
  const map: Record<string, string> = {
    showLogo: 'show_logo', showBrandName: 'show_brand_name', showGst: 'show_gst',
    showReturnAddr: 'show_return_addr', labelSize: 'label_size', templateId: 'template_id',
    logoUrl: 'logo_url', brandName: 'brand_name', returnAddress: 'return_address',
    showMobile: 'show_mobile', labelImageUrl: 'label_image_url'
  };
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined && map[k]) {
      params.push(v);
      fields.push(`${map[k]}=$${params.length}`);
    }
  }
  if (!fields.length) throw new ApiError(400, 'No fields to update');
  params.push(sid);
  await query(
    `UPDATE label_settings SET ${fields.join(', ')}, updated_at=NOW() WHERE seller_id=$${params.length}`,
    params,
  );
  res.json({ message: 'Label settings saved' });
}));
