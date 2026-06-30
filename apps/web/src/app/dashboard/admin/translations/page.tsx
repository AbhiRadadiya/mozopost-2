"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const LANG_FLAG: Record<string, string> = {
  hindi: "🇮🇳 Hindi",
  gujarati: "🇮🇳 Gujarati",
  tamil: "🇮🇳 Tamil",
  telugu: "🇮🇳 Telugu",
  marathi: "🇮🇳 Marathi",
  bengali: "🇮🇳 Bengali",
  kannada: "🇮🇳 Kannada",
  malayalam: "🇮🇳 Malayalam",
  punjabi: "🇮🇳 Punjabi",
  odia: "🇮🇳 Odia",
  english: "🇬🇧 English",
  unknown: "❓ Unknown",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#FEF9C3] text-[#854D0E]",
  translated: "bg-[#DBEAFE] text-[#1E40AF]",
  approved: "bg-[#D1FAE5] text-[#065F46]",
  rejected: "bg-[#FEE2E2] text-[#991B1B]",
  manual_review: "bg-[#FED7AA] text-[#9A3412]",
};

export default function AdminTranslationsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [tab, setTab] = useState<"overview" | "list" | "settings">("overview");
  const [form, setForm] = useState({
    autoApproveAbove: 85,
    minConfidence: 60,
    isEnabled: true,
    provider: "google",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [transRes] = await Promise.all([api.get("/admin/translations")]);
      setData(transRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveOk(false);
    try {
      await api.patch("/admin/translations/settings", form);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const s = data?.stats;

  return (
    <div className="animate-fade-up  mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">
          Address Translation Engine
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Automatically translate regional language addresses to English for
          shipment labels.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Stats */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#0F172A] p-5 rounded-2xl shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
              Total Translated
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {s.total}
            </div>
          </div>
          <div className="bg-[#FEF9C3] p-5 rounded-2xl border border-[#FEF08A] shadow-sm">
            <div className="text-[10px] font-bold text-[#854D0E] uppercase tracking-widest mb-2">
              Pending Review
            </div>
            <div className="text-2xl font-bold text-[#CA8A04] font-mono">
              {s.pending}
            </div>
          </div>
          <div className="bg-[#FED7AA] p-5 rounded-2xl border border-[#FDBA74] shadow-sm">
            <div className="text-[10px] font-bold text-[#9A3412] uppercase tracking-widest mb-2">
              Manual Queue
            </div>
            <div className="text-2xl font-bold text-[#C2410C] font-mono">
              {s.manual_review}
            </div>
          </div>
          <div className="bg-[#F0FDF4] p-5 rounded-2xl border border-[#A7F3D0] shadow-sm">
            <div className="text-[10px] font-bold text-[#065F46] uppercase tracking-widest mb-2">
              Success Rate
            </div>
            <div className="text-2xl font-bold text-[#16A34A] font-mono">
              {s.success_rate}%
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
              Avg Confidence
            </div>
            <div className="text-2xl font-bold text-[#4F46E5] font-mono">
              {s.avg_confidence}%
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E5E8EF]">
        {(["overview", "list", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t ? "border-[#4F46E5] text-[#4F46E5]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
          >
            {t === "overview"
              ? "📊 Overview"
              : t === "list"
                ? "📋 All Records"
                : "⚙ Settings"}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Language */}
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">By Language</h2>
            </div>
            {loading ? (
              <div className="py-12 text-center text-sm text-[#94A3B8] animate-pulse">
                Loading...
              </div>
            ) : (data?.byLanguage || []).length === 0 ? (
              <div className="py-12 text-center text-sm text-[#94A3B8]">
                No translations yet
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {(data?.byLanguage || []).map((l: any) => {
                  const pct =
                    s?.total > 0 ? Math.round((l.count / s.total) * 100) : 0;
                  return (
                    <div
                      key={l.language}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#F8F9FB] transition-colors"
                    >
                      <div className="text-sm font-semibold text-[#0F172A] w-24">
                        {LANG_FLAG[l.language] || l.language}
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#4F46E5] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-mono text-[#64748B] w-16 text-right">
                        {l.count} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Translation Flow */}
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Translation Flow
              </h2>
            </div>
            <div className="p-6">
              {[
                {
                  step: "1",
                  label: "Order Uploaded",
                  desc: "Address in any Indian language",
                  color: "bg-[#DBEAFE] text-[#1E40AF]",
                },
                {
                  step: "2",
                  label: "Language Detection",
                  desc: "Unicode script range analysis",
                  color: "bg-[#FEF9C3] text-[#854D0E]",
                },
                {
                  step: "3",
                  label: "Auto Translation",
                  desc: "Google Translate API call",
                  color: "bg-[#FEF9C3] text-[#854D0E]",
                },
                {
                  step: "4",
                  label: "Confidence Check",
                  desc: `≥${form.autoApproveAbove}% → auto-approve`,
                  color: "bg-[#EEF2FF] text-[#4F46E5]",
                },
                {
                  step: "5",
                  label: "Seller Review",
                  desc: "Low confidence → manual edit",
                  color: "bg-[#D1FAE5] text-[#065F46]",
                },
                {
                  step: "6",
                  label: "Shipment Created",
                  desc: "English address on label",
                  color: "bg-[#D1FAE5] text-[#065F46]",
                },
              ].map((step, i) => (
                <div key={step.step} className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.color}`}
                  >
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#0F172A]">
                      {step.label}
                    </div>
                    <div className="text-xs text-[#94A3B8] mt-0.5">
                      {step.desc}
                    </div>
                    {i < 5 && (
                      <div className="ml-0 mt-2 h-3 border-l-2 border-dashed border-[#E5E8EF]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ALL RECORDS */}
      {tab === "list" && (
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">
              Loading records...
            </div>
          ) : (data?.translations || []).length === 0 ? (
            <div className="py-16 text-center text-sm text-[#94A3B8]">
              No translation records yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Merchant
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Original
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Translated
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Conf.
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {(data?.translations || []).map((t: any) => (
                    <tr
                      key={t.id}
                      className="hover:bg-[#F8F9FB] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-bold text-[#4F46E5]">
                        {t.mozopost_order_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0F172A]">
                        {t.business_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF2FF] text-[#4F46E5]">
                          {LANG_FLAG[t.detected_language]?.split(" ")[1] ||
                            t.detected_language}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8] max-w-[120px] truncate">
                        {t.original_address}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#0F172A] max-w-[120px] truncate">
                        {t.translated_address || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono">
                        <span
                          className={
                            t.translation_confidence >= 85
                              ? "text-[#16A34A]"
                              : t.translation_confidence >= 60
                                ? "text-[#CA8A04]"
                                : "text-[#DC2626]"
                          }
                        >
                          {t.translation_confidence?.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[t.status] || "bg-[#F1F5F9] text-[#475569]"}`}
                        >
                          {t.status.replace("_", " ")}
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

      {/* SETTINGS */}
      {tab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8EF] bg-gradient-to-r from-[#EEF2FF] to-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                ⚙ Translation Engine Settings
              </h2>
            </div>
            <form onSubmit={saveSettings} className="p-6 space-y-5">
              {saveOk && (
                <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">
                  ✓ Settings saved successfully!
                </div>
              )}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F6F9] border border-[#E5E8EF]">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A]">
                    Address Translation Module
                  </div>
                  <div className="text-xs text-[#94A3B8]">
                    Enable or disable the entire engine
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, isEnabled: !p.isEnabled }))
                  }
                  className={`w-11 h-6 rounded-full relative transition-colors ${form.isEnabled ? "bg-[#4F46E5]" : "bg-[#E5E8EF]"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isEnabled ? "left-6" : "left-1"}`}
                  />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Translation Provider
                </label>
                <select
                  value={form.provider}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, provider: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                >
                  <option value="google">Google Translate API</option>
                  <option value="azure">Azure Cognitive Services</option>
                  <option value="mock">Mock (development only)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-2 uppercase tracking-wide">
                  Auto-approve Threshold:{" "}
                  <span className="text-[#4F46E5] font-bold">
                    {form.autoApproveAbove}%
                  </span>
                </label>
                <input
                  type="range"
                  min={50}
                  max={99}
                  value={form.autoApproveAbove}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      autoApproveAbove: parseInt(e.target.value),
                    }))
                  }
                  className="w-full accent-[#4F46E5]"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                  <span>50% (lenient)</span>
                  <span>99% (strict)</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-2 uppercase tracking-wide">
                  Min. Confidence:{" "}
                  <span className="text-[#4F46E5] font-bold">
                    {form.minConfidence}%
                  </span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={90}
                  value={form.minConfidence}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      minConfidence: parseInt(e.target.value),
                    }))
                  }
                  className="w-full accent-[#4F46E5]"
                />
                <div className="text-[10px] text-[#94A3B8] mt-1">
                  Below this threshold → flagged for manual review
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "✓ Save Settings"}
              </button>
            </form>
          </div>

          {/* Supported Languages */}
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Supported Languages
              </h2>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {[
                ["Hindi", "Devanagari script — most common"],
                ["Tamil", "South India — Chennai, Coimbatore"],
                ["Telugu", "Andhra Pradesh, Telangana"],
                ["Gujarati", "Gujarat — Surat, Ahmedabad"],
                ["Marathi", "Maharashtra — Mumbai, Pune"],
                ["Bengali", "West Bengal — Kolkata"],
                ["Kannada", "Karnataka — Bengaluru"],
                ["Malayalam", "Kerala — Kochi, Trivandrum"],
                ["Punjabi", "Punjab — Ludhiana, Amritsar"],
                ["Odia", "Odisha — Bhubaneswar"],
              ].map(([lang, desc]) => (
                <div
                  key={lang}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F8F9FB] transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#0F172A]">
                      🇮🇳 {lang}
                    </div>
                    <div className="text-xs text-[#94A3B8] mt-0.5">{desc}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46]">
                    Supported
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
