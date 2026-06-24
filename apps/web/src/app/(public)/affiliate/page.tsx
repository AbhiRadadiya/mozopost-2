export default function AffiliatePage() {
  return (
    <div style={{ padding:'64px 24px', maxWidth:900, margin:'0 auto' }}>
      <div style={{ background:'#104378', padding:40, textAlign:'center', border:'2.5px solid #000', boxShadow:'6px 6px 0 #000', marginBottom:40 }}>
        <h1 style={{ color:'#fff', fontSize:42, fontWeight:700, marginBottom:12 }}>Affiliate Program</h1>
        <p style={{ color:'#88aaee', fontSize:18, marginBottom:24 }}>Earn up to 2% commission on every order your referrals ship</p>
        <a href="/register" style={{ display:'inline-block', background:'#c8f135', color:'#000', fontWeight:700, fontSize:16, padding:'12px 28px', border:'2.5px solid #000', boxShadow:'4px 4px 0 #000', textDecoration:'none' }}>Join Affiliate Program →</a>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginBottom:40 }}>
        {[['1. Sign Up','Create a free Mozopost account and get your unique referral code','#b4d4ff'],['2. Refer Sellers','Share your referral code or link with merchants who need shipping solutions','#c8f135'],['3. Earn Commission','Get 2% commission on every order shipped by merchants you refer','#ffa500']].map(([title, desc, color]) => (
          <div key={title} style={{ background:color, border:'2.5px solid #000', padding:24, boxShadow:'4px 4px 0 #000' }}>
            <div style={{ fontWeight:700, fontSize:18, marginBottom:10 }}>{title}</div>
            <div style={{ fontSize:14 }}>{desc}</div>
          </div>
        ))}
      </div>
      <div style={{ background:'#fff', border:'2.5px solid #000', padding:24, boxShadow:'4px 4px 0 #000' }}>
        <h2 style={{ fontWeight:700, fontSize:22, marginBottom:16 }}>Commission Structure</h2>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead><tr style={{ background:'#000', color:'#c8f135' }}><th style={{ padding:'8px 16px', textAlign:'left' }}>Monthly Orders (Referred)</th><th style={{ padding:'8px 16px', textAlign:'left' }}>Commission Rate</th></tr></thead>
          <tbody>
            {[['1 – 100','1.5%'],['101 – 500','2.0%'],['501 – 2,000','2.5%'],['2,000+','Custom (contact us)']].map(([range, rate]) => (
              <tr key={range} style={{ borderBottom:'1px solid #eee' }}>
                <td style={{ padding:'8px 16px' }}>{range}</td>
                <td style={{ padding:'8px 16px', fontWeight:700 }}>{rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
