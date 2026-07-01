"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

const SAMPLE_ROWS = [
  {
    row: 1,
    orderId: "ORD-001",
    name: "Rahul Sharma",
    phone: "9876543210",
    address: "204 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    weight: "0.5",
    mode: "Prepaid",
    cod: "0",
    status: "valid",
  },
  {
    row: 2,
    orderId: "ORD-002",
    name: "Priya Nair",
    phone: "9999999999",
    address: "Near temple",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    weight: "0.8",
    mode: "COD",
    cod: "500",
    status: "error",
    error: "Blacklisted mobile",
  },
  {
    row: 3,
    orderId: "ORD-003",
    name: "Ravi Kumar",
    phone: "9876502345",
    address: "12 Park St",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
    weight: "1.2",
    mode: "COD",
    cod: "850",
    status: "valid",
  },
];

export function BulkUploadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [validated, setValidated] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      width="100%"
      title={
        <div className="flex items-center gap-3">
          Bulk Upload
          <span className="px-2.5 py-1 bg-[#EDF0E4] text-[#546B41] text-[10px] font-bold uppercase tracking-widest rounded-full">
            CSV / EXCEL
          </span>
        </div>
      }
      subtitle="Upload multiple orders at once using our template."
      bodyClassName="bg-[#FFF8EC]"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-[#E2D4B8] bg-white text-sm font-semibold text-[#6B7556] hover:bg-[#FFF8EC] transition-colors"
          >
            Close
          </button>
          {validated && (
            <button className="px-5 py-2.5 bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] text-sm font-semibold rounded-lg hover:bg-[#E0E7CE] transition-colors shadow-sm">
              Process {SAMPLE_ROWS.filter((r) => r.status === "valid").length}{" "}
              valid orders
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
            {/* Left Column: Upload & Validation */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-[#EADFC8] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#EADFC8] bg-white flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#2F3A22]">
                    Upload Orders
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setValidated(true)}
                      className="px-4 py-2 bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] text-xs font-semibold rounded-lg hover:bg-[#E0E7CE] transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Validate
                    </button>
                    <button className="px-4 py-2 bg-white border border-[#E2D4B8] text-[#6B7556] text-xs font-semibold rounded-lg hover:bg-[#FFF8EC] hover:text-[#2F3A22] transition-colors shadow-sm flex items-center gap-1.5">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Template
                    </button>
                  </div>
                </div>

                {!validated && (
                  <div className="p-6">
                    <div
                      className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${dragActive ? "border-[#546B41] bg-[#EDF0E4]" : "border-[#E2D4B8] bg-[#FFF8EC] hover:border-[#CBD7B5] hover:bg-[#F6EEDB]"}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        setValidated(true);
                      }}
                    >
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4 border border-[#EADFC8]">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#546B41"
                          strokeWidth="2"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <h3 className="text-base font-bold text-[#2F3A22] mb-1">
                        Drop CSV / Excel here or click to upload
                      </h3>
                      <p className="text-sm text-[#8A9270]">
                        Max 500 rows per file. File must match the template
                        format.
                      </p>
                    </div>
                  </div>
                )}

                {validated && (
                  <div className="p-6 animate-fade-in">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-[#FFF8EC] p-4 rounded-xl border border-[#EADFC8]">
                        <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-1">
                          Total Rows
                        </div>
                        <div className="text-2xl font-bold text-[#2F3A22] font-mono">
                          {SAMPLE_ROWS.length}
                        </div>
                      </div>
                      <div className="bg-[#F0FDF4] p-4 rounded-xl border border-[#BBF7D0]">
                        <div className="text-[10px] font-bold text-[#166534] uppercase tracking-widest mb-1">
                          Valid Orders
                        </div>
                        <div className="text-2xl font-bold text-[#16A34A] font-mono">
                          {
                            SAMPLE_ROWS.filter((r) => r.status === "valid")
                              .length
                          }
                        </div>
                      </div>
                      <div className="bg-[#FEF2F2] p-4 rounded-xl border border-[#FECACA]">
                        <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest mb-1">
                          Errors
                        </div>
                        <div className="text-2xl font-bold text-[#EF4444] font-mono">
                          {
                            SAMPLE_ROWS.filter((r) => r.status === "error")
                              .length
                          }
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#EADFC8] rounded-xl overflow-hidden mb-6">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#FFF8EC] border-b border-[#EADFC8]">
                            <tr>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8A9270] uppercase tracking-widest w-12">
                                #
                              </th>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8A9270] uppercase tracking-widest">
                                Order ID
                              </th>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8A9270] uppercase tracking-widest">
                                Name
                              </th>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8A9270] uppercase tracking-widest">
                                Pincode
                              </th>
                              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8A9270] uppercase tracking-widest">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {SAMPLE_ROWS.map((r) => (
                              <tr
                                key={r.row}
                                className={`border-b border-[#F6EEDB] last:border-0 ${r.status === "error" ? "bg-[#FEF2F2]" : "hover:bg-[#FFF8EC]"} transition-colors`}
                              >
                                <td className="px-4 py-3.5 font-mono text-xs text-[#8A9270]">
                                  {r.row}
                                </td>
                                <td className="px-4 py-3.5 font-mono text-xs font-bold text-[#2F3A22]">
                                  {r.orderId}
                                </td>
                                <td className="px-4 py-3.5 text-xs font-medium text-[#2F3A22]">
                                  {r.name}
                                </td>
                                <td className="px-4 py-3.5 font-mono text-xs text-[#6B7556]">
                                  {r.pincode}
                                </td>
                                <td className="px-4 py-3.5">
                                  {r.status === "valid" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D1FAE5] text-[#065F46]">
                                      ✓ Valid
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FECACA] text-[#991B1B]">
                                        Error
                                      </span>
                                      <div className="text-[10px] font-medium text-[#DC2626] mt-1">
                                        {r.error}
                                      </div>
                                    </div>
                                  )}
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
            </div>

            {/* Right Column: History & Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-[#EADFC8] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#EADFC8] bg-white">
                  <h2 className="text-sm font-bold text-[#2F3A22]">
                    Upload History
                  </h2>
                </div>
                <div className="p-0">
                  <table className="w-full text-xs">
                    <thead className="bg-[#FFF8EC] border-b border-[#EADFC8]">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-[#8A9270] uppercase tracking-widest text-[9px]">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-[#8A9270] uppercase tracking-widest text-[9px]">
                          File
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-[#8A9270] uppercase tracking-widest text-[9px]">
                          OK
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-[#8A9270] uppercase tracking-widest text-[9px]">
                          Fail
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F6EEDB]">
                      <tr className="hover:bg-[#FFF8EC]">
                        <td className="px-4 py-3 text-[#6B7556] font-medium whitespace-nowrap">
                          01 Jun
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-[#2F3A22] font-medium truncate max-w-[100px]">
                          orders_jun1.csv
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#16A34A] font-mono font-bold">
                            115
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#EF4444] font-mono font-bold">
                            5
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-[#FFF8EC]">
                        <td className="px-4 py-3 text-[#6B7556] font-medium whitespace-nowrap">
                          31 May
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-[#2F3A22] font-medium truncate max-w-[100px]">
                          bulk_may31.xlsx
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#16A34A] font-mono font-bold">
                            84
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#8A9270] font-mono font-bold">
                            0
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
        </div>
      </div>
    </Modal>
  );
}
