'use client';

import { useState } from 'react';
import { Card, CardHead, Btn, Badge } from '@/components/ui';

const TEMPLATES = ['Standard 4×6', 'Compact 3×5', 'Seller Branded', 'COD Highlight', 'Minimal'];
const SIZES = ['4×6 inch', '3×5 inch', 'A5', 'A6', 'Custom'];

export default function LabelsPage() {
  const [template, setTemplate] = useState('Standard 4×6');
  const [size, setSize] = useState('4×6 inch');

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Label Printing <Badge color="bg-c5">MULTI-FORMAT</Badge></h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">Label Design</span></CardHead>
            <div className="p-4">
              <div className="mb-3">
                <label className="font-mono-nb mb-1 block text-[9px] font-bold uppercase">Template</label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t} onClick={() => setTemplate(t)}
                      className={`border-2 border-black px-3 py-1 text-[10px] font-bold ${template===t?'bg-black text-white shadow-nb':'bg-white hover:bg-[#f5f5f5]'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="font-mono-nb mb-1 block text-[9px] font-bold uppercase">Size</label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map(s => (
                    <button key={s} onClick={() => setSize(s)}
                      className={`border-2 border-black px-3 py-1 text-[10px] font-bold ${size===s?'bg-black text-white shadow-nb':'bg-white hover:bg-[#f5f5f5]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Btn variant="success" className="justify-center">🖨 Single Print</Btn>
                <Btn variant="default" className="justify-center">📚 Bulk Print</Btn>
                <Btn variant="default" className="justify-center">📥 PDF Download</Btn>
                <Btn variant="default" className="justify-center">🔥 Thermal / ZPL</Btn>
              </div>
            </div>
          </Card>
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">Select Shipments</span></CardHead>
            <div className="overflow-auto">
              <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                <th className="px-3 py-2"><input type="checkbox" /></th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">AWB</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
              </tr></thead><tbody>
                <tr className="border-b border-[#eee]"><td className="px-3 py-2"><input type="checkbox" defaultChecked /></td><td className="font-mono-nb px-3 py-2">DEL1234567890</td><td className="px-3 py-2">Delhivery</td><td className="px-3 py-2"><Badge color="bg-c3">Ready</Badge></td></tr>
                <tr className="border-b border-[#eee]"><td className="px-3 py-2"><input type="checkbox" defaultChecked /></td><td className="font-mono-nb px-3 py-2">BD9876543210</td><td className="px-3 py-2">Bluedart</td><td className="px-3 py-2"><Badge color="bg-c3">Ready</Badge></td></tr>
                <tr><td className="px-3 py-2"><input type="checkbox" /></td><td className="font-mono-nb px-3 py-2">DTDC5432109876</td><td className="px-3 py-2">DTDC</td><td className="px-3 py-2"><Badge color="bg-c4">Pending</Badge></td></tr>
              </tbody></table>
            </div>
          </Card>
        </div>

        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">Label Preview — {template} · {size}</span></CardHead>
          <div className="p-4">
            <div style={{border:'2px solid #000',borderRadius:3,padding:16,background:'#fafafa',fontFamily:'Space Mono,monospace',fontSize:11}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,borderBottom:'2px solid #000',paddingBottom:8}}>
                <div><div style={{fontSize:14,fontWeight:700}}>DELHIVERY</div><div>AWB: DEL1234567890</div></div>
                <div style={{background:'#000',color:'#c8f135',padding:'4px 8px',fontSize:10,fontWeight:700}}>PREPAID</div>
              </div>
              <div style={{marginBottom:8}}><div style={{fontWeight:700,fontSize:12,marginBottom:2}}>SHIP TO:</div>
                <div>Rahul Sharma</div><div>204 MG Road, Bengaluru – 560001</div><div>Ph: 9876543210</div>
              </div>
              <div style={{marginBottom:8}}><div style={{fontWeight:700,fontSize:12,marginBottom:2}}>SHIP FROM:</div>
                <div>Arjun Textiles</div><div>Plot 14, GIDC, Surat – 394230</div>
              </div>
              <div style={{borderTop:'2px solid #000',paddingTop:8,display:'flex',justifyContent:'space-between',fontSize:10}}>
                <div>Wt: 0.5kg · ORD-2026-001</div>
                <div style={{background:'#000',color:'#c8f135',padding:'2px 6px'}}>01 Jun 2026</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Btn variant="success">🖨 Print Label</Btn>
              <Btn variant="default">📥 Download PDF</Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
