'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

interface Margin {
  id: string;
  courier_name: string | null;
  business_name: string | null;
  margin_type: string;
  margin_value: string;
}

export default function MarginsPage() {
  const [margins, setMargins] = useState<Margin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marginType, setMarginType] = useState<'fixed' | 'percentage'>('fixed');
  const [marginValue, setMarginValue] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/margins');
      setMargins(data.margins);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSetGlobal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/margins', { marginType, marginValue: Number(marginValue) });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Margin Management</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-c4">
          <CardHead className="bg-c4">
            <span className="text-sm font-bold">Set Global Margin</span>
          </CardHead>
          <form onSubmit={handleSetGlobal} className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" required>
                <select className="nb-input w-full" value={marginType} onChange={(e) => setMarginType(e.target.value as any)}>
                  <option value="fixed">Fixed (₹)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </Field>
              <Field label="Value" required>
                <Input type="number" value={marginValue} onChange={(e) => setMarginValue(e.target.value)} required />
              </Field>
            </div>
            {error && <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">⚠ {error}</div>}
            <Btn type="submit" variant="dark" disabled={submitting} className="w-full justify-center py-2.5">
              Apply New Margin Rule
            </Btn>
          </form>
        </Card>

        <Card>
          <CardHead className="bg-black text-white">
            <span className="text-sm font-bold">Active Margin Rules</span>
          </CardHead>
          {loading ? (
            <div className="p-4 text-sm">Loading...</div>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="sticky top-0 bg-black text-c3">
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Scope</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Type</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {margins.map((m) => (
                    <tr key={m.id} className="border-b border-[#eee]">
                      <td className="px-3 py-2">
                        {m.business_name || m.courier_name ? (
                          <>
                            {m.business_name && <Badge color="bg-c5">{m.business_name}</Badge>}{' '}
                            {m.courier_name && <Badge color="bg-c1">{m.courier_name}</Badge>}
                          </>
                        ) : (
                          <Badge color="bg-c4">GLOBAL</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">{m.margin_type}</td>
                      <td className="font-mono-nb px-3 py-2 font-bold">
                        {m.margin_type === 'fixed' ? `₹${m.margin_value}` : `${m.margin_value}%`}
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
