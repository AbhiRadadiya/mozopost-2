'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

const LANG_FLAG: Record<string,string> = {
  hindi:'🇮🇳 Hindi', gujarati:'🇮🇳 Gujarati', tamil:'🇮🇳 Tamil',
  telugu:'🇮🇳 Telugu', marathi:'🇮🇳 Marathi', bengali:'🇮🇳 Bengali',
  kannada:'🇮🇳 Kannada', malayalam:'🇮🇳 Malayalam', punjabi:'🇮🇳 Punjabi',
  odia:'🇮🇳 Odia', english:'🇬🇧 English', unknown:'❓ Unknown',
};
const STATUS_COLOR: Record<string,string> = {
  pending:'bg-c4', translated:'bg-c1', approved:'bg-c3',
  rejected:'bg-c2 text-white', manual_review:'bg-[#ffa500]',
};

export default function AdminTranslationsPage() {
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [tab, setTab] = useState<'overview'|'list'|'settings'>('overview');
  const [form, setForm] = useState({ autoApproveAbove: 85, minConfidence: 60, isEnabled: true, provider: 'google' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [transRes, settingRes] = await Promise.all([
        api.get('/admin/translations'),
        api.get('/super-admin/risk/settings').then(r =>
          r.data.settings.find((s: any) => s.rule_key === 'address_translation')
        ).catch(() => null),
      ]);
      setData(transRes.data);
      if (settingRes) {
        setSettings(settingRes);
        const t = settingRes.threshold || {};
        setForm({
          autoApproveAbove: t.auto_approve_above ?? 85,
          minConfidence:    t.min_confidence    ?? 60,
          isEnabled:        settingRes.is_enabled ?? true,
          provider:         t.provider           ?? 'google',
        });
      }
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaveOk(false);
    try {
      await api.patch('/admin/translations/settings', form);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSaving(false); }
  }

  const s = data?.stats;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Address Translation Engine</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}

      {/* Platform summary */}
      {s && (
        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="nb-card p-3 bg-black text-white"><div className="font-mono-nb text-[8px] uppercase opacity-70">Total Translated</div><div className="font-mono-nb text-2xl font-bold">{s.total}</div></div>
          <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">Pending Review</div><div className="font-mono-nb text-2xl font-bold">{s.pending}</div></div>
          <div className="nb-card p-3 bg-[#ffa500]"><div className="font-mono-nb text-[8px] uppercase">Manual Queue</div><div className="font-mono-nb text-2xl font-bold">{s.manual_review}</div></div>
          <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Success Rate</div><div className="font-mono-nb text-2xl font-bold">{s.success_rate}%</div></div>
          <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">Avg Confidence</div><div className="font-mono-nb text-2xl font-bold">{s.avg_confidence}%</div></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-0 border-b-2 border-black">
        {(['overview','list','settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-xs font-bold border-2 border-b-0 border-black font-mono-nb uppercase -mb-0.5 ${tab===t?'bg-[#fffaf0]':'bg-white text-[#777]'}`}>
            {t === 'overview' ? '📊 Overview' : t === 'list' ? '📋 All Records' : '⚙ Settings'}
          </button>
        ))}
      </div>

      <div className="pt-4">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">By Language</span></CardHead>
              {loading ? <div className="p-4 text-sm">Loading...</div>
              : (data?.byLanguage || []).length === 0
                ? <div className="p-4 text-sm text-[#777]">No translations yet</div>
                : (
                  <div className="overflow-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-black text-c3">
                        <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Language</th>
                        <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Translations</th>
                        <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Share</th>
                      </tr></thead>
                      <tbody>
                        {(data?.byLanguage || []).map((l: any) => {
                          const pct = s?.total > 0 ? Math.round((l.count / s.total) * 100) : 0;
                          return (
                            <tr key={l.language} className="border-b border-[#eee]">
                              <td className="px-3 py-2 font-bold">{LANG_FLAG[l.language] || l.language}</td>
                              <td className="font-mono-nb px-3 py-2">{l.count}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 bg-c1 border border-[#000]" style={{ width: `${pct}%`, minWidth: 2, maxWidth: 80 }} />
                                  <span className="font-mono-nb text-[10px]">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </Card>

            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">Order Flow</span></CardHead>
              <div className="p-4">
                {[
                  { step:'1', label:'Order Uploaded',       desc:'Address in any Indian language', color:'bg-c1' },
                  { step:'2', label:'Language Detection',   desc:'Unicode script range analysis', color:'bg-c4' },
                  { step:'3', label:'Auto Translation',     desc:'Google Translate API call', color:'bg-c4' },
                  { step:'4', label:'Confidence Check',     desc:`≥${form.autoApproveAbove}% → auto-approve`, color:'bg-c5' },
                  { step:'5', label:'Seller Review',        desc:'Low confidence → manual edit', color:'bg-c3' },
                  { step:'6', label:'Shipment Created',     desc:'English address on label', color:'bg-c3' },
                ].map((s, i) => (
                  <div key={s.step} className="flex items-start gap-3 mb-3">
                    <div className={`flex-shrink-0 w-7 h-7 border-2 border-black flex items-center justify-center font-mono-nb font-bold text-xs ${s.color}`}>
                      {s.step}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{s.label}</div>
                      <div className="text-xs text-[#777]">{s.desc}</div>
                    </div>
                    {i < 5 && <div className="ml-3 self-stretch border-l-2 border-dashed border-[#ccc]" />}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ALL RECORDS */}
        {tab === 'list' && (
          <Card>
            {loading ? <div className="p-4 text-sm">Loading...</div>
            : (data?.translations || []).length === 0
              ? <div className="p-6 text-center text-sm text-[#777]">No translation records yet</div>
              : (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-black text-c3">
                      <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order</th>
                      <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                      <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Language</th>
                      <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Original</th>
                      <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Translated</th>
                      <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Conf.</th>
                      <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                    </tr></thead>
                    <tbody>
                      {(data?.translations || []).map((t: any) => (
                        <tr key={t.id} className="border-b border-[#eee] hover:bg-[#fffbeb]">
                          <td className="font-mono-nb px-3 py-2 text-[10px] font-bold">{t.mozopost_order_id || '—'}</td>
                          <td className="px-3 py-2">{t.business_name}</td>
                          <td className="px-3 py-2"><Badge color="bg-c5">{LANG_FLAG[t.detected_language]?.split(' ')[1] || t.detected_language}</Badge></td>
                          <td className="px-3 py-2 max-w-[140px] truncate text-[#777]">{t.original_address}</td>
                          <td className="px-3 py-2 max-w-[140px] truncate font-bold">{t.translated_address || '—'}</td>
                          <td className="font-mono-nb px-3 py-2">
                            <span className={t.translation_confidence >= 85 ? 'text-green-700 font-bold' : t.translation_confidence >= 60 ? 'text-[#e67e22] font-bold' : 'text-c2 font-bold'}>
                              {t.translation_confidence?.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-3 py-2"><Badge color={STATUS_COLOR[t.status] || 'bg-c5'}>{t.status.replace('_',' ')}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">Translation Engine Settings</span></CardHead>
              <form onSubmit={saveSettings} className="p-4">
                {saveOk && <div className="mb-3 border-2 border-black bg-c3 p-2 text-xs font-bold">✓ Settings saved</div>}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold">Address Translation</div>
                    <div className="text-xs text-[#777]">Enable or disable the entire module</div>
                  </div>
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, isEnabled: !p.isEnabled }))}
                    className={`w-12 h-6 border-2 border-black rounded-full relative transition-colors ${form.isEnabled ? 'bg-c3' : 'bg-[#ddd]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 border-2 border-black rounded-full bg-white transition-all ${form.isEnabled ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                <Field label="Translation Provider">
                  <select className="nb-input w-full" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}>
                    <option value="google">Google Translate API</option>
                    <option value="azure">Azure Cognitive Services</option>
                    <option value="mock">Mock (development only)</option>
                  </select>
                </Field>
                <Field label={`Auto-approve threshold: ${form.autoApproveAbove}%`}>
                  <input type="range" min={50} max={99} value={form.autoApproveAbove}
                    onChange={e => setForm(p => ({ ...p, autoApproveAbove: parseInt(e.target.value) }))}
                    className="w-full" />
                  <div className="flex justify-between font-mono-nb text-[9px] text-[#777] mt-1">
                    <span>50% (lenient)</span><span>99% (strict)</span>
                  </div>
                </Field>
                <Field label={`Minimum confidence: ${form.minConfidence}%`}>
                  <input type="range" min={30} max={90} value={form.minConfidence}
                    onChange={e => setForm(p => ({ ...p, minConfidence: parseInt(e.target.value) }))}
                    className="w-full" />
                  <div className="text-[10px] text-[#777] mt-1">
                    Below this → flagged for manual review
                  </div>
                </Field>
                <Btn type="submit" variant="success" disabled={saving} className="w-full justify-center">
                  {saving ? 'Saving...' : '✓ Save Settings'}
                </Btn>
              </form>
            </Card>
            <Card>
              <CardHead className="bg-black text-white"><span className="font-bold">Supported Languages</span></CardHead>
              <div className="p-4">
                {[
                  ['Hindi','Devanagari script — most common'],
                  ['Tamil','South India — Chennai, Coimbatore'],
                  ['Telugu','Andhra Pradesh, Telangana'],
                  ['Gujarati','Gujarat — Surat, Ahmedabad'],
                  ['Marathi','Maharashtra — Mumbai, Pune'],
                  ['Bengali','West Bengal — Kolkata'],
                  ['Kannada','Karnataka — Bengaluru'],
                  ['Malayalam','Kerala — Kochi, Trivandrum'],
                  ['Punjabi','Punjab — Ludhiana, Amritsar'],
                  ['Odia','Odisha — Bhubaneswar'],
                ].map(([lang, desc]) => (
                  <div key={lang} className="flex items-center justify-between py-2 border-b border-[#eee]">
                    <div>
                      <div className="font-bold text-sm">🇮🇳 {lang}</div>
                      <div className="text-xs text-[#777]">{desc}</div>
                    </div>
                    <Badge color="bg-c3">Supported</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
