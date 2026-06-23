import { query, queryOne } from '../db/pool';

const FAKE_NUMBERS = new Set([
  '9999999999', '8888888888', '7777777777', '6666666666',
  '1234567890', '9876543210', '1111111111', '0000000000',
  '5555555555', '2222222222', '3333333333', '4444444444',
]);

export interface FraudCheckInput {
  sellerId: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  paymentMode: 'prepaid' | 'cod';
  codAmount: number;
}

export interface FraudFlag {
  type: 'error' | 'warning';
  code: string;
  message: string;
}

export interface FraudResult {
  score: number;
  band: 'safe' | 'medium_risk' | 'high_risk' | 'fraud_alert';
  flags: FraudFlag[];
  serviceable: boolean;
  recommendation: string[];
}

export async function runFraudCheck(input: FraudCheckInput): Promise<FraudResult> {
  const flags: FraudFlag[] = [];
  let score = 100;

  // 1. Address length
  const addrLen = input.address.length;
  if (addrLen > 0 && addrLen < 30) {
    flags.push({ type: 'error', code: 'short_address', message: `Address too short (${addrLen} chars) — delivery failure risk HIGH` });
    score -= 25;
  }

  // 2. Missing fields
  const missing: string[] = [];
  if (!/\d/.test(input.address)) missing.push('house number');
  if (!input.city) missing.push('city');
  if (!input.state) missing.push('state');
  if (missing.length) {
    flags.push({ type: 'warning', code: 'incomplete_address', message: `Possibly missing: ${missing.join(', ')}` });
    score -= missing.length * 8;
  }

  // 3. Fake mobile blacklist
  const fakeNumber = FAKE_NUMBERS.has(input.mobile);
  if (fakeNumber) {
    flags.push({ type: 'error', code: 'fake_mobile', message: 'Mobile number is on fraud blacklist' });
    score -= 35;
  }

  // 4. Duplicate customer (same mobile, last 30 days)
  const dup = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM orders
     WHERE seller_id = $1 AND consignee_phone = $2 AND created_at > NOW() - INTERVAL '30 days'`,
    [input.sellerId, input.mobile],
  );
  const duplicateCount = parseInt(dup?.count || '0', 10);
  if (duplicateCount > 0) {
    flags.push({ type: 'warning', code: 'duplicate_customer', message: `${duplicateCount} order(s) from this mobile in last 30 days` });
    score -= 20;
  }

  // 5. RTO history for this mobile
  const rto = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM orders
     WHERE seller_id = $1 AND consignee_phone = $2 AND status::text LIKE 'rto%'`,
    [input.sellerId, input.mobile],
  );
  const rtoCount = parseInt(rto?.count || '0', 10);
  if (rtoCount > 0) {
    flags.push({ type: 'warning', code: 'rto_history', message: `${rtoCount} previous RTO order(s) from this customer` });
    score -= 20;
  }

  // 6. Failed deliveries in last 60 days
  const failed = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM orders
     WHERE seller_id = $1 AND consignee_phone = $2 AND status = 'failed'
     AND created_at > NOW() - INTERVAL '60 days'`,
    [input.sellerId, input.mobile],
  );
  const failedCount = parseInt(failed?.count || '0', 10);
  if (failedCount >= 3) {
    flags.push({ type: 'error', code: 'high_fail_rate', message: `${failedCount} failed deliveries in last 60 days — fraud risk` });
    score -= 25;
  }

  // 7. High value COD
  if (input.paymentMode === 'cod' && input.codAmount > 5000) {
    flags.push({ type: 'warning', code: 'high_cod', message: `High value COD ₹${input.codAmount.toLocaleString('en-IN')}` });
    score -= 10;
  }

  // 8. Serviceability
  const pin = await queryOne<{ pincode: string }>(`SELECT pincode FROM pincode_master WHERE pincode = $1`, [input.pincode]);
  const serviceable = !!pin;
  if (input.pincode && !serviceable) {
    flags.push({ type: 'error', code: 'not_serviceable', message: 'Pincode not in serviceable database' });
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));

  let band: FraudResult['band'];
  if (score >= 90) band = 'safe';
  else if (score >= 70) band = 'medium_risk';
  else if (score >= 50) band = 'high_risk';
  else band = 'fraud_alert';

  const recommendation = buildRecommendation(score, flags);

  return { score, band, flags, serviceable, recommendation };
}

function buildRecommendation(score: number, flags: FraudFlag[]): string[] {
  if (score < 50) return ['Block shipment immediately', 'Flag for fraud team', 'Do not process COD'];
  if (flags.some((f) => f.code === 'fake_mobile')) return ['Verify via OTP before shipping', 'Switch to prepaid only'];
  if (flags.some((f) => f.code === 'rto_history')) return ['Require OTP confirmation', 'Limit COD amount'];
  if (flags.some((f) => f.code === 'high_cod')) return ['Send OTP to customer', 'Verify delivery address'];
  if (score >= 90) return ['Safe to ship — auto-approve'];
  return ['Verify customer before shipping', 'Review address details'];
}

/** Generates a 6-digit OTP. In production, send via SMS provider (see services/sms.ts). */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
