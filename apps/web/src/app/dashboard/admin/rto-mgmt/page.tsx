"use client";

const RTOS = [
  {
    id: "MP2606000004",
    merchant: "Arjun Textiles",
    courier: "Ekart",
    route: "Surat → Kolkata",
    cod: 1200,
    charge: 58,
    status: "in_transit",
    date: "20 Jun",
  },
  {
    id: "MP2606000085",
    merchant: "Riya Fashion",
    courier: "DTDC",
    route: "Mumbai → Hyderabad",
    cod: 0,
    charge: 72,
    status: "received",
    date: "18 Jun",
  },
  {
    id: "MP2606000080",
    merchant: "Arjun Textiles",
    courier: "Delhivery",
    route: "Surat → Bengaluru",
    cod: 0,
    charge: 45,
    status: "initiated",
    date: "21 Jun",
  },
];

const STATUS_STYLE: Record<string, string> = {
  initiated: "bg-[#FEF9C3] text-[#854D0E]",
  in_transit: "bg-[#DBEAFE] text-[#1E40AF]",
  received: "bg-[#D1FAE5] text-[#065F46]",
};

export default function RtoMgmtPage() {
  return (
    <div className="animate-fade-up  mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">RTO Management</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Track and manage return-to-origin shipments.
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-semibold bg-[#F4F6F9] text-[#475569] rounded-xl hover:bg-[#E5E8EF] transition-colors border border-[#E5E8EF]">
          ⬇ Export Report
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Initiated
          </div>
          <div className="text-2xl font-bold text-[#854D0E] font-mono">
            {RTOS.filter((r) => r.status === "initiated").length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            In Transit to WH
          </div>
          <div className="text-2xl font-bold text-[#1E40AF] font-mono">
            {RTOS.filter((r) => r.status === "in_transit").length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Received at WH
          </div>
          <div className="text-2xl font-bold text-[#065F46] font-mono">
            {RTOS.filter((r) => r.status === "received").length}
          </div>
        </div>
      </div>

      {/* RTO Table */}
      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
          <h2 className="text-sm font-bold text-[#0F172A]">RTO Tracking</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Merchant
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Route
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Courier
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  COD
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  RTO Charge
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {RTOS.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8F9FB] transition-colors">
                  <td className="px-5 py-3.5 font-mono text-sm font-bold text-[#4F46E5]">
                    {r.id}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A]">
                    {r.merchant}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B]">
                    {r.route}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#0F172A]">
                    {r.courier}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono text-[#CA8A04]">
                    {r.cod > 0 ? `₹${r.cod}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#DC2626]">
                    ₹{r.charge}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[r.status]}`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === "received" ? (
                      <button className="px-3 py-1.5 text-xs font-semibold bg-[#D1FAE5] text-[#065F46] rounded-lg hover:bg-[#A7F3D0] transition-colors">
                        Close
                      </button>
                    ) : (
                      <button className="px-3 py-1.5 text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded-lg hover:bg-[#E0E7FF] transition-colors">
                        Track
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
