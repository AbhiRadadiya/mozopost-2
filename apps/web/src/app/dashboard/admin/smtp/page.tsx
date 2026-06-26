'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

const LOG_STATUS_STYLE: Record<string, string> = {
  sent:    'bg-[#D1FAE5] text-[#065F46]',
  failed:  'bg-[#FEE2E2] text-[#991B1B]',
  queued:  'bg-[#FEF9C3] text-[#854D0E]',
  bounced: 'bg-[#FEE2E2] text-[#991B1B]',
  opened:  'bg-[#DBEAFE] text-[#1E40AF]',
};

const TABS = ['configs', 'templates', 'rules', 'logs'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  configs:   '⚙ SMTP Configs',
  templates: '📧 Templates',
  rules:     '🔔 Notification Rules',
  logs:      '📋 Email Logs',
};

export default function SmtpPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('configs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', port: '587', secure: false, username: '', password: '', fromEmail: '', fromName: 'Mozopost', isDefault: false });
  const [saving, setSaving] = useState(false);
  const [testId, setTestId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

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
      await api.post('/admin/smtp/configs', { ...form, port: parseInt(form.port), secure: form.secure || parseInt(form.port) === 465 });
      setShowForm(false); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function testSmtp(id: string) {
    if (!testEmail.trim()) {
      setError('Please enter a test recipient email before testing.');
      return;
    }
    setTestId(id); setTestResult(null);
    try {
      const { data } = await api.post(`/admin/smtp/configs/${id}/test`, { toEmail: testEmail });
      setTestResult({ id, ok: true, message: data.message || 'Test email sent successfully!' });
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || apiErrorMessage(err);
      setTestResult({ id, ok: false, message: msg });
    } finally { setTestId(null); }
  }

  async function toggleRule(id: string, isActive: boolean) {
    try {
      await api.patch(`/admin/smtp/notification-rules/${id}`, { isActive });
      setRules(r => r.map(x => x.id === id ? { ...x, is_active: isActive } : x));
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  const inp = "w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]";

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">SMTP & Email Management</h1>
        <p className="text-sm text-[#64748B] mt-1">Configure email delivery, templates, and notification rules.</p>
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E5E8EF]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* === SMTP CONFIGS === */}
      {tab === 'configs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(s => !s)}
              className="px-5 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm">
              + Add SMTP Config
            </button>
          </div>

          {/* Test Email Input */}
          <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-4 flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <input
              type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
              placeholder="Test recipient email (e.g. admin@company.com)"
              className="flex-1 px-3 py-2 text-sm border border-[#C7D2FE] rounded-lg bg-white outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]"
            />
            <span className="text-xs font-semibold text-[#4F46E5] whitespace-nowrap">Test recipient</span>
          </div>

          {testResult && (
            <div className={`p-4 rounded-xl text-sm font-medium border ${testResult.ok ? 'bg-[#F0FDF4] border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'}`}>
              {testResult.ok ? '✓ ' : '✕ '}{testResult.message}
            </div>
          )}

          {showForm && (
            <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
                <h2 className="text-sm font-bold text-[#0F172A]">New SMTP Configuration</h2>
              </div>
              <form onSubmit={saveConfig} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Config Name *</label>
                    <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">From Name</label>
                    <input value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">SMTP Host *</label>
                    <input required value={form.host} onChange={e => setForm(p => ({ ...p, host: e.target.value }))} placeholder="smtp.gmail.com" className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Port</label>
                    <input type="number" value={form.port} onChange={e => setForm(p => ({ ...p, port: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Username *</label>
                    <input required value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Password *</label>
                    <input type="password" required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={inp} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">From Email *</label>
                    <input type="email" required value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} className={inp} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                    className="w-4 h-4 accent-[#4F46E5]" />
                  <label htmlFor="isDefault" className="text-sm font-semibold text-[#0F172A]">Set as default SMTP config</label>
                </div>
                <div className="flex gap-3 pt-2 border-t border-[#F1F5F9]">
                  <button type="submit" disabled={saving}
                    className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save SMTP Config'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-6 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading configs...</div>
          ) : configs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E8EF] p-12 text-center">
              <div className="text-3xl mb-3">📬</div>
              <div className="text-sm font-semibold text-[#0F172A]">No SMTP configs yet</div>
              <div className="text-xs text-[#94A3B8] mt-1">Add one above to start sending emails.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-[#0F172A]">{c.name}</span>
                        {c.is_default && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46]">Default</span>}
                      </div>
                      <div className="text-xs text-[#64748B]">{c.host}:{c.port} · {c.from_email}</div>
                      {c.last_tested_at && (
                        <div className="text-xs mt-1.5 flex items-center gap-1.5 text-[#94A3B8]">
                          Last tested: {new Date(c.last_tested_at).toLocaleDateString('en-IN')} —
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.test_status === 'ok' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                            {c.test_status}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button disabled={testId === c.id} onClick={() => testSmtp(c.id)}
                        className="px-4 py-2 text-sm font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded-xl hover:bg-[#E0E7FF] transition-colors disabled:opacity-50">
                        {testId === c.id ? '⏳ Sending...' : '🧪 Send Test'}
                      </button>
                      {testResult?.id === c.id && (
                        <span className={`text-[11px] font-semibold ${testResult?.ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          {testResult?.ok ? '✓ Sent' : '✕ Failed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === TEMPLATES === */}
      {tab === 'templates' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading templates...</div>
          ) : templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DBEAFE] text-[#1E40AF]">{t.event.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-sm text-[#0F172A]">{t.subject}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${t.is_active ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#F1F5F9] text-[#475569]'}`}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-xs text-[#94A3B8] font-mono">
                Variables: {(Array.isArray(t.variables) ? t.variables : (typeof t.variables === 'string' && t.variables.startsWith('[') ? JSON.parse(t.variables || '[]') : typeof t.variables === 'string' ? t.variables.split(',') : [])).map((v: string) => `{{${v.trim()}}}`).join(', ') || '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === NOTIFICATION RULES === */}
      {tab === 'rules' && (
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading rules...</div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {rules.map(r => (
                <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#F8F9FB] transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-[#0F172A] capitalize">{r.event.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-[#94A3B8] mt-0.5">Send to: <span className="font-medium text-[#475569]">{r.send_to}</span></div>
                  </div>
                  <button onClick={() => toggleRule(r.id, !r.is_active)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${r.is_active ? 'bg-[#4F46E5]' : 'bg-[#E5E8EF]'}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${r.is_active ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === EMAIL LOGS === */}
      {tab === 'logs' && (
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Event</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">To</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Subject</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No email logs yet</td></tr>
                  ) : logs.map(l => (
                    <tr key={l.id} className="hover:bg-[#F8F9FB] transition-colors">
                      <td className="px-5 py-3 text-sm text-[#64748B]">{new Date(l.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF2FF] text-[#4F46E5]">{(l.event || '—').replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#64748B]">{l.to_email}</td>
                      <td className="px-5 py-3 text-sm text-[#0F172A] truncate max-w-[200px]">{l.subject}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${LOG_STATUS_STYLE[l.status] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
