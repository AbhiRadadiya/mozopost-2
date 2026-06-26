'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

const SIZES = ['4x6','3x5','A5','A6'];
const TEMPLATES = [
  { id:1, name:'Standard', desc:'Classic layout with all details' },
  { id:2, name:'Compact', desc:'Minimal info, larger barcode' },
  { id:3, name:'Branded', desc:'Your logo prominently displayed' },
  { id:4, name:'COD Bold', desc:'COD amount highlighted in red' },
  { id:5, name:'Thermal', desc:'Optimised for thermal printers' },
  { id:6, name:'A4 Sheet', desc:'6 labels per A4 page' },
];

export default function LabelsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [couriers, setCouriers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/labels/settings'),
      api.get('/couriers')
    ]).then(([settingsRes, couriersRes]) => {
      setSettings(settingsRes.data.settings);
      setCouriers(couriersRes.data.couriers || []);
    }).catch(err => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function toggle(key: string) {
    setSettings((p: any) => ({ ...p, [key]: !p[key] }));
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch('/labels/settings', {
        showLogo:       settings.show_logo,
        showBrandName:  settings.show_brand_name,
        showGst:        settings.show_gst,
        showReturnAddr: settings.show_return_addr,
        labelSize:      settings.label_size,
        templateId:     settings.template_id,
        brandName:      settings.brand_name,
        returnAddress:  settings.return_address,
      });
      setSuccess('Label settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-8 text-center text-sm text-[#94A3B8]">Loading settings...</div>;

  return (
    <div className="animate-fade-up max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Label Management</h1>
          <p className="text-sm text-[#64748B] mt-1">Customize your shipping labels and printer settings.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-sm font-medium text-[#166534] flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Toggle options */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">Label Content Options</h2>
            </div>
            <div className="divide-y divide-[#F1F3F7]">
              {[
                { key:'show_logo',       label:'Show Logo',          desc:'Display your store logo on the label' },
                { key:'show_brand_name', label:'Show Brand Name',     desc:'Print your brand name on the label' },
                { key:'show_gst',        label:'Show GST Number',     desc:'Include GSTIN for B2B shipments' },
                { key:'show_return_addr',label:'Show Return Address', desc:'Print return/pickup address' },
              ].map(opt => {
                const isActive = settings?.[opt.key];
                return (
                  <div key={opt.key} className="flex items-center justify-between p-5 hover:bg-[#F8F9FB] transition-colors cursor-pointer" onClick={() => toggle(opt.key)}>
                    <div>
                      <div className="font-bold text-sm text-[#0F172A]">{opt.label}</div>
                      <div className="text-xs text-[#64748B] mt-0.5">{opt.desc}</div>
                    </div>
                    <button
                      className={`w-11 h-6 rounded-full relative transition-colors ${isActive ? 'bg-[#4F46E5]' : 'bg-[#CBD5E1]'}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isActive ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brand details */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">Brand Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Brand Name</label>
                <input className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10" 
                  value={settings?.brand_name || ''}
                  onChange={e => setSettings((p: any) => ({ ...p, brand_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Return Address</label>
                <textarea className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10" 
                  rows={3}
                  value={settings?.return_address || ''}
                  onChange={e => setSettings((p: any) => ({ ...p, return_address: e.target.value }))}
                  placeholder="Plot 14, GIDC Sachin, Surat 394230" />
              </div>
            </div>
          </div>

          {/* Label size */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">Label Size</h2>
            </div>
            <div className="flex flex-wrap gap-3 p-6">
              {SIZES.map(s => {
                const isActive = settings?.label_size === s;
                return (
                  <button key={s} onClick={() => setSettings((p: any) => ({ ...p, label_size: s }))}
                    className={`px-6 py-2.5 text-sm font-bold font-mono rounded-xl transition-all ${isActive ? 'bg-[#EEF2FF] text-[#4F46E5] ring-2 ring-[#4F46E5]' : 'bg-[#F8F9FB] border border-[#E5E8EF] text-[#475569] hover:bg-white hover:border-[#CBD5E1]'}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <button disabled={saving} onClick={save}
            className="w-full flex items-center justify-center py-3.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Label Settings'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Template picker */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">Label Templates</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              {TEMPLATES.map(t => {
                const isActive = settings?.template_id === t.id;
                return (
                  <button key={t.id} onClick={() => setSettings((p: any) => ({ ...p, template_id: t.id }))}
                    className={`p-4 text-left rounded-xl border transition-all relative ${isActive ? 'bg-[#EEF2FF] border-[#4F46E5] ring-1 ring-[#4F46E5]' : 'bg-white border-[#E5E8EF] hover:border-[#CBD5E1] hover:shadow-sm'}`}>
                    <div className="font-bold text-sm text-[#0F172A] mb-1">{t.name}</div>
                    <div className="text-xs text-[#64748B]">{t.desc}</div>
                    {isActive && (
                      <div className="absolute top-4 right-4">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden sticky top-6">
            <div className="px-6 py-5 border-b border-[#E5E8EF] bg-[#F8F9FB] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A]">Live Preview</h2>
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest bg-[#E5E8EF] px-2 py-0.5 rounded-full">
                {TEMPLATES.find(t=>t.id===settings?.template_id)?.name} • {settings?.label_size}
              </span>
            </div>
            <div className="p-6 bg-[#F4F6F9] flex flex-col items-center">
              {/* Fake Label Box */}
              <div className="w-full max-w-[350px] bg-white border border-[#CBD5E1] shadow-sm p-4 font-mono text-xs text-black relative" style={{aspectRatio: '4/6'}}>
                <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-3">
                  <div>
                    {settings?.show_brand_name && settings?.brand_name && (
                      <div className="font-bold text-sm mb-1">{settings.brand_name}</div>
                    )}
                    <div className="font-black text-lg tracking-wide mb-1">
                      {(couriers.length > 0 ? couriers[0].name : 'DELHIVERY').toUpperCase()}
                    </div>
                    <div className="text-[10px]">AWB: DEL1234567890</div>
                  </div>
                  <div className="bg-black text-white px-2 py-1 font-bold text-[10px]">PREPAID</div>
                </div>
                
                <div className="mb-4">
                  <div className="font-bold text-[10px] mb-1">SHIP TO:</div>
                  <div className="font-semibold">Rahul Sharma</div>
                  <div>204 MG Road, Bengaluru 560001</div>
                  <div>Ph: 9876543210</div>
                </div>
                
                {settings?.show_return_addr && settings?.return_address && (
                  <div className="mb-4 pt-3 border-t border-black/20 text-[10px]">
                    <div className="font-bold mb-1">RETURN TO:</div>
                    <div>{settings.return_address}</div>
                  </div>
                )}
                
                <div className="mt-auto absolute bottom-4 left-4 right-4">
                  <div className="h-16 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)] w-full mb-2 opacity-80" />
                  <div className="border-t-2 border-black pt-2 flex justify-between text-[10px] font-semibold">
                    <div>Wt: 0.5kg • ORD-2026-001</div>
                    {settings?.show_gst && <div>GST: 24AAAA0000A1Z5</div>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 w-full max-w-[350px]">
                <button className="flex-1 py-2.5 bg-white border border-[#E5E8EF] text-[#0F172A] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors shadow-sm flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Print Test
                </button>
                <button className="flex-1 py-2.5 bg-[#F8F9FB] border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-white hover:text-[#0F172A] hover:border-[#CBD5E1] transition-colors flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
