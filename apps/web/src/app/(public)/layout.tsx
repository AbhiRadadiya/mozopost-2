import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", background: '#fffaf0', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{ background: '#104378', borderBottom: '2.5px solid #000', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: '#c8f135', border: '2px solid #000', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', fontSize: 14, boxShadow: '2px 2px 0 #000' }}>M</div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Mozopost</span>
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['/', 'Home'], ['/features', 'Features'], ['/pricing', 'Pricing'], ['/couriers', 'Couriers'], ['/about', 'About'], ['/contact', 'Contact']].map(([href, label]) => (
              <Link key={href} href={href} style={{ color: '#88aaee', fontWeight: 600, fontSize: 13, textDecoration: 'none', padding: '6px 12px' }}>
                {label}
              </Link>
            ))}
            <Link href="/login" style={{ background: '#c8f135', color: '#000', fontWeight: 700, fontSize: 13, padding: '6px 16px', border: '2px solid #000', borderRadius: 3, boxShadow: '3px 3px 0 #000', textDecoration: 'none' }}>
              Login →
            </Link>
          </div>
        </div>
      </nav>
      {children}
      {/* Footer */}
      <footer style={{ background: '#000', color: '#888', borderTop: '2.5px solid #104378', padding: '32px 24px', textAlign: 'center', fontSize: 12 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ color: '#c8f135', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Mozopost — One Platform. Every Courier.</div>
          <div>© 2026 Mozopost. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
