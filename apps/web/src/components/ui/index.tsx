'use client';

import React from 'react';

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
    default: 'bg-white text-black',
    primary: 'bg-c1 text-black',
    success: 'bg-c3 text-black',
    danger: 'bg-c2 text-white',
    warn: 'bg-c4 text-black',
    dark: 'bg-black text-white',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`nb-btn px-4 py-2 text-xs font-bold ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`nb-card mb-4 overflow-hidden ${className}`}>{children}</div>;
}

export function CardHead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between border-b-2 border-black px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`nb-input w-full ${props.className || ''}`} />;
}

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="font-mono-nb mb-1 block text-[10px] font-bold uppercase tracking-wider">
      {children}
      {required && <span className="text-c2"> *</span>}
    </label>
  );
}

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
    <div className="mb-3">
      <Label required={required}>{label}</Label>
      {children}
      {error && (
        <div className="mt-1 inline-block border-2 border-black bg-c2 px-2 py-1 text-[10px] font-bold text-white">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

export function Badge({
  children,
  color = 'bg-c5',
  className = '',
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`font-mono-nb inline-block border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase shadow-nb-sm ${color} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  bg = 'bg-white',
}: {
  label: string;
  value: string | number;
  sub?: string;
  bg?: string;
}) {
  return (
    <div className={`nb-card p-3 ${bg}`}>
      <div className="font-mono-nb text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-mono-nb text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[9px] opacity-60">{sub}</div>}
    </div>
  );
}
