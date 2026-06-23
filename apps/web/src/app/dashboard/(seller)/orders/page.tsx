'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

interface Courier {
  id: string;
  name: string;
  code: string;
  is_enabled: boolean;
  isLive: boolean;
}

interface FraudFlag {
  type: 'error' | 'warning';
  code: string;
  message: string;
}

interface FraudResult {
  score: number;
  band: 'safe' | 'medium_risk' | 'high_risk' | 'fraud_alert';
  flags: FraudFlag[];
  serviceable: boolean;
  recommendation: string[];
}

const BAND_STYLE: Record<string, { bg: string; label: string }> = {
  safe: { bg: 'bg-c3', label: '✓ Safe' },
  medium_risk: { bg: 'bg-c4', label: '⚠ Medium Risk' },
  high_risk: { bg: 'bg-c2 text-white', label: '⚠ High Risk' },
  fraud_alert: { bg: 'bg-[#e879f9] text-white', label: '🚨 Fraud Alert' },
};

const emptyForm = {
  consigneeName: '',
  consigneePhone: '',
  consigneeAddress1: '',
  consigneeCity: '',
  consigneeState: '',
  consigneePincode: '',
  paymentMode: 'prepaid' as 'prepaid' | 'cod',
  codAmount: 0,
  deadWeightKg: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  declaredValue: '',
  courierId: '',
};

