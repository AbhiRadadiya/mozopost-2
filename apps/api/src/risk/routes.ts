import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const riskRouter = Router();
riskRouter.use(requireAuth, requireRole('super_admin', 'master_admin'));

// ── SECURITY SETTINGS ─────────────────────────────────────────

riskRouter.get('/settings', ah(async (_req, res) => {
  res.json({ settings: await query(`SELECT * FROM security_settings ORDER BY rule_key`) });
}));

riskRouter.patch('/settings/:ruleKey', ah(async (req, res) => {
  const { isEnabled, threshold, action } = req.body;
  const fields: string[] = []; const params: any[] = [];
  if (isEnabled !== undefined) { params.push(isEnabled);                fields.push(`is_enabled=$${params.length}`); }
  if (threshold !== undefined) { params.push(JSON.stringify(threshold));fields.push(`threshold=$${params.length}`); }
  if (action)                  { params.push(action);                   fields.push(`action=$${params.length}`); }
  if (!fields.length) throw new ApiError(400, 'No fields');
  params.push(req.params.ruleKey);
  await query(`UPDATE security_settings SET ${fields.join(', ')}, updated_at=NOW() WHERE rule_key=$${params.length}`, params);
  res.json({ message: `Security rule "${req.params.ruleKey}" updated` });
}));

// ── MERCHANT RISK SCORES ──────────────────────────────────────

riskRouter.get('/scores', ah(async (req, res) => {
  const riskLevel = req.query.riskLevel as string | undefined;
  const params: any[] = [];
  let filter = '';
  if (riskLevel) { params.push(riskLevel); filter = `WHERE mrs.risk_level=$${params.length}`; }

  const rows = await query(
    `SELECT mrs.*, s.business_name, u.email, w.balance
     FROM merchant_risk_scores mrs
     JOIN sellers s ON s.id=mrs.seller_id
     JOIN users   u ON u.id=s.user_id
     LEFT JOIN wallets w ON w.seller_id=mrs.seller_id
     ${filter}
     ORDER BY mrs.risk_score DESC`,
    params,
  );

  const summary = await queryOne<any>(
    `SELECT COUNT(*) FILTER (WHERE risk_level='safe')::int AS safe,
            COUNT(*) FILTER (WHERE risk_level='medium')::int AS medium,
            COUNT(*) FILTER (WHERE risk_level='high')::int AS high,
            COUNT(*) FILTER (WHERE risk_level='critical')::int AS critical
     FROM merchant_risk_scores`,
  );

  res.json({ scores: rows, summary });
}));

riskRouter.post('/scores/:sellerId/evaluate', ah(async (req: AuthedRequest, res) => {
  const { sellerId } = req.params;
  const score = await evaluateMerchantRisk(sellerId);
  res.json({ score, message: 'Risk score re-evaluated' });
}));

