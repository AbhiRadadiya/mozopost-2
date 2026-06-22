'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input } from '@/components/ui';

interface Merchant {
  id: string;
  business_name: string;
  wallet_balance: string;
}

export default function WalletControlPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/admin/merchants').then((r) => {
      setMerchants(r.data.merchants);
      if (r.data.merchants[0]) setSellerId(r.data.merchants[0].id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!sellerId || !amount) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/wallets/${sellerId}/adjust`, { amount: Number(amount), type, reason });
      setMessage(`Wallet ${type}ed by ₹${amount}`);
      setAmount('');
      setReason('');
      const { data } = await api.get('/admin/merchants');
      setMerchants(data.merchants);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Wallet Control</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHead className="bg-black text-white">
            <span className="text-sm font-bold">Adjust Wallet</span>
          </CardHead>
          <form onSubmit={handleSubmit} className="p-4">
            <Field label="Merchant" required>
              <select className="nb-input w-full" value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.business_name} — ₹{parseFloat(m.wallet_balance || '0').toFixed(0)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Action" required>
                <select className="nb-input w-full" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="credit">Credit (add funds)</option>
                  <option value="debit">Debit (remove funds)</option>
                </select>
              </Field>
              <Field label="Amount (₹)" required>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
            </div>
            <Field label="Reason">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Goodwill credit" />
            </Field>

            {error && <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">⚠ {error}</div>}
            {message && <div className="mb-3 border-2 border-black bg-c3 p-2 text-xs font-bold">✓ {message}</div>}

            <Btn type="submit" variant="dark" disabled={submitting} className="w-full justify-center py-2.5">
              {submitting ? 'Processing...' : `${type === 'credit' ? '+ Credit' : '− Debit'} Wallet`}
            </Btn>
          </form>
        </Card>

        <Card>
          <CardHead className="bg-black text-white">
            <span className="text-sm font-bold">All Merchant Wallets</span>
          </CardHead>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="sticky top-0 bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Balance</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <tr key={m.id} className="border-b border-[#eee]">
                    <td className="px-3 py-2">{m.business_name}</td>
                    <td className="font-mono-nb px-3 py-2 font-bold">₹{parseFloat(m.wallet_balance || '0').toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
