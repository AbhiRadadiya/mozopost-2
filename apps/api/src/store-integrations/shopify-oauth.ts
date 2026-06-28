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

  // Target new window open
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
  if (!sellerId || sellerId === 'undefined' || sellerId.length < 30) {
    throw new ApiError(400, 'Invalid state parameter: missing or malformed seller ID. Please initiate OAuth from the Mozopost dashboard.');
  }

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

  // Encrypt the access token before saving
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(clientSecret).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(accessToken, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const encryptedToken = iv.toString('hex') + ':' + encrypted;

  // 3. Store the integration in Mozopost Database
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
      [encryptedToken, existing.id]
    );
    storeId = existing.id;
  } else {
    const store = await queryOne(
      `INSERT INTO store_integrations
         (seller_id, platform, store_name, store_url, access_token_encrypted, sync_interval_min)
       VALUES ($1, 'shopify', $2, $3, $4, 15) RETURNING id`,
      [sellerId, shop, storeUrl, encryptedToken]
    );
    storeId = store.id;
  }

  // 4. Auto-register Webhooks via Shopify API
  const webhookUrl = `${env.APP_API_URL}/api/v1/webhooks/shopify`;
  const topics = ['orders/create', 'orders/updated', 'orders/cancelled'];
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-04';
  let allRegistered = true;
  
  for (const topic of topics) {
    try {
      const webhookResponse = await fetch(`https://${shop}/admin/api/${apiVersion}/webhooks.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          webhook: { topic, address: webhookUrl, format: 'json' },
        }),
      });

      if (!webhookResponse.ok) {
        if (webhookResponse.status === 422) {
          // 422 usually means the webhook address is already registered for this topic, so we can ignore it
          console.log(`Webhook ${topic} already registered for ${shop}`);
        } else {
          console.warn(`Failed to auto-register ${topic} webhook for shop ${shop}.`, await webhookResponse.text());
          allRegistered = false;
        }
      }
    } catch (err) {
      console.error(`Error registering ${topic} webhook for ${shop}:`, err);
      allRegistered = false;
    }
  }

  // Update DB flag if successful
  if (allRegistered) {
    await query(`UPDATE store_integrations SET webhook_registered = true WHERE id = $1`, [storeId]);
  }

  // Redirect back to the dashboard with success
  const frontendUrl = process.env.NODE_ENV === 'production' ? 'https://seller.mozopost.in' : 'http://localhost:3000';
  res.redirect(`${frontendUrl}/dashboard/stores?status=success&platform=shopify`);
}));
