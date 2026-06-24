export default function CouriersPage() {
  const couriers = [
    { name:'Delhivery', coverage:'19,000+ pincodes', mode:'Express & Standard', cod:true },
    { name:'BlueDart', coverage:'35,000+ pincodes', mode:'Express', cod:true },
    { name:'XpressBees', coverage:'18,000+ pincodes', mode:'Express & Standard', cod:true },
    { name:'DTDC', coverage:'17,000+ pincodes', mode:'Express & Economy', cod:true },
    { name:'Ecom Express', coverage:'27,000+ pincodes', mode:'Express', cod:true },
    { name:'Shadowfax', coverage:'Metro & Tier 1', mode:'Hyperlocal & Express', cod:true },
    { name:'Amazon Shipping', coverage:'Pan India', mode:'Standard', cod:false },
    { name:'Ekart', coverage:'Pan India', mode:'Standard', cod:true },
    { name:'Gati', coverage:'Pan India', mode:'Express & Cargo', cod:true },
    { name:'India Post', coverage:'All pincodes', mode:'Standard & Speed Post', cod:true },
    { name:'DHL', coverage:'220+ countries', mode:'International', cod:false },
  ];
  return (
    <div style={{ padding:'64px 24px', maxWidth:1200, margin:'0 auto' }}>
      <h1 style={{ textAlign:'center', fontSize:42, fontWeight:700, marginBottom:8 }}>11 Courier Partners</h1>
      <p style={{ textAlign:'center', color:'#777', marginBottom:48 }}>All integrated. All in one dashboard.</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {couriers.map(c => (
          <div key={c.name} style={{ background:'#fff', border:'2.5px solid #000', padding:20, boxShadow:'4px 4px 0 #000' }}>
            <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>{c.name}</div>
            <div style={{ fontSize:13, color:'#555', marginBottom:4 }}>📍 {c.coverage}</div>
            <div style={{ fontSize:13, color:'#555', marginBottom:8 }}>🚚 {c.mode}</div>
            <div style={{ display:'inline-block', background:c.cod?'#c8f135':'#eee', border:'1.5px solid #000', padding:'2px 8px', fontSize:11, fontWeight:700 }}>
              {c.cod ? '✓ COD Available' : 'Prepaid Only'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
