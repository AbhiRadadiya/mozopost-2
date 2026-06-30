"use client";

import React from "react";

/* ─────────────────────────────────────────────────────────
   Btn
   ───────────────────────────────────────────────────────── */
export function Btn({
  children,
  onClick,
  variant = "default",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "success" | "danger" | "warn" | "dark";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants: Record<string, string> = {
    default:
      "bg-white text-[#2F3A22] border-[#E2D4B8] hover:border-[#D8CBAE] hover:bg-[#FFF8EC]",
    primary: "bg-[#EDF0E4] text-[#546B41] border-[#CBD7B5] hover:bg-[#E0E7CE]",
    success: "bg-[#EDF0E4] text-[#546B41] border-[#CBD7B5] hover:bg-[#E0E7CE]",
    danger: "bg-[#F1E2D8] text-[#B4623F] border-[#DDBBA8] hover:bg-[#EADFC8]",
    warn: "bg-[#F6EEDB] text-[#A9842E] border-[#DEC98F] hover:bg-[#EDF0E4]",
    dark: "bg-[#2F3A22] text-[#FFF8EC] border-[#2F3A22] hover:bg-[#3C4E2D]",
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
  className = "",
  noPad = false,
}: {
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}) {
  return (
    <div className={`nb-card overflow-hidden ${noPad ? "" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CardHead
   ───────────────────────────────────────────────────────── */
export function CardHead({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-4 border-b border-[#EADFC8] bg-white ${className}`}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Input
   ───────────────────────────────────────────────────────── */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`nb-input ${props.className || ""}`} />;
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
      className="mb-1 block text-[13px] font-semibold text-[#8A9270] tracking-wide uppercase"
      style={{ letterSpacing: "0.05em" }}
    >
      {children}
      {required && <span className="text-[#B4623F] ml-0.5">*</span>}
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
        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#B4623F]">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
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
  delivered: "bg-[#E0E7CE] text-[#4A5F37] border border-[#CBD7B5]",
  in_transit: "bg-[#EDF0E4] text-[#546B41] border border-[#CBD7B5]",
  out_for_delivery: "bg-[#F6EEDB] text-[#3C4E2D] border border-[#D8CBAE]",
  booked: "bg-[#FFF8EC] text-[#6B7556] border border-[#E2D4B8]",
  rto_initiated: "bg-[#F1E2D8] text-[#B4623F] border border-[#DDBBA8]",
  failed: "bg-[#F1E2D8] text-[#B4623F] border border-[#DDBBA8]",
  cancelled: "bg-[#FFF8EC] text-[#8A9270] border border-[#E2D4B8]",
};

export function Badge({
  children,
  color = "",
  status,
  className = "",
}: {
  children: React.ReactNode;
  color?: string;
  status?: string;
  className?: string;
}) {
  const preset = status
    ? BADGE_PRESETS[status] ||
      "bg-[#EDF0E4] text-[#546B41] border border-[#CBD7B5]"
    : "";
  const colorClass =
    preset || color || "bg-[#EDF0E4] text-[#546B41] border border-[#CBD7B5]";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] font-medium font-mono-nb ${colorClass} ${className}`}
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
  subLabel,
  subValue,
  sub,
  icon,
  accent = "#546B41",
}: {
  label: string;
  value: string | number;
  subLabel?: string;
  subValue?: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: string;
}) {
  const finalSubLabel = subLabel || "METRICS";
  const finalSubValue = subValue !== undefined ? subValue : sub;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2D4B8",
        borderRadius: "12px",
        padding: "18px",
        borderTop: `2px solid ${accent}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: accent,
          fontSize: "15px",
          fontWeight: 600,
        }}
      >
        <span>{icon || "▤"}</span>
        <span>{label}</span>
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          fontFamily: "'IBM Plex Mono', monospace",
          marginTop: "14px",
          letterSpacing: "-.5px",
          color: "#2F3A22",
        }}
      >
        {value}
      </div>
      {finalSubValue !== undefined && (
        <div
          style={{
            marginTop: "12px",
            background: "#FFF8EC",
            borderRadius: "8px",
            padding: "8px 11px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#8A9270" }}>
            {finalSubLabel}
          </div>
          <div
            style={{
              fontSize: "15px",
              fontFamily: "'IBM Plex Mono', monospace",
              color: accent,
              marginTop: "2px",
            }}
          >
            {finalSubValue}
          </div>
        </div>
      )}
    </div>
  );
}
