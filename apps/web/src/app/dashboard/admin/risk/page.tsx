'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

type Tab = 'rules' | 'scores' | 'blacklist' | 'logs';

const RISK_COLOR: Record<string,string> = {
  safe:'bg-c3', medium:'bg-c4', high:'bg-c2 text-white', critical:'bg-[#8B0000] text-white',
};
const BL_TYPES = ['mobile','email','gst','ip','pan','device'];
const LEVEL_LABELS: Record<number,string> = {
  1:'🆕 New Merchant', 2:'✅ Verified', 3:'⭐ Trusted', 4:'🏢 Enterprise',
};

export default function RiskPage() {
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [scoreSummary, setScoreSummary] = useState<any>(null);
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string|null>(null);

  // Blacklist form
  const [blType, setBlType] = useState('mobile');
  const [blValue, setBlValue] = useState('');
  const [blReason, setBlReason] = useState('');

  // Score filter
  const [scoreFilter, setScoreFilter] = useState('');

  useEffect(() => { load(); }, [tab, scoreFilter]);

  async function load() {
    setLoading(true); setError('');
    try {
      if (tab === 'rules') {
        const { data } = await api.get('/super-admin/risk/settings');
        setRules(data.settings);
      } else if (tab === 'scores') {
        const { data } = await api.get('/super-admin/risk/scores', { params: scoreFilter ? { riskLevel: scoreFilter } : {} });
        setScores(data.scores);
        setScoreSummary(data.summary);
      } else if (tab === 'blacklist') {
        const { data } = await api.get('/super-admin/risk/blacklist');
        setBlacklist(data.items);
      } else {
        const { data } = await api.get('/super-admin/risk/logs');
        setLogs(data.logs);
      }
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function toggleRule(ruleKey: string, isEnabled: boolean) {
    setSaving(ruleKey);
    try {
      await api.patch(`/super-admin/risk/settings/${ruleKey}`, { isEnabled });
      setRules(r => r.map(x => x.rule_key === ruleKey ? { ...x, is_enabled: isEnabled } : x));
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSaving(null); }
  }

  async function evaluateRisk(sellerId: string) {
    try {
      const { data } = await api.post(`/super-admin/risk/scores/${sellerId}/evaluate`);
      alert(`Risk re-evaluated: Score ${data.score.score} — ${data.score.riskLevel}`);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function merchantAction(sellerId: string, action: string) {
    const reason = prompt(`Reason for ${action}:`);
    if (reason === null) return;
    try {
      const { data } = await api.patch(`/super-admin/risk/merchants/${sellerId}/action`, { action, reason });
      alert(data.message);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function addToBlacklist(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api.post('/super-admin/risk/blacklist', { type: blType, value: blValue, reason: blReason || undefined });
      setBlValue(''); setBlReason('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function removeFromBlacklist(id: string) {
    try { await api.delete(`/super-admin/risk/blacklist/${id}`); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id:'rules',     label:'⚙ Security Rules' },
    { id:'scores',    label:'📊 Risk Scores' },
    { id:'blacklist', label:'🚫 Blacklist' },
    { id:'logs',      label:'📋 Security Logs' },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Merchant Risk Management <Badge color="bg-c2 text-white">SUPER ADMIN</Badge></h1>
        <Btn variant="default" onClick={() => window.location.href='/dashboard/admin/security'}>← Security Dashboard</Btn>
      </div>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}

      {/* Tabs */}
      <div className="flex gap-0 mb-0 border-b-2 border-black">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-xs font-bold border-2 border-b-0 border-black font-mono-nb -mb-0.5 ${tab===t.id?'bg-[#fffaf0]':'bg-white text-[#777]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-4">

        {/* SECURITY RULES — 24 rules with toggle + threshold */}
        {tab === 'rules' && (
          <div>
            <div className="mb-3 border-2 border-black bg-c5 p-3 text-xs">
              All rules are enabled by default. Toggle any rule on/off without losing its threshold settings.
            </div>
            {loading ? <div className="text-sm">Loading...</div>
            : rules.map(rule => (
              <div key={rule.rule_key} className={`nb-card p-4 mb-2 border-l-4 ${rule.is_enabled ? 'border-l-c3' : 'border-l-[#ccc]'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="font-bold text-sm">{rule.rule_name}</div>
                    <div className="text-xs text-[#777] mt-0.5">{rule.description}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge color="bg-c5">{rule.action}</Badge>
                      <span className="font-mono-nb text-[9px] text-[#999]">
                        {Object.keys(rule.threshold || {}).length > 0
                          ? Object.entries(rule.threshold).map(([k,v]) => `${k}: ${v}`).join(' · ')
                          : 'No threshold'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRule(rule.rule_key, !rule.is_enabled)}
                    disabled={saving === rule.rule_key}
                    className={`w-12 h-6 border-2 border-black rounded-full relative transition-colors flex-shrink-0 ${
                      rule.is_enabled ? 'bg-c3' : 'bg-[#ddd]'
                    } ${saving === rule.rule_key ? 'opacity-50' : ''}`}>
                    <span className={`absolute top-0.5 w-4 h-4 border-2 border-black rounded-full bg-white transition-all ${
                      rule.is_enabled ? 'left-6' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RISK SCORES */}
        {tab === 'scores' && (
          <div>
            {scoreSummary && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="nb-card p-3 bg-c3 cursor-pointer" onClick={() => setScoreFilter(scoreFilter==='safe'?'':'safe')}>
                  <div className="font-mono-nb text-[8px] uppercase">Safe (0-30)</div>
                  <div className="font-mono-nb text-2xl font-bold">{scoreSummary.safe}</div>
                </div>
                <div className="nb-card p-3 bg-c4 cursor-pointer" onClick={() => setScoreFilter(scoreFilter==='medium'?'':'medium')}>
                  <div className="font-mono-nb text-[8px] uppercase">Medium (31-60)</div>
                  <div className="font-mono-nb text-2xl font-bold">{scoreSummary.medium}</div>
                </div>
                <div className="nb-card p-3 bg-c2 text-white cursor-pointer" onClick={() => setScoreFilter(scoreFilter==='high'?'':'high')}>
                  <div className="font-mono-nb text-[8px] uppercase">High (61-80)</div>
                  <div className="font-mono-nb text-2xl font-bold">{scoreSummary.high}</div>
                </div>
                <div className="nb-card p-3 bg-[#8B0000] text-white cursor-pointer" onClick={() => setScoreFilter(scoreFilter==='critical'?'':'critical')}>
                  <div className="font-mono-nb text-[8px] uppercase">Critical (81+)</div>
                  <div className="font-mono-nb text-2xl font-bold">{scoreSummary.critical}</div>
                </div>
              </div>
            )}
            {scoreFilter && <div className="mb-3 text-xs font-bold text-c2">Filtering: {scoreFilter} <button onClick={() => setScoreFilter('')} className="underline ml-1">Clear</button></div>}
            <Card>
              {loading ? <div className="p-4 text-sm">Loading...</div>
              : scores.length === 0 ? <div className="p-6 text-center text-sm text-[#777]">No merchants scored yet. Risk evaluation runs when merchants place orders.</div>
              : (
                <div className="overflow-auto">
                  <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Score</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Risk</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Level</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Flags</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Actions</th>
                  </tr></thead>
                  <tbody>
                    {scores.map((m: any) => (
                      <tr key={m.seller_id} className={`border-b border-[#eee] ${m.risk_level==='critical'?'bg-[#fff0f0]':m.risk_level==='high'?'bg-[#fffbeb]':''}`}>
                        <td className="px-3 py-2">
                          <div className="font-bold">{m.business_name}</div>
                          <div className="text-[#777]">{m.email}</div>
                          <div className="font-mono-nb text-[9px] text-[#999]">₹{parseFloat(m.balance||0).toFixed(0)} wallet</div>
                        </td>
                        <td className="font-mono-nb px-3 py-2">
                          <div className="text-2xl font-bold" style={{color: m.risk_score>80?'#8B0000':m.risk_score>60?'#c0392b':m.risk_score>30?'#e67e22':'#27ae60'}}>
                            {m.risk_score}
                          </div>
                        </td>
                        <td className="px-3 py-2"><Badge color={RISK_COLOR[m.risk_level]||'bg-c5'}>{m.risk_level}</Badge></td>
                        <td className="px-3 py-2">
                          <div className="text-xs">{LEVEL_LABELS[m.merchant_level] || `Level ${m.merchant_level}`}</div>
                          <select className="mt-1 nb-input text-[10px] py-0.5 w-full"
                            value={m.merchant_level}
                            onChange={e => api.patch(`/super-admin/risk/merchants/${m.seller_id}/level`, { level: parseInt(e.target.value) }).then(load)}>
                            <option value={1}>Level 1 — New</option>
                            <option value={2}>Level 2 — Verified</option>
                            <option value={3}>Level 3 — Trusted</option>
                            <option value={4}>Level 4 — Enterprise</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            {(m.flags||[]).slice(0,3).map((f: string) => (
                              <span key={f} className="font-mono-nb text-[8px] border border-c2 px-1 text-c2">{f.replace(/_/g,' ')}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <Btn variant="default" onClick={() => evaluateRisk(m.seller_id)}>↺ Re-eval</Btn>
                            {m.risk_level !== 'safe' && <Btn variant="warn" onClick={() => merchantAction(m.seller_id,'hold_cod')}>Hold COD</Btn>}
                            {m.risk_level === 'critical' && <Btn variant="danger" onClick={() => merchantAction(m.seller_id,'suspend')}>Suspend</Btn>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* BLACKLIST */}
        {tab === 'blacklist' && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">Blacklisted Entries</span></CardHead>
              {loading ? <div className="p-4 text-sm">Loading...</div>
              : blacklist.length === 0 ? <div className="p-4 text-sm text-[#777]">No blacklist entries yet.</div>
              : (
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Type</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Value</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Reason</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
                  </tr></thead><tbody>
                    {blacklist.map(b => (
                      <tr key={b.id} className={`border-b border-[#eee] ${!b.is_active?'opacity-40':''}`}>
                        <td className="px-3 py-2"><Badge color="bg-c5">{b.type}</Badge></td>
                        <td className="font-mono-nb px-3 py-2 font-bold">{b.value}</td>
                        <td className="px-3 py-2 text-[#777] text-[10px]">{b.reason || '—'}</td>
                        <td className="px-3 py-2">
                          {b.is_active && (
                            <Btn variant="danger" onClick={() => removeFromBlacklist(b.id)}>Remove</Btn>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </Card>

            <Card>
              <CardHead className="bg-c2 text-white"><span className="font-bold">+ Add to Blacklist</span></CardHead>
              <form onSubmit={addToBlacklist} className="p-4">
                <Field label="Type">
                  <select className="nb-input w-full" value={blType} onChange={e => setBlType(e.target.value)}>
                    {BL_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </Field>
                <Field label="Value" required>
                  <Input value={blValue} onChange={e => setBlValue(e.target.value)}
                    placeholder={blType==='mobile'?'9999999999':blType==='email'?'fake@email.com':blType==='ip'?'103.25.10.20':'Value'} required />
                </Field>
                <Field label="Reason">
                  <Input value={blReason} onChange={e => setBlReason(e.target.value)} placeholder="e.g. Known fraudster" />
                </Field>
                <Btn type="submit" variant="danger" className="w-full justify-center">🚫 Add to Blacklist</Btn>
              </form>
              <div className="border-t-2 border-[#eee] p-4">
                <div className="font-bold text-xs mb-2">Quick blocks — pre-seeded fake numbers:</div>
                {['9999999999','8888888888','7777777777','1234567890'].map(n => (
                  <span key={n} className="font-mono-nb text-[9px] border border-c2 text-c2 px-1.5 py-0.5 mr-1 mb-1 inline-block">{n}</span>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* SECURITY LOGS */}
        {tab === 'logs' && (
          <Card>
            <CardHead className="bg-black text-white"><span className="font-bold">Security Event Logs</span></CardHead>
            {loading ? <div className="p-4 text-sm">Loading...</div>
            : logs.length === 0 ? <div className="p-6 text-center text-sm text-[#777]">No security events logged yet.</div>
            : (
              <div className="overflow-auto">
                <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Time</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Event</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Severity</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">IP</th>
                </tr></thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id} className={`border-b border-[#eee] ${l.severity==='critical'?'bg-[#fff0f0]':l.severity==='warn'?'bg-[#fffbeb]':''}`}>
                      <td className="px-3 py-2">{new Date(l.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                      <td className="px-3 py-2"><Badge color="bg-c5">{l.event.replace(/_/g,' ')}</Badge></td>
                      <td className="px-3 py-2">{l.business_name || <span className="text-[#777]">System</span>}</td>
                      <td className="px-3 py-2">
                        <Badge color={l.severity==='critical'?'bg-c2 text-white':l.severity==='warn'?'bg-c4':'bg-c5'}>
                          {l.severity}
                        </Badge>
                      </td>
                      <td className="font-mono-nb px-3 py-2">{l.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
