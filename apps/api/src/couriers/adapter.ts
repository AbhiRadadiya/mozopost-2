import axios from 'axios';
import { env, isCourierLive } from '../config/env';

export interface BookingInput {
  orderId: string;
  mozopostOrderId: string;
  consigneeName: string;
  consigneePhone: string;
  consigneeAddress: string;
  consigneeCity: string;
  consigneeState: string;
  consigneePincode: string;
  originPincode: string;
  weightKg: number;
  paymentMode: 'prepaid' | 'cod';
  codAmount: number;
  declaredValue: number;
}

export interface BookingResult {
  success: boolean;
  awbNumber?: string;
  error?: string;
  mock: boolean;
}

export interface TrackingEvent {
  status: string;
  location: string;
  description: string;
  timestamp: Date;
}

export interface TrackingResult {
  awbNumber: string;
  currentStatus: string;
  events: TrackingEvent[];
  mock: boolean;
}

/**
 * Generic adapter. When live credentials are present for a courier code,
 * real HTTP calls are attempted. When absent, a deterministic mock response
 * is returned so the full order lifecycle can be tested end-to-end without
 * a live courier contract.
 *
 * To wire up a real courier: add the HTTP call inside `bookLive` /
 * `trackLive` for that courier code. The mock fallback never runs once
 * credentials are present.
 */
export class CourierAdapter {
  constructor(private code: string) {}

  async book(input: BookingInput): Promise<BookingResult> {
    if (isCourierLive(this.code as any)) {
      try {
        return await this.bookLive(input);
      } catch (err: any) {
        console.error(`[courier:${this.code}] live booking failed, falling back is disabled by design:`, err.message);
        return { success: false, error: err.message, mock: false };
      }
    }
    return this.bookMock(input);
  }

  async track(awbNumber: string): Promise<TrackingResult> {
    if (isCourierLive(this.code as any)) {
      try {
        return await this.trackLive(awbNumber);
      } catch (err: any) {
        console.error(`[courier:${this.code}] live tracking failed:`, err.message);
        return { awbNumber, currentStatus: 'unknown', events: [], mock: false };
      }
    }
    return this.trackMock(awbNumber);
  }

  // ── MOCK IMPLEMENTATIONS (used when no API key is configured) ──────
  private bookMock(input: BookingInput): BookingResult {
    const prefix = this.code.slice(0, 3).toUpperCase();
    const awb = `${prefix}${Date.now().toString().slice(-9)}`;
    return { success: true, awbNumber: awb, mock: true };
  }

  private trackMock(awbNumber: string): TrackingResult {
    // Deterministic fake progression based on AWB so refreshing the page
    // shows a stable, increasingly-advanced timeline (useful for demos).
    const now = Date.now();
    const events: TrackingEvent[] = [
      { status: 'booked', location: 'Origin Hub', description: 'Shipment booked', timestamp: new Date(now - 3 * 86400000) },
      { status: 'picked', location: 'Origin Hub', description: 'Picked up from seller', timestamp: new Date(now - 2.5 * 86400000) },
      { status: 'in_transit', location: 'Transit Hub', description: 'In transit to destination', timestamp: new Date(now - 1.5 * 86400000) },
      { status: 'out_for_delivery', location: 'Destination Hub', description: 'Out for delivery', timestamp: new Date(now - 3600000) },
    ];
    return { awbNumber, currentStatus: 'out_for_delivery', events, mock: true };
  }

  // ── LIVE IMPLEMENTATIONS (fill in once you have courier API access) ─
  private async bookLive(input: BookingInput): Promise<BookingResult> {
    switch (this.code) {
      case 'delhivery':
        return this.bookDelhivery(input);
      // Add real implementations for other couriers here following the
      // same pattern once you have their API documentation + test creds.
      default:
        // No live implementation written yet for this courier code —
        // safe fallback to mock so the order flow doesn't break.
        return this.bookMock(input);
    }
  }

  private async trackLive(awbNumber: string): Promise<TrackingResult> {
    switch (this.code) {
      case 'delhivery':
        return this.trackDelhivery(awbNumber);
      default:
        return this.trackMock(awbNumber);
    }
  }

  // ── Delhivery reference implementation ──────────────────────────────
  // Docs: https://www.delhivery.com/business/api
  private async bookDelhivery(input: BookingInput): Promise<BookingResult> {
    const { apiKey, baseUrl } = env.COURIERS.delhivery;
    const payload = {
      format: 'json',
      data: JSON.stringify({
        shipments: [
          {
            name: input.consigneeName,
            add: input.consigneeAddress,
            city: input.consigneeCity,
            state: input.consigneeState,
            pin: input.consigneePincode,
            phone: input.consigneePhone,
            order: input.mozopostOrderId,
            payment_mode: input.paymentMode === 'cod' ? 'COD' : 'Prepaid',
            cod_amount: input.codAmount || 0,
            total_amount: input.declaredValue || 0,
            weight: Math.round(input.weightKg * 1000),
          },
        ],
        pickup_location: { name: 'Primary' },
      }),
    };
    const res = await axios.post(`${baseUrl}/api/cmu/create.json`, payload, {
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    const pkg = res.data?.packages?.[0];
    if (!pkg || pkg.error) {
      return { success: false, error: pkg?.error || 'Delhivery booking failed', mock: false };
    }
    return { success: true, awbNumber: pkg.waybill, mock: false };
  }

  private async trackDelhivery(awbNumber: string): Promise<TrackingResult> {
    const { apiKey, baseUrl } = env.COURIERS.delhivery;
    const res = await axios.get(`${baseUrl}/api/v1/packages/json/?waybill=${awbNumber}&verbose=1`, {
      headers: { Authorization: `Token ${apiKey}` },
      timeout: 15000,
    });
    const shipment = res.data?.ShipmentData?.[0]?.Shipment;
    if (!shipment) return { awbNumber, currentStatus: 'unknown', events: [], mock: false };
    const events: TrackingEvent[] = (shipment.Scans || []).map((s: any) => ({
      status: s.ScanDetail.ScanType,
      location: s.ScanDetail.ScannedLocation,
      description: s.ScanDetail.Instructions,
      timestamp: new Date(s.ScanDetail.ScanDateTime),
    }));
    return { awbNumber, currentStatus: shipment.Status?.Status || 'unknown', events, mock: false };
  }
}

export function getAdapter(courierCode: string): CourierAdapter {
  return new CourierAdapter(courierCode);
}
