import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';
import { env } from '../config/env';

export const shopifyOAuthRouter = Router();

/**
 * GET /api/v1/stores/shopify/auth-url
 * Returns the Shopify OAuth authorization URL.
 * Protected route so we can securely associate the OAuth flow with the logged-in seller.
 */
shopifyOAuthRouter.get('/auth-url', requireAuth, requireRole('seller'), ah(async (req: AuthedRequest, res: Response) => {
  const shop = req.query.shop as string;
  const sellerId = req.user!.sellerId;

  if (!shop) {
    throw new ApiError(400, 'Missing shop domain');
  }

  const clientId = env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    throw new ApiError(500, 'Shopify OAuth is not configured on this server');
  }

  const scopes = 'read_orders,read_products,read_customers';
  // Use SHOPIFY_CALLBACK_URL from env if available, else construct it
  const redirectUri = env.SHOPIFY_CALLBACK_URL || `${env.APP_API_URL}/api/v1/stores/shopify/callback`;
  
  // Pass sellerId in state so the callback knows which seller to link
  const state = sellerId; 

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

  res.json({ url: authUrl });
}));

/**
 * GET /api/v1/stores/shopify/callback
 * Handles the redirect back from Shopify after user grants permissions
 */
shopifyOAuthRouter.get('/callback', ah(async (req: Request, res: Response) => {
  const { shop, code, hmac, state } = req.query;

  if (!shop || !code || !hmac || !state) {
    throw new ApiError(400, 'Missing required parameters from Shopify');
  }

  const sellerId = state as string;
  const clientId = env.SHOPIFY_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET;

  // 1. Verify HMAC
  const map = { ...req.query };
  delete map.hmac;
  const message = Object.keys(map)
    .sort()
    .map(key => `${key}=${map[key]}`)
    .join('&');

  const generatedHash = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('hex');

  if (generatedHash !== hmac) {
    throw new ApiError(401, 'HMAC validation failed');
  }

  // 2. Exchange code for access token
  const accessTokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!accessTokenResponse.ok) {
    const errText = await accessTokenResponse.text();
    throw new ApiError(500, `Failed to get access token from Shopify: ${errText}`);
  }

  const data = await accessTokenResponse.json() as any;
  const accessToken = data.access_token;

  // 3. Store the integration in Mozopost Database
  const webhookSecret = 'whstore_' + crypto.randomBytes(16).toString('hex');
  const storeUrl = `https://${shop}`;
  
  // Check if store already exists for this seller
  const existing = await queryOne(
    `SELECT id FROM store_integrations WHERE seller_id=$1 AND store_url=$2`,
    [sellerId, storeUrl]
  );

  let storeId;

  if (existing) {
    await query(
      `UPDATE store_integrations 
       SET access_token_encrypted = $1, is_active = true, updated_at = NOW() 
       WHERE id = $2`,
      [accessToken, existing.id]
    );
    storeId = existing.id;
  } else {
    const store = await queryOne(
      `INSERT INTO store_integrations
         (seller_id, platform, store_name, store_url, access_token_encrypted, webhook_secret, sync_interval_min, auto_sync,
          import_pending, import_prepaid, import_cod, push_tracking, push_awb)
       VALUES ($1, 'shopify', $2, $3, $4, $5, 15, true, true, true, true, true, true) RETURNING id`,
      [sellerId, shop, storeUrl, accessToken, webhookSecret]
    );
    storeId = store.id;
  }

  // 4. Auto-register Webhooks via Shopify API
  const webhookUrl = `${env.APP_API_URL}/api/v1/webhooks/shopify/${storeId}`;
  
  try {
    const webhookResponse = await fetch(`https://${shop}/admin/api/2024-04/webhooks.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        webhook: {
          topic: 'orders/create',
          address: webhookUrl,
          format: 'json',
        },
      }),
    });

    if (!webhookResponse.ok) {
      console.warn(`Failed to auto-register webhook for shop ${shop}.`, await webhookResponse.text());
    }
  } catch (err) {
    console.error(`Error registering webhook for ${shop}:`, err);
  }

  // Redirect back to the dashboard with success
  const frontendUrl = process.env.NODE_ENV === 'production' ? 'https://seller.mozopost.in' : 'http://localhost:3000';
  res.redirect(`${frontendUrl}/dashboard/stores?status=success&platform=shopify`);
}));
