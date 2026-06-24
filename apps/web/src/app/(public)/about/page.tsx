export default function AboutPage() {
  const teams = [
    { name:'Operations Team', desc:'Manages day-to-day platform operations, pickup scheduling, and courier coordination' },
    { name:'Support Team', desc:'Handles merchant queries, NDR resolution, and dispute management' },
    { name:'Finance Team', desc:'Manages COD settlements, credit facilities, and P&L reporting' },
    { name:'Sales Team', desc:'Merchant onboarding, referral management, and business development' },
    { name:'Technology Team', desc:'Platform development, API integrations, and system reliability' },
  ];
  return (
    <div style={{ padding:'64px 24px', maxWidth:900, margin:'0 auto' }}>
      <h1 style={{ fontSize:42, fontWeight:700, marginBottom:16 }}>About Mozopost</h1>
      <p style={{ fontSize:18, color:'#555', marginBottom:40, lineHeight:1.7 }}>
        Mozopost is building India's leading multi-courier shipping platform with enterprise-grade operations, analytics, automation, and merchant tools. Our mission is to make shipping simple, affordable, and reliable for every Indian business.
      </p>
      <h2 style={{ fontSize:28, fontWeight:700, marginBottom:24 }}>Our Teams</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {teams.map(t => (
          <div key={t.name} style={{ background:'#fff', border:'2.5px solid #000', padding:20, boxShadow:'4px 4px 0 #000' }}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>{t.name}</div>
            <div style={{ color:'#555', fontSize:13 }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
