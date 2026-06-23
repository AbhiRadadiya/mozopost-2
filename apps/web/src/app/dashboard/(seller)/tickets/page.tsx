'use client';

import { useState } from 'react';
import { Card, CardHead, Btn, Field, Input, Badge } from '@/components/ui';

const MOCK_TICKETS = [
  { id:'TKT-2026-00001', type:'Weight dispute', subject:'DTDC charged 900g for 450g shipment', priority:'high', status:'open', date:'22 Jun' },
  { id:'TKT-2026-00002', type:'Billing dispute', subject:'Overcharged fuel surcharge May', priority:'medium', status:'open', date:'21 Jun' },
  { id:'TKT-2026-00003', type:'Shipment issue', subject:'Shipment marked delivered but not received', priority:'high', status:'closed', date:'15 Jun' },
];
const STATUS_COLOR: Record<string,string> = { open:'bg-c4', closed:'bg-c3', escalated:'bg-c2 text-white', in_progress:'bg-c1' };
const PRIORITY_COLOR: Record<string,string> = { high:'bg-c2 text-white', medium:'bg-c4', low:'bg-c5', critical:'bg-c2 text-white' };

export default function TicketsPage() {
  const [form, setForm] = useState({ type:'weight_dispute', subject:'', description:'' });
  const [submitted, setSubmitted] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Support Tickets</h1>
        <Badge color="bg-c2 text-white">{MOCK_TICKETS.filter(t=>t.status==='open').length} Open</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          {MOCK_TICKETS.map(t => (
            <div key={t.id} className="nb-card p-4 mb-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold">{t.id} — {t.type}</div>
                  <div className="text-sm text-[#777]">{t.subject}</div>
                </div>
                <Badge color={STATUS_COLOR[t.status]}>{t.status}</Badge>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge color={PRIORITY_COLOR[t.priority]}>{t.priority}</Badge>
                <span className="text-xs text-[#777]">{t.date}</span>
              </div>
              <div className="flex gap-2">
                <Btn variant="default">💬 Reply</Btn>
                {t.status==='open' && <Btn variant="warn">Escalate</Btn>}
              </div>
            </div>
          ))}
        </div>
        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">Create New Ticket</span></CardHead>
          {submitted ? (
            <div className="p-6 text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-bold">Ticket submitted!</div>
              <div className="text-sm text-[#777] mt-1 mb-4">Our team will respond within 24 hours.</div>
              <Btn variant="default" onClick={() => setSubmitted(false)}>+ New Ticket</Btn>
            </div>
          ) : (
            <form className="p-4" onSubmit={e => { e.preventDefault(); setSubmitted(true); }}>
              <Field label="Ticket type" required>
                <select className="nb-input w-full" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
                  <option value="weight_dispute">Weight Dispute</option>
                  <option value="billing_dispute">Billing Dispute</option>
                  <option value="shipment_issue">Shipment Issue</option>
                  <option value="ndr">NDR / Delivery Issue</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Subject" required>
                <Input value={form.subject} onChange={e => setForm(p=>({...p,subject:e.target.value}))} placeholder="Brief description..." required />
              </Field>
              <Field label="Description" required>
                <textarea className="nb-input w-full" rows={4} value={form.description}
                  onChange={e => setForm(p=>({...p,description:e.target.value}))}
                  placeholder="Describe the issue in detail..." required />
              </Field>
              <Btn type="submit" variant="success" className="w-full justify-center">📤 Submit Ticket</Btn>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
