'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead, StatCard } from '@/components/ui';

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

  if (loading) return <div className="font-mono-nb text-sm">Loading...</div>;
  if (error) return <div className="border-2 border-black bg-c2 p-4 font-bold text-white shadow-nb">⚠ {error}</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Platform Overview</h1>
      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Total Merchants" value={stats?.total_merchants ?? 0} bg="bg-black text-white" />
        <StatCard label="Platform Orders" value={stats?.total_orders ?? 0} bg="bg-c1" />
        <StatCard label="Revenue (₹)" value={(stats?.total_revenue ?? 0).toFixed(0)} bg="bg-c3" />
        <StatCard label="Margin (₹)" value={(stats?.total_margin ?? 0).toFixed(0)} bg="bg-c4" />
        <StatCard label="Delivered" value={stats?.total_delivered ?? 0} bg="bg-c3" />
        <StatCard label="RTO" value={stats?.total_rto ?? 0} bg="bg-c2 text-white" />
      </div>
      <Card>
        <CardHead className="bg-black text-white">
          <span className="text-sm font-bold">Quick Links</span>
        </CardHead>
        <div className="grid grid-cols-2 gap-2 p-4 text-xs">
          <a href="/dashboard/admin/merchants" className="border-2 border-black p-3 font-bold shadow-nb-sm hover:bg-c5">
            👥 Manage Merchants &amp; KYC
          </a>
          <a href="/dashboard/admin/wallets" className="border-2 border-black p-3 font-bold shadow-nb-sm hover:bg-c5">
            💰 Wallet Adjustments
          </a>
          <a href="/dashboard/admin/margins" className="border-2 border-black p-3 font-bold shadow-nb-sm hover:bg-c5">
            💹 Margin Settings
          </a>
          <a href="/dashboard/admin/cod" className="border-2 border-black p-3 font-bold shadow-nb-sm hover:bg-c5">
            💵 COD Settlements
          </a>
        </div>
      </Card>
    </div>
  );
}