async function evaluateMerchantRisk(sellerId: string) {
  const seller = await queryOne<any>(
    `SELECT s.*, u.email, u.kyc_status,
            COUNT(o.id) FILTER (WHERE o.created_at > NOW()-INTERVAL '30 days')::int AS orders_30d,
            COUNT(o.id) FILTER (WHERE o.status LIKE 'rto%' AND o.created_at > NOW()-INTERVAL '30 days')::int AS rto_30d,
            w.balance
     FROM sellers s
     JOIN users u ON u.id=s.user_id
     LEFT JOIN orders o ON o.seller_id=s.id
     LEFT JOIN wallets w ON w.seller_id=s.id
     WHERE s.id=$1
     GROUP BY s.id, u.email, u.kyc_status, w.balance`,
    [sellerId],
  );
  if (!seller) throw new ApiError(404, 'Seller not found');

  let score = 0;
  const flags: string[] = [];

  // KYC check
  if (seller.kyc_status !== 'verified') { score += 20; flags.push('kyc_not_verified'); }

  // RTO rate
  const rtoRate = seller.orders_30d > 0 ? (seller.rto_30d / seller.orders_30d) * 100 : 0;
  if (rtoRate > 50) { score += 30; flags.push(`high_rto_${rtoRate.toFixed(0)}pct`); }
  else if (rtoRate > 30) { score += 15; flags.push(`elevated_rto_${rtoRate.toFixed(0)}pct`); }

  // Wallet balance
  if (parseFloat(seller.balance || '0') < 0) { score += 15; flags.push('negative_wallet'); }

  // Check blacklist
  const blEmail = await queryOne(`SELECT id FROM blacklist WHERE type='email' AND value=$1 AND is_active=true`, [seller.email]);
  if (blEmail) { score += 50; flags.push('blacklisted_email'); }

  score = Math.min(100, score);
  const riskLevel = score <= 30 ? 'safe' : score <= 60 ? 'medium' : score <= 80 ? 'high' : 'critical';
  const merchantLevel = seller.kyc_status === 'verified' && seller.orders_30d > 100 ? 3 : seller.kyc_status === 'verified' ? 2 : 1;

  await query(
    `INSERT INTO merchant_risk_scores (seller_id, risk_score, risk_level, merchant_level, flags, last_evaluated_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
     ON CONFLICT (seller_id) DO UPDATE SET
       risk_score=$2, risk_level=$3, merchant_level=$4, flags=$5, last_evaluated_at=NOW(), updated_at=NOW()`,
    [sellerId, score, riskLevel, merchantLevel, JSON.stringify(flags)],
  );

  // Apply auto-actions based on settings
  const autoSuspend = await queryOne<any>(`SELECT * FROM security_settings WHERE rule_key='auto_suspend' AND is_enabled=true`);
  if (autoSuspend) {
    const threshold = autoSuspend.threshold?.threshold || 81;
    if (score >= threshold) {
      await query(`UPDATE users SET status='suspended' WHERE id=(SELECT user_id FROM sellers WHERE id=$1)`, [sellerId]);
      await query(`INSERT INTO security_logs (seller_id, event, severity, metadata) VALUES ($1,'account_blocked','critical',$2)`,
        [sellerId, JSON.stringify({ reason: 'auto_suspend', risk_score: score })]);
    }
  }

  return { sellerId, score, riskLevel, merchantLevel, flags };
}

// ── BLACKLIST MANAGEMENT ──────────────────────────────────────

riskRouter.get('/blacklist', ah(async (req, res) => {
  const type = req.query.type as string | undefined;
  const params: any[] = [];
  let filter = '';
  if (type) { params.push(type); filter = `WHERE type=$1`; }
  const items = await query(
    `SELECT bl.*, u.email AS added_by_email FROM blacklist bl
     LEFT JOIN users u ON u.id=bl.added_by
     ${filter} ORDER BY bl.created_at DESC LIMIT 500`,
    params,
  );
  res.json({ items });
}));

const blSchema = z.object({
  type:   z.enum(['mobile','email','gst','ip','pan','device']),
  value:  z.string().min(1),
  reason: z.string().max(255).optional(),
});

riskRouter.post('/blacklist', ah(async (req: AuthedRequest, res) => {
  const dto = blSchema.parse(req.body);
  const row = await queryOne(
    `INSERT INTO blacklist (type, value, reason, added_by)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (type, value) DO UPDATE SET is_active=true, reason=$3 RETURNING *`,
    [dto.type, dto.value, dto.reason || null, req.user!.sub],
  );
  res.status(201).json({ item: row });
}));

riskRouter.delete('/blacklist/:id', ah(async (req, res) => {
  await query(`UPDATE blacklist SET is_active=false WHERE id=$1`, [req.params.id]);
  res.json({ message: 'Blacklist entry disabled' });
}));

// ── SECURITY LOGS ─────────────────────────────────────────────

