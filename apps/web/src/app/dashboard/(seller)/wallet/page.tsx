'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Input, Badge, StatCard } from '@/components/ui';
import { useAuthStore } from '@/store/auth';

interface Txn {
  id: string;
  type: string;
  amount: string;
  balance_after: string;
  description: string;
  created_at: string;
}

interface CreditInfo {
  hasCreditFacility: boolean;
  wallet: { balance: number; creditOutstanding?: number };
  creditFacility: {
    creditLimit: number; availableCredit: number; utilizationPct: number;
    status: string; billingCycle: string; riskBand: string;
  } | null;
}

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

export default function WalletPage() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [balance, setBalance] = useState<number | null>(null);
  const [credit, setCredit] = useState<CreditInfo | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [amount, setAmount] = useState('1000');
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [walletRes, txnRes, creditRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions'),
        api.get('/credit').catch(() => ({ data: null })),
      ]);
      setBalance(parseFloat(walletRes.data.wallet.balance));
      setTxns(txnRes.data.transactions);
      if (creditRes.data) setCredit(creditRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRecharge() {
    setError('');
    setMessage('');
    const amt = parseFloat(amount);
    if (!amt || amt < 100) {
      setError('Minimum recharge amount is ₹100');
      return;
    }
    setRecharging(true);
    try {
      const { data } = await api.post('/wallet/recharge/create', { amount: amt });

      if (data.mock) {
        // Mock mode: API already credited the wallet instantly
        setMessage(data.message);
        await load();
        await fetchMe();
        setRecharging(false);
        return;
      }

      // Live mode: open Razorpay checkout
      const options = {
        key: RAZORPAY_KEY || data.keyId,
        amount: Math.round(amt * 100),
        currency: 'INR',
        name: 'Mozopost',
        description: 'Wallet Recharge',
        order_id: data.razorpayOrderId,
        handler: async (response: any) => {
          try {
            await api.post('/wallet/recharge/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amt,
            });
            setMessage('Payment successful — wallet credited!');
            await load();
            await fetchMe();
          } catch (err) {
            setError(apiErrorMessage(err));
          }
        },
        theme: { color: '#104378' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setRecharging(false);
    }
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h1 className="mb-4 text-xl font-bold">Wallet &amp; Billing</h1>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatCard label="Wallet balance" value={loading ? '...' : `₹${balance?.toLocaleString('en-IN')}`} bg="bg-c3" />
        <StatCard label="Total Transactions" value={txns.length} bg="bg-c5" />
        <StatCard label="Mode" value={RAZORPAY_KEY ? 'LIVE' : 'MOCK'} bg={RAZORPAY_KEY ? 'bg-c3' : 'bg-c4'} />
      </div>

      {/* Credit facility panel */}
      {credit?.hasCreditFacility && credit.creditFacility && (
        <div className={`mb-4 nb-card p-4 ${
          credit.creditFacility.riskBand === 'exhausted' ? 'bg-[#fff5f5]' :
          credit.creditFacility.riskBand === 'near_limit' ? 'bg-[#fffbeb]' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold">💳 Postpaid Credit Facility</div>
            <Badge color={credit.creditFacility.riskBand === 'exhausted' ? 'bg-c2 text-white' :
              credit.creditFacility.riskBand === 'near_limit' ? 'bg-c4' : 'bg-c3'}>
              {credit.creditFacility.riskBand === 'exhausted' ? '❌ Credit exhausted' :
               credit.creditFacility.riskBand === 'near_limit' ? '🟡 Near limit' : '✓ Active'}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="border-2 border-black p-2 bg-white">
              <div className="font-mono-nb text-[8px] text-[#777] uppercase">Credit limit</div>
              <div className="font-mono-nb text-base font-bold">₹{credit.creditFacility.creditLimit.toLocaleString('en-IN')}</div>
            </div>
            <div className="border-2 border-black p-2 bg-white">
              <div className="font-mono-nb text-[8px] text-[#777] uppercase">Used credit</div>
              <div className="font-mono-nb text-base font-bold text-c2">₹{(credit.wallet.creditOutstanding ?? 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="border-2 border-black p-2 bg-white">
              <div className="font-mono-nb text-[8px] text-[#777] uppercase">Available credit</div>
              <div className="font-mono-nb text-base font-bold text-green-700">₹{credit.creditFacility.availableCredit.toLocaleString('en-IN')}</div>
            </div>
            <div className="border-2 border-black p-2 bg-white">
              <div className="font-mono-nb text-[8px] text-[#777] uppercase">Billing cycle</div>
              <div className="font-mono-nb text-base font-bold">{credit.creditFacility.billingCycle}</div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono-nb font-bold mb-1">
              <span>Credit utilization</span>
              <span>{credit.creditFacility.utilizationPct.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 bg-[#eee] border-2 border-black rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all ${credit.creditFacility.riskBand === 'exhausted' ? 'bg-c2' : credit.creditFacility.riskBand === 'near_limit' ? 'bg-c4' : 'bg-c3'}`}
                style={{ width: `${Math.min(100, credit.creditFacility.utilizationPct)}%` }}
              />
            </div>
          </div>
          {credit.creditFacility.riskBand === 'exhausted' && (
            <div className="mt-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white text-center">
              ❌ Credit limit exhausted — new orders blocked. Please recharge your wallet.
            </div>
          )}
          {credit.creditFacility.riskBand === 'near_limit' && (
            <div className="mt-3 border-2 border-black bg-c4 p-2 text-xs font-bold text-center">
              🟡 Credit limit near exhaustion — recharge soon to avoid order blocks.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-c3">
          <CardHead className="bg-c3">
            <span className="text-sm font-bold">💰 Recharge Wallet</span>
          </CardHead>
          <div className="p-4">
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mb-3 bg-white" />
            <div className="mb-3 flex flex-wrap gap-2">
              {[1000, 2000, 5000, 10000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold shadow-nb-sm hover:translate-x-[-1px] hover:translate-y-[-1px]"
                >
                  ₹{v.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            {!RAZORPAY_KEY && (
              <div className="mb-3 border-2 border-black bg-white px-3 py-2 text-[11px] font-semibold">
                ℹ Running in mock mode — wallet credits instantly. Add Razorpay keys to{' '}
                <code className="font-mono-nb">apps/api/.env</code> for live payments.
              </div>
            )}

            {error && <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">⚠ {error}</div>}
            {message && <div className="mb-3 border-2 border-black bg-white p-2 text-xs font-bold">✓ {message}</div>}

            <Btn variant="dark" disabled={recharging} onClick={handleRecharge} className="w-full justify-center py-2.5">
              {recharging ? 'Processing...' : `💳 ${RAZORPAY_KEY ? 'Pay via Razorpay' : 'Recharge (mock)'}`}
            </Btn>
          </div>
        </Card>

        <Card>
          <CardHead className="bg-black text-white">
            <span className="text-sm font-bold">📋 Transaction History</span>
          </CardHead>
          {loading ? (
            <div className="p-4 text-sm">Loading...</div>
          ) : txns.length === 0 ? (
            <div className="p-4 text-sm text-[#777]">No transactions yet.</div>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="sticky top-0 bg-black text-c3">
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Date</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Description</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Type</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b border-[#eee]">
                      <td className="px-3 py-2">{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2">{t.description}</td>
                      <td className="px-3 py-2">
                        <Badge color={t.type === 'debit' ? 'bg-c2 text-white' : 'bg-c3'}>{t.type}</Badge>
                      </td>
                      <td className={`font-mono-nb px-3 py-2 font-bold ${t.type === 'debit' ? 'text-c2' : 'text-green-700'}`}>
                        {t.type === 'debit' ? '-' : '+'}₹{Math.abs(parseFloat(t.amount)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
