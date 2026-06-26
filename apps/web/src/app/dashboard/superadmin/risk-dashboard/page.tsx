'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead, Badge, StatCard } from '@/components/ui';
import { RISK_BADGE, SEV_BADGE, SAIcon, PageHeader, ErrorBar } from '../_shared';

export default function RiskDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => { (async () => {
    try { const res = await api.get('/super-admin/risk/dashboard'); setData(res.data); }
    catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  })(); }, []);

  const s = data?.scoreSummary;

  return (
    <div>
      <PageHeader title="Risk Dashboard" subtitle="Platform-wide fraud and risk overview" />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Critical Risk" value={loading ? '…' : (s?.critical ?? 0)} accent="#DC2626"
          icon={<SAIcon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16z" />} />
        <StatCard label="High Risk" value={loading ? '…' : (s?.high ?? 0)} accent="#EA580C"
          icon={<SAIcon d="M12 9v2m0 4h.01" />} />
        <StatCard label="Blacklisted" value={loading ? '…' : (data?.blacklistCount ?? 0)} accent="#7C3AED"
          icon={<SAIcon d="M18.364 18.364A9 9 0 005.636 5.636" />} />
        <StatCard label="Total Merchants" value={loading ? '…' : (s?.total ?? 0)} accent="#0891B2"
          icon={<SAIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHead>
            <span className="font-bold text-[#0F172A]">High-Risk Merchants</span>
            <Link href="/dashboard/superadmin/risk-scores" className="text-xs font-semibold text-[#7C3AED]">View all →</Link>
          </CardHead>
          <div className="divide-y divide-[#F1F5F9]">
            {(data?.highRiskMerchants || []).length === 0 && !loading && (
              <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">No high-risk merchants 🎉</div>
            )}
            {(data?.highRiskMerchants || []).map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[#0F172A]">{m.business_name}</div>
                  <div className="truncate font-mono-nb text-[11px] text-[#94A3B8]">{m.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-nb text-sm font-bold text-[#DC2626]">{m.risk_score}</span>
                  <Badge className={RISK_BADGE[m.risk_level]}>{m.risk_level}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead>
            <span className="font-bold text-[#0F172A]">Security Event Feed</span>
            <Link href="/dashboard/superadmin/security-logs" className="text-xs font-semibold text-[#7C3AED]">All logs →</Link>
          </CardHead>
          <div className="divide-y divide-[#F1F5F9]">
            {(data?.recentLogs || []).length === 0 && !loading && (
              <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">No recent security events</div>
            )}
            {(data?.recentLogs || []).map((l: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#0F172A]">{l.event?.replace(/_/g, ' ')}</div>
                  <div className="truncate font-mono-nb text-[11px] text-[#94A3B8]">{l.business_name || 'system'}</div>
                </div>
                <Badge className={SEV_BADGE[l.severity] || 'bg-[#F3F4F6] text-[#374151]'}>{l.severity}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
