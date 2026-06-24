'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

const PLATFORMS = [
  { id:'shopify',      label:'Shopify',      color:'bg-[#96bf48]' },
  { id:'woocommerce',  label:'WooCommerce',  color:'bg-[#7f54b3]' },
  { id:'opencart',     label:'OpenCart',     color:'bg-c1' },
  { id:'magento',      label:'Magento',      color:'bg-c2 text-white' },
  { id:'shopline',     label:'Shopline',     color:'bg-c4' },
  { id:'dukaan',       label:'Dukaan',       color:'bg-c3' },
  { id:'custom_api',   label:'Custom API',   color:'bg-c5' },
];
const STATUS_COLOR: Record<string,string> = { idle:'bg-c3', syncing:'bg-c4', error:'bg-c2 text-white', paused:'bg-[#999] text-white' };

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [syncingId, setSyncingId] = useState<string|null>(null);
  const [form, setForm] = useState({
    platform:'shopify', storeName:'', storeUrl:'', apiKey:'', apiSecret:'', accessToken:'',
    syncIntervalMin:15, autoSync:true, importPending:true, importPrepaid:true, importCod:true,
    pushTracking:true, pushAwb:true,
  });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [storeRes, dashRes] = await Promise.all([
        api.get('/stores'),
        api.get('/stores/dashboard'),
      ]);
      setStores(storeRes.data.stores);
      setDashboard(dashRes.data);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault(); setConnecting(true); setError('');
    try {
      const { data } = await api.post('/stores', form);
      alert(`Store connected!\nWebhook secret: ${data.webhookSecret}\nSave this for order push verification.`);
      setShowForm(false);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setConnecting(false); }
  }

  async function syncNow(id: string) {
    setSyncingId(id); setError('');
    try {
      await api.post(`/stores/${id}/sync`);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSyncingId(null); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Store Integrations</h1>
        <Btn variant="success" onClick={() => setShowForm(s => !s)}>+ Connect Store</Btn>
      </div>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}

      {dashboard && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="nb-card p-3 bg-c1"><div className="font-mono-nb text-[8px] uppercase">Connected Stores</div><div className="font-mono-nb text-2xl font-bold">{dashboard.connectedCount}</div></div>
          <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Total Imported</div><div className="font-mono-nb text-2xl font-bold">{dashboard.totalImported}</div></div>
          <div className="nb-card p-3 bg-c2 text-white"><div className="font-mono-nb text-[8px] uppercase">Failed Syncs (7d)</div><div className="font-mono-nb text-2xl font-bold">{dashboard.failedSyncs}</div></div>
          <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">Platforms</div><div className="font-mono-nb text-2xl font-bold">{[...new Set((stores||[]).map((s:any)=>s.platform))].length}</div></div>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHead className="bg-c4"><span className="font-bold">Connect New Store</span></CardHead>
          <form onSubmit={connect} className="p-4">
            <div className="mb-3">
              <div className="font-mono-nb text-[9px] font-bold uppercase mb-2">Platform</div>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} type="button" onClick={() => setForm(f=>({...f,platform:p.id}))}
                    className={`border-2 border-black px-3 py-1.5 text-xs font-bold ${form.platform===p.id?`${p.color} shadow-nb-sm`:'bg-white hover:bg-[#f5f5f5]'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Store name" required><Input value={form.storeName} onChange={e=>setForm(f=>({...f,storeName:e.target.value}))} required /></Field>
              <Field label="Store URL" required><Input type="url" value={form.storeUrl} onChange={e=>setForm(f=>({...f,storeUrl:e.target.value}))} placeholder="https://yourstore.com" required /></Field>
              <Field label="API Key" required><Input value={form.apiKey} onChange={e=>setForm(f=>({...f,apiKey:e.target.value}))} required /></Field>
              <Field label="API Secret"><Input value={form.apiSecret} onChange={e=>setForm(f=>({...f,apiSecret:e.target.value}))} /></Field>
              <Field label="Access Token"><Input value={form.accessToken} onChange={e=>setForm(f=>({...f,accessToken:e.target.value}))} /></Field>
              <Field label="Sync Interval">
                <select className="nb-input w-full" value={form.syncIntervalMin} onChange={e=>setForm(f=>({...f,syncIntervalMin:parseInt(e.target.value)}))}>
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 60 minutes</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[['Import Pending Orders','importPending'],['Import Prepaid','importPrepaid'],['Import COD','importCod'],['Push Tracking','pushTracking'],['Push AWB Number','pushAwb'],['Auto Sync','autoSync']].map(([label,key]) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer border border-[#eee] p-2">
                  <input type="checkbox" checked={(form as any)[key]}
                    onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Btn type="submit" variant="success" disabled={connecting} className="flex-1 justify-center">
                {connecting ? 'Connecting...' : '✓ Connect Store'}
              </Btn>
              <Btn type="button" variant="default" onClick={() => setShowForm(false)}>Cancel</Btn>
            </div>
          </form>
        </Card>
      )}

      {loading ? <div className="text-sm mt-4">Loading...</div>
      : stores.length === 0 ? (
        <div className="border-2 border-black bg-c5 p-6 text-center">
          <div className="text-2xl mb-2">🛒</div>
          <div className="font-bold mb-1">No stores connected</div>
          <div className="text-sm text-[#777]">Connect Shopify, WooCommerce, or any platform to auto-import orders.</div>
        </div>
      ) : stores.map(s => (
        <div key={s.id} className="nb-card p-4 mb-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge color={PLATFORMS.find(p=>p.id===s.platform)?.color||'bg-c5'}>{s.platform}</Badge>
                <span className="font-bold">{s.store_name}</span>
              </div>
              <div className="text-xs text-[#777] mt-0.5">{s.store_url}</div>
            </div>
            <Badge color={STATUS_COLOR[s.status]||'bg-c5'}>{s.status}</Badge>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
            <div className="border border-[#eee] p-2"><div className="text-[#777] text-[9px] uppercase font-mono-nb">Sync interval</div><div className="font-bold">{s.sync_interval_min}min</div></div>
            <div className="border border-[#eee] p-2"><div className="text-[#777] text-[9px] uppercase font-mono-nb">Total imported</div><div className="font-bold">{s.total_imported}</div></div>
            <div className="border border-[#eee] p-2"><div className="text-[#777] text-[9px] uppercase font-mono-nb">Last sync</div><div className="font-bold">{s.last_sync_at ? new Date(s.last_sync_at).toLocaleTimeString('en-IN') : '—'}</div></div>
            <div className="border border-[#eee] p-2"><div className="text-[#777] text-[9px] uppercase font-mono-nb">Auto sync</div><div className="font-bold">{s.auto_sync ? '✓ On' : '— Off'}</div></div>
          </div>
          {s.last_error && <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">⚠ {s.last_error}</div>}
          <div className="flex gap-2">
            <Btn variant="success" disabled={syncingId===s.id || s.status==='syncing'} onClick={() => syncNow(s.id)}>
              {syncingId===s.id ? 'Syncing...' : '↺ Sync Now'}
            </Btn>
            <Btn variant="default" onClick={() => api.patch(`/stores/${s.id}`, { isActive: !s.is_active }).then(load)}>
              {s.is_active ? 'Pause' : 'Resume'}
            </Btn>
            <Btn variant="danger" onClick={() => { if(confirm('Disconnect this store?')) api.delete(`/stores/${s.id}`).then(load); }}>
              Disconnect
            </Btn>
          </div>
        </div>
      ))}
    </div>
  );
}
