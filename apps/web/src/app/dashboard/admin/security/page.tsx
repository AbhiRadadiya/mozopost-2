'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead, Badge, Btn } from '@/components/ui';

const LEVEL_COLOR: Record<string,string> = {
  safe: 'bg-c3', medium: 'bg-c4', high: 'bg-c2 text-white', critical: 'bg-[#8B0000] text-white',
};
const SEV_COLOR: Record<string,string> = {
  info:'bg-c5', warn:'bg-c4', critical:'bg-c2 text-white',
};
const EVENT_ICON: Record<string,string> = {
  account_blocked:'🚫', cod_held:'💵', wallet_frozen:'🧊',
  duplicate_order:'📋', fake_mobile:'📵', high_rto:'↩',
  ip_flagged:'🌐', login_attempt:'🔑', failed_otp:'⚠',
  suspicious_upload:'📤', kyc_rejected:'🪪',
};

export default function SecurityDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/super-admin/risk/dashboard')
      .then(r => setData(r.data))
      .catch(err => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm p-4">Loading security dashboard...</div>;
  if (error)   return <div className="border-2 border-black bg-c2 p-4 font-bold text-white">⚠ {error}</div>;

  const s = data?.scoreSummary;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Security Center</h1>
        <div className="flex gap-2">
          <Btn variant="warn" onClick={() => window.location.href='/dashboard/admin/risk'}>
            ⚙ Risk Rules
          </Btn>
        </div>
      </div>

      {/* Risk band summary */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <div className="nb-card p-3 bg-black text-white">
          <div className="font-mono-nb text-[8px] uppercase opacity-70">Total Merchants</div>
          <div className="font-mono-nb text-2xl font-bold">{s?.total ?? 0}</div>
        </div>
        {[
          { label:'Safe',     key:'safe',     bg:'bg-c3' },
          { label:'Medium',   key:'medium',   bg:'bg-c4' },
          { label:'High Risk',key:'high',     bg:'bg-c2 text-white' },
          { label:'Critical', key:'critical', bg:'bg-[#8B0000] text-white' },
        ].map(band => (
          <div key={band.key} className={`nb-card p-3 ${band.bg}`}>
            <div className="font-mono-nb text-[8px] uppercase opacity-80">{band.label}</div>
            <div className="font-mono-nb text-2xl font-bold">{s?.[band.key] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="nb-card p-3 bg-c5">
          <div className="font-mono-nb text-[8px] uppercase">Blacklisted</div>
          <div className="font-mono-nb text-2xl font-bold">{data?.blacklistCount ?? 0}</div>
          <div className="text-xs text-[#777] mt-1">IPs, mobiles, emails</div>
        </div>
        <div className="nb-card p-3 bg-c4">
          <div className="font-mono-nb text-[8px] uppercase">Recent Events (warn+)</div>
          <div className="font-mono-nb text-2xl font-bold">{data?.recentLogs?.length ?? 0}</div>
          <div className="text-xs text-[#777] mt-1">Last 10 security events</div>
        </div>
        <div className="nb-card p-3 bg-c2 text-white">
          <div className="font-mono-nb text-[8px] uppercase">High Risk</div>
          <div className="font-mono-nb text-2xl font-bold">{data?.highRiskMerchants?.length ?? 0}</div>
          <div className="text-xs opacity-70 mt-1">Score &gt; 60</div>
        </div>
        <div className="nb-card p-3 bg-[#8B0000] text-white">
          <div className="font-mono-nb text-[8px] uppercase">Critical</div>
          <div className="font-mono-nb text-2xl font-bold">{s?.critical ?? 0}</div>
          <div className="text-xs opacity-70 mt-1">Score &gt; 80</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* High risk merchants */}
        <Card>
          <CardHead className="bg-black text-white">
            <span className="font-bold">🚨 High Risk Merchants</span>
            <Btn variant="warn" onClick={() => window.location.href='/dashboard/admin/risk?filter=high'}>
              View All
            </Btn>
          </CardHead>
          {!data?.highRiskMerchants?.length
            ? <div className="p-4 text-sm text-[#777]">✓ No high risk merchants</div>
            : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-black text-c3">
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Score</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Risk</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Flags</th>
                  </tr></thead>
                  <tbody>
                    {data.highRiskMerchants.map((m: any) => (
                      <tr key={m.email} className="border-b border-[#eee]">
                        <td className="px-3 py-2">
                          <div className="font-bold">{m.business_name}</div>
                          <div className="text-[#777]">{m.email}</div>
                        </td>
                        <td className="font-mono-nb px-3 py-2 font-bold text-c2">{m.risk_score}</td>
                        <td className="px-3 py-2">
                          <Badge color={LEVEL_COLOR[m.risk_level]}>{m.risk_level}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          {(m.flags||[]).slice(0,2).map((f: string) => (
                            <div key={f} className="font-mono-nb text-[8px] text-c2">{f.replace(/_/g,' ')}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>

        {/* Recent security events */}
        <Card>
          <CardHead className="bg-black text-white">
            <span className="font-bold">🔔 Recent Security Events</span>
          </CardHead>
          {!data?.recentLogs?.length
            ? <div className="p-4 text-sm text-[#777]">✓ No recent security events</div>
            : (
              <div className="divide-y divide-[#eee]">
                {data.recentLogs.map((log: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <div className="text-base flex-shrink-0">
                      {EVENT_ICON[log.event] || '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{log.event.replace(/_/g,' ')}</span>
                        <Badge color={SEV_COLOR[log.severity]}>{log.severity}</Badge>
                      </div>
                      <div className="text-xs text-[#777]">{log.business_name || 'System'}</div>
                    </div>
                    <div className="text-[10px] text-[#999] flex-shrink-0">
                      {new Date(log.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>
    </div>
  );
}
