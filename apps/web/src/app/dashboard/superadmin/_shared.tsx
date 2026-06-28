'use client';

import React from 'react';

export const RISK_BADGE: Record<string, string> = {
  safe:     'bg-[#E0E7CE] text-[#4A5F37] border border-[#CBD7B5]',
  medium:   'bg-[#F6EEDB] text-[#A9842E] border border-[#DEC98F]',
  high:     'bg-[#F1E2D8] text-[#B4623F] border border-[#DDBBA8]',
  critical: 'bg-[#F1E2D8] text-[#B4623F] border border-[#DDBBA8]',
};

export const SEV_BADGE: Record<string, string> = {
  info:     'bg-[#EDF0E4] text-[#546B41] border border-[#CBD7B5]',
  warn:     'bg-[#F6EEDB] text-[#A9842E] border border-[#DEC98F]',
  critical: 'bg-[#F1E2D8] text-[#B4623F] border border-[#DDBBA8]',
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
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#8A9270]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-[#CBD7B5] bg-[#EDF0E4] px-4 py-3 text-sm font-semibold text-[#546B41]">
      <span className="flex items-center gap-2">
        <SAIcon d="M5 13l4 4L19 7" size={16} /> {msg}
      </span>
      <button onClick={onClose} className="text-[#546B41] hover:opacity-75">✕</button>
    </div>
  );
}

export function ErrorBar({ msg, onClose }: { msg: string; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-[#DDBBA8] bg-[#F1E2D8] px-4 py-3 text-sm font-semibold text-[#B4623F]">
      <span>⚠ {msg}</span>
      <button onClick={onClose} className="text-[#B4623F] hover:opacity-75">✕</button>
    </div>
  );
}

