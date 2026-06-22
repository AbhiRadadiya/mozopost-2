'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Input, Badge } from '@/components/ui';

interface Setting {
  key: string;
  value: any;
}

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/global-settings');
      setSettings(data.settings);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function save(key: string) {
    setSavingKey(key);
    try {
      let value: any = edited[key];
      // try to parse as number, fallback to string
      if (!isNaN(Number(value))) value = Number(value);
      await api.patch(`/super-admin/global-settings/${key}`, { value });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        Global Settings <Badge color="bg-c2 text-white">SUPER ADMIN</Badge>
      </h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}

      <Card>
        <CardHead className="bg-black text-white">
          <span className="text-sm font-bold">Platform Settings</span>
        </CardHead>
        {loading ? (
          <div className="p-4 text-sm">Loading...</div>
        ) : (
          <div className="divide-y divide-[#eee]">
            {settings.map((s) => (
              <div key={s.key} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <div className="font-mono-nb text-[10px] font-bold uppercase text-[#777]">{s.key.replace(/_/g, ' ')}</div>
                </div>
                <Input
                  defaultValue={typeof s.value === 'string' ? s.value.replace(/"/g, '') : String(s.value)}
                  onChange={(e) => setEdited((p) => ({ ...p, [s.key]: e.target.value }))}
                  className="w-40"
                />
                <Btn variant="success" disabled={savingKey === s.key} onClick={() => save(s.key)}>
                  Save
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
