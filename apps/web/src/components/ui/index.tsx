'use client';

import React from 'react';

/* ─────────────────────────────────────────────────────────
   Btn
   ───────────────────────────────────────────────────────── */
export function Btn({
  children,
  onClick,
  variant = 'default',
  disabled = false,
  type = 'button',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warn' | 'dark';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const variants: Record<string, string> = {
    default: 'bg-white text-[#0F172A] border-[#E5E8EF] hover:border-[#C8D0DD] hover:bg-[#F8F9FB]',
    primary: 'bg-[#4F46E5] text-white border-[#4338CA] hover:bg-[#4338CA]',
    success: 'bg-[#10B981] text-white border-[#059669] hover:bg-[#059669]',
    danger:  'bg-[#EF4444] text-white border-[#DC2626] hover:bg-[#DC2626]',
    warn:    'bg-[#F59E0B] text-white border-[#D97706] hover:bg-[#D97706]',
    dark:    'bg-[#0F172A] text-white border-[#0F172A] hover:bg-[#1E293B]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`nb-btn border ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
   Card
   ───────────────────────────────────────────────────────── */
export function Card({
  children,
  className = '',
  noPad = false,
}: {
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}) {
  return (
    <div className={`nb-card overflow-hidden ${noPad ? '' : ''} ${className}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CardHead
   ───────────────────────────────────────────────────────── */
export function CardHead({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 border-b border-[#E5E8EF] bg-white ${className}`}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Input
   ───────────────────────────────────────────────────────── */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`nb-input ${props.className || ''}`} />;
}

/* ─────────────────────────────────────────────────────────
   Label
   ───────────────────────────────────────────────────────── */
export function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="mb-1 block text-xs font-semibold text-[#475569] tracking-wide uppercase"
      style={{ letterSpacing: '0.05em' }}
    >
      {children}
      {required && <span className="text-[#EF4444] ml-0.5">*</span>}
    </label>
  );
}

/* ─────────────────────────────────────────────────────────
   Field
   ───────────────────────────────────────────────────────── */
export function Field({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="mb-4">
      <Label required={required}>{label}</Label>
      {children}
      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#EF4444]">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Badge
   ───────────────────────────────────────────────────────── */
const BADGE_PRESETS: Record<string, string> = {
  delivered:         'bg-[#D1FAE5] text-[#065F46]',
  in_transit:        'bg-[#DBEAFE] text-[#1E40AF]',
  out_for_delivery:  'bg-[#E0E7FF] text-[#3730A3]',
  booked:            'bg-[#F3F4F6] text-[#374151]',
  rto_initiated:     'bg-[#FEE2E2] text-[#991B1B]',
  failed:            'bg-[#FEF3C7] text-[#92400E]',
  cancelled:         'bg-[#F3F4F6] text-[#6B7280]',
};

export function Badge({
  children,
  color = '',
  status,
  className = '',
}: {
  children: React.ReactNode;
  color?: string;
  status?: string;
  className?: string;
}) {
  const preset = status ? (BADGE_PRESETS[status] || 'bg-[#F3F4F6] text-[#374151]') : '';
  const colorClass = preset || color || 'bg-[#F3F4F6] text-[#374151]';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono-nb ${colorClass} ${className}`}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
   StatCard
   ───────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  sub,
  bg = '',
  icon,
  accent = '#4F46E5',
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  bg?: string;
  icon?: React.ReactNode;
  accent?: string;
  trend?: { value: string; up: boolean };
}) {
  return (
    <div
      className="nb-card p-5 flex flex-col gap-3 animate-fade-up"
      style={{ background: bg || undefined }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
          style={{ background: accent }}
        >
          {icon || (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.up
                ? 'bg-[#D1FAE5] text-[#065F46]'
                : 'bg-[#FEE2E2] text-[#991B1B]'
            }`}
          >
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div>
        <div className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-1" style={{ letterSpacing: '0.07em' }}>
          {label}
        </div>
        <div className="text-2xl font-bold text-[#0F172A] font-mono-nb leading-none">
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-[#94A3B8]">{sub}</div>}
      </div>
    </div>
  );
}
