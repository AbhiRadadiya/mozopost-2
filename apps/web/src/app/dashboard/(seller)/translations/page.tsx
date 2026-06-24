'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

const LANG_FLAG: Record<string,string> = {
  hindi:'🇮🇳', gujarati:'🇮🇳', tamil:'🇮🇳', telugu:'🇮🇳',
  marathi:'🇮🇳', bengali:'🇮🇳', kannada:'🇮🇳', malayalam:'🇮🇳',
  punjabi:'🇮🇳', odia:'🇮🇳', english:'🇬🇧', unknown:'❓',
};
const LANG_COLOR: Record<string,string> = {
  hindi:'bg-[#ff9933]', gujarati:'bg-[#009900] text-white', tamil:'bg-c2 text-white',
  telugu:'bg-c1', marathi:'bg-c4', bengali:'bg-[#006a4e] text-white',
  kannada:'bg-c2 text-white', malayalam:'bg-[#006600] text-white',
  punjabi:'bg-[#003580] text-white', odia:'bg-c4', english:'bg-c3', unknown:'bg-[#999] text-white',
};
const STATUS_COLOR: Record<string,string> = {
  pending:'bg-c4', translated:'bg-c1', approved:'bg-c3',
  rejected:'bg-c2 text-white', manual_review:'bg-[#ffa500]',
};

