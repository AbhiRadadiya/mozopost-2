"use client";

import { useEffect, useState, useMemo } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-[#FEF2F2] text-[#991B1B]",
  in_progress: "bg-[#FEF9C3] text-[#854D0E]",
  escalated: "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]",
  closed: "bg-[#F1F5F9] text-[#475569]",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [search, setSearch] = useState("");
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);

  // Status update modal state
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [statusUpdateForm, setStatusUpdateForm] = useState({ status: "" });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      load();
    }, 400); // 400ms debounce for search
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (search) qs.append("search", search);
      const { data } = await api.get(`/admin/tickets?${qs.toString()}`);
      setTickets(data.tickets || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTicket || !statusUpdateForm.status) return;
    
    setUpdating(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/admin/tickets/${activeTicket.id}/status`, {
        status: statusUpdateForm.status
      });
      setSuccess(`Ticket #${activeTicket.ticket_number} status updated to ${statusUpdateForm.status.replace("_", " ")}.`);
      setActiveTicket(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  const groupedSellers = useMemo(() => {
    const groups: Record<string, any> = {};
    tickets.forEach((t) => {
      if (!groups[t.seller_id]) {
        groups[t.seller_id] = {
          sellerId: t.seller_id,
          businessName: t.business_name,
          tickets: [],
          latestDate: new Date(t.created_at).getTime(),
          openCount: 0,
        };
      }
      groups[t.seller_id].tickets.push(t);
      if (t.status === "open" || t.status === "escalated") {
        groups[t.seller_id].openCount++;
      }
      const tTime = new Date(t.created_at).getTime();
      if (tTime > groups[t.seller_id].latestDate) {
        groups[t.seller_id].latestDate = tTime;
      }
    });

    return Object.values(groups).sort((a, b) => b.latestDate - a.latestDate);
  }, [tickets]);

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const escalatedTickets = tickets.filter(t => t.status === 'escalated').length;

  return (
    <div className="animate-fade-up mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Support Tickets</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage and resolve merchant support requests.
          </p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white outline-none focus:border-[#4F46E5] w-[260px] shadow-sm"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Total Tickets
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">
            {tickets.length}
          </div>
        </div>
        <div className="bg-[#FEF2F2] p-5 rounded-2xl border border-[#FECACA] shadow-sm">
          <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest mb-2">
            Needs Attention (Open)
          </div>
          <div className="text-2xl font-bold text-[#B91C1C] font-mono">
            {openTickets}
          </div>
        </div>
        <div className="bg-[#FFFBEB] p-5 rounded-2xl border border-[#FDE68A] shadow-sm">
          <div className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest mb-2">
            Escalated Issues
          </div>
          <div className="text-2xl font-bold text-[#D97706] font-mono">
            {escalatedTickets}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">
          ✓ {success}
        </div>
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={!!activeTicket}
        onClose={() => {
          setActiveTicket(null);
          setError("");
        }}
        width="460px"
        title="Update Ticket Status"
        subtitle={activeTicket ? `Ticket #${activeTicket.ticket_number} - ${activeTicket.business_name}` : ""}
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="submit"
              form="status-update-form"
              disabled={updating || !statusUpdateForm.status}
              className="flex-1 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50"
            >
              {updating ? "Updating..." : "Update Status"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTicket(null)}
              className="px-4 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors"
            >
              Cancel
            </button>
          </div>
        }
      >
        <form id="status-update-form" onSubmit={updateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
              New Status
            </label>
            <select
              required
              value={statusUpdateForm.status}
              onChange={(e) => setStatusUpdateForm({ status: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
            >
              <option value="" disabled>Select a status...</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Accordion List */}
      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden flex flex-col divide-y divide-[#E5E8EF]">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">
            Loading tickets...
          </div>
        ) : groupedSellers.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">🎫</div>
            <div className="text-sm font-semibold text-[#0F172A]">
              No Tickets Found
            </div>
            <div className="text-xs text-[#94A3B8] mt-1">
              Either there are no tickets or your search returned no merchants.
            </div>
          </div>
        ) : (
          groupedSellers.map((seller) => {
            const isExpanded = expandedSeller === seller.sellerId;
            return (
              <div key={seller.sellerId} className="flex flex-col">
                {/* Accordion Header */}
                <button
                  onClick={() => setExpandedSeller(isExpanded ? null : seller.sellerId)}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[#F8F9FB] transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-lg">
                      {seller.businessName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-[#0F172A]">
                        {seller.businessName}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Latest Request: {new Date(seller.latestDate).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-[11px] uppercase tracking-wider font-bold text-[#94A3B8] mb-0.5">Tickets</div>
                      <div className="text-sm font-semibold text-[#0F172A]">{seller.tickets.length} total</div>
                    </div>
                    {seller.openCount > 0 ? (
                      <div className="px-3 py-1 bg-[#FEF2F2] border border-[#FECACA] rounded-full text-[11px] font-bold text-[#991B1B]">
                        {seller.openCount} Actionable
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-full text-[11px] font-bold text-[#475569]">
                        All Resolved
                      </div>
                    )}
                    <div className={`transform transition-transform text-[#94A3B8] ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="bg-[#F8F9FB] border-t border-[#E5E8EF] p-4 sm:p-6">
                    <div className="bg-white border border-[#E5E8EF] rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E5E8EF]">
                              <th className="px-4 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Ticket ID</th>
                              <th className="px-4 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Subject & Type</th>
                              <th className="px-4 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {seller.tickets.map((t: any) => (
                              <tr key={t.id} className="hover:bg-[#F8F9FB] transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-mono text-[11px] font-bold text-[#4F46E5] uppercase">{t.ticket_number}</div>
                                  <div className="text-[10px] text-[#94A3B8] mt-0.5">
                                    {new Date(t.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-semibold text-[#0F172A]">{t.subject}</div>
                                  <div className="text-[11px] text-[#64748B] capitalize mt-0.5">{t.type.replace(/_/g, " ")}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[t.status] || "bg-[#F1F5F9] text-[#475569]"}`}>
                                    {t.status.replace(/_/g, " ")}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {t.attachment_url && (
                                      <a
                                        href={`${api.defaults.baseURL?.replace("/api/v1", "") || ""}${t.attachment_url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="View Attachment"
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF] transition-colors"
                                      >
                                        📎
                                      </a>
                                    )}
                                    <button
                                      onClick={() => {
                                        setActiveTicket(t);
                                        setStatusUpdateForm({ status: t.status });
                                        setError("");
                                        setSuccess("");
                                      }}
                                      className="px-3 py-1.5 text-[11px] font-bold bg-white border border-[#E5E8EF] text-[#475569] rounded-lg hover:bg-[#F1F5F9] transition-colors shadow-sm"
                                    >
                                      Update
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
