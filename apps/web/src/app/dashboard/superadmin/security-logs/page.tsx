'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead, Badge } from '@/components/ui';
import { SEV_BADGE, PageHeader, ErrorBar } from '../_shared';

const SEVERITIES = ['', 'info', 'warn', 'critical'];

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async (sev = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/risk/logs', { params: sev ? { severity: sev } : {} });
      setLogs(data.logs || data || []);
    } catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  return (
    <div>
      <PageHeader title="Security Logs" subtitle="Full audit trail of security events" />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      <div className="mb-4 flex gap-2">
        {SEVERITIES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === s ? 'border-[#7C3AED] bg-[#EDE9FE] text-[#5B21B6]' : 'border-[#E5E8EF] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}>
            {s ? s.toUpperCase() : 'ALL'}
          </button>
        ))}
      </div>

      <Card>
        <CardHead><span className="font-bold text-[#0F172A]">Events ({logs.length})</span></CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F8FAFC] text-left font-mono-nb text-[10px] uppercase text-[#64748B]">
              <th className="px-4 py-2.5">Event</th><th className="px-4 py-2.5">Merchant</th>
              <th className="px-4 py-2.5">Severity</th><th className="px-4 py-2.5">When</th>
            </tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#94A3B8]">No logs</td></tr>}
              {logs.map((l: any, i: number) => (
                <tr key={i} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{l.event?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-[#475569]">{l.business_name || '—'}</td>
                  <td className="px-4 py-3"><Badge className={SEV_BADGE[l.severity] || 'bg-[#F3F4F6] text-[#374151]'}>{l.severity}</Badge></td>
                  <td className="px-4 py-3 font-mono-nb text-[11px] text-[#94A3B8]">{l.created_at ? new Date(l.created_at).toLocaleString('en-IN') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