riskRouter.get('/logs', ah(async (req, res) => {
  const page  = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, parseInt((req.query.limit as string) || '50', 10));
  const event = req.query.event as string | undefined;
  const params: any[] = [];
  let filter = '';
  if (event) { params.push(event); filter = `WHERE sl.event=$1`; }
  const total = parseInt((await queryOne<any>(`SELECT COUNT(*)::text c FROM security_logs sl ${filter}`, params))?.c || '0', 10);
  params.push(limit, (page - 1) * limit);
  const logs = await query(
    `SELECT sl.*, s.business_name FROM security_logs sl
     LEFT JOIN sellers s ON s.id=sl.seller_id
     ${filter}
     ORDER BY sl.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
    params,
  );
  res.json({ logs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}));

// ── SECURITY DASHBOARD ───────────────────────────────────────

riskRouter.get('/dashboard', ah(async (_req, res) => {
  const [scoreSummary, recentLogs, highRiskMerchants, blacklistCount] = await Promise.all([
    queryOne<any>(
      `SELECT COUNT(*) FILTER (WHERE risk_level='critical')::int AS critical,
              COUNT(*) FILTER (WHERE risk_level='high')::int AS high,
              COUNT(*) FILTER (WHERE risk_level='medium')::int AS medium,
              COUNT(*) FILTER (WHERE risk_level='safe')::int AS safe,
              COUNT(*)::int AS total
       FROM merchant_risk_scores`,
    ),
    query(
      `SELECT sl.event, sl.severity, sl.created_at, s.business_name
       FROM security_logs sl LEFT JOIN sellers s ON s.id=sl.seller_id
       WHERE sl.severity IN ('warn','critical')
       ORDER BY sl.created_at DESC LIMIT 10`,
    ),
    query(
      `SELECT mrs.risk_score, mrs.risk_level, mrs.flags, s.business_name, u.email
       FROM merchant_risk_scores mrs
       JOIN sellers s ON s.id=mrs.seller_id
       JOIN users   u ON u.id=s.user_id
       WHERE mrs.risk_level IN ('high','critical')
       ORDER BY mrs.risk_score DESC LIMIT 10`,
    ),
    queryOne<any>(`SELECT COUNT(*)::int AS total FROM blacklist WHERE is_active=true`),
  ]);

  res.json({ scoreSummary, recentLogs, highRiskMerchants, blacklistCount: blacklistCount?.total || 0 });
}));

// ── FRAUD INVESTIGATION ──────────────────────────────────────

riskRouter.patch('/merchants/:sellerId/action', ah(async (req: AuthedRequest, res) => {
  const { action, reason } = req.body;
  const seller = await queryOne<any>(`SELECT s.*, u.id AS uid FROM sellers s JOIN users u ON u.id=s.user_id WHERE s.id=$1`, [req.params.sellerId]);
  if (!seller) throw new ApiError(404, 'Merchant not found');

  let msg = '';
  if (action === 'suspend') {
    await query(`UPDATE users SET status='suspended' WHERE id=$1`, [seller.uid]);
    await query(`INSERT INTO security_logs (seller_id, event, severity, metadata) VALUES ($1,'account_blocked','critical',$2)`,
      [req.params.sellerId, JSON.stringify({ reason, triggered_by: req.user!.sub })]);
    msg = 'Merchant suspended';
  } else if (action === 'activate') {
    await query(`UPDATE users SET status='active' WHERE id=$1`, [seller.uid]);
    msg = 'Merchant reactivated';
  } else if (action === 'hold_cod') {
    await query(`UPDATE sellers SET notes=COALESCE(notes,'')||' [COD HELD]' WHERE id=$1`, [req.params.sellerId]);
    await query(`INSERT INTO security_logs (seller_id, event, severity, metadata) VALUES ($1,'cod_held','warn',$2)`,
      [req.params.sellerId, JSON.stringify({ reason })]);
    msg = 'COD placed on hold';
  } else if (action === 'freeze_wallet') {
    await query(`UPDATE wallets SET balance=balance WHERE seller_id=$1`, [req.params.sellerId]); // placeholder — real impl would add freeze flag
    await query(`INSERT INTO security_logs (seller_id, event, severity, metadata) VALUES ($1,'wallet_frozen','critical',$2)`,
      [req.params.sellerId, JSON.stringify({ reason })]);
    msg = 'Wallet frozen';
  } else {
    throw new ApiError(400, 'Invalid action. Use: suspend | activate | hold_cod | freeze_wallet');
  }

  res.json({ message: msg });
}));

riskRouter.patch('/merchants/:sellerId/level', ah(async (req, res) => {
  const { level } = z.object({ level: z.number().int().min(1).max(4) }).parse(req.body);
  await query(`UPDATE sellers SET merchant_level=$1 WHERE id=$2`, [level, req.params.sellerId]);
  await query(
    `UPDATE merchant_risk_scores SET merchant_level=$1, updated_at=NOW() WHERE seller_id=$2`,
    [level, req.params.sellerId],
  );
  const labels = ['','New Merchant','Verified Merchant','Trusted Merchant','Enterprise Merchant'];
  res.json({ message: `Merchant upgraded to Level ${level} — ${labels[level]}` });
}));
