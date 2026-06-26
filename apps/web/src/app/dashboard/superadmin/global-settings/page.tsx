'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead } from '@/components/ui';
import { PageHeader, Toast, ErrorBar } from '../_shared';

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/super-admin/global-settings'); setSettings(data.settings || []); }
    catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(key: string) {
    setBusy(key);
    let value: any = drafts[key];
    try { value = JSON.parse(drafts[key]); } catch { /* keep as string */ }
    try { await api.patch(`/super-admin/global-settings/${key}`, { value }); flash(`Setting "${key}" saved`); load(); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(''); }
  }

  return (
    <div>
      <PageHeader title="Global Settings" subtitle="Platform-wide configuration keys" />
      <Toast msg={toast} onClose={() => setToast('')} />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      <Card>
        <CardHead><span className="font-bold text-[#0F172A]">Settings ({settings.length})</span></CardHead>
        <div className="divide-y divide-[#F1F5F9]">
          {loading && <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">Loading…</div>}
          {!loading && settings.length === 0 && <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">No global settings</div>}
          {settings.map((s: any) => {
            const current = typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value ?? '');
            const draft = drafts[s.key] ?? current;
            return (
              <div key={s.key} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center">
                <div className="md:w-1/3">
                  <div className="font-semibold text-[#0F172A]">{s.key}</div>
                  {s.description && <div className="text-[11px] text-[#94A3B8]">{s.description}</div>}
                </div>
                <div className="flex flex-1 gap-2">
                  <input value={draft} onChange={e => setDrafts({ ...drafts, [s.key]: e.target.value })} className="nb-input flex-1 font-mono-nb text-xs" />
                  <Btn variant="primary" disabled={busy === s.key || draft === current} onClick={() => save(s.key)}>
                    {busy === s.key ? 'Saving…' : 'Save'}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
