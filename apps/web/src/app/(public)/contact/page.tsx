export default function ContactPage() {
  return (
    <div style={{ padding:'64px 24px', maxWidth:700, margin:'0 auto' }}>
      <h1 style={{ fontSize:42, fontWeight:700, marginBottom:8 }}>Contact Us</h1>
      <p style={{ color:'#777', marginBottom:40 }}>Have questions? Our team is here to help.</p>
      <div style={{ background:'#fff', border:'2.5px solid #000', padding:28, boxShadow:'4px 4px 0 #000' }}>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontFamily:'Space Mono,monospace', fontSize:10, fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:4 }}>Full Name</label>
          <input style={{ width:'100%', padding:'8px 12px', border:'2px solid #000', borderRadius:3, fontFamily:'Space Grotesk,sans-serif', fontSize:14, boxShadow:'2px 2px 0 #000', boxSizing:'border-box' }} placeholder="Your name" />
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontFamily:'Space Mono,monospace', fontSize:10, fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:4 }}>Email</label>
          <input type="email" style={{ width:'100%', padding:'8px 12px', border:'2px solid #000', borderRadius:3, fontFamily:'Space Grotesk,sans-serif', fontSize:14, boxShadow:'2px 2px 0 #000', boxSizing:'border-box' }} placeholder="your@email.com" />
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontFamily:'Space Mono,monospace', fontSize:10, fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:4 }}>Message</label>
          <textarea rows={5} style={{ width:'100%', padding:'8px 12px', border:'2px solid #000', borderRadius:3, fontFamily:'Space Grotesk,sans-serif', fontSize:14, boxShadow:'2px 2px 0 #000', resize:'none', boxSizing:'border-box' }} placeholder="How can we help?" />
        </div>
        <button style={{ background:'#000', color:'#c8f135', fontWeight:700, padding:'12px 28px', border:'2.5px solid #000', cursor:'pointer', boxShadow:'4px 4px 0 #000', fontFamily:'Space Grotesk,sans-serif', fontSize:14 }}>
          Send Message →
        </button>
      </div>
      <div style={{ marginTop:32, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:'#104378', color:'#fff', border:'2.5px solid #000', padding:20, boxShadow:'4px 4px 0 #000' }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>📧 Email</div>
          <div style={{ color:'#88aaee', fontSize:14 }}>support@mozopost.in</div>
        </div>
        <div style={{ background:'#104378', color:'#fff', border:'2.5px solid #000', padding:20, boxShadow:'4px 4px 0 #000' }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>📞 Phone</div>
          <div style={{ color:'#88aaee', fontSize:14 }}>+91 98765 00000</div>
        </div>
      </div>
    </div>
  );
}
