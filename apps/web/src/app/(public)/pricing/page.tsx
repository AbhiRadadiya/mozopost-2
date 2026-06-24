export default function PricingPage() {
  const plans = [
    { name:'Starter', price:'₹0', desc:'For new sellers', features:['Up to 500 orders/month','5 couriers','Basic dashboard','Email support'], color:'#b4d4ff' },
    { name:'Growth', price:'₹999/mo', desc:'For growing D2C brands', features:['Unlimited orders','All 11 couriers','Advanced analytics','Credit wallet','Priority support','Bulk upload'], color:'#c8f135', featured: true },
    { name:'Enterprise', price:'Custom', desc:'For high-volume sellers', features:['Everything in Growth','Dedicated account manager','Custom integrations','SLA guarantee','White-label option','API access'], color:'#104378' },
  ];
  return (
    <div style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ textAlign:'center', fontSize:42, fontWeight:700, marginBottom:8 }}>Simple, transparent pricing</h1>
      <p style={{ textAlign:'center', color:'#777', marginBottom:48 }}>No hidden charges. Pay only for what you use.</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
        {plans.map(p => (
          <div key={p.name} style={{ background:'#fff', border:`${p.featured?'3px':'2.5px'} solid #000`, padding:28, boxShadow:`${p.featured?'6px 6px':'4px 4px'} 0 #000`, position:'relative' }}>
            {p.featured && <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'#000', color:'#c8f135', fontWeight:700, fontSize:11, padding:'3px 12px', border:'2px solid #000' }}>MOST POPULAR</div>}
            <div style={{ background:p.color, display:'inline-block', padding:'4px 12px', border:'1.5px solid #000', fontWeight:700, marginBottom:12, color:p.name==='Enterprise'?'#c8f135':'#000' }}>{p.name}</div>
            <div style={{ fontSize:36, fontWeight:700, marginBottom:4 }}>{p.price}</div>
            <div style={{ color:'#777', marginBottom:20 }}>{p.desc}</div>
            <ul style={{ listStyle:'none', padding:0, marginBottom:24 }}>
              {p.features.map(f => (
                <li key={f} style={{ padding:'5px 0', borderBottom:'1px solid #eee', fontSize:14 }}>✓ {f}</li>
              ))}
            </ul>
            <a href="/register" style={{ display:'block', textAlign:'center', background:'#000', color:'#c8f135', fontWeight:700, padding:'10px', border:'2px solid #000', boxShadow:'3px 3px 0 #000', textDecoration:'none' }}>Get started →</a>
          </div>
        ))}
      </div>
    </div>
  );
}
