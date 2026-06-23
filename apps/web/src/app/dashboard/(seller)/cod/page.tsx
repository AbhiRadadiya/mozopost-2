'use client';

import { useState } from 'react';
import { Card, CardHead, Badge, Btn } from '@/components/ui';

export default function CodReportsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">COD Reports</h1>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Total Collected</div><div className="font-mono-nb text-2xl font-bold">₹58,420</div></div>
        <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">Pending Release</div><div className="font-mono-nb text-2xl font-bold">₹12,450</div></div>
        <div className="nb-card p-3 bg-c1"><div className="font-mono-nb text-[8px] uppercase">Next Settlement</div><div className="font-mono-nb text-2xl font-bold" style={{fontSize:15}}>3 Jul</div></div>
        <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">D+2 Cycle</div><div className="font-mono-nb text-2xl font-bold" style={{fontSize:15}}>₹6,220</div></div>
      </div>
      <Card>
        <CardHead className="bg-black text-white"><span className="font-bold">Remittance History</span><Btn variant="success" className="border-c3">⬇ Export</Btn></CardHead>
        <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="bg-black text-c3">
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Date</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Orders</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Amount</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
        </tr></thead><tbody>
          {[
            { date:'03 Jul',orders:62,amount:'₹6,220',courier:'All',status:'pending',color:'bg-c4'},
            { date:'27 Jun',orders:48,amount:'₹4,850',courier:'Delhivery',status:'settled',color:'bg-c3'},
            { date:'20 Jun',orders:32,amount:'₹3,210',courier:'DTDC',status:'settled',color:'bg-c3'},
            { date:'13 Jun',orders:52,amount:'₹5,540',courier:'Bluedart',status:'settled',color:'bg-c3'},
          ].map((r,i) => (
            <tr key={i} className="border-b border-[#eee]">
              <td className="px-3 py-2">{r.date}</td>
              <td className="font-mono-nb px-3 py-2">{r.orders}</td>
              <td className="font-mono-nb px-3 py-2 font-bold">{r.amount}</td>
              <td className="px-3 py-2">{r.courier}</td>
              <td className="px-3 py-2"><Badge color={r.color}>{r.status}</Badge></td>
            </tr>
          ))}
        </tbody></table></div>
      </Card>
    </div>
  );
}
