'use client';

import { useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Input, Badge } from '@/components/ui';

interface TrackingEvent {
  id: string;
  status: string;
  location: string;
  description: string;
  event_timestamp: string;
  source: string;
}

interface TrackResult {
  order: {
    mozopostOrderId: string;
    awbNumber: string;
    status: string;
    courierName: string;
    consigneeCity: string;
    consigneeState: string;
  };
  events: TrackingEvent[];
}

export default function TrackingPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.get(`/tracking/${encodeURIComponent(query.trim())}`);
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        Tracking <Badge color="bg-c3">REAL-TIME</Badge>
      </h1>

      <Card>
        <CardHead className="bg-black text-white">
          <span className="text-sm font-bold">🔍 Track Shipment</span>
        </CardHead>
        <form onSubmit={handleTrack} className="flex gap-2 p-4">
          <Input
            placeholder="Enter AWB number or Order ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Btn type="submit" variant="success" disabled={loading}>
            {loading ? 'Searching...' : '🔍 Track'}
          </Btn>
        </form>
      </Card>

      {error && <div className="mb-4 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}

      {result && (
        <Card>
          <CardHead className="bg-black text-white">
            <span className="text-sm font-bold">{result.order.mozopostOrderId}</span>
            <Badge color="bg-c1">{result.order.status.replace(/_/g, ' ')}</Badge>
          </CardHead>
          <div className="grid grid-cols-3 gap-2.5 p-4">
            <div className="border-2 border-black bg-c1 p-2.5">
              <div className="font-mono-nb text-[9px] uppercase opacity-70">AWB</div>
              <div className="font-mono-nb text-sm font-bold">{result.order.awbNumber}</div>
            </div>
            <div className="border-2 border-black bg-c5 p-2.5">
              <div className="font-mono-nb text-[9px] uppercase opacity-70">Courier</div>
              <div className="text-sm font-bold">{result.order.courierName}</div>
            </div>
            <div className="border-2 border-black bg-c4 p-2.5">
              <div className="font-mono-nb text-[9px] uppercase opacity-70">Destination</div>
              <div className="text-sm font-bold">
                {result.order.consigneeCity}, {result.order.consigneeState}
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="mb-2 font-bold">📍 Shipment Timeline</div>
            {result.events.length === 0 ? (
              <div className="text-sm text-[#777]">No tracking events yet.</div>
            ) : (
              <div>
                {result.events
                  .slice()
                  .reverse()
                  .map((ev, i) => (
                    <div key={ev.id} className="relative flex gap-3 py-2">
                      {i < result.events.length - 1 && (
                        <div className="absolute bottom-[-8px] left-[11px] top-7 w-0.5 bg-[#ddd]" />
                      )}
                      <div
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center border-2 border-black text-[9px] font-bold shadow-nb-sm ${
                          i === 0 ? 'bg-c4' : 'bg-c3'
                        }`}
                      >
                        {i === 0 ? '→' : '✓'}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{ev.description}</div>
                        <div className="text-[10px] text-[#777]">
                          {new Date(ev.event_timestamp).toLocaleString('en-IN')} · {ev.location}
                          {ev.source === 'mock' && <span className="ml-1 italic">(mock courier data)</span>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
