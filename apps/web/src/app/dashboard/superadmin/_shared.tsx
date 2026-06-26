'use client';

import React from 'react';

export const RISK_BADGE: Record<string, string> = {
  safe:     'bg-[#D1FAE5] text-[#065F46]',
  medium:   'bg-[#FEF3C7] text-[#92400E]',
  high:     'bg-[#FFEDD5] text-[#9A3412]',
  critical: 'bg-[#FEE2E2] text-[#991B1B]',
};

export const SEV_BADGE: Record<string, string> = {
  info:     'bg-[#DBEAFE] text-[#1E40AF]',
  warn:     'bg-[#FEF3C7] text-[#92400E]',
  critical: 'bg-[#FEE2E2] text-[#991B1B]',
};

export function SAIcon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((s, i) => <path key={i} d={`M${s}`} />)}
    </svg>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#0F172A]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[#94A3B8]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border-2 border-[#059669] bg-[#D1FAE5] px-4 py-3 text-sm font-bold text-[#065F46]">
      <span className="flex items-center gap-2">
        <SAIcon d="M5 13l4 4L19 7" size={16} /> {msg}
      </span>
      <button onClick={onClose} className="text-[#065F46]">✕</button>
    </div>
  );
}

export function ErrorBar({ msg, onClose }: { msg: string; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border-2 border-[#DC2626] bg-[#FEE2E2] px-4 py-3 text-sm font-bold text-[#991B1B]">
      <span>⚠ {msg}</span>
      <button onClick={onClose} className="text-[#991B1B]">✕</button>
    </div>
  );
}
