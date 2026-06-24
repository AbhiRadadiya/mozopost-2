import Link from 'next/link';

const COURIERS = ['Delhivery','XpressBees','DTDC','BlueDart','Ecom Express','Shadowfax','Amazon Shipping','Ekart','Gati','India Post','DHL'];
const FEATURES = [
  ['📦','Order Management','Create, bulk upload, track all orders from one dashboard'],
  ['🚚','11 Courier Partners','Auto-allocate to the cheapest serviceable courier automatically'],
  ['🎯','Smart Fraud Detection','AI-powered fraud score on every order before booking'],
  ['⚖','Weight Dispute Management','Raise and track weight discrepancy disputes with couriers'],
  ['💰','Postpaid Credit Wallet','Ship even when wallet is low with our credit facility'],
  ['📊','Analytics & Reports','Delivery rates, courier performance, P&L in real-time'],
  ['💵','COD Management','Automated COD remittances with UTR tracking'],
  ['📧','Email Notifications','SMTP-powered alerts for every shipment event'],
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section style={{ background: '#104378', padding: '80px 24px', textAlign: 'center', borderBottom: '2.5px solid #000' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ background: '#c8f135', display: 'inline-block', padding: '4px 14px', border: '2px solid #000', fontWeight: 700, fontSize: 12, marginBottom: 20, boxShadow: '3px 3px 0 #000' }}>
            India's #1 Multi-Courier Platform
          </div>
          <h1 style={{ color: '#fff', fontSize: 52, fontWeight: 700, lineHeight: 1.1, marginBottom: 16 }}>
            One Platform.<br /><span style={{ color: '#c8f135' }}>Every Courier.</span>
          </h1>
          <p style={{ color: '#88aaee', fontSize: 18, marginBottom: 32 }}>
            Manage all your shipping from a single dashboard. Compare rates, book shipments, track deliveries, and manage COD — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/register" style={{ background: '#c8f135', color: '#000', fontWeight: 700, fontSize: 16, padding: '12px 28px', border: '2.5px solid #000', boxShadow: '4px 4px 0 #000', textDecoration: 'none' }}>
              Start Free →
            </Link>
            <Link href="/features" style={{ background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 16, padding: '12px 28px', border: '2.5px solid #88aaee', textDecoration: 'none' }}>
              See Features
            </Link>
          </div>
        </div>
      </section>

      {/* Courier logos */}
      <section style={{ padding: '32px 24px', borderBottom: '2.5px solid #000', background: '#fffbeb' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', color: '#777', marginBottom: 16, letterSpacing: '0.1em' }}>Integrated with 11 couriers</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {COURIERS.map(c => (
              <div key={c} style={{ background: '#fff', border: '2px solid #000', padding: '6px 14px', fontWeight: 700, fontSize: 13, boxShadow: '2px 2px 0 #000' }}>{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '64px 24px', borderBottom: '2.5px solid #000' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Everything you need to ship smarter</h2>
          <p style={{ textAlign: 'center', color: '#777', marginBottom: 40 }}>Built for D2C brands, marketplace sellers, and enterprise logistics</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {FEATURES.map(([icon, title, desc]) => (
              <div key={title} style={{ background: '#fff', border: '2.5px solid #000', padding: 20, boxShadow: '4px 4px 0 #000' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#555', fontSize: 13 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#104378', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Ready to scale your shipping?</h2>
          <p style={{ color: '#88aaee', marginBottom: 28 }}>Join thousands of merchants already shipping smarter with Mozopost.</p>
          <Link href="/register" style={{ background: '#c8f135', color: '#000', fontWeight: 700, fontSize: 18, padding: '14px 36px', border: '2.5px solid #000', boxShadow: '4px 4px 0 #000', textDecoration: 'none' }}>
            Create Free Account →
          </Link>
        </div>
      </section>
    </>
  );
}
