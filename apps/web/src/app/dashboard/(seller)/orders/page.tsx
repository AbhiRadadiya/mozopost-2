'use client';

import { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Field, Input } from '@/components/ui';
import { BulkUploadModal } from './BulkUploadModal';

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
      <label className="block text-xs font-semibold text-[#6B7556] mb-1.5" style={{ letterSpacing: '0.03em' }}>
        {label}{required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      <input {...rest}
        className="w-full border border-[#E2D4B8] rounded-lg px-3 py-2.5 text-sm text-[#2F3A22] bg-white outline-none transition-all focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 placeholder:text-[#B3B596]"
      />
    </div>
  );
}
function ProSelect({ label, required, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#6B7556] mb-1.5" style={{ letterSpacing: '0.03em' }}>
        {label}{required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      <select {...rest}
        className="w-full border border-[#E2D4B8] rounded-lg px-3 py-2.5 text-sm text-[#2F3A22] bg-white outline-none transition-all focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10"
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
  open, orderIds, onClose, onSuccess, couriers
}: {
  open: boolean; orderIds: string[]; onClose: () => void; onSuccess: () => void; couriers: Courier[];
}) {
  const today = new Date().toISOString().split('T')[0];
  const [pickupDate, setPickupDate] = useState(today);
  const [courierId, setCourierId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleShip() {
    setError(''); setSubmitting(true);
    try {
      await api.post('/pickups', {
        pickupDate,
        expectedPackageCount: orderIds.length,
        courierId: courierId || undefined,
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fade-up border border-[#EADFC8]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EADFC8]">
          <div>
            <h2 className="text-base font-bold text-[#2F3A22]">Schedule Pickup</h2>
            <p className="text-xs text-[#8A9270] mt-0.5">
              {orderIds.length} order{orderIds.length > 1 ? 's' : ''} will be included
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A9270] hover:bg-[#FFF8EC] hover:text-[#546B41] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Package summary */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FFF8EC] border border-[#E2D4B8]">
            <div className="w-10 h-10 rounded-xl bg-[#EDF0E4] border border-[#CBD7B5] flex items-center justify-center text-[#546B41] shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-[#2F3A22]">{orderIds.length} Package{orderIds.length > 1 ? 's' : ''}</div>
              <div className="text-xs text-[#6B7556]">Ready for pickup scheduling</div>
            </div>
          </div>

          {/* Pickup date and Courier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B7556] mb-1.5">Pickup Date</label>
              <input
                type="date"
                value={pickupDate}
                min={today}
                onChange={e => setPickupDate(e.target.value)}
                className="w-full border border-[#E2D4B8] rounded-lg px-3 py-2.5 text-sm text-[#2F3A22] bg-white outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10"
              />
            </div>
            <ProSelect label="Courier Partner" value={courierId} onChange={e => setCourierId(e.target.value)}>
              <option value="">Auto-allocate (cheapest)</option>
              {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </ProSelect>
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
        <div className="flex gap-3 px-6 py-4 border-t border-[#EADFC8] bg-[#FFF8EC] rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#E2D4B8] bg-white text-sm font-semibold text-[#6B7556] hover:bg-[#F9FAFC] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleShip}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-[#EDF0E4] border border-[#CBD7B5] text-sm font-semibold text-[#546B41] hover:bg-[#E0E7CE] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-[#FAFAFA] shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EADFC8] bg-white shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#2F3A22]">Create New Order</h2>
            <p className="text-xs text-[#8A9270] mt-0.5">Fill in the shipment details below</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A9270] hover:bg-[#FFF8EC] hover:text-[#546B41] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1 */}
          <div className="bg-white p-5 rounded-xl border border-[#EADFC8]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#EDF0E4] border border-[#CBD7B5] flex items-center justify-center text-[#546B41] text-xs font-bold">1</div>
              <h3 className="text-sm font-bold text-[#2F3A22]">Customer & Address</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ProInput label="Full Name" required placeholder="Rahul Sharma" value={form.consigneeName} onChange={e => set('consigneeName', e.target.value)} />
              <ProInput label="Mobile Number" required placeholder="9876543210" maxLength={10} value={form.consigneePhone} onChange={e => set('consigneePhone', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#6B7556] mb-1.5">Delivery Address <span className="text-[#EF4444]">*</span></label>
              <textarea rows={2} placeholder="House No, Street, Locality..."
                className="w-full border border-[#E2D4B8] rounded-lg px-3 py-2.5 text-sm text-[#2F3A22] bg-white outline-none resize-none transition-all focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 placeholder:text-[#B3B596]"
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
            <div className={`rounded-xl border p-4 ${band ? 'border-current/20' : 'border-[#EADFC8]'} bg-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={band?.ring || '#8A9270'} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span className="text-xs font-semibold text-[#6B7556]">Risk Check</span>
                  {checking && <span className="text-[10px] text-[#8A9270] animate-pulse-soft">Checking...</span>}
                </div>
                {fraud && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono-nb text-lg font-bold" style={{ color: band?.ring }}>{fraud.score}</span>
                    <span className="text-[10px] text-[#8A9270]">/100</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: band?.ring, background: `${band?.ring}10`, color: band?.text }}>{band?.label}</span>
                  </div>
                )}
              </div>
              {fraud?.flags && fraud.flags.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {fraud.flags.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.type === 'error' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`} />
                      <span className="text-[#6B7556]">{f.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          <div className="bg-white p-5 rounded-xl border border-[#EADFC8]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#EDF0E4] border border-[#CBD7B5] flex items-center justify-center text-[#546B41] text-xs font-bold">2</div>
              <h3 className="text-sm font-bold text-[#2F3A22]">Package & Payment</h3>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#6B7556] mb-1.5">Payment Mode</label>
              <div className="flex rounded-lg border border-[#E2D4B8] overflow-hidden w-fit p-1 bg-[#F9FAFC]">
                {['prepaid','cod'].map(mode => (
                  <button key={mode} type="button" onClick={() => set('paymentMode', mode as any)}
                    className={`px-6 py-2 text-sm font-semibold transition-colors rounded-md ${form.paymentMode === mode ? 'bg-white shadow-sm border border-[#E2D4B8] text-[#2F3A22]' : 'bg-transparent text-[#8A9270] hover:text-[#546B41]'}`}>
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
              <div className="mt-3 flex items-center gap-2 text-xs text-[#546B41] bg-[#EDF0E4] border border-[#CBD7B5] rounded-lg px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                Volumetric: <strong className="font-mono-nb">{calcVolWeight().toFixed(3)} kg</strong> — billed at the higher of dead/vol weight
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
        <div className="px-6 py-4 border-t border-[#EADFC8] bg-white flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#E2D4B8] bg-white text-sm font-semibold text-[#6B7556] hover:bg-[#F9FAFC] transition-colors">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-lg bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] text-sm font-semibold hover:bg-[#E0E7CE] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
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
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

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
        couriers={couriers}
      />
      <AddOrderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => load()}
        couriers={couriers}
      />
      <BulkUploadModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
      />

      <div className="animate-fade-up space-y-5">
        {/* ── Page Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">
              Self-Ship Orders <span className="text-sm font-normal text-[#8A9270] ml-1">({meta?.total || orders.length} Orders)</span>
            </h1>
            <p className="text-sm text-[#8A9270] mt-1">Manage all your self-ship orders from here.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-lg px-4 py-2 text-xs font-medium hover:bg-[#E0E7CE] transition-colors shadow-sm cursor-pointer"
            >
              + Create Order
            </button>
            <button
              onClick={() => setBulkModalOpen(true)}
              className="bg-white border border-[#CBD7B5] text-[#546B41] rounded-lg px-4 py-2 text-xs font-medium hover:bg-[#F9FAFC] transition-colors shadow-sm cursor-pointer"
            >
              Import Orders
            </button>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex items-center gap-1 border-b border-[#EADFC8] overflow-x-auto pt-1">
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setStatus(tab.key); setPage(1); setSelected([]); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer ${
                  isActive
                    ? 'border-[#546B41] text-[#546B41] font-semibold'
                    : 'border-transparent text-[#8A9270] hover:text-[#2F3A22]'
                }`}
              >
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono-nb border ${
                    isActive
                      ? 'bg-[#EDF0E4] text-[#546B41] border-[#CBD7B5]'
                      : 'bg-[#FFF8EC] text-[#8A9270] border-[#E2D4B8]'
                  }`}
                >
                  {status === tab.key ? (meta?.total || orders.length) : '0'}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-xs font-semibold text-[#6B7556] flex items-center gap-2 shadow-sm cursor-pointer">
            <span>Order ID</span>
            <span className="text-[#8A9270]">▾</span>
          </div>
          <div className="flex-1 max-w-xs relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="⌕ Search by Order ID, AWB..."
              className="w-full bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-xs text-[#2F3A22] placeholder-[#B3B596] outline-none shadow-sm focus:border-[#546B41]"
            />
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-xs font-mono-nb text-[#6B7556] shadow-sm">
              21 Jun – 27 Jun
            </div>
            <button
              onClick={load}
              className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-xs font-medium text-[#2F3A22] hover:border-[#D8CBAE] transition-colors shadow-sm cursor-pointer"
            >
              + Add Filter
            </button>
            <button
              onClick={load}
              className="bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-lg px-4 py-2 text-xs font-medium hover:bg-[#E0E7CE] transition-colors shadow-sm cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>

        {/* ── Multi-Selection Bulk Action Toolbar ── */}
        {selected.length > 0 && (
          <div className="flex items-center gap-4 bg-[#EDF0E4] border border-[#CBD7B5] rounded-xl p-3 px-4 shadow-sm animate-fade-up">
            <span className="text-xs font-semibold text-[#546B41] font-mono-nb">
              {selected.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Printing labels for selected orders...')}
                className="bg-white border border-[#E2D4B8] hover:border-[#546B41] text-[#2F3A22] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                ⎙ Print Labels
              </button>
              {shippableSelected.length > 0 && (
                <button
                  onClick={openBulkShip}
                  className="bg-white border border-[#E2D4B8] hover:border-[#546B41] text-[#546B41] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                >
                  ✓ Confirm Ship ({shippableSelected.length})
                </button>
              )}
              <button
                onClick={() => alert('Exporting selected orders...')}
                className="bg-white border border-[#E2D4B8] hover:border-[#546B41] text-[#2F3A22] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                ↧ Export
              </button>
            </div>
            <button
              onClick={() => setSelected([])}
              className="ml-auto text-xs text-[#8A9270] hover:text-[#B4623F] transition-colors cursor-pointer"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Orders Table Container ── */}
        <div className="bg-white border border-[#EADFC8] rounded-xl overflow-hidden shadow-sm">
          {/* Grid Table Header */}
          <div className="grid grid-cols-[34px_1.3fr_1.1fr_2fr_1.4fr_1.4fr_1fr] gap-3.5 px-4 py-3 bg-[#F6EEDB] text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider items-center border-b border-[#EADFC8]">
            <div>
              <input
                type="checkbox"
                checked={selected.length === orders.length && orders.length > 0}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-[#E2D4B8] accent-[#546B41] cursor-pointer"
              />
            </div>
            <div>Order ID</div>
            <div>Payment</div>
            <div>Items</div>
            <div>Status</div>
            <div>Customer</div>
            <div>Created At</div>
          </div>

          {/* Grid Table Body */}
          {loading ? (
            <div className="p-8 text-center text-sm text-[#8A9270]">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#EDF0E4] text-[#546B41] flex items-center justify-center mb-3 font-bold text-lg">
                ▤
              </div>
              <p className="text-sm font-medium text-[#2F3A22] mb-1">No orders found</p>
              <p className="text-xs text-[#8A9270] mb-4">Get started by creating your first self-ship order.</p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-lg px-4 py-2 text-xs font-semibold hover:bg-[#E0E7CE] transition-colors shadow-sm cursor-pointer"
              >
                + Create Order
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#F6EEDB]">
              {orders.map((o) => {
                const isSelected = selected.includes(o.id);
                const s = STATUS_BADGE[o.status] || { classes: 'bg-[#EDF0E4] text-[#546B41]', label: o.status };
                const payClass = PAYMENT_BADGE[o.payment_mode] || 'bg-[#F3ECD8] text-[#A9842E]';

                return (
                  <div
                    key={o.id}
                    className={`grid grid-cols-[34px_1.3fr_1.1fr_2fr_1.4fr_1.4fr_1fr] gap-3.5 px-4 py-4 text-xs items-start transition-colors ${
                      isSelected ? 'bg-[#FFF8EC]' : 'hover:bg-[#FFF8EC]/50'
                    }`}
                  >
                    <div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(o.id)}
                        className="w-4 h-4 rounded border-[#E2D4B8] accent-[#546B41] cursor-pointer mt-0.5"
                      />
                    </div>
                    <div>
                      <div className="font-mono-nb font-semibold text-[#2F3A22] text-xs">#{o.mozopost_order_id}</div>
                      <div className="text-[11px] text-[#8A9270] mt-1">Group: {o.id.slice(0, 6)}</div>
                      <div className="inline-block mt-1.5 text-[10px] color-[#546B41] bg-[#EDF0E4] border border-[#CBD7B5] rounded px-1.5 py-0.5 font-mono-nb">
                        pira surat-500
                      </div>
                    </div>
                    <div>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${payClass}`}>
                        {o.payment_mode?.toUpperCase()}
                      </span>
                      <div className="text-[11px] text-[#8A9270] mt-2 flex justify-between">
                        <span>Total</span>
                        <span className="font-mono-nb text-[#2F3A22] font-semibold">₹{parseFloat(o.total_freight || o.cod_amount || 0).toFixed(0)}</span>
                      </div>
                      <div className="text-[11px] text-[#8A9270] mt-0.5 flex justify-between">
                        <span>COD</span>
                        <span className="font-mono-nb text-[#A9842E] font-semibold">₹{parseFloat(o.cod_amount || 0).toFixed(0)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[#2F3A22] font-medium leading-relaxed truncate max-w-xs">
                        {o.consignee_name}'s Order Shipment Items
                      </div>
                      <div className="text-[11px] text-[#8A9270] font-mono-nb mt-1.5">
                        ₹{parseFloat(o.total_freight || 0).toFixed(0)} · Qty: 1 · {o.dead_weight_kg || '0.4'} kg
                      </div>
                    </div>
                    <div>
                      <span className={`inline-block text-[10px] font-semibold font-mono-nb px-2 py-0.5 rounded-full border ${s.classes}`}>
                        {s.label}
                      </span>
                      <div className="text-[11px] text-[#8A9270] mt-1.5">
                        {new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[11px] text-[#546B41] font-mono-nb mt-0.5 font-medium">
                        {o.courier_name || 'DELHIVERY'}
                      </div>
                      <div className="text-[11px] text-[#8A9270] font-mono-nb mt-0.5">
                        {o.awb_number || 'DL5566120934'}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-[#2F3A22]">{o.consignee_name}</div>
                      <div className="text-[11px] text-[#8A9270] font-mono-nb mt-0.5">{o.consignee_phone}</div>
                      <div className="text-[11px] text-[#8A9270] mt-0.5 truncate">{o.consignee_city}, {o.consignee_state}</div>
                    </div>
                    <div className="text-xs text-[#6B7556] font-mono-nb">
                      {new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#EADFC8] bg-[#FFF8EC]">
              <span className="text-xs text-[#8A9270]">
                Page {meta.page} of {meta.totalPages} · {meta.total} total orders
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-[#E2D4B8] bg-white text-[#2F3A22] hover:bg-[#EDF0E4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <button
                  disabled={page === meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-[#E2D4B8] bg-white text-[#2F3A22] hover:bg-[#EDF0E4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
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
