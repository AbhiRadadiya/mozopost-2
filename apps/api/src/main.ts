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
import { smtpRouter } from './smtp/routes';
import { referralRouter, adminReferralRouter } from './referral/routes';
import { futureCodRouter, adminFutureCodRouter, labelSettingsRouter } from './future-cod/routes';
import { developerApiRouter, adminDeveloperApiRouter } from './developer-api/routes';
import { storeIntegrationsRouter, adminStoreRouter } from './store-integrations/routes';
import { shopifyOAuthRouter } from './store-integrations/shopify-oauth';
import { riskRouter } from './risk/routes';
import { translationRouter, adminTranslationRouter } from './address-translation/routes';
import { adminTicketsRouter, ticketsRouter } from './tickets/routes';
import { adminCodRouter, codRouter } from './cod/routes';
import { settingsRouter } from './settings/routes';
import { pool } from './db/pool';

const app = express();

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
app.use(express.json({ limit: '10mb' }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// ── Auth ──────────────────────────────────────────────────────
app.use('/api/v1/auth',                    authRouter);

// ── Seller ────────────────────────────────────────────────────
app.use('/api/v1/orders',                  ordersRouter);
app.use('/api/v1/tracking',                trackingRouter);
app.use('/api/v1/wallet',                  walletRouter);
app.use('/api/v1/ndr',                     ndrRouter);
app.use('/api/v1/pickups',                 pickupsRouter);
app.use('/api/v1/weight-disputes',         weightDisputesRouter);
app.use('/api/v1/credit',                  creditRouter);
app.use('/api/v1/reports',                 reportsRouter);
app.use('/api/v1/referrals',               referralRouter);
app.use('/api/v1/future-cod',              futureCodRouter);
app.use('/api/v1/labels',                  labelSettingsRouter);
app.use('/api/v1/developer',               developerApiRouter);
app.use('/api/v1/stores/shopify',          shopifyOAuthRouter);
app.use('/api/v1/stores',                  storeIntegrationsRouter);
app.use('/api/v1/tickets',                 ticketsRouter);
app.use('/api/v1/cod',                     codRouter);
app.use('/api/v1/settings',                settingsRouter);

// ── Shared ────────────────────────────────────────────────────
app.use('/api/v1/couriers',                couriersRouter);
app.use('/api/v1/webhooks',                webhooksRouter);

// ── Master Admin ──────────────────────────────────────────────
app.use('/api/v1/admin',                   adminRouter);
app.use('/api/v1/admin/weight-disputes',   adminWeightDisputesRouter);
app.use('/api/v1/admin/credit',            adminCreditRouter);
app.use('/api/v1/admin/staff',             staffRouter);
app.use('/api/v1/admin/pickups',           adminPickupsRouter);
app.use('/api/v1/admin/referrals',         adminReferralRouter);
app.use('/api/v1/admin/future-cod',        adminFutureCodRouter);
app.use('/api/v1/admin/smtp',              smtpRouter);
app.use('/api/v1/admin/developer',         adminDeveloperApiRouter);
app.use('/api/v1/admin/stores',            adminStoreRouter);
app.use('/api/v1/admin/tickets',           adminTicketsRouter);
app.use('/api/v1/admin/cod',               adminCodRouter);

// ── Super Admin ───────────────────────────────────────────────
app.use('/api/v1/translations',             translationRouter);
app.use('/api/v1/admin/translations',       adminTranslationRouter);
app.use('/api/v1/super-admin',             superAdminRouter);
app.use('/api/v1/super-admin/roles',       rolesRouter);
app.use('/api/v1/super-admin/risk',        riskRouter);

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`\n🚀 Mozopost API on http://localhost:${env.PORT}`);
  console.log(`   Health: http://localhost:${env.PORT}/health\n`);
});
