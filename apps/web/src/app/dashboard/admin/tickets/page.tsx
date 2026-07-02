"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-[#FEF2F2] text-[#DC2626]",
  in_progress: "bg-[#FEF9C3] text-[#CA8A04]",
  escalated: "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]",
  closed: "bg-[#FAF4E6] text-[#546B41]",
};

function getPriorityInfo(type: string = "") {
  const t = type.toLowerCase();
  if (t.includes('payment') || t.includes('dispute') || t.includes('finance') || t.includes('remittance')) {
    return { label: 'High', style: 'border-[#FECACA] text-[#DC2626] bg-[#FEF2F2]' };
  }
  if (t.includes('general') || t.includes('inquiry')) {
    return { label: 'Low', style: 'border-[#E2D4B8] text-[#8A9270] bg-[#FAF4E6]' };
  }
  return { label: 'Medium', style: 'border-[#FDE68A] text-[#D97706] bg-[#FFFBEB]' };
}

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"open" | "pending" | "all">("open");

  // Status update modal state
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [statusUpdateForm, setStatusUpdateForm] = useState({ status: "" });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      load(false);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, [search]);

  async function load(isPolling = false) {
    if (!isPolling) setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.append("search", search);
      const { data } = await api.get(`/admin/tickets?${qs.toString()}`);
      setTickets(data.tickets || []);
    } catch (err) {
      if (!isPolling) setError(apiErrorMessage(err));
    } finally {
      if (!isPolling) setLoading(false);
    }
  }

  async function updateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTicket || !statusUpdateForm.status) return;
    
    setUpdating(true);
    setError("");
    try {
      await api.patch(`/admin/tickets/${activeTicket.id}/status`, {
        status: statusUpdateForm.status
      });
      setActiveTicket(null);
      await load(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  const openTickets = tickets.filter(t => t.status === 'open');
  const pendingTickets = tickets.filter(t => t.status === 'in_progress' || t.status === 'escalated');
  
  let displayedTickets = tickets;
  if (activeTab === "open") displayedTickets = openTickets;
  if (activeTab === "pending") displayedTickets = pendingTickets;

  return (
    <div className="animate-fade-up mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22]">Support Tickets</h1>
          <p className="text-sm text-[#8A9270] mt-1">
            Every seller's ticket in one queue.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9270]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search sellers, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-[#E2D4B8] rounded-xl bg-white outline-none focus:border-[#546B41] w-[260px] shadow-sm text-[#2F3A22] placeholder:text-[#8A9270]"
            />
          </div>
          <button
            onClick={() => load(false)}
            className="px-5 py-2 text-sm border border-[#E2D4B8] text-[#546B41] font-bold rounded-xl hover:bg-[#FAF4E6] transition-colors shadow-sm bg-white"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] font-semibold">
          ⚠ {error}
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-8 border-b border-[#E2D4B8] pb-[1px]">
        <button
          onClick={() => setActiveTab("open")}
          className={`pb-3 flex items-center gap-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "open"
              ? "border-[#546B41] text-[#2F3A22]"
              : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
          }`}
        >
          Open
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === "open" ? "bg-[#E0E7CE] text-[#546B41]" : "bg-[#F1F5F9] text-[#94A3B8]"
          }`}>
            {openTickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 flex items-center gap-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "pending"
              ? "border-[#546B41] text-[#2F3A22]"
              : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
          }`}
        >
          Pending
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === "pending" ? "bg-[#E0E7CE] text-[#546B41]" : "bg-[#F1F5F9] text-[#94A3B8]"
          }`}>
            {pendingTickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 flex items-center gap-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-[#546B41] text-[#2F3A22]"
              : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
          }`}
        >
          All
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === "all" ? "bg-[#E0E7CE] text-[#546B41]" : "bg-[#F1F5F9] text-[#94A3B8]"
          }`}>
            {tickets.length}
          </span>
        </button>
      </div>

      {/* Flat List */}
      <div className="bg-white rounded-[16px] border border-[#E2D4B8] shadow-sm overflow-hidden">
        {loading && displayedTickets.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#E2D4B8] border-t-[#546B41] rounded-full animate-spin"></div>
              <div className="text-sm text-[#8A9270] animate-pulse">Loading tickets...</div>
            </div>
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">🎫</div>
            <div className="text-base font-semibold text-[#2F3A22]">
              No Tickets Found
            </div>
            <div className="text-sm text-[#8A9270] mt-1">
              There are no tickets in this queue.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#FAF4E6] border-b border-[#E2D4B8]">
                  <th className="px-6 py-4 text-[10px] font-bold text-[#8A9270] uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#8A9270] uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#8A9270] uppercase tracking-wider">Seller</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#8A9270] uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#8A9270] uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#8A9270] uppercase tracking-wider text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D4B8]">
                {displayedTickets.map((t: any) => {
                  const priority = getPriorityInfo(t.type);
                  return (
                    <tr key={t.id} className="hover:bg-[#FAF4E6]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-[#8A9270]">
                          {t.ticket_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[13px] font-bold text-[#2F3A22]">
                          {t.subject}
                        </div>
                        <div className="text-[11px] text-[#8A9270] font-medium mt-0.5">
                          {timeAgo(t.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[13px] font-medium text-[#6B7556]">
                          {t.business_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[13px] text-[#8A9270] capitalize font-medium">
                          {t.type.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${priority.style}`}>
                          {priority.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setActiveTicket(t);
                            setStatusUpdateForm({ status: t.status });
                            setError("");
                          }}
                          className="text-xs font-bold text-[#546B41] hover:text-[#435534] transition-colors inline-flex items-center gap-1"
                        >
                          Open <span className="text-[14px]">→</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Beautiful Resolution Modal */}
      <Modal
        title={``}
        isOpen={!!activeTicket}
        onClose={() => setActiveTicket(null)}
        width="672px" // matches max-w-2xl
        customHeader={
          activeTicket ? (
            <div className="flex items-center justify-between p-6 border-b border-[#E2D4B8] bg-[#FAF4E6]">
              <div>
                <h3 className="text-xl font-bold text-[#2F3A22] flex items-center gap-3">
                  Ticket {activeTicket.ticket_number}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityInfo(activeTicket.type).style}`}>
                    {getPriorityInfo(activeTicket.type).label} Priority
                  </span>
                </h3>
                <p className="text-sm text-[#8A9270] mt-1 font-medium">
                  Reported by {activeTicket.business_name} • {new Date(activeTicket.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#E2D4B8] text-[#8A9270] hover:text-[#2F3A22] hover:border-[#8A9270] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          ) : null
        }
        bodyClassName="p-0"
      >
        {activeTicket && (
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="mb-6">
              <div className="text-xs font-bold text-[#8A9270] uppercase tracking-widest mb-2">Subject</div>
              <div className="text-lg font-bold text-[#2F3A22] leading-tight">
                {activeTicket.subject}
              </div>
            </div>

            {activeTicket.message && (
              <div className="mb-6">
                <div className="text-xs font-bold text-[#8A9270] uppercase tracking-widest mb-2">Message Description</div>
                <div className="bg-[#FAF4E6] border border-[#E2D4B8] rounded-2xl p-5 text-sm text-[#6B7556] leading-relaxed whitespace-pre-wrap">
                  {activeTicket.message}
                </div>
              </div>
            )}

            {activeTicket.attachment_url && (
              <div className="mb-8">
                <div className="text-xs font-bold text-[#8A9270] uppercase tracking-widest mb-2">Attachments</div>
                <a
                  href={`${api.defaults.baseURL?.replace("/api/v1", "") || ""}${activeTicket.attachment_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E2D4B8] text-[#546B41] hover:bg-[#FAF4E6] transition-colors text-sm font-bold shadow-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path></svg>
                  View Attached File
                </a>
              </div>
            )}

            <div className="border-t border-[#E2D4B8] pt-6">
              <h4 className="text-sm font-bold text-[#2F3A22] mb-4">Resolve & Update Status</h4>
              <form onSubmit={updateStatus} className="flex gap-3">
                <select
                  required
                  value={statusUpdateForm.status}
                  onChange={(e) => setStatusUpdateForm({ status: e.target.value })}
                  className="flex-1 px-4 py-3 text-sm font-bold border border-[#E2D4B8] rounded-xl bg-[#FAF4E6] text-[#2F3A22] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/20 appearance-none cursor-pointer"
                >
                  <option value="open">Open (Needs Attention)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="escalated">Escalated</option>
                  <option value="closed">Closed (Resolved)</option>
                </select>
                <button
                  type="submit"
                  disabled={updating || !statusUpdateForm.status || statusUpdateForm.status === activeTicket.status}
                  className="px-6 py-3 text-sm font-bold text-white bg-[#546B41] rounded-xl hover:bg-[#435534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {updating ? "Saving..." : "Update Ticket"}
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
