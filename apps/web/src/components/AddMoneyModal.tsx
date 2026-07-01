"use client";

import { useState } from "react";

import { Modal } from "./ui/Modal";

export function AddMoneyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<string>("500");

  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      width="460px"
      title={
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
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M7 12h.01M17 12h.01" />
            </svg>
          </div>
          <div>Add Money to Wallet</div>
        </div>
      }
      subtitle="Funds are added instantly after payment"
    >
      <div className="space-y-5">
        {/* Quick Select */}
        <div>
          <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
            Quick Select
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  amount === amt.toString()
                    ? "bg-[#EDF0E4] border-[#CBD7B5] text-[#546B41] shadow-sm"
                    : "bg-white border-[#EADFC8] text-[#6B7556] hover:bg-[#FFF8EC]"
                }`}
              >
                ₹{amt.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#EADFC8]" />
          <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest">
            Or Enter Amount
          </div>
          <div className="flex-1 h-px bg-[#EADFC8]" />
        </div>

        {/* Enter Amount */}
        <div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#546B41] font-bold">
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#FFF8EC] border border-[#EADFC8] rounded-xl pl-8 pr-4 py-3 text-[#2F3A22] font-bold text-lg outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 transition-all"
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-semibold text-[#8A9270]">
            <span>Min: ₹100</span>
            <span>Max: ₹1,00,000</span>
          </div>
        </div>

        {/* Submit */}
        <button className="w-full py-3.5 rounded-xl bg-[#546B41] text-white font-semibold text-sm hover:bg-[#3C4E2D] transition-colors shadow-sm flex items-center justify-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Proceed to pay ₹{Number(amount || 0).toLocaleString("en-IN")}
        </button>

        {/* Footer */}
        <div className="text-center flex items-center justify-center gap-1.5 text-[10px] font-medium text-[#8A9270]">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Secured by Razorpay. 100% safe payments.
        </div>
      </div>
    </Modal>
  );
}
