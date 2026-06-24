import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const developerApiRouter = Router();
developerApiRouter.use(requireAuth, requireRole('seller'));

function sid(req: AuthedRequest) {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller');
  return req.user!.sellerId;
}

function generateApiKey() {
  return 'mp_live_' + crypto.randomBytes(20).toString('hex');
}
function generateSecretKey() {
  return 'mp_secret_' + crypto.randomBytes(24).toString('hex');
}

const ALL_PERMISSIONS = [
  'create_orders','cancel_orders','generate_awb','track_orders',
  'ndr_api','rto_api','pickup_api','webhooks','cod_api','label_api',
];

// ── API KEYS ────────────────────────────────────────────────────

developerApiRouter.get('/keys', ah(async (req: AuthedRequest, res) => {
  const keys = await query(
    `SELECT id, name, api_key, permissions, is_active, last_used_at, expires_at, created_at
     FROM api_keys WHERE seller_id=$1 ORDER BY created_at DESC`,
    [sid(req)],
  );
  res.json({ keys, availablePermissions: ALL_PERMISSIONS });
}));

const createKeySchema = z.object({
  name:        z.string().min(1).max(100).default('Default'),
  permissions: z.array(z.string()).default(ALL_PERMISSIONS),
  expiresAt:   z.string().optional(),
});

developerApiRouter.post('/keys', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const dto = createKeySchema.parse(req.body);

  // Max 5 keys per seller
  const count = parseInt((await queryOne<any>(`SELECT COUNT(*)::text c FROM api_keys WHERE seller_id=$1`, [sellerId]))?.c || '0', 10);
  if (count >= 5) throw new ApiError(422, 'Maximum 5 API keys per account');

  const key = await queryOne(
    `INSERT INTO api_keys (seller_id, name, api_key, secret_key, permissions, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [sellerId, dto.name, generateApiKey(), generateSecretKey(), JSON.stringify(dto.permissions), dto.expiresAt || null],
  );
  res.status(201).json({ key });
}));

developerApiRouter.patch('/keys/:id/regenerate', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const key = await queryOne<any>(`SELECT * FROM api_keys WHERE id=$1 AND seller_id=$2`, [req.params.id, sellerId]);
  if (!key) throw new ApiError(404, 'API key not found');
  const updated = await queryOne(
    `UPDATE api_keys SET api_key=$1, secret_key=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
    [generateApiKey(), generateSecretKey(), key.id],
  );
  res.json({ key: updated, message: 'API key regenerated — update your integrations immediately' });
}));

developerApiRouter.patch('/keys/:id', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const { isActive, permissions, name } = req.body;
  const fields: string[] = []; const params: any[] = [];
  if (isActive !== undefined)  { params.push(isActive);                      fields.push(`is_active=$${params.length}`); }
  if (permissions)             { params.push(JSON.stringify(permissions));    fields.push(`permissions=$${params.length}`); }
  if (name)                    { params.push(name);                          fields.push(`name=$${params.length}`); }
  if (!fields.length) throw new ApiError(400, 'No fields');
  params.push(req.params.id, sellerId);
  await query(`UPDATE api_keys SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${params.length-1} AND seller_id=$${params.length}`, params);
  res.json({ message: 'API key updated' });
}));

developerApiRouter.delete('/keys/:id', ah(async (req: AuthedRequest, res) => {
  await query(`DELETE FROM api_keys WHERE id=$1 AND seller_id=$2`, [req.params.id, sid(req)]);
  res.json({ message: 'API key deleted' });
}));

// ── IP WHITELIST ─────────────────────────────────────────────────

developerApiRouter.get('/ip-whitelist', ah(async (req: AuthedRequest, res) => {
  res.json({ ips: await query(`SELECT * FROM api_ip_whitelist WHERE seller_id=$1 ORDER BY created_at DESC`, [sid(req)]) });
}));

const ipSchema = z.object({
  ipAddress: z.string().min(7).max(50),
  label:     z.string().max(100).optional(),
});

developerApiRouter.post('/ip-whitelist', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const dto = ipSchema.parse(req.body);
  const row = await queryOne(
    `INSERT INTO api_ip_whitelist (seller_id, ip_address, label)
     VALUES ($1,$2,$3) ON CONFLICT (seller_id, ip_address) DO UPDATE SET label=$3, is_active=true RETURNING *`,
    [sellerId, dto.ipAddress, dto.label || null],
  );
  res.status(201).json({ ip: row });
}));

developerApiRouter.delete('/ip-whitelist/:id', ah(async (req: AuthedRequest, res) => {
  await query(`DELETE FROM api_ip_whitelist WHERE id=$1 AND seller_id=$2`, [req.params.id, sid(req)]);
  res.json({ message: 'IP removed from whitelist' });
}));

// ── WEBHOOKS ─────────────────────────────────────────────────────

const WEBHOOK_EVENTS = [
  'order.created','order.booked','order.picked','order.in_transit',
  'order.out_for_delivery','order.delivered','order.rto','order.cancelled',
  'ndr.created','cod.settled','pickup.scheduled','pickup.failed',
  'weight_dispute.raised','weight_dispute.resolved',
];

developerApiRouter.get('/webhooks', ah(async (req: AuthedRequest, res) => {
  res.json({
    webhooks: await query(`SELECT id,url,events,status,failure_count,last_triggered_at,last_response_code,created_at FROM webhook_endpoints WHERE seller_id=$1 ORDER BY created_at DESC`, [sid(req)]),
    availableEvents: WEBHOOK_EVENTS,
  });
}));

const webhookSchema = z.object({
  url:    z.string().url(),
  events: z.array(z.string()).min(1),
});

