"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-[#FEF2F2]", text: "text-[#A84A3B]" }, // Olive error red
  closed: { bg: "bg-[#F8F9F7]", text: "text-[#6B7556]" },
  escalated: { bg: "bg-[#FFFBEB]", text: "text-[#D97706]" },
  in_progress: { bg: "bg-[#EDF0E4]", text: "text-[#546B41]" },
};

export default function TicketsPage() {
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const supportCards = [
    {
      label: "Total Tickets",
      sub: "All time",
      value: tickets.length,
      color: "#2F3A22",
      iconBg: "#F6EEDB",
      icon: "🎫",
    },
    {
      label: "Open Tickets",
      sub: "Needs attention",
      value: tickets.filter((t) => t.status === "open").length,
      color: "#A84A3B",
      iconBg: "#FEF2F2",
      icon: "⚠️",
    },
    {
      label: "Resolved",
      sub: "Successfully closed",
      value: tickets.filter((t) => t.status === "closed").length,
      color: "#546B41",
      iconBg: "#EDF0E4",
      icon: "✓",
    },
    {
      label: "Escalated",
      sub: "High priority",
      value: tickets.filter((t) => t.status === "escalated").length,
      color: "#D97706",
      iconBg: "#FFFBEB",
      icon: "🔥",
    },
  ];

  return (
    <div className="animate-fade-up mx-auto  pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">
          Support Tickets
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#546B41] text-[#FFF8EC] rounded-lg px-5 py-2.5 text-[13px] font-bold hover:bg-[#435534] transition-colors shadow-sm"
        >
          + Raise Ticket
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Support Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {supportCards.map((c, i) => (
          <div
            key={i}
            className="bg-white border border-[#EADFC8] rounded-xl p-5 flex items-start justify-between shadow-sm"
          >
            <div>
              <div className="text-[11px] text-[#8A9270] uppercase tracking-widest font-bold">
                {c.label}
              </div>
              <div className="text-xs text-[#8A9270] mt-1.5">{c.sub}</div>
              <div
                className="text-3xl font-bold font-mono mt-3.5"
                style={{ color: c.color }}
              >
                {c.value}
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: c.iconBg, color: c.color }}
            >
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Overview Table */}
      <div className="bg-white border border-[#EADFC8] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[#2F3A22]">
            ▤ Ticket Overview
          </div>
          <div className="text-xs text-[#8A9270] font-medium">
            Total: {tickets.length} tickets
          </div>
        </div>

        <div className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-3 py-3 border-b border-[#EADFC8] text-[11px] text-[#8A9270] uppercase tracking-wider font-bold">
          <div>Ticket ID</div>
          <div>Issue Description</div>
          <div>Status</div>
          <div>Created Date</div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#8A9270] text-sm font-medium">
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-[#B3B596] text-sm">
            No tickets yet
          </div>
        ) : (
          <div className="divide-y divide-[#EADFC8]">
            {tickets.map((t) => {
              const statusStyle = STATUS_COLOR[t.status] || STATUS_COLOR.open;

              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-3 py-4 text-[13px] items-center hover:bg-[#F8F9F7] transition-colors -mx-5 px-5"
                >
                  <div className="font-mono text-[11px] font-bold text-[#6B7556] uppercase">
                    {t.ticket_number}
                  </div>
                  <div className="pr-4">
                    <div className="font-bold text-[#2F3A22] text-[13px] line-clamp-1">
                      {t.subject}
                    </div>
                    <div className="text-[11px] text-[#8A9270] mt-1 capitalize">
                      {t.type.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-[#8A9270] text-xs flex items-center justify-between">
                    <span>
                      {new Date(t.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex gap-2">
                      {t.attachment_url && (
                        <a
                          href={`${api.defaults.baseURL?.replace("/api/v1", "") || ""}${t.attachment_url}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View Attachment"
                          className="text-[#546B41] hover:text-[#435534]"
                        >
                          📎
                        </a>
                      )}
                      {t.status === "open" && (
                        <button
                          onClick={() => escalate(t.id)}
                          className="text-[#A84A3B] hover:underline text-[11px] font-bold"
                          title="Escalate Issue"
                        >
                          Escalate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raise Ticket Modal */}
      <Modal
        title=""
        isOpen={isModalOpen && mounted}
        onClose={() => {
          setIsModalOpen(false);
          setSubmitted(false);
        }}
        width="450px"
        customHeader={
          <div className="p-6 pb-4 shrink-0 bg-white z-10 border-b border-[#EADFC8]">
            <div className="flex items-start justify-between">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-xl bg-[#546B41] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2F3A22]">
                    Create New Ticket
                  </h2>
                  <p className="text-xs text-[#8A9270] mt-0.5">
                    We're here to help resolve any issues.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSubmitted(false);
                }}
                className="text-[#8A9270] hover:bg-[#FFF8EC] hover:text-[#546B41] w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        }
        bodyClassName="p-0"
      >
        {submitted ? (
          <div className="p-10 text-center overflow-y-auto">
            <div className="w-16 h-16 bg-[#EDF0E4] rounded-full flex items-center justify-center mx-auto mb-5 border border-[#CBD7B5]">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#546B41"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#2F3A22] mb-1">
              Ticket Submitted
            </h3>
            <p className="text-[13px] text-[#8A9270] mb-8 max-w-[250px] mx-auto leading-relaxed">
              Our support team has received your request and will respond
              within 24 hours.
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
                setIsModalOpen(false);
              }}
              className="px-8 py-3 bg-[#546B41] text-[#FFF8EC] text-[13px] font-bold rounded-xl hover:bg-[#435534] transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            className="flex-1 min-h-0"
            onSubmit={handleSubmit}
          >
                  {/* Body (Scrollable) */}
                  <div className="px-6 pb-6 space-y-5">
                    <div>
                      <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
                        Ticket Type
                      </div>
                      <div className="relative">
                        <select
                          required
                          className="w-full bg-[#FFF8EC] border border-[#EADFC8] rounded-xl pl-4 pr-10 py-3 text-[#2F3A22] font-semibold text-[13px] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 transition-all appearance-none cursor-pointer"
                          value={form.type}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, type: e.target.value }))
                          }
                        >
                          <option value="weight_dispute">Weight Dispute</option>
                          <option value="billing_dispute">
                            Billing Dispute
                          </option>
                          <option value="shipment_issue">Shipment Issue</option>
                          <option value="ndr">NDR / Delivery Issue</option>
                          <option value="other">Other</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#546B41]">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
                        Subject
                      </div>
                      <input
                        required
                        className="w-full bg-[#FFF8EC] border border-[#EADFC8] rounded-xl px-4 py-3 text-[#2F3A22] font-semibold text-[13px] placeholder:text-[#C2BC9E] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 transition-all"
                        value={form.subject}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, subject: e.target.value }))
                        }
                        placeholder="Briefly summarize the issue..."
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
                        Description
                      </div>
                      <textarea
                        required
                        className="w-full bg-[#FFF8EC] border border-[#EADFC8] rounded-xl px-4 py-3 text-[#2F3A22] font-semibold text-[13px] placeholder:text-[#C2BC9E] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 transition-all min-h-[90px] resize-y"
                        rows={3}
                        value={form.description}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Provide all relevant details, AWB numbers, etc."
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
                        Attachment (Optional)
                      </div>
                      <label
                        className={`w-full flex flex-col items-center justify-center py-5 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${form.attachmentUrl ? "border-[#546B41] bg-[#EDF0E4]" : "border-[#EADFC8] bg-[#FFF8EC] hover:bg-white hover:border-[#CBD7B5]"}`}
                      >
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        {uploading ? (
                          <div className="flex flex-col items-center gap-2 text-[#546B41]">
                            <svg
                              className="animate-spin"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            <span className="text-[11px] font-bold">
                              Uploading...
                            </span>
                          </div>
                        ) : form.attachmentUrl ? (
                          <div className="flex flex-col items-center gap-1.5 text-[#546B41]">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span className="text-[12px] font-bold">
                              File Attached
                            </span>
                            <span className="text-[10px] font-semibold text-[#6B7556] hover:underline mt-0.5">
                              Click to replace
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-[#8A9270]">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <span className="text-[12px] font-bold text-[#6B7556]">
                              Click to upload
                            </span>
                            <span className="text-[10px] font-medium">
                              JPG, PNG, or PDF
                            </span>
                          </div>
                        )}
                      </label>
                      {uploadError && (
                        <div className="text-[11px] text-[#A84A3B] mt-2 font-bold text-center">
                          {uploadError}
                        </div>
                      )}
                    </div>

                    {submitError && (
                      <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-bold text-[#A84A3B]">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl bg-[#546B41] text-white font-semibold text-sm hover:bg-[#3C4E2D] transition-colors shadow-sm flex items-center justify-center gap-2 mt-2 shrink-0"
                    >
                      {submitting ? "Submitting..." : "Submit Ticket"}
                      {!submitting && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="none"
                        >
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
        )}
      </Modal>
    </div>
  );
}
