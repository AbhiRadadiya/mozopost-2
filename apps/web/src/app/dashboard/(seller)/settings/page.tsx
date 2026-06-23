'use client';

import { useState } from 'react';
import { Card, Btn, Field, Input } from '@/components/ui';

const TABS = [
  { id:'profile', label:'👤 Company Profile' },
  { id:'couriers', label:'🚚 Courier Priority' },
  { id:'billing', label:'💳 Billing Details' },
  { id:'notifications', label:'🔔 Notifications' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Settings</h1>
      <div className="grid grid-cols-[160px_1fr] gap-4">
        <div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`mb-1 flex w-full items-center gap-2 border-2 border-black p-2.5 text-left text-xs font-bold transition-all ${
                tab===t.id ? 'bg-c3 shadow-nb-sm' : 'bg-white hover:bg-[#f5f5f5]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <Card>
          {saved && <div className="border-b-2 border-black bg-c3 px-4 py-2 text-xs font-bold">✓ Settings saved</div>}

          {tab === 'profile' && (
            <form onSubmit={handleSave} className="p-4">
              <div className="text-base font-bold mb-4">Company Profile</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Business name" required><Input defaultValue="Arjun Textiles Pvt Ltd" /></Field>
                <Field label="GSTIN"><Input placeholder="24AAAAA0000A1Z5" /></Field>
                <Field label="PAN"><Input placeholder="AAAAA0000A" /></Field>
                <Field label="Business type"><select className="nb-input w-full"><option>D2C Brand</option><option>Marketplace Seller</option></select></Field>
                <Field label="Contact name" required><Input defaultValue="Arjun Mehta" /></Field>
                <Field label="Phone" required><Input defaultValue="+91 98765 43210" /></Field>
              </div>
              <Field label="Email"><Input type="email" defaultValue="arjun@arjuntextiles.com" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bank account"><Input placeholder="Account number" /></Field>
                <Field label="IFSC"><Input placeholder="HDFC0001234" /></Field>
              </div>
              <Btn type="submit" variant="success">✓ Save Changes</Btn>
            </form>
          )}

          {tab === 'couriers' && (
            <div className="p-4">
              <div className="text-base font-bold mb-4">Courier Priority & Access</div>
              {['Delhivery','Bluedart','DTDC','Ekart','Shadowfax','XpressBees','EcomExpress','India Post'].map((c,i) => (
                <div key={c} className="flex items-center justify-between border-b-2 border-[#eee] py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="font-mono-nb text-xs font-bold text-[#777] w-5">{i+1}</div>
                    <div className="font-bold">{c}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-mono-nb text-xs text-[#777]">{['₹65','₹130','₹87','₹70','₹75','₹83','₹69','₹38'][i]}/500g</div>
                    <div onClick={e => (e.currentTarget as any).classList.toggle('on')}
                      className={`toggle ${i < 3 ? 'on' : ''}`} />
                  </div>
                </div>
              ))}
              <div className="mt-4 border-t-2 border-[#eee] pt-4">
                <div className="font-bold mb-2">Auto-allocation basis</div>
                <select className="nb-input w-full"><option>Lowest cost</option><option>Fastest delivery</option><option>Best delivery rate</option></select>
              </div>
              <Btn variant="success" className="mt-4">✓ Save Priority</Btn>
              <style>{'.toggle{width:34px;height:18px;border:1.5px solid #000;border-radius:18px;background:#ddd;position:relative;cursor:pointer;display:inline-block}.toggle.on{background:#c8f135}.toggle::after{content:"";position:absolute;top:2px;left:2px;width:11px;height:11px;border:1.5px solid #000;border-radius:50%;background:#fff;transition:.2s}.toggle.on::after{transform:translateX(16px)}'}</style>
            </div>
          )}

          {tab === 'billing' && (
            <form onSubmit={handleSave} className="p-4">
              <div className="text-base font-bold mb-4">Billing Details</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bank name"><Input placeholder="HDFC Bank" /></Field>
                <Field label="Account holder"><Input defaultValue="Arjun Textiles Pvt Ltd" /></Field>
                <Field label="Account number"><Input placeholder="Account number" /></Field>
                <Field label="IFSC code"><Input placeholder="HDFC0001234" /></Field>
              </div>
              <Field label="GST invoice email"><Input type="email" defaultValue="accounts@arjuntextiles.com" /></Field>
              <Btn type="submit" variant="success">✓ Save Billing</Btn>
            </form>
          )}

          {tab === 'notifications' && (
            <div className="p-4">
              <div className="text-base font-bold mb-4">Notification Preferences</div>
              {[
                ['Pickup confirmed', true], ['Pickup failed', true],
                ['Out for delivery', true], ['Delivered', true],
                ['NDR / Failed delivery', true], ['RTO initiated', true],
                ['COD collected', true], ['COD remittance settled', true],
                ['Low wallet balance', true], ['Weight discrepancy auto-flag', true],
                ['Courier API downtime', false], ['System maintenance', false],
              ].map(([label, defaultOn]) => (
                <div key={String(label)} className="flex items-center justify-between border-b-2 border-[#eee] py-2">
                  <div className="font-bold text-sm">{label as string}</div>
                  <div onClick={e => (e.currentTarget as any).classList.toggle('on')}
                    className={`toggle ${defaultOn ? 'on' : ''}`} />
                </div>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Email"><Input type="email" defaultValue="arjun@arjuntextiles.com" /></Field>
                <Field label="WhatsApp/SMS"><Input defaultValue="+91 98765 43210" /></Field>
              </div>
              <Btn variant="success">✓ Save Preferences</Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
