'use client';

import { useState } from 'react';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

const SAMPLE_ROWS = [
  { row: 1, orderId:'ORD-001', name:'Rahul Sharma', phone:'9876543210', address:'204 MG Road', city:'Bengaluru', state:'Karnataka', pincode:'560001', weight:'0.5', mode:'Prepaid', cod:'0', status:'valid' },
  { row: 2, orderId:'ORD-002', name:'Priya Nair',   phone:'9999999999', address:'Near temple',  city:'Mumbai',    state:'Maharashtra', pincode:'400001', weight:'0.8', mode:'COD',     cod:'500', status:'error', error:'Blacklisted mobile' },
  { row: 3, orderId:'ORD-003', name:'Ravi Kumar',   phone:'9876502345', address:'12 Park St',    city:'Kolkata',   state:'West Bengal', pincode:'700001', weight:'1.2', mode:'COD',     cod:'850', status:'valid' },
];

export default function BulkUploadPage() {
  const [validated, setValidated] = useState(false);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Bulk Upload <Badge color="bg-c5">CSV / EXCEL</Badge></h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">📁 Upload Orders</span>
              <div className="flex gap-2">
                <Btn variant="success" onClick={() => setValidated(true)}>▶ Validate</Btn>
                <Btn variant="default">⬇ Template</Btn>
              </div>
            </CardHead>
            <div style={{border:'2px dashed #000',borderRadius:3,padding:20,textAlign:'center',background:'var(--c5)',cursor:'pointer',margin:14}}>
              <div style={{fontSize:28,marginBottom:7}}>📄</div>
              <div className="font-bold">Drop CSV / Excel here or click to upload</div>
              <div className="text-[#777] text-xs mt-1">{SAMPLE_ROWS.length} sample rows loaded · Max 500 rows/file</div>
            </div>
            {validated && (
              <div style={{padding:'0 14px 14px'}}>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="nb-card p-2.5 bg-black text-white"><div className="font-mono-nb text-[8px] uppercase opacity-70">Total</div><div className="font-mono-nb text-2xl font-bold">{SAMPLE_ROWS.length}</div></div>
                  <div className="nb-card p-2.5 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Valid</div><div className="font-mono-nb text-2xl font-bold">{SAMPLE_ROWS.filter(r=>r.status==='valid').length}</div></div>
                  <div className="nb-card p-2.5 bg-c2 text-white"><div className="font-mono-nb text-[8px] uppercase">Errors</div><div className="font-mono-nb text-2xl font-bold">{SAMPLE_ROWS.filter(r=>r.status==='error').length}</div></div>
                </div>
                <div className="overflow-auto border-2 border-black rounded">
                  <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                    <th className="px-2 py-1.5 text-left font-mono-nb text-[8px] uppercase">#</th>
                    <th className="px-2 py-1.5 text-left font-mono-nb text-[8px] uppercase">Order ID</th>
                    <th className="px-2 py-1.5 text-left font-mono-nb text-[8px] uppercase">Name</th>
                    <th className="px-2 py-1.5 text-left font-mono-nb text-[8px] uppercase">Pincode</th>
                    <th className="px-2 py-1.5 text-left font-mono-nb text-[8px] uppercase">Status</th>
                  </tr></thead><tbody>
                    {SAMPLE_ROWS.map(r => (
                      <tr key={r.row} className={`border-b border-[#eee] ${r.status==='error'?'bg-[#fff0f0]':''}`}>
                        <td className="font-mono-nb px-2 py-1.5">{r.row}</td>
                        <td className="font-mono-nb px-2 py-1.5 font-bold">{r.orderId}</td>
                        <td className="px-2 py-1.5">{r.name}</td>
                        <td className="font-mono-nb px-2 py-1.5">{r.pincode}</td>
                        <td className="px-2 py-1.5">
                          {r.status==='valid'
                            ? <Badge color="bg-c3">✓ Valid</Badge>
                            : <><Badge color="bg-c2 text-white">Error</Badge><div className="text-[9px] text-c2 mt-0.5">{r.error}</div></>}
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <Btn variant="default" onClick={() => setValidated(false)}>↩ Re-upload</Btn>
                  <Btn variant="dark">✓ Process {SAMPLE_ROWS.filter(r=>r.status==='valid').length} valid orders</Btn>
                </div>
              </div>
            )}
          </Card>
        </div>
        <div>
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">📋 Upload History</span></CardHead>
            <div className="overflow-auto">
              <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Date</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">File</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Total</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">OK</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Failed</th>
              </tr></thead><tbody>
                <tr className="border-b border-[#eee]"><td className="px-3 py-2">01 Jun</td><td className="font-mono-nb px-3 py-2 text-[10px]">orders_jun1.csv</td><td className="font-mono-nb px-3 py-2">120</td><td><Badge color="bg-c3">115</Badge></td><td><Badge color="bg-c2 text-white">5</Badge></td></tr>
                <tr className="border-b border-[#eee]"><td className="px-3 py-2">31 May</td><td className="font-mono-nb px-3 py-2 text-[10px]">bulk_may31.xlsx</td><td className="font-mono-nb px-3 py-2">84</td><td><Badge color="bg-c3">84</Badge></td><td><Badge color="bg-c3">0</Badge></td></tr>
              </tbody></table>
            </div>
          </Card>
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">Bulk Actions</span></CardHead>
            <div className="flex flex-col gap-2 p-3">
              <Btn variant="success" className="w-full justify-center">🖨 Bulk Print Labels</Btn>
              <Btn variant="default" className="w-full justify-center">📋 Bulk Manifest</Btn>
              <Btn variant="danger" className="w-full justify-center">✕ Bulk Cancel</Btn>
              <Btn variant="primary" className="w-full justify-center">🚚 Bulk Assign Courier</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
