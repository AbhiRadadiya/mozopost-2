'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead, Btn, Badge } from '@/components/ui';

const HEALTH_COLOR: Record<string,string> = {
  excellent: 'bg-c3',
  good: 'bg-c1',
  risk: 'bg-c4',
  loss_making: 'bg-c2 text-white',
};
const HEALTH_LABEL: Record<string,string> = {
  excellent: '🟢 Excellent',
  good: '🟡 Good',
  risk: '🔴 Risk',
  loss_making: '💔 Loss Making',
};
const MARGIN_COLOR = (pct: number) =>
  pct >= 15 ? 'text-green-700' : pct >= 5 ? 'text-c4' : 'text-c2 font-bold';

export default function PnlPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'merchants'|'couriers'>('merchants');

  useEffect(() => {
    api.get('/reports/admin/pnl')
      .then(r => setData(r.data))
      .catch(err => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-sm">Loading P&L data...</div>;
  if (error) return <div className="border-2 border-black bg-c2 p-4 font-bold text-white">⚠ {error}</div>;

  const p = data?.platform;
  const netProfit = (p?.total_margin ?? 0) - (p?.rto_loss ?? 0) - (p?.weight_refunded ?? 0);
  const marginPct = p?.total_revenue > 0 ? (netProfit / p.total_revenue * 100) : 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Merchant P&L Report</h1>
        <div className="flex gap-2">
          <select className="nb-input text-xs py-1 w-auto"><option>All time</option><option>This month</option><option>Last 30 days</option></select>
          <Btn variant="default">⬇ Export</Btn>
        </div>
      </div>

      {/* Platform summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="nb-card p-3 bg-black text-white"><div className="font-mono-nb text-[8px] uppercase opacity-70">Total Revenue</div><div className="font-mono-nb text-xl font-bold">₹{(p?.total_revenue||0).toFixed(0)}</div></div>
        <div className="nb-card p-3 bg-c2 text-white"><div className="font-mono-nb text-[8px] uppercase">Courier Cost</div><div className="font-mono-nb text-xl font-bold">₹{(p?.courier_cost_approx||0).toFixed(0)}</div></div>
        <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Gross Margin</div><div className="font-mono-nb text-xl font-bold">₹{(p?.total_margin||0).toFixed(0)}</div></div>
        <div className={`nb-card p-3 ${netProfit >= 0 ? 'bg-c3' : 'bg-c2 text-white'}`}><div className="font-mono-nb text-[8px] uppercase">Net Profit</div><div className="font-mono-nb text-xl font-bold">₹{netProfit.toFixed(0)}</div><div className="font-mono-nb text-xs opacity-70">{marginPct.toFixed(1)}% margin</div></div>
        <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">RTO Loss</div><div className="font-mono-nb text-xl font-bold">₹{(p?.rto_loss||0).toFixed(0)}</div></div>
        <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">Total Orders</div><div className="font-mono-nb text-xl font-bold">{p?.total_orders || 0}</div></div>
        <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">Active Merchants</div><div className="font-mono-nb text-xl font-bold">{p?.active_merchants || 0}</div></div>
        <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">Weight Disputes</div><div className="font-mono-nb text-xl font-bold">₹{(p?.weight_dispute_amt||0).toFixed(0)}</div></div>
      </div>

      {/* P&L Formula reference */}
      <div className="mb-4 border-2 border-black bg-[#fffbeb] p-4 shadow-nb">
        <div className="font-bold mb-2 text-sm">💡 P&L Formula</div>
        <div className="font-mono-nb text-xs space-y-1">
          <div>Seller Charged ← Courier Cost = <span className="font-bold">Gross Profit</span></div>
          <div>Gross Profit − COD Charges − RTO Loss − Weight Disputes = <span className="font-bold text-green-700">Net Profit</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-0 border-b-2 border-black">
        {(['merchants','couriers'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 text-xs font-bold border-2 border-b-0 border-black font-mono-nb uppercase -mb-0.5 ${activeTab===t?'bg-[#fffaf0]':'bg-white text-[#777]'}`}>
            {t === 'merchants' ? '👥 Merchant P&L' : '🚚 Courier P&L'}
          </button>
        ))}
      </div>

      {/* Merchant P&L table */}
      {activeTab === 'merchants' && (
        <Card>
          {(data?.merchants||[]).length === 0
            ? <div className="p-6 text-center text-sm text-[#777]">No merchant data yet. Place orders to see P&L.</div>
            : (
              <div className="overflow-auto">
                <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Orders</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Revenue</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier Cost</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Gross Profit</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">RTO Loss</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Net Profit</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Margin %</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Del. Rate</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Health</th>
                </tr></thead><tbody>
                  {(data?.merchants||[]).map((m: any) => (
                    <tr key={m.seller_id} className={`border-b border-[#eee] ${m.healthBand==='loss_making'?'bg-[#fff5f5]':m.healthBand==='risk'?'bg-[#fffbeb]':''}`}>
                      <td className="px-3 py-2 font-bold">{m.business_name}</td>
                      <td className="font-mono-nb px-3 py-2">{m.orders}</td>
                      <td className="font-mono-nb px-3 py-2 font-bold">₹{m.revenue?.toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2">₹{m.courier_cost?.toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2 font-bold text-green-700">₹{m.gross_profit?.toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2 text-c2">₹{m.rto_loss?.toFixed(0)}</td>
                      <td className={`font-mono-nb px-3 py-2 font-bold ${m.netProfit>=0?'text-green-700':'text-c2'}`}>₹{m.netProfit?.toFixed(0)}</td>
                      <td className={`font-mono-nb px-3 py-2 font-bold ${MARGIN_COLOR(m.marginPct)}`}>{m.marginPct?.toFixed(1)}%</td>
                      <td className="px-3 py-2"><Badge color={(m.delivery_rate||0)>=85?'bg-c3':(m.delivery_rate||0)>=75?'bg-c4':'bg-c2 text-white'}>{m.delivery_rate?.toFixed(1)||'—'}%</Badge></td>
                      <td className="px-3 py-2">
                        <Badge color={HEALTH_COLOR[m.healthBand]||'bg-c5'}>{HEALTH_LABEL[m.healthBand]}</Badge>
                        <div className="font-mono-nb text-[9px] text-[#777] mt-0.5">{m.healthScore}/100</div>
                      </td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            )}
        </Card>
      )}

      {/* Courier P&L table */}
      {activeTab === 'couriers' && (
        <Card>
          {(data?.couriers||[]).length === 0
            ? <div className="p-6 text-center text-sm text-[#777]">No courier data yet.</div>
            : (
              <div className="overflow-auto">
                <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Orders</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Revenue</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Base Cost</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Margin</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">RTO Count</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Disputes ₹</th>
                </tr></thead><tbody>
                  {(data?.couriers||[]).map((c:any) => (
                    <tr key={c.code} className="border-b border-[#eee]">
                      <td className="px-3 py-2 font-bold">{c.courier_name}</td>
                      <td className="font-mono-nb px-3 py-2">{c.orders}</td>
                      <td className="font-mono-nb px-3 py-2 font-bold">₹{c.revenue?.toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2">₹{c.base_cost?.toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2 font-bold text-green-700">₹{c.margin?.toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2">{c.rto_count}</td>
                      <td className="font-mono-nb px-3 py-2 text-c2">₹{c.disputes_amt?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            )}
        </Card>
      )}
    </div>
  );
}
