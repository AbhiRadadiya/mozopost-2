'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import Link from 'next/link';

interface Overview {
  total_merchants: string;
  total_orders: string;
  total_revenue: number;
  total_margin: number;
  total_delivered: string;
  total_rto: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/analytics/overview')
      .then((r) => setStats(r.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#E5E8EF] border-t-[#0F172A] rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-[#64748B] animate-pulse">Loading overview...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
        {error}
      </div>
    );
  }

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Platform Overview</h1>
        <p className="text-sm text-[#64748B] mt-1">Real-time stats across all merchants and operations.</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Merchants */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF] hover:border-[#CBD5E1] transition-colors group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Merchants</div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">{stats?.total_merchants ?? 0}</div>
        </div>

        {/* Platform Orders */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF] hover:border-[#CBD5E1] transition-colors group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Orders</div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">{stats?.total_orders ?? 0}</div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF] hover:border-[#CBD5E1] transition-colors group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#FEF9C3] text-[#CA8A04] flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="font-bold text-sm">₹</span>
            </div>
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Revenue</div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">₹{(stats?.total_revenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>

        {/* Total Margin */}
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-5 rounded-2xl shadow-sm border border-[#334155] hover:border-[#475569] transition-colors group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#4F46E5] rounded-full opacity-20 blur-xl"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Margin</div>
          </div>
          <div className="text-2xl font-bold text-white font-mono relative z-10">₹{(stats?.total_margin ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>

        {/* Delivered */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF] hover:border-[#CBD5E1] transition-colors group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#ECFCCB] text-[#65A30D] flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Delivered</div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">{stats?.total_delivered ?? 0}</div>
        </div>

        {/* RTO */}
        <div className="bg-[#FEF2F2] p-5 rounded-2xl shadow-sm border border-[#FECACA] hover:border-[#FCA5A5] transition-colors group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white text-[#DC2626] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest">RTO</div>
          </div>
          <div className="text-2xl font-bold text-[#991B1B] font-mono">{stats?.total_rto ?? 0}</div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div>
        <h2 className="text-lg font-bold text-[#0F172A] mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/admin/merchants" className="group p-5 bg-white rounded-2xl border border-[#E5E8EF] shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-[#CBD5E1] transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#F8F9FB] text-[#4F46E5] flex items-center justify-center mb-4 group-hover:bg-[#EEF2FF] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Merchants & KYC</h3>
            <p className="text-xs text-[#64748B]">Manage users, verify documents, and control access.</p>
          </Link>

          <Link href="/dashboard/admin/wallets" className="group p-5 bg-white rounded-2xl border border-[#E5E8EF] shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-[#CBD5E1] transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#F8F9FB] text-[#CA8A04] flex items-center justify-center mb-4 group-hover:bg-[#FEF9C3] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Wallet Adjustments</h3>
            <p className="text-xs text-[#64748B]">Credit, debit, and review seller wallet ledgers.</p>
          </Link>

          <Link href="/dashboard/admin/margins" className="group p-5 bg-white rounded-2xl border border-[#E5E8EF] shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-[#CBD5E1] transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#F8F9FB] text-[#059669] flex items-center justify-center mb-4 group-hover:bg-[#D1FAE5] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Margin Settings</h3>
            <p className="text-xs text-[#64748B]">Configure base shipping costs and profit margins.</p>
          </Link>

          <Link href="/dashboard/admin/cod" className="group p-5 bg-white rounded-2xl border border-[#E5E8EF] shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-[#CBD5E1] transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#F8F9FB] text-[#0284C7] flex items-center justify-center mb-4 group-hover:bg-[#E0F2FE] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">COD Settlements</h3>
            <p className="text-xs text-[#64748B]">Process Cash-on-Delivery remittances to sellers.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
