"use client";

import { useState, useEffect } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  closed: { bg: "bg-[#F1F5F9]", text: "text-[#475569]" },
  escalated: { bg: "bg-[#FECACA]", text: "text-[#991B1B]" },
  in_progress: { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]" },
};

const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]" },
  medium: { bg: "bg-[#FFFBEB]", text: "text-[#D97706]" },
  low: { bg: "bg-[#F8F9FB]", text: "text-[#64748B]" },
  critical: { bg: "bg-[#991B1B]", text: "text-[#FFFFFF]" },
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "weight_dispute",
    subject: "",
    description: "",
    attachmentUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const { data } = await api.post("/upload", {
            name: file.name,
            data: base64,
          });
          setForm((p) => ({ ...p, attachmentUrl: data.url }));
        } catch (err) {
          setUploadError("Failed to upload file");
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadError("An error occurred during file selection");
      setUploading(false);
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/tickets");
      setTickets(data.tickets);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post("/tickets", form);
      setSubmitted(true);
      load();
    } catch (err) {
      setSubmitError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function escalate(id: string) {
    try {
      await api.patch(`/tickets/${id}/escalate`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="animate-fade-up mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
            Support Tickets
            <span className="px-2.5 py-1 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold uppercase tracking-widest rounded-full">
              {tickets.filter((t) => t.status === "open").length} Open
            </span>
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Get help with shipments, billing, and technical issues.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-[#94A3B8] text-sm">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] p-12 text-center">
              <div className="w-16 h-16 bg-[#F8F9FB] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E5E8EF]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-1">
                No tickets found
              </h3>
              <p className="text-sm text-[#64748B]">
                You haven't created any support tickets yet.
              </p>
            </div>
          ) : (
            tickets.map((t) => {
              const statusStyle = STATUS_COLOR[t.status] || STATUS_COLOR.open;
              const priorityStyle =
                PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low;

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] p-5 hover:border-[#CBD5E1] transition-colors relative overflow-hidden group"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${t.status === "open" ? "bg-[#4F46E5]" : "bg-[#E5E8EF]"}`}
                  />

                  <div className="flex items-start justify-between mb-3 pl-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                          {t.ticket_number}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                        <span className="text-xs font-bold text-[#4F46E5]">
                          {t.type
                            .replace("_", " ")
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#0F172A] pr-4">
                        {t.subject}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0 ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pl-2 mt-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${priorityStyle.bg} ${priorityStyle.text}`}
                      >
                        {t.priority}
                      </span>
                      <span className="text-xs font-medium text-[#94A3B8] flex items-center gap-1.5">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {new Date(t.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      {t.attachment_url && (
                        <a
                          href={`${api.defaults.baseURL?.replace("/api/v1", "") || ""}${t.attachment_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                          </svg>
                          Attachment
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.status === "open" && (
                        <button
                          onClick={() => escalate(t.id)}
                          className="px-3 py-1.5 bg-[#FFFBEB] border border-[#FEF08A] text-[#B45309] text-xs font-semibold rounded-lg hover:bg-[#FEF3C7] hover:border-[#FDE047] transition-colors"
                        >
                          Escalate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Ticket Form */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden sticky top-6">
            <div className="px-6 py-5 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Create New Ticket
              </h2>
            </div>

            {submitted ? (
              <div className="p-10 text-center animate-fade-in">
                <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#BBF7D0]">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-1">
                  Ticket submitted successfully
                </h3>
                <p className="text-sm text-[#64748B] mb-6">
                  Our support team will respond within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setForm({
                      type: "weight_dispute",
                      subject: "",
                      description: "",
                      attachmentUrl: "",
                    });
                  }}
                  className="px-5 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] hover:text-[#0F172A] transition-colors shadow-sm"
                >
                  Create Another Ticket
                </button>
              </div>
            ) : (
              <form className="p-6" onSubmit={handleSubmit}>
                <div className="space-y-5 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Ticket Type
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full pl-3 pr-10 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 appearance-none cursor-pointer"
                        value={form.type}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, type: e.target.value }))
                        }
                      >
                        <option value="weight_dispute">Weight Dispute</option>
                        <option value="billing_dispute">Billing Dispute</option>
                        <option value="shipment_issue">Shipment Issue</option>
                        <option value="ndr">NDR / Delivery Issue</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Subject
                    </label>
                    <input
                      required
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                      value={form.subject}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, subject: e.target.value }))
                      }
                      placeholder="Briefly summarize the issue..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Description
                    </label>
                    <textarea
                      required
                      className="w-full px-3 py-3 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 resize-y min-h-[120px]"
                      rows={5}
                      value={form.description}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="Please provide all relevant details, AWB numbers, and context to help us resolve this quickly..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Upload Image / PDF
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="w-full text-xs text-[#64748B] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EEF2FF] file:text-[#4F46E5] hover:file:bg-[#E0E7FF] file:cursor-pointer cursor-pointer border border-[#E5E8EF] rounded-xl p-1"
                    />
                    {uploading && (
                      <div className="text-xs text-[#4F46E5] mt-1 font-semibold animate-pulse">
                        Uploading file...
                      </div>
                    )}
                    {uploadError && (
                      <div className="text-xs text-[#EF4444] mt-1 font-semibold">
                        {uploadError}
                      </div>
                    )}
                    {form.attachmentUrl && (
                      <div className="text-xs text-[#16A34A] mt-1 font-semibold flex items-center gap-1">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>{" "}
                        File attached successfully!
                      </div>
                    )}
                  </div>
                </div>

                {submitError && (
                  <div className="mb-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
                    {submitError}
                  </div>
                )}

                <div className="pt-2 border-t border-[#E5E8EF]">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center py-3 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
