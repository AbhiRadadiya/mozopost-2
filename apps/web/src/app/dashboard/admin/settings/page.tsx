'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

interface Setting { key: string; value: any; }

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/global-settings');
      setSettings(data.settings);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function save(key: string) {
    setSavingKey(key);
    try {
      let value: any = edited[key];
      if (!isNaN(Number(value))) value = Number(value);
      await api.patch(`/super-admin/global-settings/${key}`, { value });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSavingKey(null); }
  }

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Global Settings</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-[#64748B]">Platform-wide configuration values.</p>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B]">Super Admin Only</span>
          </div>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}

      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
          <h2 className="text-sm font-bold text-[#0F172A]">Platform Settings</h2>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading settings...</div>
        ) : settings.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#94A3B8]">No settings found.</div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {settings.map(s => (
              <div key={s.key} className="flex items-center gap-4 px-6 py-4 hover:bg-[#F8F9FB] transition-colors">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#0F172A] capitalize">{s.key.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-[#94A3B8] font-mono mt-0.5">{s.key}</div>
                </div>
                <input
                  defaultValue={typeof s.value === 'string' ? s.value.replace(/"/g, '') : String(s.value)}
                  onChange={e => setEdited(p => ({ ...p, [s.key]: e.target.value }))}
                  className="w-48 px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
                <button
                  disabled={savingKey === s.key}
                  onClick={() => save(s.key)}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${savedKey === s.key ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'}`}
                >
                  {savingKey === s.key ? 'Saving...' : savedKey === s.key ? '✓ Saved' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
