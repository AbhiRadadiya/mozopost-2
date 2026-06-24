'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

export default function SmtpPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tab, setTab] = useState<'configs'|'templates'|'rules'|'logs'>('configs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', host:'', port:'587', secure:false, username:'', password:'', fromEmail:'', fromName:'Mozopost', isDefault:false });
  const [saving, setSaving] = useState(false);
  const [testId, setTestId] = useState<string|null>(null);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    try {
      if (tab === 'configs') {
        const { data } = await api.get('/admin/smtp/configs');
        setConfigs(data.configs);
      } else if (tab === 'templates') {
        const { data } = await api.get('/admin/smtp/templates');
        setTemplates(data.templates);
      } else if (tab === 'rules') {
        const { data } = await api.get('/admin/smtp/notification-rules');
        setRules(data.rules);
      } else {
        const { data } = await api.get('/admin/smtp/logs');
        setLogs(data.logs);
      }
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/admin/smtp/configs', { ...form, port: parseInt(form.port) });
      setShowForm(false);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function testSmtp(id: string) {
    setTestId(id);
    try {
      const { data } = await api.post(`/admin/smtp/configs/${id}/test`, {});
      alert(data.message);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setTestId(null); }
  }

  async function toggleRule(id: string, isActive: boolean) {
    try {
      await api.patch(`/admin/smtp/notification-rules/${id}`, { isActive });
      setRules(r => r.map(x => x.id===id ? {...x, is_active: isActive} : x));
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  const STATUS_COLOR: Record<string,string> = { sent:'bg-c3', failed:'bg-c2 text-white', queued:'bg-c4', bounced:'bg-c2 text-white', opened:'bg-c1' };

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">SMTP & Email Management</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}

      {/* Tabs */}
      <div className="flex gap-0 mb-0 border-b-2 border-black">
        {(['configs','templates','rules','logs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-xs font-bold border-2 border-b-0 border-black font-mono-nb uppercase -mb-0.5 ${tab===t?'bg-[#fffaf0]':'bg-white text-[#777]'}`}>
            {t === 'configs' ? '⚙ SMTP Configs' : t === 'templates' ? '📧 Templates' : t === 'rules' ? '🔔 Rules' : '📋 Logs'}
          </button>
        ))}
      </div>

      {/* SMTP CONFIGS */}
      {tab === 'configs' && (
        <div className="pt-4">
          <div className="mb-3 flex justify-end">
            <Btn variant="success" onClick={() => setShowForm(s => !s)}>+ Add SMTP Config</Btn>
          </div>
          {showForm && (
            <Card>
              <CardHead className="bg-c4"><span className="font-bold">New SMTP Configuration</span></CardHead>
              <form onSubmit={saveConfig} className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Config name" required><Input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} required /></Field>
                  <Field label="From name"><Input value={form.fromName} onChange={e => setForm(p=>({...p,fromName:e.target.value}))} /></Field>
                  <Field label="SMTP host" required><Input value={form.host} onChange={e => setForm(p=>({...p,host:e.target.value}))} placeholder="smtp.gmail.com" required /></Field>
                  <Field label="Port"><Input type="number" value={form.port} onChange={e => setForm(p=>({...p,port:e.target.value}))} /></Field>
                  <Field label="Username" required><Input value={form.username} onChange={e => setForm(p=>({...p,username:e.target.value}))} required /></Field>
                  <Field label="Password" required><Input type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} required /></Field>
                  <Field label="From email" required><Input type="email" value={form.fromEmail} onChange={e => setForm(p=>({...p,fromEmail:e.target.value}))} required /></Field>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <input type="checkbox" checked={form.isDefault} onChange={e => setForm(p=>({...p,isDefault:e.target.checked}))} id="isDefault" />
                  <label htmlFor="isDefault" className="text-xs font-bold">Set as default SMTP</label>
                </div>
                <Btn type="submit" variant="success" disabled={saving} className="w-full justify-center">
                  {saving ? 'Saving...' : 'Save SMTP Config'}
                </Btn>
              </form>
            </Card>
          )}
          {loading ? <div className="text-sm mt-4">Loading...</div>
          : configs.length === 0 ? <div className="mt-4 text-sm text-[#777]">No SMTP configs yet. Add one to start sending emails.</div>
          : configs.map(c => (
            <div key={c.id} className="nb-card p-4 mb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">{c.name} {c.is_default && <Badge color="bg-c3 text-black">Default</Badge>}</div>
                  <div className="text-xs text-[#777] mt-1">{c.host}:{c.port} · {c.from_email}</div>
                  {c.last_tested_at && (
                    <div className="text-xs mt-1">
                      Last tested: {new Date(c.last_tested_at).toLocaleDateString('en-IN')} — <Badge color={c.test_status==='ok'?'bg-c3':'bg-c2 text-white'}>{c.test_status}</Badge>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Btn variant="default" disabled={testId===c.id} onClick={() => testSmtp(c.id)}>
                    {testId===c.id ? 'Testing...' : '🧪 Test'}
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEMPLATES */}
      {tab === 'templates' && (
        <div className="pt-4">
          {loading ? <div className="text-sm">Loading...</div>
          : templates.map(t => (
            <div key={t.id} className="nb-card p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Badge color="bg-c1 text-black">{t.event.replace(/_/g,' ')}</Badge>
                  <span className="ml-2 font-bold text-sm">{t.subject}</span>
                </div>
                <Badge color={t.is_active?'bg-c3':'bg-[#999] text-white'}>{t.is_active?'Active':'Inactive'}</Badge>
              </div>
              <div className="text-xs text-[#777] font-mono-nb">Variables: {JSON.parse(t.variables||'[]').map((v:string) => `{{${v}}}`).join(', ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* NOTIFICATION RULES */}
      {tab === 'rules' && (
        <div className="pt-4">
          {loading ? <div className="text-sm">Loading...</div>
          : rules.map(r => (
            <div key={r.id} className="flex items-center justify-between border-b-2 border-[#eee] py-3">
              <div>
                <div className="font-bold text-sm">{r.event.replace(/_/g,' ')}</div>
                <div className="text-xs text-[#777]">Send to: {r.send_to}</div>
              </div>
              <button onClick={() => toggleRule(r.id, !r.is_active)}
                className={`w-10 h-5 border-2 border-black rounded-full relative transition-colors ${r.is_active?'bg-c3':'bg-[#ddd]'}`}>
                <span className={`absolute top-0.5 w-3 h-3 border-2 border-black rounded-full bg-white transition-all ${r.is_active?'left-5':'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* LOGS */}
      {tab === 'logs' && (
        <div className="pt-4">
          <Card>
            {loading ? <div className="p-4 text-sm">Loading...</div>
            : (
              <div className="overflow-auto">
                <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Date</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Event</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">To</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Subject</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                </tr></thead><tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-[#777]">No email logs yet</td></tr>
                  ) : logs.map(l => (
                    <tr key={l.id} className="border-b border-[#eee]">
                      <td className="px-3 py-2">{new Date(l.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2"><Badge color="bg-c5">{(l.event||'—').replace(/_/g,' ')}</Badge></td>
                      <td className="px-3 py-2">{l.to_email}</td>
                      <td className="px-3 py-2 truncate max-w-[200px]">{l.subject}</td>
                      <td className="px-3 py-2"><Badge color={STATUS_COLOR[l.status]||'bg-c5'}>{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
