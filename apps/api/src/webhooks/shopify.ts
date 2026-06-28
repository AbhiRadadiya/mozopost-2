import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne } from '../db/pool';
import { ah, ApiError } from '../middleware';
import { env } from '../config/env';

export const shopifyWebhooksRouter = Router();

// Define a type so TS knows rawBody exists from our main.ts middleware
interface ShopifyWebhookRequest extends Request {
  rawBody?: string;
}

shopifyWebhooksRouter.post(
  '/',
  ah(async (req: ShopifyWebhookRequest, res: Response) => {
    const shopDomain = req.headers['x-shopify-shop-domain'] as string;
    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
    const topic = req.headers['x-shopify-topic'] as string;

    if (!shopDomain || !hmacHeader || !topic) {
      throw new ApiError(400, 'Missing required Shopify webhook headers');
    }

    if (!req.rawBody) {
      throw new ApiError(500, 'Raw body not captured for HMAC verification');
    }

    // 1. Verify HMAC Signature
    const clientSecret = env.SHOPIFY_CLIENT_SECRET;
    const generatedHash = crypto
      .createHmac('sha256', clientSecret)
      .update(req.rawBody, 'utf8')
      .digest('base64');

    if (generatedHash !== hmacHeader) {
      throw new ApiError(401, 'Invalid HMAC signature');
    }

    // 2. Find the store integration
    const store = await queryOne<any>(
      `SELECT id, seller_id, import_pending, import_prepaid, import_cod FROM store_integrations WHERE store_url = $1 AND is_active = true`,
      [`https://${shopDomain}`]
    );

    if (!store) {
      // Store might have uninstalled or is inactive
      return res.status(200).send('Store not active or not found');
    }

    // Respond to Shopify quickly
    res.status(200).send('Webhook received');

    // 3. Process the Webhook Payload asynchronously
    const orderData = req.body;
    console.log(`Processing Webhook [${topic}] for ${shopDomain}...`);
    
    // Process based on topic
    if (topic === 'orders/create') {
      await handleOrderCreate(store, orderData).catch(err => {
        console.error('Error handling order create:', err);
      });
      console.log(`Successfully processed [${topic}] for ${shopDomain}`);
    } else if (topic === 'orders/updated') {
      // Future: handle order updates
    } else if (topic === 'orders/cancelled') {
      // Future: handle order cancellations
    }
  })
);

async function handleOrderCreate(store: any, shopifyOrder: any) {
  // Determine Payment Mode
  const financialStatus = shopifyOrder.financial_status?.toLowerCase();
  let paymentMode = 'prepaid';
  if (financialStatus === 'pending' || shopifyOrder.gateway?.toLowerCase().includes('cod') || shopifyOrder.gateway?.toLowerCase().includes('cash')) {
    paymentMode = 'cod';
  }

  // Check sync settings
  if (paymentMode === 'cod' && !store.import_cod) return;
  if (paymentMode === 'prepaid' && !store.import_prepaid) return;
  if (financialStatus === 'pending' && !store.import_pending && paymentMode !== 'cod') return;

  const sellerOrderId = shopifyOrder.name || String(shopifyOrder.id);

  // Check if order already exists
  const existingOrder = await queryOne(
    `SELECT id FROM orders WHERE seller_id = $1 AND seller_order_id = $2`,
    [store.seller_id, sellerOrderId]
  );
  if (existingOrder) return; // Skip duplicates

  // Fetch a default warehouse for the seller
  const warehouse = await queryOne(
    `SELECT id FROM warehouses WHERE seller_id = $1 LIMIT 1`, 
    [store.seller_id]
  );
  const warehouseId = warehouse?.id;

  // Extract total weight in kg (Shopify weight is usually in grams)
  const deadWeightKg = (shopifyOrder.total_weight || 0) / 1000;

  // Extract address
  const address = shopifyOrder.shipping_address || shopifyOrder.billing_address || {};
  const phone = address.phone || shopifyOrder.phone || shopifyOrder.customer?.phone || '0000000000';
  const name = address.name || shopifyOrder.customer?.first_name + ' ' + shopifyOrder.customer?.last_name || 'Customer';

  // Map to local orders table
  const order = await queryOne<any>(
    `INSERT INTO orders (
      seller_id, seller_order_id, status, payment_mode, 
      consignee_name, consignee_phone, consignee_email, 
      consignee_address1, consignee_address2, consignee_city, consignee_state, consignee_pincode,
      warehouse_id, dead_weight_kg, declared_value, total_freight, cod_amount, channel
    ) VALUES (
      $1, $2, 'unprocessed', $3,
      $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, 0, $15, 'shopify'
    ) RETURNING id`,
    [
      store.seller_id, 
      sellerOrderId, 
      paymentMode,
      name, 
      phone, 
      shopifyOrder.email || '',
      address.address1 || '', 
      address.address2 || '', 
      address.city || '', 
      address.province || '', 
      address.zip || '',
      warehouseId, 
      deadWeightKg > 0 ? deadWeightKg : 0.5, // fallback 0.5kg
      shopifyOrder.current_subtotal_price || shopifyOrder.total_price || 0,
      paymentMode === 'cod' ? (shopifyOrder.total_price || 0) : 0
    ]
  );

  // Insert Line Items
  if (order && shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
    for (const item of shopifyOrder.line_items) {
      await query(
        `INSERT INTO order_items (order_id, sku, name, quantity, unit_price, weight_kg)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          item.sku || 'UNKNOWN',
          item.name || item.title || 'Product',
          item.quantity || 1,
          item.price || 0,
          (item.grams || 0) / 1000
        ]
      );
    }
  }

  // Update store stats
  await query(
    `UPDATE store_integrations SET total_imported = total_imported + 1, last_sync_at = NOW() WHERE id = $1`,
    [store.id]
  );
}
