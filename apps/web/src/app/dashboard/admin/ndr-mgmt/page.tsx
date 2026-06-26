'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

const REASON_STYLE: Record<string, string> = {
  customer_not_available: 'bg-[#FEF9C3] text-[#854D0E]',
  wrong_address:          'bg-[#FEF9C3] text-[#854D0E]',
  refused_delivery:       'bg-[#FEE2E2] text-[#991B1B]',
  premises_closed:        'bg-[#FEF9C3] text-[#854D0E]',
  fake_attempt:           'bg-[#FEE2E2] text-[#991B1B]',
};

export default function NdrMgmtPage() {
  const [ndrs, setNdrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setNdrs([
        { id: '1', mozopost_order_id: 'MP2606000003', consignee_name: 'Ravi Kumar', consignee_phone: '9876503456', courier_name: 'DTDC', attempt_number: 1, ndr_reason: 'customer_not_available', business_name: 'Arjun Textiles', cod_amount: 850 },
        { id: '2', mozopost_order_id: 'MP2606000099', consignee_name: 'Meena Pillai', consignee_phone: '9123456789', courier_name: 'Delhivery', attempt_number: 2, ndr_reason: 'wrong_address', business_name: 'Riya Fashion', cod_amount: 0 },
        { id: '3', mozopost_order_id: 'MP2606000101', consignee_name: 'Suresh Nair', consignee_phone: '9988776655', courier_name: 'Ekart', attempt_number: 3, ndr_reason: 'refused_delivery', business_name: 'FastMart', cod_amount: 500 },
      ]);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">NDR Management</h1>
          <p className="text-sm text-[#64748B] mt-1">Resolve non-delivery reports to prevent revenue loss.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white outline-none focus:border-[#4F46E5]">
            <option>All Couriers</option>
            <option>Delhivery</option>
            <option>DTDC</option>
            <option>Ekart</option>
          </select>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="p-4 rounded-xl bg-[#FEF9C3] border border-[#FEF08A] text-sm font-semibold text-[#854D0E] flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        Unresolved NDRs auto-convert to RTO after 3 days. Act now to protect COD revenue.
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading NDRs...</div>
      ) : (
        <div className="space-y-4">
          {ndrs.map(n => (
            <div key={n.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${n.attempt_number >= 3 ? 'border-[#FCA5A5]' : 'border-[#E5E8EF]'}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[#0F172A] font-mono">{n.mozopost_order_id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${REASON_STYLE[n.ndr_reason] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                      {n.ndr_reason.replace(/_/g, ' ')}
                    </span>
                    {n.attempt_number >= 3 && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B]">Max Attempts Reached</span>}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    {n.courier_name} · {n.business_name} · Attempt {n.attempt_number}/3
                    {n.cod_amount > 0 && <span className="ml-2 font-semibold text-[#CA8A04]">COD ₹{n.cod_amount}</span>}
                  </div>
                  <div className="text-sm font-semibold text-[#0F172A] mt-2">{n.consignee_name} · {n.consignee_phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-[#F1F5F9] flex-wrap">
                {n.attempt_number < 3 && (
                  <button className="px-3 py-1.5 text-xs font-semibold bg-[#D1FAE5] text-[#065F46] rounded-lg hover:bg-[#A7F3D0] transition-colors">🔄 Re-attempt</button>
                )}
                <button className="px-3 py-1.5 text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded-lg hover:bg-[#E0E7FF] transition-colors">💬 Customer Confirm</button>
                <button className="px-3 py-1.5 text-xs font-semibold bg-[#F4F6F9] text-[#475569] rounded-lg hover:bg-[#E5E8EF] transition-colors">✏ Update Address</button>
                <button className="px-3 py-1.5 text-xs font-semibold bg-[#F4F6F9] text-[#475569] rounded-lg hover:bg-[#E5E8EF] transition-colors">⏸ Hold</button>
                <button className="px-3 py-1.5 text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] rounded-lg hover:bg-[#FECACA] transition-colors ml-auto">↩ Mark RTO</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
