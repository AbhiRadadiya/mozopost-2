import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const storeIntegrationsRouter = Router();
storeIntegrationsRouter.use(requireAuth, requireRole('seller'));

function sid(req: AuthedRequest) {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller');
  return req.user!.sellerId;
}

// ── STORE CONNECTIONS ─────────────────────────────────────────

storeIntegrationsRouter.get('/', ah(async (req: AuthedRequest, res) => {
  const stores = await query(
    `SELECT id, platform, store_name, store_url, sync_interval_min,
            status, is_active, last_sync_at, last_sync_orders, last_error, total_imported, created_at,
            uuid
     FROM store_integrations WHERE seller_id=$1 ORDER BY created_at DESC`,
    [sid(req)],
  );
  res.json({ stores });
}));

const connectSchema = z.object({
  platform:        z.enum(['shopify']),
  storeName:       z.string().min(1).max(255),
  storeUrl:        z.string().url(),
  apiKey:          z.string().min(1),
  apiSecret:       z.string().optional(),
  accessToken:     z.string().optional(),
  syncIntervalMin: z.number().int().refine(v => [5,15,30,60].includes(v)).default(15),
});

storeIntegrationsRouter.post('/', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const dto = connectSchema.parse(req.body);
  const store = await queryOne(
    `INSERT INTO store_integrations
       (seller_id, platform, store_name, store_url, api_key_encrypted, api_secret_encrypted,
        access_token_encrypted, sync_interval_min)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [sellerId, dto.platform, dto.storeName, dto.storeUrl,
     dto.apiKey, dto.apiSecret || null, dto.accessToken || null,
     dto.syncIntervalMin],
  );
  res.status(201).json({ store, message: 'Store connected successfully.' });
}));

storeIntegrationsRouter.patch('/:id', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const allowed = ['store_name','sync_interval_min','is_active'];
  const fields: string[] = []; const params: any[] = [];
  const map: Record<string,string> = {
    storeName:'store_name', syncIntervalMin:'sync_interval_min', isActive:'is_active',
  };
  for (const [k, v] of Object.entries(req.body)) {
    const col = map[k] || k;
    if (allowed.includes(col)) { params.push(v); fields.push(`${col}=$${params.length}`); }
  }
  if (!fields.length) throw new ApiError(400, 'No valid fields');
  params.push(req.params.id, sellerId);
  await query(`UPDATE store_integrations SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${params.length-1} AND seller_id=$${params.length}`, params);
  res.json({ message: 'Store settings updated' });
}));

storeIntegrationsRouter.delete('/:id', ah(async (req: AuthedRequest, res) => {
  await query(`DELETE FROM store_integrations WHERE id=$1 AND seller_id=$2`, [req.params.id, sid(req)]);
  res.json({ message: 'Store disconnected' });
}));

/** POST /:id/sync — trigger manual sync */
storeIntegrationsRouter.post('/:id/sync', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const store = await queryOne<any>(`SELECT * FROM store_integrations WHERE id=$1 AND seller_id=$2`, [req.params.id, sellerId]);
  if (!store) throw new ApiError(404, 'Store not found');
  if (!store.is_active) throw new ApiError(422, 'Store is not active');

  await query(`UPDATE store_integrations SET status='syncing', updated_at=NOW() WHERE id=$1`, [store.id]);

  // In production this would call the actual platform API (Shopify/WooCommerce etc.)
  // For now we record the sync attempt and return mock data
  const syncLog = await queryOne(
    `INSERT INTO store_sync_logs (store_id, seller_id, status, orders_imported, started_at, completed_at)
     VALUES ($1,$2,'success',0,NOW(),NOW()) RETURNING *`,
    [store.id, sellerId],
  );
  await query(
    `UPDATE store_integrations SET status='idle', last_sync_at=NOW(), last_sync_orders=0, updated_at=NOW() WHERE id=$1`,
    [store.id],
  );

  res.json({ message: 'Sync completed (platform API call not yet configured)', syncLog });
}));

/** GET /:id/logs — sync history */
storeIntegrationsRouter.get('/:id/logs', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const store = await queryOne(`SELECT id FROM store_integrations WHERE id=$1 AND seller_id=$2`, [req.params.id, sellerId]);
  if (!store) throw new ApiError(404, 'Store not found');
  const logs = await query(
    `SELECT * FROM store_sync_logs WHERE store_id=$1 ORDER BY started_at DESC LIMIT 50`,
    [store.id],
  );
  res.json({ logs });
}));

/** GET /:id/dashboard  — stats widget data */
storeIntegrationsRouter.get('/dashboard', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const stores = await query(`SELECT id, platform, store_name, status, last_sync_at, total_imported FROM store_integrations WHERE seller_id=$1`, [sellerId]);
  const totalImported = stores.reduce((a: number, s: any) => a + (s.total_imported || 0), 0);
  const failedSyncs = parseInt((await queryOne<any>(`SELECT COUNT(*)::text c FROM store_sync_logs WHERE seller_id=$1 AND status='failed' AND started_at >= NOW()-INTERVAL '7 days'`, [sellerId]))?.c || '0', 10);

  res.json({ stores, connectedCount: stores.length, totalImported, failedSyncs });
}));

// ── ADMIN: enable/disable platforms ──────────────────────────────

export const adminStoreRouter = Router();
adminStoreRouter.use(requireAuth, requireRole('super_admin', 'master_admin'));

adminStoreRouter.get('/stats', ah(async (_req, res) => {
  const stats = await query(
    `SELECT platform, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active) AS active
     FROM store_integrations GROUP BY platform ORDER BY total DESC`,
  );
  res.json({ stats });
}));
