import { query, queryOne } from '../db/pool';

export interface RateInput {
  courierId: string;
  sellerId: string;
  weightKg: number;
  paymentMode: 'prepaid' | 'cod';
  codAmount: number;
}

export interface RateResult {
  courierId: string;
  courierName: string;
  courierCode: string;
  baseFreight: number;
  codCharge: number;
  marginApplied: number;
  totalFreight: number;
}

export async function calculateRate(input: RateInput): Promise<RateResult | null> {
  const courier = await queryOne<{ id: string; name: string; code: string }>(
    `SELECT id, name, code FROM couriers WHERE id = $1 AND status = 'active'`,
    [input.courierId],
  );
  if (!courier) return null;

  const rateCard = await queryOne<{
    base_rate: string; additional_rate_per_kg: string; cod_charge_fixed: string; cod_charge_pct: string;
  }>(
    `SELECT base_rate, additional_rate_per_kg, cod_charge_fixed, cod_charge_pct
     FROM rate_cards
     WHERE courier_id = $1 AND is_active = true
       AND min_weight_kg <= $2 AND max_weight_kg >= $2
     ORDER BY base_rate ASC LIMIT 1`,
    [input.courierId, input.weightKg],
  );
  if (!rateCard) return null;

  const baseRate = parseFloat(rateCard.base_rate);
  const perKg = parseFloat(rateCard.additional_rate_per_kg);
  const codFixed = parseFloat(rateCard.cod_charge_fixed);
  const codPct = parseFloat(rateCard.cod_charge_pct);

  const baseFreight = baseRate + Math.max(0, input.weightKg - 0.5) * perKg;
  const codCharge = input.paymentMode === 'cod'
    ? Math.max(codFixed, (input.codAmount || 0) * (codPct / 100))
    : 0;

  const margin = await getMargin(input.sellerId, input.courierId);
  const marginApplied = margin.type === 'fixed' ? margin.value : baseFreight * (margin.value / 100);

  const totalFreight = Math.round((baseFreight + codCharge + marginApplied) * 100) / 100;

  return {
    courierId: courier.id,
    courierName: courier.name,
    courierCode: courier.code,
    baseFreight: Math.round(baseFreight * 100) / 100,
    codCharge: Math.round(codCharge * 100) / 100,
    marginApplied: Math.round(marginApplied * 100) / 100,
    totalFreight,
  };
}

async function getMargin(sellerId: string, courierId: string): Promise<{ type: 'fixed' | 'percentage'; value: number }> {
  let row = await queryOne<{ margin_type: string; margin_value: string }>(
    `SELECT margin_type, margin_value FROM margin_settings
     WHERE seller_id = $1 AND courier_id = $2 AND is_active = true LIMIT 1`,
    [sellerId, courierId],
  );
  if (!row) {
    row = await queryOne(
      `SELECT margin_type, margin_value FROM margin_settings
       WHERE seller_id = $1 AND courier_id IS NULL AND is_active = true LIMIT 1`,
      [sellerId],
    );
  }
  if (!row) {
    row = await queryOne(
      `SELECT margin_type, margin_value FROM margin_settings
       WHERE seller_id IS NULL AND courier_id IS NULL AND is_active = true LIMIT 1`,
    );
  }
  return row
    ? { type: row.margin_type as 'fixed' | 'percentage', value: parseFloat(row.margin_value) }
    : { type: 'fixed', value: 5 };
}

/** Picks the cheapest serviceable, enabled courier for this seller + destination. */
export async function autoAllocateCourier(
  sellerId: string,
  destPincode: string,
  weightKg: number,
  paymentMode: 'prepaid' | 'cod',
  codAmount: number,
): Promise<RateResult | null> {
  const enabledCouriers = await query<{ courier_id: string }>(
    `SELECT mca.courier_id FROM merchant_courier_access mca
     JOIN couriers c ON c.id = mca.courier_id
     WHERE mca.seller_id = $1 AND mca.is_enabled = true AND c.status = 'active'`,
    [sellerId],
  );
  if (!enabledCouriers.length) return null;

  const serviceable = await query<{ courier_id: string }>(
    `SELECT courier_id FROM courier_serviceability
     WHERE pincode = $1 AND supports_delivery = true
       AND courier_id = ANY($2::uuid[])
       ${paymentMode === 'cod' ? 'AND supports_cod = true' : ''}`,
    [destPincode, enabledCouriers.map((c) => c.courier_id)],
  );
  if (!serviceable.length) return null;

  const rates: RateResult[] = [];
  for (const s of serviceable) {
    const rate = await calculateRate({ courierId: s.courier_id, sellerId, weightKg, paymentMode, codAmount });
    if (rate) rates.push(rate);
  }
  if (!rates.length) return null;

  rates.sort((a, b) => a.totalFreight - b.totalFreight);
  return rates[0];
}
