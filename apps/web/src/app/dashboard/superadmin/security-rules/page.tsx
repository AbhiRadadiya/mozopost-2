'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead } from '@/components/ui';
import { PageHeader, Toast, ErrorBar } from '../_shared';

function RuleRow({ rule, flash, setErr, reload }: any) {
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await api.patch(`/super-admin/risk/settings/${rule.rule_key}`, { isEnabled: !rule.is_enabled });
      flash(`Rule "${rule.rule_key}" ${!rule.is_enabled ? 'enabled' : 'disabled'}`); reload();
    } catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="min-w-0 pr-4">
        <div className="font-semibold text-[#0F172A]">{rule.rule_name || rule.rule_key?.replace(/_/g, ' ')}</div>
        <div className="truncate text-[11px] text-[#94A3B8]">{rule.description || rule.rule_key}</div>
        {rule.threshold && (
          <div className="mt-1 font-mono-nb text-[10px] text-[#64748B]">
            threshold: {typeof rule.threshold === 'object' ? JSON.stringify(rule.threshold) : rule.threshold}
          </div>
        )}
      </div>
      <button disabled={busy} onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${rule.is_enabled ? 'bg-[#10B981]' : 'bg-[#CBD5E1]'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${rule.is_enabled ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export default function SecurityRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/super-admin/risk/settings'); setRules(data.settings || []); }
    catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enabled = rules.filter(r => r.is_enabled).length;

  return (
    <div>
      <PageHeader title="Security Rules" subtitle={`${enabled} of ${rules.length} rules active`} />
      <Toast msg={toast} onClose={() => setToast('')} />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      <Card>
        <CardHead><span className="font-bold text-[#0F172A]">Rules</span></CardHead>
        <div className="divide-y divide-[#F1F5F9]">
          {loading && <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">Loading…</div>}
          {!loading && rules.length === 0 && <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">No rules configured</div>}
          {rules.map((r: any) => <RuleRow key={r.rule_key} rule={r} flash={flash} setErr={setErr} reload={load} />)}
        </div>
      </Card>
    </div>
  );
}
