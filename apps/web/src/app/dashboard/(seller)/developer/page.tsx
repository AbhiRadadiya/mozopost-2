'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

const ALL_PERMISSIONS = [
  { key:'create_orders', label:'Create Orders' },
  { key:'cancel_orders', label:'Cancel Orders' },
  { key:'generate_awb',  label:'Generate AWB' },
  { key:'track_orders',  label:'Track Orders' },
  { key:'ndr_api',       label:'NDR API' },
  { key:'rto_api',       label:'RTO API' },
  { key:'pickup_api',    label:'Pickup API' },
  { key:'webhooks',      label:'Webhooks' },
  { key:'cod_api',       label:'COD API' },
  { key:'label_api',     label:'Label API' },
];
const WEBHOOK_EVENTS = [
  'order.created','order.booked','order.picked','order.in_transit',
  'order.out_for_delivery','order.delivered','order.rto','order.cancelled',
  'ndr.created','cod.settled','pickup.scheduled','pickup.failed',
];

type Tab = 'keys'|'webhooks'|'ip'|'logs';

export default function DeveloperPage() {
  const [tab, setTab] = useState<Tab>('keys');
  const [keys, setKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [ips, setIps] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logStats, setLogStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create key form
  const [keyName, setKeyName] = useState('Default');
  const [keyPerms, setKeyPerms] = useState<string[]>(ALL_PERMISSIONS.map(p=>p.key));
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<any>(null);

  // Webhook form
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>(['order.delivered','ndr.created']);
  const [creatingWh, setCreatingWh] = useState(false);

  // IP form
  const [newIp, setNewIp] = useState('');
  const [ipLabel, setIpLabel] = useState('');

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true); setError('');
    try {
      if (tab === 'keys') {
        const { data } = await api.get('/developer/keys');
        setKeys(data.keys);
      } else if (tab === 'webhooks') {
        const { data } = await api.get('/developer/webhooks');
        setWebhooks(data.webhooks);
      } else if (tab === 'ip') {
        const { data } = await api.get('/developer/ip-whitelist');
        setIps(data.ips);
      } else {
        const { data } = await api.get('/developer/logs');
        setLogs(data.logs);
        setLogStats(data.stats);
      }
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault(); setCreatingKey(true); setError('');
    try {
      const { data } = await api.post('/developer/keys', { name: keyName, permissions: keyPerms });
      setNewKey(data.key);
      setKeyName('Default');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setCreatingKey(false); }
  }

  async function deleteKey(id: string) {
    if (!confirm('Delete this API key? Integrations using it will stop working.')) return;
    try { await api.delete(`/developer/keys/${id}`); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  async function regenerateKey(id: string) {
    if (!confirm('Regenerate? Your old key will stop working immediately.')) return;
    try {
      const { data } = await api.patch(`/developer/keys/${id}/regenerate`);
      setNewKey(data.key);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function createWebhook(e: React.FormEvent) {
    e.preventDefault(); setCreatingWh(true); setError('');
    try {
      const { data } = await api.post('/developer/webhooks', { url: whUrl, events: whEvents });
      alert(`Webhook created!\nSigning secret: ${data.webhook.secret}\nSave this — it will not be shown again.`);
      setWhUrl('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setCreatingWh(false); }
  }

  async function testWebhook(id: string) {
    try {
      const { data } = await api.post(`/developer/webhooks/${id}/test`);
      alert(data.message);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function addIp(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api.post('/developer/ip-whitelist', { ipAddress: newIp, label: ipLabel || undefined });
      setNewIp(''); setIpLabel('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id:'keys',     label:'🔑 API Keys' },
    { id:'webhooks', label:'🔗 Webhooks' },
    { id:'ip',       label:'🛡 IP Whitelist' },
    { id:'logs',     label:'📋 API Logs' },
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Developer API</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}

      <div className="flex gap-0 mb-0 border-b-2 border-black">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-xs font-bold border-2 border-b-0 border-black font-mono-nb -mb-0.5 ${tab===t.id?'bg-[#fffaf0]':'bg-white text-[#777]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {/* API KEYS */}
        {tab === 'keys' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              {newKey && (
                <div className="mb-4 border-2 border-black bg-c3 p-4 shadow-nb">
                  <div className="font-bold mb-2">✓ API Key Created — Save these now!</div>
                  <div className="mb-1 font-mono-nb text-xs">API Key:</div>
                  <div className="bg-black text-c3 font-mono-nb text-xs p-2 mb-2 select-all">{newKey.api_key}</div>
                  <div className="mb-1 font-mono-nb text-xs">Secret Key:</div>
                  <div className="bg-black text-c3 font-mono-nb text-xs p-2 mb-3 select-all">{newKey.secret_key}</div>
                  <div className="text-xs font-bold text-[#555]">The secret key will NOT be shown again.</div>
                  <Btn variant="dark" onClick={() => setNewKey(null)} className="mt-2">I have saved these →</Btn>
                </div>
              )}
              {loading ? <div className="text-sm">Loading...</div>
              : keys.length === 0 ? <div className="text-sm text-[#777]">No API keys yet. Create one to integrate your systems.</div>
              : keys.map(k => (
                <div key={k.id} className="nb-card p-4 mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold">{k.name}</div>
                      <div className="font-mono-nb text-xs text-[#777]">{k.api_key}</div>
                    </div>
                    <Badge color={k.is_active?'bg-c3':'bg-[#999] text-white'}>{k.is_active?'Active':'Disabled'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(k.permissions||[]).map((p: string) => (
                      <span key={p} className="font-mono-nb text-[8px] border border-black px-1.5 py-0.5 bg-c5">{p.replace(/_/g,' ')}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="warn" onClick={() => regenerateKey(k.id)}>↺ Regenerate</Btn>
                    <Btn variant="default" onClick={() => api.patch(`/developer/keys/${k.id}`, { isActive: !k.is_active }).then(load)}>
                      {k.is_active ? 'Disable' : 'Enable'}
                    </Btn>
                    <Btn variant="danger" onClick={() => deleteKey(k.id)}>Delete</Btn>
                  </div>
                </div>
              ))}
            </div>

            <Card>
              <CardHead className="bg-c4"><span className="font-bold">+ Create API Key</span></CardHead>
              <form onSubmit={createKey} className="p-4">
                <Field label="Key name" required>
                  <Input value={keyName} onChange={e => setKeyName(e.target.value)} required />
                </Field>
                <div className="mb-3">
                  <div className="font-mono-nb text-[9px] font-bold uppercase mb-2">Permissions</div>
                  <div className="grid grid-cols-2 gap-1">
                    {ALL_PERMISSIONS.map(p => (
                      <label key={p.key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={keyPerms.includes(p.key)}
                          onChange={e => setKeyPerms(prev => e.target.checked ? [...prev,p.key] : prev.filter(x=>x!==p.key))} />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Btn type="submit" variant="success" disabled={creatingKey} className="w-full justify-center">
                  {creatingKey ? 'Creating...' : '+ Generate API Key'}
                </Btn>
              </form>
            </Card>
          </div>
        )}

        {/* WEBHOOKS */}
        {tab === 'webhooks' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              {loading ? <div className="text-sm">Loading...</div>
              : webhooks.length === 0 ? <div className="text-sm text-[#777]">No webhooks yet.</div>
              : webhooks.map(w => (
                <div key={w.id} className="nb-card p-4 mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-mono-nb text-xs break-all">{w.url}</div>
                    <Badge color={w.status==='active'?'bg-c3':w.status==='paused'?'bg-c4':'bg-c2 text-white'}>{w.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(w.events||[]).map((e: string) => (
                      <span key={e} className="font-mono-nb text-[8px] border border-black px-1.5 py-0.5 bg-c5">{e}</span>
                    ))}
                  </div>
                  {w.failure_count > 0 && <div className="text-xs text-c2 font-bold mb-2">⚠ {w.failure_count} consecutive failures</div>}
                  <div className="flex gap-2">
                    <Btn variant="default" onClick={() => testWebhook(w.id)}>🧪 Test</Btn>
                    <Btn variant="danger" onClick={() => api.delete(`/developer/webhooks/${w.id}`).then(load)}>Delete</Btn>
                  </div>
                </div>
              ))}
            </div>

            <Card>
              <CardHead className="bg-c4"><span className="font-bold">+ Add Webhook</span></CardHead>
              <form onSubmit={createWebhook} className="p-4">
                <Field label="Endpoint URL" required>
                  <Input type="url" value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://yourstore.com/webhook" required />
                </Field>
                <div className="mb-3">
                  <div className="font-mono-nb text-[9px] font-bold uppercase mb-2">Events to receive</div>
                  <div className="grid grid-cols-2 gap-1">
                    {WEBHOOK_EVENTS.map(e => (
                      <label key={e} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={whEvents.includes(e)}
                          onChange={ev => setWhEvents(prev => ev.target.checked ? [...prev,e] : prev.filter(x=>x!==e))} />
                        {e}
                      </label>
                    ))}
                  </div>
                </div>
                <Btn type="submit" variant="success" disabled={creatingWh} className="w-full justify-center">
                  {creatingWh ? 'Creating...' : '+ Add Webhook'}
                </Btn>
              </form>
            </Card>
          </div>
        )}

        {/* IP WHITELIST */}
        {tab === 'ip' && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">Whitelisted IPs</span></CardHead>
              {loading ? <div className="p-4 text-sm">Loading...</div>
              : ips.length === 0 ? <div className="p-4 text-sm text-[#777]">No IPs whitelisted. When empty, all IPs are allowed.</div>
              : (
                <div className="overflow-auto">
                  <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">IP Address</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Label</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
                  </tr></thead><tbody>
                    {ips.map(ip => (
                      <tr key={ip.id} className="border-b border-[#eee]">
                        <td className="font-mono-nb px-3 py-2 font-bold">{ip.ip_address}</td>
                        <td className="px-3 py-2 text-[#777]">{ip.label || '—'}</td>
                        <td className="px-3 py-2">
                          <Btn variant="danger" onClick={() => api.delete(`/developer/ip-whitelist/${ip.id}`).then(load)}>Remove</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </Card>

            <Card>
              <CardHead className="bg-c4"><span className="font-bold">+ Add IP Address</span></CardHead>
              <form onSubmit={addIp} className="p-4">
                <div className="mb-3 border-2 border-black bg-c5 p-2 text-xs">
                  When you add an IP to the whitelist, only those IPs can use your API keys. Leave empty to allow all IPs.
                </div>
                <Field label="IP Address" required>
                  <Input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="103.25.10.20" required />
                </Field>
                <Field label="Label (optional)">
                  <Input value={ipLabel} onChange={e => setIpLabel(e.target.value)} placeholder="e.g. Office Server" />
                </Field>
                <Btn type="submit" variant="success" className="w-full justify-center">+ Add IP</Btn>
              </form>
            </Card>
          </div>
        )}

        {/* API LOGS */}
        {tab === 'logs' && (
          <div>
            {logStats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="nb-card p-3 bg-black text-white"><div className="font-mono-nb text-[8px] uppercase opacity-70">API Calls Today</div><div className="font-mono-nb text-2xl font-bold">{logStats.total_today}</div></div>
                <div className="nb-card p-3 bg-c2 text-white"><div className="font-mono-nb text-[8px] uppercase">Failed Calls Today</div><div className="font-mono-nb text-2xl font-bold">{logStats.errors_today}</div></div>
                <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">Avg Response</div><div className="font-mono-nb text-2xl font-bold">{logStats.avg_response_ms || '—'}ms</div></div>
              </div>
            )}
            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">API Request Logs</span></CardHead>
              {loading ? <div className="p-4 text-sm">Loading...</div>
              : logs.length === 0 ? <div className="p-4 text-sm text-[#777]">No API calls yet.</div>
              : (
                <div className="overflow-auto">
                  <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Time</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Method</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Path</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Time (ms)</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">IP</th>
                  </tr></thead><tbody>
                    {logs.map(l => (
                      <tr key={l.id} className={`border-b border-[#eee] ${(l.status_code||0) >= 400 ? 'bg-[#fff5f5]' : ''}`}>
                        <td className="px-3 py-2">{new Date(l.created_at).toLocaleTimeString('en-IN')}</td>
                        <td className="font-mono-nb px-3 py-2 font-bold">{l.method}</td>
                        <td className="font-mono-nb px-3 py-2 text-xs truncate max-w-[200px]">{l.path}</td>
                        <td className="px-3 py-2"><Badge color={(l.status_code||0)<400?'bg-c3':(l.status_code||0)<500?'bg-c4':'bg-c2 text-white'}>{l.status_code||'—'}</Badge></td>
                        <td className="font-mono-nb px-3 py-2">{l.response_time_ms || '—'}</td>
                        <td className="font-mono-nb px-3 py-2">{l.ip_address}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
