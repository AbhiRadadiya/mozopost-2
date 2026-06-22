import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function req(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    console.error(`❌ Missing required environment variable: ${name}`);
    console.error('   Copy apps/api/.env.example to apps/api/.env and fill it in.');
    process.exit(1);
  }
  return val;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  DATABASE_URL: req('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL || '',

  JWT_SECRET: req('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_DAYS: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '30', 10),

  CREDENTIALS_ENCRYPTION_KEY: process.env.CREDENTIALS_ENCRYPTION_KEY || '',

  // Payments
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',

  // SMS
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || 'MOZPST',
  MSG91_OTP_TEMPLATE_ID: process.env.MSG91_OTP_TEMPLATE_ID || '',

  // Email
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@mozopost.in',

  // Couriers — presence of these flags whether each adapter runs live or mock
  COURIERS: {
    delhivery: { apiKey: process.env.DELHIVERY_API_KEY || '', baseUrl: process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com' },
    bluedart: { loginId: process.env.BLUEDART_LOGIN_ID || '', licenseKey: process.env.BLUEDART_LICENSE_KEY || '' },
    dtdc: { apiKey: process.env.DTDC_API_KEY || '', customerCode: process.env.DTDC_CUSTOMER_CODE || '' },
    ekart: { apiKey: process.env.EKART_API_KEY || '', merchantId: process.env.EKART_MERCHANT_ID || '' },
    shadowfax: { apiKey: process.env.SHADOWFAX_API_KEY || '' },
    xpressbees: { email: process.env.XPRESSBEES_EMAIL || '', password: process.env.XPRESSBEES_PASSWORD || '' },
    ecomexpress: { username: process.env.ECOMEXPRESS_USERNAME || '', password: process.env.ECOMEXPRESS_PASSWORD || '' },
    amazon_shipping: { clientId: process.env.AMAZON_SHIPPING_CLIENT_ID || '', clientSecret: process.env.AMAZON_SHIPPING_CLIENT_SECRET || '' },
    india_post: { apiKey: process.env.INDIA_POST_API_KEY || '' },
    gati: { apiKey: process.env.GATI_API_KEY || '' },
    dlh: { apiKey: process.env.DLH_API_KEY || '' },
  },
};

export function isCourierLive(code: keyof typeof env.COURIERS): boolean {
  const creds = env.COURIERS[code] as Record<string, string>;
  return Object.values(creds).some((v) => v && v.length > 0);
}