developerApiRouter.post('/webhooks', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const dto = webhookSchema.parse(req.body);
  const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');
  const row = await queryOne(
    `INSERT INTO webhook_endpoints (seller_id, url, secret, events)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [sellerId, dto.url, secret, JSON.stringify(dto.events)],
  );
  res.status(201).json({ webhook: row, message: 'Store the signing secret — it will not be shown again' });
}));

developerApiRouter.patch('/webhooks/:id', ah(async (req: AuthedRequest, res) => {
  const { url, events, status } = req.body;
  const fields: string[] = []; const params: any[] = [];
  if (url)    { params.push(url);                  fields.push(`url=$${params.length}`); }
  if (events) { params.push(JSON.stringify(events)); fields.push(`events=$${params.length}`); }
  if (status) { params.push(status);               fields.push(`status=$${params.length}`); }
  if (!fields.length) throw new ApiError(400, 'No fields');
  params.push(req.params.id, sid(req));
  await query(`UPDATE webhook_endpoints SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${params.length-1} AND seller_id=$${params.length}`, params);
  res.json({ message: 'Webhook updated' });
}));

developerApiRouter.delete('/webhooks/:id', ah(async (req: AuthedRequest, res) => {
  await query(`DELETE FROM webhook_endpoints WHERE id=$1 AND seller_id=$2`, [req.params.id, sid(req)]);
  res.json({ message: 'Webhook deleted' });
}));

/** POST /webhooks/:id/test — send a test ping to the endpoint */
developerApiRouter.post('/webhooks/:id/test', ah(async (req: AuthedRequest, res) => {
  const wh = await queryOne<any>(`SELECT * FROM webhook_endpoints WHERE id=$1 AND seller_id=$2`, [req.params.id, sid(req)]);
  if (!wh) throw new ApiError(404, 'Webhook not found');

  const payload = JSON.stringify({ event: 'webhook.test', timestamp: new Date().toISOString(), data: { message: 'This is a test ping from Mozopost' } });
  const sig = crypto.createHmac('sha256', wh.secret).update(payload).digest('hex');

  try {
    const { default: axios } = await import('axios');
    const resp = await axios.post(wh.url, JSON.parse(payload), {
      headers: { 'Content-Type': 'application/json', 'X-Mozopost-Signature': `sha256=${sig}` },
      timeout: 10000,
    });
    await query(`UPDATE webhook_endpoints SET last_triggered_at=NOW(), last_response_code=$1, failure_count=0 WHERE id=$2`, [resp.status, wh.id]);
    res.json({ success: true, statusCode: resp.status, message: 'Test webhook delivered successfully' });
  } catch (err: any) {
    const code = err.response?.status || 0;
    await query(`UPDATE webhook_endpoints SET last_triggered_at=NOW(), last_response_code=$1, failure_count=failure_count+1 WHERE id=$2`, [code, wh.id]);
    throw new ApiError(502, `Webhook test failed: ${err.message}`);
  }
}));

// ── API LOGS ─────────────────────────────────────────────────────

developerApiRouter.get('/logs', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const page  = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(50, parseInt((req.query.limit as string) || '20', 10));
  const status = req.query.status as string | undefined;
  const params: any[] = [sellerId];
  let filter = '';
  if (status === 'error')   { filter = 'AND al.status_code >= 400'; }
  if (status === 'success') { filter = 'AND al.status_code < 400'; }

  const total = parseInt((await queryOne<any>(`SELECT COUNT(*)::text c FROM api_logs al WHERE al.seller_id=$1 ${filter}`, params))?.c || '0', 10);
  params.push(limit, (page - 1) * limit);
  const logs = await query(
    `SELECT al.id, al.method, al.path, al.status_code, al.response_time_ms, al.ip_address, al.error_message, al.created_at,
            ak.name AS key_name
     FROM api_logs al LEFT JOIN api_keys ak ON ak.id=al.api_key_id
     WHERE al.seller_id=$1 ${filter}
     ORDER BY al.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
    params,
  );

  // Stats
  const stats = await queryOne<any>(
    `SELECT COUNT(*)::int AS total_today,
            COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors_today,
            ROUND(AVG(response_time_ms)::numeric, 0)::int AS avg_response_ms
     FROM api_logs WHERE seller_id=$1 AND created_at >= NOW() - INTERVAL '24 hours'`,
    [sellerId],
  );

  res.json({ logs, stats, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}));

// ── ADMIN: manage all API keys globally ──────────────────────────

export const adminDeveloperApiRouter = Router();
adminDeveloperApiRouter.use(requireAuth, requireRole('super_admin', 'master_admin'));

adminDeveloperApiRouter.get('/keys', ah(async (req, res) => {
  const rows = await query(
    `SELECT ak.*, s.business_name, u.email
     FROM api_keys ak JOIN sellers s ON s.id=ak.seller_id JOIN users u ON u.id=s.user_id
     ORDER BY ak.created_at DESC LIMIT 100`,
  );
  res.json({ keys: rows });
}));

adminDeveloperApiRouter.patch('/keys/:id/status', ah(async (req, res) => {
  await query(`UPDATE api_keys SET is_active=$1, updated_at=NOW() WHERE id=$2`, [req.body.isActive, req.params.id]);
  res.json({ message: 'API key status updated' });
}));

adminDeveloperApiRouter.get('/logs', ah(async (req, res) => {
  const page  = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, parseInt((req.query.limit as string) || '50', 10));
  const rows = await query(
    `SELECT al.*, s.business_name, ak.name AS key_name
     FROM api_logs al
     LEFT JOIN sellers s  ON s.id=al.seller_id
     LEFT JOIN api_keys ak ON ak.id=al.api_key_id
     ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit],
  );
  res.json({ logs: rows });
}));