export default function TranslationsPage() {
  const [translations, setTranslations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<string|null>(null);
  const [editForm, setEditForm] = useState({ address:'', city:'', state:'' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/translations', {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setTranslations(data.translations);
      setStats(data.stats);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function approve(id: string) {
    try {
      const payload = editing === id
        ? { editedAddress: editForm.address, editedCity: editForm.city, editedState: editForm.state }
        : {};
      await api.patch(`/translations/${id}/approve`, payload);
      setEditing(null);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function reject(id: string) {
    try {
      await api.patch(`/translations/${id}/reject`, { reason: 'Incorrect translation' });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function bulkApprove() {
    if (!selected.size) return;
    setBulkLoading(true);
    try {
      const { data } = await api.post('/translations/bulk-approve', { ids: Array.from(selected) });
      setSelected(new Set());
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBulkLoading(false); }
  }

  async function testDetect() {
    try {
      const { data } = await api.post('/translations/detect', { address: testText });
      setTestResult(data);
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  function startEdit(t: any) {
    setEditing(t.id);
    setEditForm({
      address: t.translated_address || '',
      city:    t.translated_city    || '',
      state:   t.translated_state   || '',
    });
  }

  const pendingCount = translations.filter(t => ['pending','translated','manual_review'].includes(t.status)).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Address Translation</h1>
          <p className="text-xs text-[#777] mt-0.5">Automatically translates regional language addresses to English before shipment</p>
        </div>
        {pendingCount > 0 && (
          <Badge color="bg-c2 text-white">{pendingCount} Need Review</Badge>
        )}
      </div>

      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="nb-card p-3 bg-black text-white"><div className="font-mono-nb text-[8px] uppercase opacity-70">Total</div><div className="font-mono-nb text-2xl font-bold">{stats.total}</div></div>
          <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">Pending</div><div className="font-mono-nb text-2xl font-bold">{stats.pending}</div></div>
          <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Approved</div><div className="font-mono-nb text-2xl font-bold">{stats.approved}</div></div>
          <div className="nb-card p-3 bg-[#ffa500]"><div className="font-mono-nb text-[8px] uppercase">Manual Review</div><div className="font-mono-nb text-2xl font-bold">{stats.manual_review}</div></div>
          <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">Avg Confidence</div><div className="font-mono-nb text-2xl font-bold">{stats.avg_confidence}%</div></div>
        </div>
      )}

      {/* Filter tabs + bulk actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 flex-wrap">
          {['','pending','translated','approved','manual_review'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`border-2 border-black px-3 py-1 text-[10px] font-bold font-mono-nb uppercase ${
                statusFilter === s ? 'bg-black text-white shadow-nb-sm' : 'bg-white hover:bg-[#f5f5f5]'
              }`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">{selected.size} selected</span>
            <Btn variant="success" disabled={bulkLoading} onClick={bulkApprove}>
              {bulkLoading ? 'Approving...' : `✓ Bulk Approve (${selected.size})`}
            </Btn>
            <Btn variant="default" onClick={() => setSelected(new Set())}>Clear</Btn>
          </div>
        )}
      </div>

      {/* Translation cards */}
      {loading ? <div className="text-sm py-4">Loading translations...</div>
      : translations.length === 0 ? (
        <div className="border-2 border-black bg-c3 p-6 text-center font-bold shadow-nb">
          ✓ No translations pending review
        </div>
      ) : translations.map(t => (
        <div key={t.id} className={`nb-card mb-3 overflow-hidden ${
          t.status === 'manual_review' ? 'border-l-4 border-l-[#ffa500]' :
          t.status === 'approved' ? 'border-l-4 border-l-c3' : ''
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between bg-black px-4 py-2.5">
            <div className="flex items-center gap-2">
              <input type="checkbox"
                checked={selected.has(t.id)}
                onChange={e => setSelected(prev => {
                  const next = new Set(prev);
                  e.target.checked ? next.add(t.id) : next.delete(t.id);
                  return next;
                })}
                className="w-4 h-4"
              />
              <span className="font-mono-nb text-c3 text-xs font-bold">{t.mozopost_order_id || 'No order'}</span>
              {t.consignee_name && <span className="text-white text-xs">{t.consignee_name}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Badge color={LANG_COLOR[t.detected_language] || 'bg-c5'}>
                {LANG_FLAG[t.detected_language]} {t.detected_language?.toUpperCase()}
              </Badge>
              <span className="font-mono-nb text-[10px] text-[#888]">
                Confidence: <span className={`font-bold ${t.translation_confidence >= 85 ? 'text-c3' : t.translation_confidence >= 60 ? 'text-c4' : 'text-c2'}`}>
                  {t.translation_confidence?.toFixed(0)}%
                </span>
              </span>
              <Badge color={STATUS_COLOR[t.status] || 'bg-c5'}>{t.status.replace('_', ' ')}</Badge>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-0">
            {/* Original */}
            <div className="p-4 bg-[#fff5f5] border-r-2 border-[#eee]">
              <div className="font-mono-nb text-[8px] font-bold uppercase text-c2 mb-2">
                Original ({t.detected_language})
              </div>
              <div className="font-bold text-sm">{t.original_address}</div>
              {t.original_city && <div className="text-sm text-[#555]">{t.original_city}</div>}
              {t.original_state && <div className="text-sm text-[#555]">{t.original_state}</div>}
              {t.original_pincode && <div className="font-mono-nb text-sm font-bold">{t.original_pincode}</div>}
            </div>

            {/* Translated */}
            <div className="p-4 bg-[#f5fff5]">
              <div className="font-mono-nb text-[8px] font-bold uppercase text-green-700 mb-2">
                Translated (English)
              </div>
              {editing === t.id ? (
                <div>
                  <input className="nb-input w-full mb-1.5 text-sm py-1"
                    value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Street address" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input className="nb-input w-full text-sm py-1"
                      value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                      placeholder="City" />
                    <input className="nb-input w-full text-sm py-1"
                      value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))}
                      placeholder="State" />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-sm">{t.translated_address || '—'}</div>
                  {t.translated_city && <div className="text-sm text-[#555]">{t.translated_city}</div>}
                  {t.translated_state && <div className="text-sm text-[#555]">{t.translated_state}</div>}
                  {t.translated_pincode && <div className="font-mono-nb text-sm font-bold">{t.translated_pincode}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {t.status !== 'approved' && (
            <div className="flex items-center gap-2 px-4 py-3 bg-[#f8f8f8] border-t-2 border-[#eee]">
              {editing === t.id ? (
                <>
                  <Btn variant="success" onClick={() => approve(t.id)}>✓ Approve with Edits</Btn>
                  <Btn variant="default" onClick={() => setEditing(null)}>Cancel</Btn>
                </>
              ) : (
                <>
                  <Btn variant="success" onClick={() => approve(t.id)}>✓ Approve</Btn>
                  <Btn variant="default" onClick={() => startEdit(t)}>✏ Edit & Approve</Btn>
                  <Btn variant="danger" onClick={() => reject(t.id)}>✕ Reject</Btn>
                </>
              )}
              {t.status === 'manual_review' && (
                <span className="text-[10px] font-bold text-[#ffa500]">⚠ Low confidence — manual review recommended</span>
              )}
            </div>
          )}
          {t.status === 'approved' && (
            <div className="px-4 py-2 bg-c3 border-t-2 border-[#000] text-xs font-bold">
              ✓ Approved{t.seller_edited ? ' with edits' : ''} — {t.final_address}, {t.final_city}
            </div>
          )}
        </div>
      ))}

      {/* Test tool */}
      <Card>
        <CardHead className="bg-black text-white"><span className="font-bold">🔍 Language Detection Test Tool</span></CardHead>
        <div className="p-4">
          <div className="flex gap-2">
            <input className="nb-input flex-1 text-sm"
              value={testText}
              onChange={e => setTestText(e.target.value)}
              placeholder="Paste any address to detect its language..." />
            <Btn variant="success" onClick={testDetect} disabled={!testText}>Detect</Btn>
          </div>
          {testResult && (
            <div className="mt-3 border-2 border-black p-3 bg-c5">
              <div className="flex items-center gap-3">
                <Badge color={LANG_COLOR[testResult.language] || 'bg-c5'}>
                  {LANG_FLAG[testResult.language]} {testResult.language?.toUpperCase()}
                </Badge>
                <span className="font-mono-nb text-sm font-bold">Confidence: {testResult.confidence?.toFixed(1)}%</span>
                {testResult.language !== 'english' && testResult.language !== 'unknown' && (
                  <span className="text-xs text-c2 font-bold">⚡ Translation required before booking</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
