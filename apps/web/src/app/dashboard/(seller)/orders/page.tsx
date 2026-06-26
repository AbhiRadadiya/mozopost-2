'use client';

import { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Field, Input } from '@/components/ui';

/* ─────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────── */
interface Courier {
  id: string; name: string; code: string;
  is_enabled: boolean; isLive: boolean;
}
interface FraudFlag { type: 'error' | 'warning'; code: string; message: string; }
interface FraudResult {
  score: number; band: 'safe' | 'medium_risk' | 'high_risk' | 'fraud_alert';
  flags: FraudFlag[]; serviceable: boolean; recommendation: string[];
}

/* ─────────────────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────────────────── */
const STATUS_TABS = [
  { key: 'new',              label: 'New',              dot: '#4F46E5' },
  { key: 'ready_to_ship',    label: 'Ready to Ship',    dot: '#6366F1' },
  { key: 'in_transit',       label: 'In Transit',       dot: '#3B82F6' },
  { key: 'out_for_delivery', label: 'Out for Delivery', dot: '#8B5CF6' },
  { key: 'delivered',        label: 'Delivered',        dot: '#10B981' },
  { key: 'unprocessed',      label: 'Needs Attention',  dot: '#F59E0B' },
  { key: 'rto_initiated',    label: 'RTO',              dot: '#EF4444' },
  { key: 'cancelled',        label: 'Cancelled',        dot: '#94A3B8' },
];

/* Tabs where shipment hasn't happened yet → hide AWB/Courier/Status/Freight, show Ship btn */
const PRE_SHIP_TABS = new Set(['new', 'unprocessed']);
const PRE_SHIP_STATUSES = new Set(['unprocessed', 'booked']);

const STATUS_BADGE: Record<string, { classes: string; label: string }> = {
  delivered:        { classes: 'bg-[#D1FAE5] text-[#065F46]',  label: 'Delivered' },
  in_transit:       { classes: 'bg-[#DBEAFE] text-[#1E40AF]',  label: 'In Transit' },
  out_for_delivery: { classes: 'bg-[#E0E7FF] text-[#3730A3]',  label: 'Out for Delivery' },
  booked:           { classes: 'bg-[#EEF2FF] text-[#4338CA]',  label: 'Booked' },
  unprocessed:      { classes: 'bg-[#FEF3C7] text-[#92400E]',  label: 'Needs Attention' },
  rto_initiated:    { classes: 'bg-[#FEE2E2] text-[#991B1B]',  label: 'RTO Initiated' },
  rto_in_transit:   { classes: 'bg-[#FEE2E2] text-[#991B1B]',  label: 'RTO In Transit' },
  failed:           { classes: 'bg-[#FEF3C7] text-[#92400E]',  label: 'Failed' },
  cancelled:        { classes: 'bg-[#F1F5F9] text-[#64748B]',  label: 'Cancelled' },
};

const PAYMENT_BADGE: Record<string, string> = {
  prepaid: 'bg-[#D1FAE5] text-[#065F46]',
  cod:     'bg-[#FEF3C7] text-[#92400E]',
};

const FRAUD_BAND: Record<string, { ring: string; text: string; label: string }> = {
  safe:        { ring: '#10B981', text: '#065F46', label: 'Safe' },
  medium_risk: { ring: '#F59E0B', text: '#92400E', label: 'Medium Risk' },
  high_risk:   { ring: '#EF4444', text: '#991B1B', label: 'High Risk' },
  fraud_alert: { ring: '#7C3AED', text: '#4C1D95', label: 'Fraud Alert' },
};

const emptyForm = {
  consigneeName: '', consigneePhone: '', consigneeAddress1: '',
  consigneeCity: '', consigneeState: '', consigneePincode: '',
  paymentMode: 'prepaid' as 'prepaid' | 'cod',
  codAmount: 0, deadWeightKg: '', lengthCm: '', widthCm: '',
  heightCm: '', declaredValue: '', courierId: '',
};

/* ─────────────────────────────────────────────────────────
   Shared input components
   ───────────────────────────────────────────────────────── */
function ProInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  const { label, required, ...rest } = props;
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5" style={{ letterSpacing: '0.03em' }}>
        {label}{required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      <input {...rest}
        className="w-full border border-[#E5E8EF] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#CBD5E1]"
      />
    </div>
  );
}
function ProSelect({ label, required, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5" style={{ letterSpacing: '0.03em' }}>
        {label}{required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      <select {...rest}
        className="w-full border border-[#E5E8EF] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
      >
        {children}
      </select>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Ship / Schedule Pickup Modal
   ───────────────────────────────────────────────────────── */
function ShipModal({
  open, orderIds, onClose, onSuccess,
}: {
  open: boolean; orderIds: string[]; onClose: () => void; onSuccess: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [pickupDate, setPickupDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleShip() {
    setError(''); setSubmitting(true);
    try {
      await api.post('/pickups', {
        pickupDate,
        expectedPackageCount: orderIds.length,
      });
      setSuccess(`Pickup scheduled for ${orderIds.length} order${orderIds.length > 1 ? 's' : ''}!`);
      setTimeout(() => { onSuccess(); onClose(); setSuccess(''); }, 1800);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E8EF]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Schedule Pickup</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {orderIds.length} order{orderIds.length > 1 ? 's' : ''} will be included
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F4F6F9] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Package summary */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE]">
            <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-[#4338CA]">{orderIds.length} Package{orderIds.length > 1 ? 's' : ''}</div>
              <div className="text-xs text-[#6366F1]">Ready for pickup scheduling</div>
            </div>
          </div>

          {/* Pickup date */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">Pickup Date</label>
            <input
              type="date"
              value={pickupDate}
              min={today}
              onChange={e => setPickupDate(e.target.value)}
              className="w-full border border-[#E5E8EF] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#D1FAE5] border border-[#6EE7B7] text-xs font-medium text-[#065F46]">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#E5E8EF] bg-[#F8F9FB] rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#E5E8EF] bg-white text-sm font-semibold text-[#475569] hover:bg-[#F4F6F9] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleShip}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] text-sm font-semibold text-white hover:bg-[#4338CA] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0110 10" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
            )}
            Schedule Pickup
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Add Order Drawer
   ───────────────────────────────────────────────────────── */
function AddOrderDrawer({ open, onClose, onSuccess, couriers }: {
  open: boolean; onClose: () => void; onSuccess: () => void; couriers: Courier[];
}) {
  const [form, setForm] = useState(emptyForm);
  const [fraud, setFraud] = useState<FraudResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function set(k: keyof typeof form, v: any) { setForm(p => ({ ...p, [k]: v })); }

  useEffect(() => {
    if (!form.consigneePhone || form.consigneePhone.length < 10) { setFraud(null); return; }
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const { data } = await api.post('/orders/fraud-check', {
          mobile: form.consigneePhone, address: form.consigneeAddress1,
          city: form.consigneeCity, state: form.consigneeState,
          pincode: form.consigneePincode, paymentMode: form.paymentMode, codAmount: form.codAmount,
        });
        setFraud(data);
      } catch { /* advisory */ }
      finally { setChecking(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [form.consigneePhone, form.consigneeAddress1, form.consigneeCity, form.consigneeState, form.consigneePincode, form.paymentMode, form.codAmount]);

  function calcVolWeight() {
    const l = parseFloat(form.lengthCm)||0, w = parseFloat(form.widthCm)||0, h = parseFloat(form.heightCm)||0;
    return l && w && h ? (l * w * h) / 5000 : 0;
  }

  async function handleSubmit() {
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        consigneeName: form.consigneeName, consigneePhone: form.consigneePhone,
        consigneeAddress1: form.consigneeAddress1, consigneeCity: form.consigneeCity,
        consigneeState: form.consigneeState, consigneePincode: form.consigneePincode,
        paymentMode: form.paymentMode,
        codAmount: form.paymentMode === 'cod' ? Number(form.codAmount) : 0,
        deadWeightKg: Number(form.deadWeightKg),
        lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
        widthCm:  form.widthCm  ? Number(form.widthCm)  : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        declaredValue: form.declaredValue ? Number(form.declaredValue) : 0,
        courierId: form.courierId || undefined,
      });
      setSuccess(`Order ${data.order.mozopost_order_id} booked! AWB: ${data.order.awb_number}`);
      setForm(emptyForm); setFraud(null);
      setTimeout(() => { onSuccess(); onClose(); setSuccess(''); }, 2000);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  const band = fraud ? FRAUD_BAND[fraud.band] : null;

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E8EF] bg-white shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Create New Order</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Fill in the shipment details below</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F4F6F9] hover:text-[#475569] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#4F46E5] flex items-center justify-center text-white text-xs font-bold">1</div>
              <h3 className="text-sm font-bold text-[#0F172A]">Customer & Address</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ProInput label="Full Name" required placeholder="Rahul Sharma" value={form.consigneeName} onChange={e => set('consigneeName', e.target.value)} />
              <ProInput label="Mobile Number" required placeholder="9876543210" maxLength={10} value={form.consigneePhone} onChange={e => set('consigneePhone', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Delivery Address <span className="text-[#EF4444]">*</span></label>
              <textarea rows={2} placeholder="House No, Street, Locality..."
                className="w-full border border-[#E5E8EF] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white outline-none resize-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#CBD5E1]"
                value={form.consigneeAddress1} onChange={e => set('consigneeAddress1', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <ProInput label="City" required placeholder="Mumbai" value={form.consigneeCity} onChange={e => set('consigneeCity', e.target.value)} />
              <ProInput label="State" required placeholder="Maharashtra" value={form.consigneeState} onChange={e => set('consigneeState', e.target.value)} />
              <ProInput label="Pincode" required placeholder="400001" maxLength={6} value={form.consigneePincode} onChange={e => set('consigneePincode', e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>

          {/* Fraud */}
          {(checking || fraud) && (
            <div className={`rounded-xl border p-4 ${band ? 'border-current/20' : 'border-[#E5E8EF]'} bg-[#F8F9FB]`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={band?.ring || '#94A3B8'} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span className="text-xs font-semibold text-[#475569]">Risk Check</span>
                  {checking && <span className="text-[10px] text-[#94A3B8] animate-pulse-soft">Checking...</span>}
                </div>
                {fraud && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono-nb text-lg font-bold" style={{ color: band?.ring }}>{fraud.score}</span>
                    <span className="text-[10px] text-[#94A3B8]">/100</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${band?.ring}20`, color: band?.text }}>{band?.label}</span>
                  </div>
                )}
              </div>
              {fraud?.flags && fraud.flags.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {fraud.flags.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.type === 'error' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`} />
                      <span className="text-[#475569]">{f.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#4F46E5] flex items-center justify-center text-white text-xs font-bold">2</div>
              <h3 className="text-sm font-bold text-[#0F172A]">Package & Payment</h3>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Payment Mode</label>
              <div className="flex rounded-lg border border-[#E5E8EF] overflow-hidden w-fit">
                {['prepaid','cod'].map(mode => (
                  <button key={mode} type="button" onClick={() => set('paymentMode', mode as any)}
                    className={`px-6 py-2.5 text-sm font-semibold transition-colors ${form.paymentMode === mode ? 'bg-[#4F46E5] text-white' : 'bg-white text-[#475569] hover:bg-[#F4F6F9]'}`}>
                    {mode === 'prepaid' ? 'Prepaid' : 'COD'}
                  </button>
                ))}
              </div>
            </div>
            {form.paymentMode === 'cod' && (
              <div className="mb-4">
                <ProInput label="COD Amount (₹)" required type="number" value={form.codAmount} onChange={e => set('codAmount', e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-4 gap-3">
              <ProInput label="Weight (kg)" required type="number" step="0.01" placeholder="0.50" value={form.deadWeightKg} onChange={e => set('deadWeightKg', e.target.value)} />
              <ProInput label="Length (cm)" type="number" placeholder="10" value={form.lengthCm} onChange={e => set('lengthCm', e.target.value)} />
              <ProInput label="Width (cm)" type="number" placeholder="10" value={form.widthCm} onChange={e => set('widthCm', e.target.value)} />
              <ProInput label="Height (cm)" type="number" placeholder="10" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} />
            </div>
            {calcVolWeight() > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-[#4F46E5] bg-[#EEF2FF] rounded-lg px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                Volumetric: <strong>{calcVolWeight().toFixed(3)} kg</strong> — billed at the higher of dead/vol weight
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <ProInput label="Declared Value (₹)" type="number" placeholder="500" value={form.declaredValue} onChange={e => set('declaredValue', e.target.value)} />
              <ProSelect label="Courier" value={form.courierId} onChange={e => set('courierId', e.target.value)}>
                <option value="">Auto-allocate (cheapest)</option>
                {couriers.map(c => <option key={c.id} value={c.id}>{c.name} {c.isLive ? '· LIVE' : '· mock'}</option>)}
              </ProSelect>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#D1FAE5] border border-[#6EE7B7] text-sm font-medium text-[#065F46]">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E8EF] bg-[#F8F9FB] flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#E5E8EF] bg-white text-sm font-semibold text-[#475569] hover:bg-[#F4F6F9] transition-colors">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-lg bg-[#4F46E5] text-sm font-semibold text-white hover:bg-[#4338CA] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0110 10" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>}
            {submitting ? 'Booking...' : 'Book Shipment'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Main Orders Page
   ───────────────────────────────────────────────────────── */
export default function OrdersPage() {
  const [orders, setOrders]     = useState<any[]>([]);
  const [meta, setMeta]         = useState<any>(null);
  const [status, setStatus]     = useState('new');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [shipModal, setShipModal] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });

  useEffect(() => {
    api.get('/couriers').then(r => setCouriers(r.data.couriers?.filter((c: Courier) => c.is_enabled !== false) || []));
  }, []);

  useEffect(() => { load(); }, [status, page]);

  async function load() {
    setLoading(true); setError('');
    try {
      const params: any = { limit: 20, page };
      // 'new' tab = freshly created orders (booked + unprocessed) → hide AWB/Courier/Status
      if (status === 'new') {
        params.status = 'booked'; // booked = AWB assigned but not yet in transit
      } else if (status === 'ready_to_ship') {
        params.status = 'booked';
      } else if (status !== 'all') {
        params.status = status;
      }
      if (search) params.search = search;
      const { data } = await api.get('/orders', { params });
      setOrders(data.data); setMeta(data.meta);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  function toggleSelect(id: string) {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  function toggleAll() {
    setSelected(p => p.length === orders.length ? [] : orders.map(o => o.id));
  }

  /* Determine if current tab is pre-ship (hides AWB/Courier/Status/Freight) */
  const isPreShipTab = PRE_SHIP_TABS.has(status);

  /* Which selected orders are shippable */
  const shippableSelected = selected.filter(id => {
    const o = orders.find(x => x.id === id);
    return o && PRE_SHIP_STATUSES.has(o.status);
  });

  function openBulkShip() {
    if (shippableSelected.length === 0) return;
    setShipModal({ open: true, ids: shippableSelected });
  }
  function openSingleShip(id: string) {
    setShipModal({ open: true, ids: [id] });
  }

  return (
    <>
      <ShipModal
        open={shipModal.open}
        orderIds={shipModal.ids}
        onClose={() => setShipModal({ open: false, ids: [] })}
        onSuccess={() => { load(); setSelected([]); }}
      />
      <AddOrderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => load()}
        couriers={couriers}
      />

      <div className="animate-fade-up">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-[#0F172A]">Orders</h1>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
                placeholder="Search AWB, Order ID, customer..."
                className="pl-9 pr-4 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#CBD5E1] w-72"
              />
            </div>
            <button onClick={load} className="w-10 h-10 rounded-xl border border-[#E5E8EF] bg-white flex items-center justify-center text-[#94A3B8] hover:text-[#4F46E5] hover:border-[#4F46E5]/30 hover:bg-[#EEF2FF] transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
            </button>
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
              Add Order
            </button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-0 border-b border-[#E5E8EF] overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button key={tab.key}
              onClick={() => { setStatus(tab.key); setPage(1); setSelected([]); }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                status === tab.key
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-[#E5E8EF]'
              }`}
            >
              {tab.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: status === tab.key ? tab.dot : '#CBD5E1' }} />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Bulk action toolbar (appears when rows selected) ── */}
        <div className={`transition-all duration-200 overflow-hidden ${selected.length > 0 ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex items-center justify-between py-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#4F46E5]">{selected.length} selected</span>
              <button onClick={() => setSelected([])} className="text-xs text-[#94A3B8] hover:text-[#475569] transition-colors">Clear</button>
            </div>
            <div className="flex items-center gap-2">
              {shippableSelected.length > 0 && (
                <button onClick={openBulkShip}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] text-white text-xs font-bold rounded-lg hover:bg-[#4338CA] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                  Ship {shippableSelected.length} order{shippableSelected.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Count row ── */}
        <div className="flex items-center py-3 px-0.5">
          <span className="text-sm text-[#94A3B8]">
            {loading ? '—' : `${meta?.total ?? orders.length} orders`}
          </span>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] mb-4">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        {/* ── Table ── */}
        <div className="nb-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8F9FB] border-b border-[#E5E8EF]">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.length === orders.length && orders.length > 0} onChange={toggleAll}
                      className="w-4 h-4 rounded border-[#E5E8EF] accent-[#4F46E5]" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Payment</th>
                  {/* Post-ship columns — only shown on shipped tabs or "all" */}
                  {(!isPreShipTab) && <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">AWB</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Courier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Freight</th>
                  </>}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Date</th>
                  {/* Ship action column for pre-ship tabs */}
                  {isPreShipTab && <th className="px-4 py-3 w-24" />}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-[#F1F3F7]">
                      {[...Array(isPreShipTab ? 8 : 11)].map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="skeleton h-4 rounded" style={{ width: `${55 + (j * 17 % 40)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={isPreShipTab ? 8 : 10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.75">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-[#475569]">No orders found</p>
                        <button onClick={() => setDrawerOpen(true)}
                          className="mt-1 px-4 py-2 bg-[#4F46E5] text-white text-sm font-semibold rounded-lg hover:bg-[#4338CA] transition-colors">
                          + Add Order
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map(o => {
                    const s = STATUS_BADGE[o.status] || { classes: 'bg-[#F1F5F9] text-[#64748B]', label: o.status };
                    const payClass = PAYMENT_BADGE[o.payment_mode] || 'bg-[#F1F5F9] text-[#64748B]';
                    const isSelected = selected.includes(o.id);
                    const canShip = PRE_SHIP_STATUSES.has(o.status);
                    /* showPostShip: true on any non-pre-ship tab */
                    const showPostShip = !isPreShipTab;

                    return (
                      <tr key={o.id} className={`border-b border-[#F1F3F7] transition-colors group ${isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#F8F9FB]'}`}>
                        <td className="px-4 py-3.5">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(o.id)}
                            className="w-4 h-4 rounded border-[#E5E8EF] accent-[#4F46E5]" />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono-nb text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2.5 py-1 rounded-md">
                            #{o.mozopost_order_id}
                          </span>
                          {o.fraud_score != null && (
                            <div className={`text-[10px] mt-1 flex items-center gap-0.5 ${o.fraud_score > 60 ? 'text-[#EF4444]' : 'text-[#CBD5E1]'}`}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                              Risk {o.fraud_score}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-medium text-[#0F172A]">{o.consignee_name}</div>
                          <div className="text-xs text-[#94A3B8] font-mono-nb mt-0.5">{o.consignee_phone}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-[#0F172A]">{o.consignee_city}</div>
                          <div className="text-xs text-[#94A3B8]">{o.consignee_state}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-mono-nb text-[#0F172A]">{o.dead_weight_kg ?? '—'} kg</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${payClass}`}>
                            {o.payment_mode?.toUpperCase()}
                          </span>
                          {o.cod_amount > 0 && (
                            <div className="font-mono-nb text-xs text-[#475569] mt-0.5">₹{parseFloat(o.cod_amount).toFixed(0)}</div>
                          )}
                        </td>

                        {/* Post-ship data — shown only for shipped tabs or shipped rows in "all" tab */}
                        {!isPreShipTab && (
                          <>
                            <td className="px-4 py-3.5">
                              {showPostShip
                                ? <span className="font-mono-nb text-xs text-[#475569]">{o.awb_number || '—'}</span>
                                : <span className="text-[#E5E8EF]">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[#475569]">
                              {showPostShip ? (o.courier_name || <span className="text-[#CBD5E1]">—</span>) : <span className="text-[#E5E8EF]">—</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              {showPostShip
                                ? <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.classes}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />{s.label}
                                  </span>
                                : <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.classes}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />{s.label}
                                  </span>}
                            </td>
                            <td className="px-4 py-3.5 font-mono-nb text-sm font-semibold text-[#0F172A]">
                              {showPostShip ? `₹${parseFloat(o.total_freight||0).toFixed(0)}` : <span className="text-[#E5E8EF]">—</span>}
                            </td>
                          </>
                        )}

                        <td className="px-4 py-3.5">
                          <div className="text-xs text-[#94A3B8]">
                            {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="text-[10px] text-[#CBD5E1]">
                            {new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Ship action — only on pre-ship tabs */}
                        {isPreShipTab && (
                          <td className="px-4 py-3.5 text-right">
                            {canShip && (
                              <button
                                onClick={() => openSingleShip(o.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] text-white text-xs font-bold rounded-lg hover:bg-[#4338CA] transition-colors whitespace-nowrap shadow-sm"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                                Ship
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E5E8EF] bg-[#F8F9FB]">
              <span className="text-xs text-[#94A3B8]">
                Page {meta.page} of {meta.totalPages} · {meta.total} total orders
              </span>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p-1)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E5E8EF] bg-white text-[#475569] hover:bg-[#F4F6F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  ← Prev
                </button>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p+1)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E5E8EF] bg-white text-[#475569] hover:bg-[#F4F6F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
