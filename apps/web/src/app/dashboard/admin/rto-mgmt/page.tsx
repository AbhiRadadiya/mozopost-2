'use client';

import { Card, CardHead, Badge, Btn } from '@/components/ui';

const RTOS = [
  { id:'MP2606000004', merchant:'Arjun Textiles', courier:'Ekart', route:'Surat→Kol', cod:1200, charge:58, status:'in_transit', date:'20 Jun' },
  { id:'MP2606000085', merchant:'Riya Fashion',   courier:'DTDC', route:'Mum→Hyd',   cod:0,    charge:72, status:'received', date:'18 Jun' },
  { id:'MP2606000080', merchant:'Arjun Textiles', courier:'Delhivery', route:'Sur→Blr', cod:0, charge:45, status:'initiated', date:'21 Jun' },
];
const STATUS_COLOR: Record<string,string> = { initiated:'bg-c4',in_transit:'bg-c1',received:'bg-c3' };

export default function RtoMgmtPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">RTO Management</h1>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">Initiated</div><div className="font-mono-nb text-2xl font-bold">{RTOS.filter(r=>r.status==='initiated').length}</div></div>
        <div className="nb-card p-3 bg-c1"><div className="font-mono-nb text-[8px] uppercase">In Transit to WH</div><div className="font-mono-nb text-2xl font-bold">{RTOS.filter(r=>r.status==='in_transit').length}</div></div>
        <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Received at WH</div><div className="font-mono-nb text-2xl font-bold">{RTOS.filter(r=>r.status==='received').length}</div></div>
      </div>
      <Card>
        <CardHead className="bg-black text-white"><span className="font-bold">RTO Tracking</span><Btn variant="success" className="border-c3">⬇ Report</Btn></CardHead>
        <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="bg-black text-c3">
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order ID</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Route</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">COD</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">RTO Charge</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
        </tr></thead><tbody>
          {RTOS.map(r => (
            <tr key={r.id} className="border-b border-[#eee]">
              <td className="font-mono-nb px-3 py-2 font-bold">{r.id}</td>
              <td className="px-3 py-2">{r.merchant}</td>
              <td className="px-3 py-2 text-[#777]">{r.route}</td>
              <td className="px-3 py-2">{r.courier}</td>
              <td className="font-mono-nb px-3 py-2">{r.cod > 0 ? `₹${r.cod}` : '—'}</td>
              <td className="font-mono-nb px-3 py-2 font-bold text-c2">₹{r.charge}</td>
              <td className="px-3 py-2"><Badge color={STATUS_COLOR[r.status]}>{r.status}</Badge></td>
              <td className="px-3 py-2">
                {r.status === 'received' ? <Btn variant="success">Close</Btn> : <Btn variant="default">Track</Btn>}
              </td>
            </tr>
          ))}
        </tbody></table></div>
      </Card>
    </div>
  );
}
