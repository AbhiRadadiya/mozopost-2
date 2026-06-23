import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware';
import { authRouter } from './auth/routes';
import { ordersRouter } from './orders/routes';
import { trackingRouter } from './tracking/routes';
import { walletRouter } from './wallet/routes';
import { ndrRouter } from './ndr/routes';
import { couriersRouter, adminRouter, superAdminRouter } from './admin/routes';
import { webhooksRouter } from './webhooks/routes';
import { weightDisputesRouter, adminWeightDisputesRouter } from './weight-disputes/routes';
import { creditRouter, adminCreditRouter } from './credit/routes';
import { rolesRouter, staffRouter } from './staff/routes';
import { reportsRouter } from './reports/routes';
import { pickupsRouter, adminPickupsRouter } from './pickups/routes';
import { pool } from './db/pool';

const app = express();

// Supports both env-variable CORS origins AND the fixed production domains
const CORS_ORIGINS = [
  'http://seller.mozopost.in',
  'http://admin.mozopost.in',
  'http://masteradmin.mozopost.in',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:4002',
  'http://localhost:4003',
  ...(env.CORS_ORIGINS || []),
];

app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// ── Auth ──
app.use('/api/v1/auth',                  authRouter);

// ── Seller ──
app.use('/api/v1/orders',                ordersRouter);
app.use('/api/v1/tracking',              trackingRouter);
app.use('/api/v1/wallet',                walletRouter);
app.use('/api/v1/ndr',                   ndrRouter);
app.use('/api/v1/pickups',               pickupsRouter);
app.use('/api/v1/weight-disputes',       weightDisputesRouter);
app.use('/api/v1/credit',                creditRouter);
app.use('/api/v1/reports',               reportsRouter);

// ── Shared ──
app.use('/api/v1/couriers',              couriersRouter);
app.use('/api/v1/webhooks',              webhooksRouter);

// ── Master Admin ──
app.use('/api/v1/admin',                 adminRouter);
app.use('/api/v1/admin/weight-disputes', adminWeightDisputesRouter);
app.use('/api/v1/admin/credit',          adminCreditRouter);
app.use('/api/v1/admin/staff',           staffRouter);
app.use('/api/v1/admin/pickups',         adminPickupsRouter);

// ── Super Admin ──
app.use('/api/v1/super-admin',           superAdminRouter);
app.use('/api/v1/super-admin/roles',     rolesRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`\n🚀 Mozopost API running on http://localhost:${env.PORT}`);
  console.log(`   Health:      http://localhost:${env.PORT}/health`);
  console.log(`   Environment: ${env.NODE_ENV}\n`);
});
