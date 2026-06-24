export default function FeaturesPage() {
  const sections = [
    { title:'Seller Panel', icon:'🛍', features:['Dashboard with charts','Create orders individually or in bulk','Multi-courier auto-allocation','Real-time tracking','NDR management with re-attempt','COD remittance tracking','Weight dispute system','Postpaid credit wallet','Branded label printing','Pickup scheduling'] },
    { title:'Admin Panel', icon:'🛡', features:['Merchant management & KYC','P&L reporting per merchant','Credit limit management','COD settlement with UTR entry','Weight dispute resolution','Staff roles & permissions','Referral commission management','Bulk NDR actions','Courier rate card management','SMTP & email template management'] },
    { title:'Analytics', icon:'📊', features:['Order performance chart','Courier performance comparison','Best courier widget','Top state & city analysis','Delivery rate tracking','RTO loss reporting','COD outstanding dashboard','Merchant health scoring'] },
  ];
  return (
    <div style={{ padding:'64px 24px', maxWidth:1200, margin:'0 auto' }}>
      <h1 style={{ textAlign:'center', fontSize:42, fontWeight:700, marginBottom:48 }}>Full Feature List</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
        {sections.map(s => (
          <div key={s.title} style={{ background:'#fff', border:'2.5px solid #000', padding:24, boxShadow:'4px 4px 0 #000' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{s.icon}</div>
            <h2 style={{ fontWeight:700, fontSize:20, marginBottom:16 }}>{s.title}</h2>
            <ul style={{ listStyle:'none', padding:0 }}>
              {s.features.map(f => (
                <li key={f} style={{ padding:'5px 0', borderBottom:'1px solid #eee', fontSize:13 }}>✓ {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
