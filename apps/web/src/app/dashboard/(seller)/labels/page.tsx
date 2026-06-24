'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Badge } from '@/components/ui';

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

  useEffect(() => {
    api.get('/labels/settings').then(r => setSettings(r.data.settings))
      .catch(err => setError(apiErrorMessage(err)))
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
      setSuccess('Label settings saved!');
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="text-sm">Loading...</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Label Management</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}
      {success && <div className="mb-3 border-2 border-black bg-c3 p-3 text-xs font-bold">✓ {success}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          {/* Toggle options */}
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">Label Content Options</span></CardHead>
            <div className="divide-y divide-[#eee]">
              {[
                { key:'show_logo',       label:'Show Logo',          desc:'Display your store logo on the label' },
                { key:'show_brand_name', label:'Show Brand Name',     desc:'Print your brand name on the label' },
                { key:'show_gst',        label:'Show GST Number',     desc:'Include GSTIN for B2B shipments' },
                { key:'show_return_addr',label:'Show Return Address', desc:'Print return/pickup address' },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-bold text-sm">{opt.label}</div>
                    <div className="text-xs text-[#777]">{opt.desc}</div>
                  </div>
                  <button
                    onClick={() => toggle(opt.key)}
                    className={`w-10 h-5 border-2 border-black rounded-full relative transition-colors ${settings?.[opt.key] ? 'bg-c3' : 'bg-[#ddd]'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 border-2 border-black rounded-full bg-white transition-all ${settings?.[opt.key] ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Brand details */}
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">Brand Details</span></CardHead>
            <div className="p-4">
              <Field label="Brand name">
                <input className="nb-input w-full" value={settings?.brand_name || ''}
                  onChange={e => setSettings((p: any) => ({ ...p, brand_name: e.target.value }))} />
              </Field>
              <Field label="Return address">
                <textarea className="nb-input w-full" rows={3}
                  value={settings?.return_address || ''}
                  onChange={e => setSettings((p: any) => ({ ...p, return_address: e.target.value }))}
                  placeholder="Plot 14, GIDC Sachin, Surat 394230" />
              </Field>
            </div>
          </Card>

          {/* Label size */}
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">Label Size</span></CardHead>
            <div className="flex flex-wrap gap-2 p-4">
              {SIZES.map(s => (
                <button key={s} onClick={() => setSettings((p: any) => ({ ...p, label_size: s }))}
                  className={`border-2 border-black px-4 py-2 text-xs font-bold font-mono-nb ${settings?.label_size===s?'bg-c3 shadow-nb-sm':'bg-white hover:bg-[#f5f5f5]'}`}>
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Btn variant="success" className="w-full justify-center py-3" disabled={saving} onClick={save}>
            {saving ? 'Saving...' : '✓ Save Label Settings'}
          </Btn>
        </div>

        <div>
          {/* Template picker */}
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">Label Templates</span></CardHead>
            <div className="grid grid-cols-2 gap-3 p-4">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setSettings((p: any) => ({ ...p, template_id: t.id }))}
                  className={`border-2 border-black p-3 text-left ${settings?.template_id===t.id?'bg-c3 shadow-nb':'bg-white hover:bg-[#f5f5f5]'}`}>
                  <div className="font-bold text-sm mb-1">{t.name}</div>
                  <div className="text-xs text-[#555]">{t.desc}</div>
                  {settings?.template_id===t.id && (
                    <div className="mt-1"><Badge color="bg-black text-white">✓ Selected</Badge></div>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Live preview */}
          <Card>
            <CardHead className="bg-black text-white">
              <span className="font-bold">Live Preview — Template {settings?.template_id} · {settings?.label_size}</span>
            </CardHead>
            <div className="p-4">
              <div style={{border:'2px solid #000',padding:14,background:'#fafafa',fontFamily:'Space Mono,monospace',fontSize:11}}>
                <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1.5px solid #000',paddingBottom:8,marginBottom:8}}>
                  <div>
                    {settings?.show_brand_name && settings?.brand_name && (
                      <div style={{fontWeight:700,fontSize:13}}>{settings.brand_name}</div>
                    )}
                    <div style={{fontWeight:700,fontSize:12}}>DELHIVERY</div>
                    <div style={{fontSize:9}}>AWB: DEL1234567890</div>
                  </div>
                  <div style={{background:'#000',color:'#c8f135',padding:'3px 7px',fontWeight:700,fontSize:10,alignSelf:'flex-start'}}>PREPAID</div>
                </div>
                <div style={{marginBottom:7}}>
                  <div style={{fontWeight:700,fontSize:10}}>SHIP TO:</div>
                  <div>Rahul Sharma</div>
                  <div>204 MG Road, Bengaluru 560001</div>
                  <div>Ph: 9876543210</div>
                </div>
                {settings?.show_return_addr && settings?.return_address && (
                  <div style={{marginBottom:7,fontSize:9,borderTop:'1px solid #ccc',paddingTop:5}}>
                    <div style={{fontWeight:700}}>RETURN TO:</div>
                    <div>{settings.return_address}</div>
                  </div>
                )}
                <div style={{borderTop:'1.5px solid #000',paddingTop:7,display:'flex',justifyContent:'space-between',fontSize:9}}>
                  <div>Wt: 0.5kg · ORD-2026-001</div>
                  {settings?.show_gst && <div>GST: 24AAAA0000A1Z5</div>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn variant="success">🖨 Print</Btn>
                <Btn variant="default">📥 PDF</Btn>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