export default function OrdersPage() {
  const [form, setForm] = useState(emptyForm);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [fraud, setFraud] = useState<FraudResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    api.get('/couriers').then((r) => setCouriers(r.data.couriers.filter((c: Courier) => c.is_enabled !== false)));
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoadingOrders(true);
    try {
      const { data } = await api.get('/orders', { params: { limit: 15 } });
      setOrders(data.data);
    } catch {
      /* non-fatal */
    } finally {
      setLoadingOrders(false);
    }
  }

  function set(k: keyof typeof form, v: any) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  // Debounced fraud check whenever key fields change
  useEffect(() => {
    if (!form.consigneePhone || form.consigneePhone.length < 10) {
      setFraud(null);
      return;
    }
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const { data } = await api.post('/orders/fraud-check', {
          mobile: form.consigneePhone,
          address: form.consigneeAddress1,
          city: form.consigneeCity,
          state: form.consigneeState,
          pincode: form.consigneePincode,
          paymentMode: form.paymentMode,
          codAmount: form.codAmount,
        });
        setFraud(data);
      } catch {
        /* non-fatal — fraud check is advisory */
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.consigneePhone, form.consigneeAddress1, form.consigneeCity, form.consigneeState, form.consigneePincode, form.paymentMode, form.codAmount]);

  function calcVolWeight(): number {
    const l = parseFloat(form.lengthCm) || 0;
    const w = parseFloat(form.widthCm) || 0;
    const h = parseFloat(form.heightCm) || 0;
    return l && w && h ? (l * w * h) / 5000 : 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const payload = {
        consigneeName: form.consigneeName,
        consigneePhone: form.consigneePhone,
        consigneeAddress1: form.consigneeAddress1,
        consigneeCity: form.consigneeCity,
        consigneeState: form.consigneeState,
        consigneePincode: form.consigneePincode,
        paymentMode: form.paymentMode,
        codAmount: form.paymentMode === 'cod' ? Number(form.codAmount) : 0,
        deadWeightKg: Number(form.deadWeightKg),
        lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
        widthCm: form.widthCm ? Number(form.widthCm) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        declaredValue: form.declaredValue ? Number(form.declaredValue) : 0,
        courierId: form.courierId || undefined,
      };
      const { data } = await api.post('/orders', payload);
      setSuccess(
        `Order ${data.order.mozopost_order_id} booked! AWB: ${data.order.awb_number}${data.courierMock ? ' (mock courier — add API keys for live booking)' : ''}`,
      );
      setForm(emptyForm);
      setFraud(null);
      loadOrders();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const band = fraud ? BAND_STYLE[fraud.band] : null;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Create Order</h1>

      <div className="grid grid-cols-[1fr_320px] items-start gap-4">
        {/* ── FORM ── */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHead className="bg-black text-white">
              <span className="text-sm font-bold">📦 Customer Details</span>
            </CardHead>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Consignee name" required>
                  <Input value={form.consigneeName} onChange={(e) => set('consigneeName', e.target.value)} required />
                </Field>
                <Field label="Mobile" required>
                  <Input
                    value={form.consigneePhone}
                    onChange={(e) => set('consigneePhone', e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    required
                  />
                </Field>
              </div>
              <Field label="Address" required>
                <textarea
                  className="nb-input w-full resize-y"
                  rows={2}
                  value={form.consigneeAddress1}
                  onChange={(e) => set('consigneeAddress1', e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City" required>
                  <Input value={form.consigneeCity} onChange={(e) => set('consigneeCity', e.target.value)} required />
                </Field>
                <Field label="State" required>
                  <Input value={form.consigneeState} onChange={(e) => set('consigneeState', e.target.value)} required />
                </Field>
                <Field label="Pincode" required>
                  <Input
                    value={form.consigneePincode}
                    onChange={(e) => set('consigneePincode', e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    required
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead className="bg-black text-white">
              <span className="text-sm font-bold">💳 Payment &amp; Package</span>
            </CardHead>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment mode" required>
                  <select
                    className="nb-input w-full"
                    value={form.paymentMode}
                    onChange={(e) => set('paymentMode', e.target.value)}
                  >
                    <option value="prepaid">Prepaid</option>
                    <option value="cod">COD</option>
                  </select>
                </Field>
                {form.paymentMode === 'cod' && (
                  <Field label="COD amount (₹)" required>
                    <Input
                      type="number"
                      value={form.codAmount}
                      onChange={(e) => set('codAmount', e.target.value)}
                      required
                    />
                  </Field>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Field label="Weight (kg)" required>
                  <Input type="number" step="0.01" value={form.deadWeightKg} onChange={(e) => set('deadWeightKg', e.target.value)} required />
                </Field>
                <Field label="L (cm)">
                  <Input type="number" value={form.lengthCm} onChange={(e) => set('lengthCm', e.target.value)} />
                </Field>
                <Field label="W (cm)">
                  <Input type="number" value={form.widthCm} onChange={(e) => set('widthCm', e.target.value)} />
                </Field>
                <Field label="H (cm)">
                  <Input type="number" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
                </Field>
              </div>
              {calcVolWeight() > 0 && (
                <div className="mb-3 border-2 border-black bg-c5 px-3 py-1.5 text-[11px] font-bold">
                  Volumetric weight: {calcVolWeight().toFixed(3)} kg — billed weight will be the higher of dead/volumetric
                </div>
              )}
              <Field label="Declared value (₹)">
                <Input type="number" value={form.declaredValue} onChange={(e) => set('declaredValue', e.target.value)} />
              </Field>
              <Field label="Courier">
                <select className="nb-input w-full" value={form.courierId} onChange={(e) => set('courierId', e.target.value)}>
                  <option value="">Auto-allocate (cheapest serviceable)</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isLive ? '· LIVE' : '· mock'}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          {error && (
            <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>
          )}
          {success && (
            <div className="mb-3 border-2 border-black bg-c3 p-3 text-xs font-bold shadow-nb">✓ {success}</div>
          )}

          <Btn type="submit" variant="dark" disabled={submitting} className="w-full justify-center py-3">
            {submitting ? 'Booking...' : '✓ Book Shipment'}
          </Btn>
        </form>

        {/* ── FRAUD SIDEBAR ── */}
        <div>
          <Card>
            <CardHead className={band ? band.bg : 'bg-c5'}>
              <span className="text-sm font-bold">🎯 Fraud Score</span>
              {checking && <span className="text-[10px] font-bold">checking...</span>}
            </CardHead>
            <div className="p-4 text-center">
              <div className="font-mono-nb text-4xl font-bold">{fraud ? fraud.score : '—'}</div>
              <div className="font-mono-nb mt-1 text-[10px] text-[#777]">/100</div>
              {band && (
                <div className={`mt-2 inline-block border-2 border-black px-3 py-1 text-xs font-bold ${band.bg}`}>
                  {band.label}
                </div>
              )}
            </div>
          </Card>

          {fraud && fraud.flags.length > 0 && (
            <Card>
              <CardHead className="bg-black text-white">
                <span className="text-sm font-bold">⚠ Flags</span>
              </CardHead>
              <div className="p-3">
                {fraud.flags.map((f, i) => (
                  <div key={i} className="border-b border-[#eee] py-1.5 last:border-0">
                    <Badge color={f.type === 'error' ? 'bg-c2 text-white' : 'bg-c4'}>{f.code.replace(/_/g, ' ')}</Badge>
                    <div className="mt-1 text-[11px]">{f.message}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {fraud && (
            <Card>
              <CardHead className="bg-c3">
                <span className="text-sm font-bold">🤖 Recommendation</span>
              </CardHead>
              <div className="p-3">
                {fraud.recommendation.map((r, i) => (
                  <div key={i} className="py-1 text-[11px] font-semibold">
                    {i + 1}. {r}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Recent Orders</h2>
      <Card>
        {loadingOrders ? (
          <div className="p-4 text-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-sm text-[#777]">No orders yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order ID</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Consignee</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">AWB</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Fraud</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[#eee]">
                    <td className="font-mono-nb px-3 py-2 font-bold">{o.mozopost_order_id}</td>
                    <td className="px-3 py-2">{o.consignee_name}</td>
                    <td className="font-mono-nb px-3 py-2">{o.awb_number || '—'}</td>
                    <td className="px-3 py-2">{o.status.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2">{o.fraud_score ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
