'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead, Badge } from '@/components/ui';
import { PageHeader, Toast, ErrorBar } from '../_shared';

export default function ApiPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, l] = await Promise.all([
        api.get('/admin/developer/keys'),
        api.get('/admin/developer/logs', { params: { limit: 50 } }),
      ]);
      setKeys(k.data.keys || []);
      setLogs(l.data.logs || []);
    } catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleKey(id: string, isActive: boolean) {
    setBusy(id);
    try { await api.patch(`/admin/developer/keys/${id}/status`, { isActive: !isActive }); flash(`Key ${!isActive ? 'enabled' : 'disabled'}`); load(); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(''); }
  }

  const statusColor = (s: number) => s >= 500 ? 'bg-[#FEE2E2] text-[#991B1B]' : s >= 400 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#D1FAE5] text-[#065F46]';

  return (
    <div>
      <PageHeader title="API & Keys" subtitle="Platform-wide API key management and request logs" />
      <Toast msg={toast} onClose={() => setToast('')} />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      <Card className="mb-4">
        <CardHead><span className="font-bold text-[#0F172A]">API Keys ({keys.length})</span></CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F8FAFC] text-left font-mono-nb text-[10px] uppercase text-[#64748B]">
              <th className="px-4 py-2.5">Merchant</th><th className="px-4 py-2.5">Key Name</th>
              <th className="px-4 py-2.5">Prefix</th><th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>}
              {!loading && keys.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#94A3B8]">No API keys issued</td></tr>}
              {keys.map((k: any) => (
                <tr key={k.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#0F172A]">{k.business_name}</div>
                    <div className="font-mono-nb text-[11px] text-[#94A3B8]">{k.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[#475569]">{k.name || '—'}</td>
                  <td className="px-4 py-3 font-mono-nb text-[11px] text-[#64748B]">{k.key_prefix || k.prefix || (k.api_key ? String(k.api_key).slice(0, 12) + '…' : '—')}</td>
                  <td className="px-4 py-3">
                    <Badge className={k.is_active ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#F3F4F6] text-[#6B7280]'}>{k.is_active ? 'active' : 'disabled'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button disabled={busy === k.id} onClick={() => toggleKey(k.id, k.is_active)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${k.is_active ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#D1FAE5] text-[#065F46]'}`}>
                      {k.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHead><span className="font-bold text-[#0F172A]">Recent API Requests</span></CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F8FAFC] text-left font-mono-nb text-[10px] uppercase text-[#64748B]">
              <th className="px-4 py-2.5">Time</th><th className="px-4 py-2.5">Merchant</th>
              <th className="px-4 py-2.5">Method</th><th className="px-4 py-2.5">Path</th>
              <th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">ms</th>
            </tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {!loading && logs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">No API requests logged</td></tr>}
              {logs.map((l: any, i: number) => (
                <tr key={i} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-mono-nb text-[11px] text-[#94A3B8]">{l.created_at ? new Date(l.created_at).toLocaleTimeString('en-IN') : ''}</td>
                  <td className="px-4 py-3 text-[#475569]">{l.business_name || '—'}</td>
                  <td className="px-4 py-3 font-mono-nb font-bold text-[#475569]">{l.method}</td>
                  <td className="px-4 py-3 font-mono-nb text-[11px] text-[#475569]">{l.path}</td>
                  <td className="px-4 py-3"><Badge className={statusColor(Number(l.status_code || l.status || 200))}>{l.status_code || l.status}</Badge></td>
                  <td className="px-4 py-3 font-mono-nb text-[#64748B]">{l.response_time_ms ?? l.response_time ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
