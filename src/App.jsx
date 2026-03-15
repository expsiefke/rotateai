/**
 * RotateAI v1.0 — Production
 * Two access modes:
 *   WEB    → user visits app.rotateai.com, enters credentials
 *   TABLET → MDM pre-saves session, boots straight to dashboard
 *
 * Replace SUPABASE_URL + SUPABASE_ANON_KEY to go live.
 * DEMO_MODE activates automatically when not configured.
 */
import { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const SUPABASE_URL      = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
const DEMO_MODE         = SUPABASE_URL.includes("YOUR_PROJECT");

// ── Supabase client (no npm) ──────────────────────────────────────────────────
const sb = (() => {
  const h = t => ({ "Content-Type":"application/json", apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${t||SUPABASE_ANON_KEY}` });
  const rest = async (path, token, opts={}) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers:h(token), ...opts });
    return r.json();
  };
  return {
    async signIn(email, password) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:"POST", headers:h(), body:JSON.stringify({email,password}) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error_description || "Sign in failed");
      return d;
    },
    async signOut(t) { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method:"POST", headers:h(t) }); },
    async getProfile(uid, t)    { const d = await rest(`user_profiles?id=eq.${uid}&select=*`, t); return d[0]; },
    async getLocations(t)       { return rest("locations?active=eq.true&select=*&order=name", t); },
    async getInventory(locId,t) { return rest(`inventory_items?location_id=eq.${locId}&active=eq.true&select=*&order=category,name`, t); },
    async getKegs(locId,t)      { return rest(`kegs?location_id=eq.${locId}&active=eq.true&select=*&order=oz_remaining`, t); },
  };
})();

// ── Demo data ─────────────────────────────────────────────────────────────────
const DL = [
  { id:"loc-1", name:"Phil's Backyard Grill",    city:"Nowhere",  state:"FL" },
  { id:"loc-2", name:"Ford's Garage – Lakeland", city:"Lakeland", state:"FL" },
];
const DI = [
  { id:"i1",  name:"Black Angus Ground Beef (80/20)", category:"Protein", unit:"lbs",  on_hand:47,  par_level:120, daily_use:38,  vendor:"Sysco",      shelf_life:4,  fifo_risk:true  },
  { id:"i2",  name:"Brioche Burger Buns",              category:"Bakery",  unit:"units",on_hand:240, par_level:600, daily_use:180, vendor:"Sysco",      shelf_life:3,  fifo_risk:true  },
  { id:"i3",  name:"Atlantic Salmon Filets",           category:"Protein", unit:"lbs",  on_hand:28,  par_level:60,  daily_use:12,  vendor:"US Foods",   shelf_life:3,  fifo_risk:false },
  { id:"i4",  name:"Sharp Cheddar (Sliced)",           category:"Dairy",   unit:"lbs",  on_hand:34,  par_level:80,  daily_use:14,  vendor:"Sysco",      shelf_life:14, fifo_risk:false },
  { id:"i5",  name:"Applewood Smoked Bacon",           category:"Protein", unit:"lbs",  on_hand:52,  par_level:90,  daily_use:16,  vendor:"Sysco",      shelf_life:10, fifo_risk:false },
  { id:"i6",  name:"Russet Potatoes (Fry Cut)",        category:"Produce", unit:"lbs",  on_hand:180, par_level:300, daily_use:48,  vendor:"US Foods",   shelf_life:7,  fifo_risk:false },
  { id:"i7",  name:"Romaine Lettuce",                  category:"Produce", unit:"heads",on_hand:24,  par_level:60,  daily_use:8,   vendor:"US Foods",   shelf_life:5,  fifo_risk:true  },
  { id:"i8",  name:"Avocado (Fresh)",                  category:"Produce", unit:"each", on_hand:36,  par_level:80,  daily_use:18,  vendor:"US Foods",   shelf_life:3,  fifo_risk:true  },
  { id:"i9",  name:"Sweet Potato (Fry Cut)",           category:"Produce", unit:"lbs",  on_hand:90,  par_level:200, daily_use:22,  vendor:"Sysco",      shelf_life:6,  fifo_risk:false },
  { id:"i10", name:"Blue Cheese Crumbles",             category:"Dairy",   unit:"lbs",  on_hand:18,  par_level:30,  daily_use:3.5, vendor:"Sysco",      shelf_life:21, fifo_risk:false },
];
const DK = [
  { id:"k1", name:"Jai Alai IPA",        brewery:"Cigar City Brewing",  style:"IPA",           size_oz:1984, oz_remaining:310,  daily_oz:248, cost_per_keg:185, sell_per_pint:7.50, rotating:true  },
  { id:"k2", name:"Free Dive IPA",        brewery:"Coppertail Brewing",  style:"Hazy IPA",      size_oz:1984, oz_remaining:820,  daily_oz:180, cost_per_keg:172, sell_per_pint:7.50, rotating:true  },
  { id:"k3", name:"The Magistrate Stout", brewery:"Angry Chair Brewing", style:"Imperial Stout",size_oz:661,  oz_remaining:480,  daily_oz:55,  cost_per_keg:95,  sell_per_pint:8.00, rotating:true  },
  { id:"k4", name:"Bud Light",            brewery:"Anheuser-Busch",      style:"Lager",         size_oz:1984, oz_remaining:960,  daily_oz:310, cost_per_keg:128, sell_per_pint:5.00, rotating:false },
  { id:"k5", name:"Miller Lite",          brewery:"Molson Coors",        style:"Lager",         size_oz:1984, oz_remaining:1450, daily_oz:220, cost_per_keg:122, sell_per_pint:5.00, rotating:false },
  { id:"k6", name:"Corona Extra",         brewery:"Constellation",       style:"Mexican Lager", size_oz:992,  oz_remaining:720,  daily_oz:124, cost_per_keg:110, sell_per_pint:6.00, rotating:false },
];
const WH = [
  {w:"Jan W3",v:4210,r:0},{w:"Jan W4",v:3980,r:0},{w:"Feb W1",v:4450,r:0},
  {w:"Feb W2",v:3820,r:890},{w:"Feb W3",v:3540,r:1100},{w:"Feb W4",v:3210,r:1380},{w:"Mar W1",v:3820,r:1240},
];

// ── Context ───────────────────────────────────────────────────────────────────
const Ctx = createContext(null);

function AppProvider({ children }) {
  const [session,     setSession]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [locations,   setLocations]   = useState([]);
  const [location,    setLocation]    = useState(null);
  const [inventory,   setInventory]   = useState([]);
  const [kegs,        setKegs]        = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [tab,         setTab]         = useState("brief");
  const [toasts,      setToasts]      = useState([]);
  const tid = useRef(0);

  useEffect(() => {
    if (DEMO_MODE) {
      setSession({ user:{id:"demo",email:"demo@rotateai.com"}, token:"demo", profile:{role:"admin",full_name:"Demo GM"} });
      setLocations(DL);
      setAuthLoading(false);
      return;
    }
    try {
      const s = JSON.parse(localStorage.getItem("rotateai_v1") || "null");
      if (s && new Date(s.expires_at*1000) > new Date()) {
        setSession({ user:s.user, token:s.access_token, profile:s.profile });
        setLocations(s.locations || []);
        if (s.location) { setLocation(s.location); setInventory(s.inventory||[]); setKegs(s.kegs||[]); }
      } else localStorage.removeItem("rotateai_v1");
    } catch { localStorage.removeItem("rotateai_v1"); }
    setAuthLoading(false);
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (DEMO_MODE) { setSession({user:{id:"demo",email},token:"demo",profile:{role:"admin",full_name:"Demo GM"}}); setLocations(DL); return; }
    const s = await sb.signIn(email, password);
    const [profile, locs] = await Promise.all([sb.getProfile(s.user.id, s.access_token), sb.getLocations(s.access_token)]);
    const full = { ...s, profile, locations:locs };
    localStorage.setItem("rotateai_v1", JSON.stringify(full));
    setSession({user:s.user,token:s.access_token,profile}); setLocations(locs);
  }, []);

  const signOut = useCallback(async () => {
    if (!DEMO_MODE && session?.token !== "demo") try { await sb.signOut(session.token); } catch{}
    localStorage.removeItem("rotateai_v1");
    setSession(null); setLocation(null); setLocations([]); setInventory([]); setKegs([]);
  }, [session]);

  const selectLocation = useCallback(async (loc) => {
    setLocation(loc); setDataLoading(true);
    try {
      const [inv, kgs] = DEMO_MODE
        ? [DI, DK]
        : await Promise.all([sb.getInventory(loc.id, session.token), sb.getKegs(loc.id, session.token)]);
      setInventory(inv); setKegs(kgs);
      const raw = localStorage.getItem("rotateai_v1");
      if (raw) localStorage.setItem("rotateai_v1", JSON.stringify({...JSON.parse(raw), location:loc, inventory:inv, kegs:kgs}));
    } catch { setInventory(DI); setKegs(DK); }
    setDataLoading(false);
  }, [session]);

  const navigate    = useCallback(t => setTab(t), []);
  const addToast    = useCallback(cfg => {
    const id = ++tid.current;
    setToasts(p => [...p, {id,...cfg}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id!==id)), cfg.duration||7000);
  }, []);
  const removeToast = useCallback(id => setToasts(p => p.filter(t => t.id!==id)), []);

  return <Ctx.Provider value={{session,authLoading,locations,location,inventory,kegs,dataLoading,tab,toasts,signIn,signOut,selectLocation,navigate,addToast,removeToast}}>{children}</Ctx.Provider>;
}

const useApp = () => useContext(Ctx);

// ── Helpers ───────────────────────────────────────────────────────────────────
const dL = i => +((i.on_hand||0)/(i.daily_use||1)).toFixed(1);
const dK = k => +((k.oz_remaining||0)/(k.daily_oz||1)).toFixed(1);
const kC = d => d<=1?"#ff5555":d<=3?"#ffaa33":d<=5?"#4a9eff":"#00c853";
const kP = k => Math.round(((k.oz_remaining||0)/(k.size_oz||1))*100);
const badge = d => ({ color:d<=1?"#ff5555":d<=3?"#ffaa33":d<=5?"#4a9eff":"#00c853", label:d<=1?"CRITICAL":d<=3?"LOW":d<=5?"WATCH":"OK" });

// ── Global CSS ────────────────────────────────────────────────────────────────
const GCSS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:#0a0c14;color:#e8ddd0;font-family:'DM Sans',sans-serif;}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:#f0820030;border-radius:2px}input,button{font-family:inherit;}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;

// ── Shared UI ─────────────────────────────────────────────────────────────────
function AnimCount({ val, pre="", suf="", dur=1000 }) {
  const [n,setN]=useState(0); const s=useRef(null);
  useEffect(()=>{ s.current=null; const t=ts=>{if(!s.current)s.current=ts; const p=Math.min((ts-s.current)/dur,1); setN(Math.floor((1-Math.pow(1-p,3))*val)); if(p<1)requestAnimationFrame(t);}; requestAnimationFrame(t); },[val]);
  return <>{pre}{n.toLocaleString()}{suf}</>;
}
function KegGauge({pct,color,size=52}){ const r=size/2-5,c=2*Math.PI*r; return <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2230" strokeWidth={5}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"/></svg>; }
const SL = ({children,color="#555"}) => <div style={{fontSize:9,color,letterSpacing:2,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",marginBottom:10}}>{children}</div>;
const Spinner = ({size=28,color="#f08200"}) => <div style={{width:size,height:size,border:`3px solid ${color}30`,borderTopColor:color,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>;
const DarkTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:"#0a0c14",border:"1px solid #1e2230",borderRadius:4,padding:"8px 12px"}}>{label&&<div style={{fontSize:9,color:"#555",fontFamily:"'DM Mono',monospace",marginBottom:4}}>{label}</div>}{payload.map((p,i)=><div key={i} style={{fontSize:11,color:p.color||"#e8ddd0",fontFamily:"'DM Mono',monospace"}}>{p.name}: {typeof p.value==="number"?`$${p.value.toLocaleString()}`:p.value}</div>)}</div>;
};

// ── Toaster ───────────────────────────────────────────────────────────────────
function Toaster() {
  const { toasts, removeToast, navigate } = useApp();
  if (!toasts.length) return null;
  const visible = [...toasts].slice(-4);
  return (
    <div style={{position:"fixed",bottom:20,right:16,zIndex:9999,display:"flex",flexDirection:"column",alignItems:"flex-end",pointerEvents:"none"}}>
      {visible.map((t,idx) => {
        const depth = visible.length-1-idx;
        return (
          <div key={t.id} onClick={()=>{ if(t.tab)navigate(t.tab); removeToast(t.id); }}
            style={{pointerEvents:"all",background:"#0d0f18",border:`1px solid ${(t.color||"#f08200")}40`,borderLeft:`3px solid ${t.color||"#f08200"}`,borderRadius:8,padding:"11px 14px",minWidth:250,maxWidth:330,cursor:t.tab?"pointer":"default",transform:`translateY(-${depth*8}px) scale(${1-depth*0.04})`,transformOrigin:"bottom right",opacity:1-depth*0.2,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",marginTop:idx===0?0:-42,zIndex:idx+1}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:15,flexShrink:0}}>{t.icon||"🔔"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:9,color:t.color||"#f08200",fontFamily:"'DM Mono',monospace",letterSpacing:2,marginBottom:3}}>{t.type}</div>
                <div style={{fontSize:12,color:"#c0b8b0",lineHeight:1.5}}>{t.msg}</div>
                {t.tab&&<div style={{fontSize:9,color:"#555",marginTop:3}}>→ tap to view</div>}
              </div>
              <button onClick={e=>{e.stopPropagation();removeToast(t.id);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,padding:0,flexShrink:0}}>×</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const {signIn}=useApp(); const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [loading,setLoading]=useState(false); const [err,setErr]=useState(""); const [show,setShow]=useState(false);
  const inp = {width:"100%",background:"#0a0c14",border:"1px solid #1e2230",borderRadius:6,padding:"13px 14px",color:"#e8ddd0",fontSize:14,outline:"none"};
  const go = async (e) => { e?.preventDefault(); setLoading(true); setErr(""); try { await signIn(email,pw); } catch(e) { setErr(e.message||"Check credentials and try again"); } setLoading(false); };
  return (
    <div style={{minHeight:"100vh",background:"#0a0c14",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{GCSS}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:12}}>
            <div style={{width:5,height:48,background:"#f08200",borderRadius:3}}/>
            <div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:40,letterSpacing:5,color:"#f08200",lineHeight:1}}>ROTATEAI</div>
              <div style={{fontSize:9,color:"#555",letterSpacing:3,fontFamily:"'DM Mono',monospace"}}>INTELLIGENT RESTAURANT OPERATIONS</div>
            </div>
          </div>
          {DEMO_MODE&&<div style={{marginTop:14,background:"#f0820012",border:"1px solid #f0820030",borderRadius:6,padding:"7px 16px",display:"inline-block"}}><div style={{fontSize:10,color:"#f08200",fontFamily:"'DM Mono',monospace",letterSpacing:1}}>⚡ DEMO MODE — no login required</div></div>}
        </div>
        <div style={{background:"#111520",border:"1px solid #1e2230",borderRadius:12,padding:32,animation:"fu 0.3s ease"}}>
          <form onSubmit={go}>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:9,color:"#555",letterSpacing:2,fontFamily:"'DM Mono',monospace",marginBottom:7}}>EMAIL</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={DEMO_MODE?"demo@rotateai.com":"gm@restaurant.com"} style={inp} onFocus={e=>e.target.style.borderColor="#f08200"} onBlur={e=>e.target.style.borderColor="#1e2230"} autoComplete="email"/>
            </div>
            <div style={{marginBottom:28}}>
              <label style={{display:"block",fontSize:9,color:"#555",letterSpacing:2,fontFamily:"'DM Mono',monospace",marginBottom:7}}>PASSWORD</label>
              <div style={{position:"relative"}}>
                <input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder={DEMO_MODE?"any value":"••••••••"} style={{...inp,paddingRight:60}} onFocus={e=>e.target.style.borderColor="#f08200"} onBlur={e=>e.target.style.borderColor="#1e2230"} autoComplete="current-password"/>
                <button type="button" onClick={()=>setShow(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{show?"HIDE":"SHOW"}</button>
              </div>
            </div>
            {err&&<div style={{background:"#ff333312",border:"1px solid #ff333330",borderRadius:6,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#ff9999"}}>{err}</div>}
            <button type="submit" disabled={loading} style={{width:"100%",background:loading?"#1a1d2a":"#f08200",color:loading?"#555":"#0a0c14",border:"none",borderRadius:7,padding:15,fontFamily:"'Bebas Neue',cursive",fontSize:19,letterSpacing:3,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              {loading?<><Spinner size={18} color="#555"/> SIGNING IN...</>:"SIGN IN →"}
            </button>
          </form>
          {DEMO_MODE&&<button onClick={()=>{setEmail("demo@rotateai.com");setPw("demo");setTimeout(go,30);}} style={{width:"100%",marginTop:10,background:"transparent",color:"#f08200",border:"1px solid #f0820030",borderRadius:7,padding:13,fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:2,cursor:"pointer"}}>→ ENTER AS DEMO GM (skip login)</button>}
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:10,color:"#333",fontFamily:"'DM Mono',monospace",letterSpacing:1}}>ROTATEAI · EXPERT INCUBATORS LLC · EAGLE LAKE FL</div>
      </div>
    </div>
  );
}

// ── Location Selector ─────────────────────────────────────────────────────────
function LocationSelector() {
  const {locations,selectLocation,signOut,session}=useApp(); const [busy,setBusy]=useState(null);
  const pick = async loc => { setBusy(loc.id); await selectLocation(loc); setBusy(null); };
  return (
    <div style={{minHeight:"100vh",background:"#0a0c14",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{GCSS}</style>
      <div style={{width:"100%",maxWidth:460}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:30,letterSpacing:4,color:"#f08200"}}>ROTATEAI</div>
          <div style={{fontSize:13,color:"#666",marginTop:6}}>Welcome, <span style={{color:"#e8ddd0"}}>{session?.profile?.full_name||session?.user?.email}</span></div>
          <div style={{fontSize:11,color:"#555",marginTop:3}}>Select a location</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {locations.map(loc=>(
            <button key={loc.id} onClick={()=>pick(loc)} disabled={!!busy} style={{background:"#111520",border:"1px solid #1e2230",borderLeft:"4px solid #f08200",borderRadius:8,padding:"18px 22px",cursor:busy?"not-allowed":"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:2,color:"#e8ddd0"}}>{loc.name}</div><div style={{fontSize:11,color:"#555",marginTop:2,fontFamily:"'DM Mono',monospace"}}>{loc.city}, {loc.state}</div></div>
              {busy===loc.id?<Spinner size={20}/>:<div style={{fontSize:9,color:"#f08200",fontFamily:"'DM Mono',monospace"}}>OPEN →</div>}
            </button>
          ))}
        </div>
        <button onClick={signOut} style={{width:"100%",marginTop:22,background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>← SIGN OUT</button>
      </div>
    </div>
  );
}

// ── Tab: Morning Brief ────────────────────────────────────────────────────────
function MorningBrief() {
  const {inventory,kegs,location}=useApp();
  const crit=inventory.filter(i=>dL(i)<=1.5), low=inventory.filter(i=>{const d=dL(i);return d>1.5&&d<=3;}), kCrit=kegs.filter(k=>dK(k)<=1), kWarn=kegs.filter(k=>{const d=dK(k);return d>1&&d<=3;});
  const actions=[
    ...kCrit.map(k=>({pri:"KEG CRITICAL",col:"#f08200",icon:"🍺",msg:`${k.name} — kicks tonight. Call ${k.brewery} NOW.`})),
    ...crit.map(i=>({pri:"FOOD URGENT",col:"#ff5555",icon:"🚨",msg:`${i.name} — ${dL(i)}d left. Order immediately.`})),
    ...kWarn.map(k=>({pri:"ORDER TODAY",col:"#ffaa33",icon:"🍺",msg:`${k.name} — ${dK(k)} days left.`})),
    ...low.slice(0,3).map(i=>({pri:"ORDER TODAY",col:"#ffaa33",icon:"⚠️",msg:`${i.name} — ${dL(i)} days left.`})),
    {pri:"SEASONAL INTEL",col:"#4a9eff",icon:"🏖️",msg:"Spring Break in 9 days — pre-position +45% craft beer, +35% wine tap."},
  ];
  return (
    <div style={{animation:"fu 0.25s ease"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3}}>MORNING BRIEF</div>
        <div style={{fontSize:11,color:"#555"}}>{location?.name} · {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
        {[{l:"FOOD CRITICAL",v:crit.length,c:"#ff5555",s:" items"},{l:"KEGS KICKING",v:kCrit.length,c:"#f08200",s:" tonight"},{l:"LOW STOCK",v:low.length,c:"#ffaa33",s:" items"},{l:"TOTAL TRACKED",v:inventory.length,c:"#00c853",s:" items"}].map((k,i)=>(
          <div key={i} style={{background:"#111520",border:`1px solid ${k.c}18`,borderRadius:6,padding:"14px 16px"}}>
            <div style={{fontSize:9,color:"#555",letterSpacing:2,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{k.l}</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:k.c,letterSpacing:2,lineHeight:1.2}}><AnimCount val={k.v} suf={k.s}/></div>
          </div>
        ))}
      </div>
      <SL>PRIORITY ACTION LIST</SL>
      {actions.length===0
        ? <div style={{background:"#00c85310",border:"1px solid #00c85330",borderRadius:8,padding:28,textAlign:"center"}}><div style={{fontSize:28,marginBottom:10}}>✅</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:"#00c853",letterSpacing:2}}>ALL CLEAR</div><div style={{fontSize:12,color:"#555",marginTop:6}}>No critical actions today</div></div>
        : <div style={{display:"flex",flexDirection:"column",gap:8}}>{actions.map((a,i)=><div key={i} style={{background:"#111520",border:`1px solid ${a.col}20`,borderLeft:`4px solid ${a.col}`,borderRadius:6,padding:"13px 18px",display:"flex",gap:12,alignItems:"flex-start"}}><span style={{fontSize:18,flexShrink:0,lineHeight:1.4}}>{a.icon}</span><div><span style={{fontSize:9,color:a.col,letterSpacing:2,fontFamily:"'DM Mono',monospace",marginRight:10}}>{a.pri}</span><span style={{fontSize:13,color:"#c0b8b0"}}>{a.msg}</span></div></div>)}</div>
      }
    </div>
  );
}

// ── Tab: Inventory ────────────────────────────────────────────────────────────
function InventoryView() {
  const {inventory}=useApp(); const [sort,setSort]=useState("days"); const [cat,setCat]=useState("All");
  const cats=useMemo(()=>["All",...new Set(inventory.map(i=>i.category))],[inventory]);
  const items=useMemo(()=>{
    let f=cat==="All"?inventory:inventory.filter(i=>i.category===cat);
    return [...f].sort((a,b)=>sort==="days"?dL(a)-dL(b):sort==="name"?a.name.localeCompare(b.name):a.category.localeCompare(b.category));
  },[inventory,sort,cat]);
  return (
    <div style={{animation:"fu 0.25s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3}}>INVENTORY</div><div style={{fontSize:11,color:"#555"}}>{inventory.length} items · sorted by days left</div></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:"5px 12px",background:cat===c?"#f08200":"#111520",color:cat===c?"#0a0c14":"#555",border:`1px solid ${cat===c?"#f08200":"#1e2230"}`,borderRadius:4,fontSize:9,letterSpacing:1,fontFamily:"'DM Mono',monospace",cursor:"pointer",textTransform:"uppercase"}}>{c}</button>)}</div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>{[["days","DAYS LEFT"],["name","NAME"],["cat","CATEGORY"]].map(([k,l])=><button key={k} onClick={()=>setSort(k)} style={{padding:"4px 10px",background:"none",border:`1px solid ${sort===k?"#f08200":"#1e2230"}`,color:sort===k?"#f08200":"#555",borderRadius:4,fontSize:9,letterSpacing:1,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>{l}{sort===k?" ↑":""}</button>)}</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {items.map(item=>{
          const d=dL(item),{color,label}=badge(d),pct=Math.min(100,Math.round((item.on_hand/item.par_level)*100));
          return(
            <div key={item.id} style={{background:"#111520",border:`1px solid ${d<=1?"#ff555328":d<=3?"#ffaa3318":"#1e2230"}`,borderLeft:`4px solid ${color}`,borderRadius:6,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                    <div style={{fontSize:14,color:"#e8ddd0",fontWeight:500}}>{item.name}</div>
                    {item.fifo_risk&&<span style={{fontSize:8,color:"#ffaa33",background:"#ffaa3315",border:"1px solid #ffaa3330",padding:"1px 6px",borderRadius:3,fontFamily:"'DM Mono',monospace"}}>FIFO</span>}
                  </div>
                  <div style={{fontSize:10,color:"#555"}}>{item.category} · {item.vendor} · {item.shelf_life}d shelf</div>
                  <div style={{marginTop:8,height:4,background:"#1a1d2a",borderRadius:2}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:2,transition:"width 1s ease"}}/></div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:30,color,lineHeight:1}}>{d}<span style={{fontSize:12,color:"#555"}}>d</span></div>
                  <div style={{fontSize:8,color,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>{label}</div>
                  <div style={{fontSize:11,color:"#555",marginTop:4,fontFamily:"'DM Mono',monospace"}}>{item.on_hand}/{item.par_level} {item.unit}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Tap Room ─────────────────────────────────────────────────────────────
function TapsView() {
  const {kegs}=useApp();
  const SC={"IPA":"#f08200","Hazy IPA":"#4a9eff","Imperial Stout":"#a78bff","Lager":"#ffaa33","Mexican Lager":"#00c853"};
  return (
    <div style={{animation:"fu 0.25s ease"}}>
      <div style={{marginBottom:20}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3}}>TAP ROOM</div><div style={{fontSize:11,color:"#555"}}>{kegs.length} handles · live levels</div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {kegs.map(k=>{
          const d=dK(k),pct=kP(k),col=kC(d),sc=SC[k.style]||"#555";
          const pc=k.cost_per_keg&&k.sell_per_pint?Math.round((k.cost_per_keg/((k.size_oz/16)*k.sell_per_pint))*100):null;
          return(
            <div key={k.id} style={{background:"#111520",border:`1px solid ${col}25`,borderRadius:8,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{flex:1,paddingRight:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    {d<=1&&<div style={{width:7,height:7,borderRadius:"50%",background:"#ff5555",animation:"pulse 1.5s infinite",flexShrink:0}}/>}
                    <div style={{fontWeight:600,fontSize:14,color:"#e8ddd0"}}>{k.name}</div>
                  </div>
                  <div style={{fontSize:11,color:"#555",marginBottom:7}}>{k.brewery}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:8,color:sc,background:`${sc}15`,border:`1px solid ${sc}30`,padding:"2px 7px",borderRadius:3}}>{k.style}</span>
                    {k.rotating&&<span style={{fontSize:8,color:"#f08200",background:"#f0820012",border:"1px solid #f0820030",padding:"2px 7px",borderRadius:3}}>ROTATING</span>}
                  </div>
                </div>
                <div style={{position:"relative",width:54,height:54,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <KegGauge pct={pct} color={col} size={54}/>
                  <div style={{position:"absolute",fontFamily:"'Bebas Neue',cursive",fontSize:13,color:col}}>{pct}%</div>
                </div>
              </div>
              <div style={{background:`${col}10`,border:`1px solid ${col}20`,borderRadius:6,padding:"10px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                  <div><div style={{fontSize:8,color:"#555",fontFamily:"'DM Mono',monospace"}}>KICKS IN</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:30,color:col,lineHeight:1}}>{d}<span style={{fontSize:11,color:"#555",marginLeft:3}}>d</span></div></div>
                  <div style={{textAlign:"center"}}><div style={{fontSize:8,color:"#555",fontFamily:"'DM Mono',monospace"}}>OZ/DAY</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#e8ddd0"}}>{k.daily_oz}</div></div>
                  {pc!==null&&<div style={{textAlign:"right"}}><div style={{fontSize:8,color:"#555",fontFamily:"'DM Mono',monospace"}}>POUR COST</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:pc<26?"#00c853":"#ffaa33"}}>{pc}%</div></div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Waste ────────────────────────────────────────────────────────────────
function WasteView() {
  const cd=WH.map(w=>({week:w.w.replace("Jan ","J").replace("Feb ","F").replace("Mar ","M"),waste:w.v,rec:w.r}));
  const lat=WH[WH.length-1],prv=WH[WH.length-2];
  return (
    <div style={{animation:"fu 0.25s ease"}}>
      <div style={{marginBottom:20}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3}}>WASTE ANALYTICS</div><div style={{fontSize:11,color:"#555"}}>Log daily entries to build your intelligence baseline</div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:18}}>
        {[{l:"THIS WEEK",v:lat.v,c:"#ff5555",p:"$"},{l:"RECOVERED",v:lat.r,c:"#00c853",p:"$"},{l:"WOW CHANGE",v:Math.abs(lat.v-prv.v),c:lat.v<prv.v?"#00c853":"#ff5555",p:lat.v<prv.v?"↓$":"↑$"},{l:"YTD TOTAL",v:WH.reduce((s,w)=>s+w.v,0),c:"#555",p:"$"}].map((k,i)=>(
          <div key={i} style={{background:"#111520",border:`1px solid ${k.c}18`,borderRadius:6,padding:"14px 16px"}}>
            <div style={{fontSize:9,color:"#555",letterSpacing:2,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{k.l}</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:k.c,letterSpacing:2,lineHeight:1.2}}><AnimCount val={k.v} pre={k.p}/></div>
          </div>
        ))}
      </div>
      <div style={{background:"#111520",border:"1px solid #1e2230",borderRadius:8,padding:"18px 16px",marginBottom:14}}>
        <SL>7-WEEK WASTE TREND</SL>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={cd} margin={{top:4,right:4,left:-16,bottom:0}}>
            <XAxis dataKey="week" tick={{fill:"#555",fontSize:8,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"#555",fontSize:8}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(1)}k`}/>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1d2a" vertical={false}/>
            <Tooltip content={<DarkTip/>}/>
            <Area type="monotone" dataKey="waste" stroke="#ff5555" fill="#ff5555" fillOpacity={0.1} strokeWidth={2} dot={false} name="Waste"/>
            <Area type="monotone" dataKey="rec"   stroke="#00c853" fill="#00c853" fillOpacity={0.12} strokeWidth={1.5} dot={false} name="Recovered"/>
          </AreaChart>
        </ResponsiveContainer>
        <div style={{display:"flex",gap:16,marginTop:8}}>{[["#ff5555","Waste"],["#00c853","Recovered"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#555"}}><div style={{width:12,height:3,background:c,borderRadius:1}}/>{l}</div>)}</div>
      </div>
      <div style={{background:"#111520",border:"1px solid #f0820030",borderRadius:8,padding:22,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:10}}>📝</div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:"#f08200",letterSpacing:2,marginBottom:8}}>LOG FIRST WASTE ENTRY</div>
        <div style={{fontSize:12,color:"#555",lineHeight:1.8,marginBottom:18}}>As your team logs waste daily, RotateAI identifies patterns,<br/>root causes, and where margin is disappearing.</div>
        <button style={{background:"#f08200",color:"#0a0c14",border:"none",borderRadius:6,padding:"11px 28px",fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2,cursor:"pointer"}}>+ LOG WASTE ENTRY</button>
      </div>
    </div>
  );
}

// ── Tab: Settings ─────────────────────────────────────────────────────────────
function SettingsView() {
  const {session,location,signOut,selectLocation,locations}=useApp();
  return (
    <div style={{animation:"fu 0.25s ease"}}>
      <div style={{marginBottom:20}}><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:3}}>SETTINGS</div></div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {[{l:"SIGNED IN AS",v:session?.user?.email},{l:"ROLE",v:(session?.profile?.role||"").toUpperCase()},{l:"LOCATION",v:location?.name},{l:"CONNECTION",v:DEMO_MODE?"Demo mode":"Live — Supabase"}].map((r,i)=>(
          <div key={i} style={{background:"#111520",border:"1px solid #1e2230",borderRadius:6,padding:"13px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div style={{fontSize:10,color:"#555",fontFamily:"'DM Mono',monospace",letterSpacing:1,flexShrink:0}}>{r.l}</div>
            <div style={{fontSize:13,color:"#e8ddd0",textAlign:"right"}}>{r.v||"—"}</div>
          </div>
        ))}
      </div>
      {locations.length>1&&(
        <div style={{marginBottom:20}}>
          <SL>SWITCH LOCATION</SL>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {locations.map(loc=>(
              <button key={loc.id} onClick={()=>selectLocation(loc)} style={{background:location?.id===loc.id?"#f0820015":"#111520",border:`1px solid ${location?.id===loc.id?"#f08200":"#1e2230"}`,borderRadius:6,padding:"12px 16px",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:13,color:"#e8ddd0"}}>{loc.name}</div><div style={{fontSize:10,color:"#555",fontFamily:"'DM Mono',monospace"}}>{loc.city}, {loc.state}</div></div>
                {location?.id===loc.id&&<span style={{fontSize:9,color:"#f08200",fontFamily:"'DM Mono',monospace"}}>ACTIVE</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {DEMO_MODE&&(
        <div style={{background:"#4a9eff10",border:"1px solid #4a9eff25",borderRadius:8,padding:20,marginBottom:16}}>
          <div style={{fontSize:9,color:"#4a9eff",fontFamily:"'DM Mono',monospace",letterSpacing:2,marginBottom:10}}>CONNECT SUPABASE TO GO LIVE</div>
          <div style={{fontSize:12,color:"#888",lineHeight:1.9}}>
            1. Create project at <span style={{color:"#4a9eff"}}>supabase.com</span><br/>
            2. Run <span style={{color:"#e8ddd0",fontFamily:"'DM Mono',monospace"}}>rotateai_schema.sql</span> in SQL Editor<br/>
            3. Settings → API → copy URL + anon key<br/>
            4. Update <span style={{color:"#e8ddd0",fontFamily:"'DM Mono',monospace"}}>SUPABASE_URL</span> + <span style={{color:"#e8ddd0",fontFamily:"'DM Mono',monospace"}}>SUPABASE_ANON_KEY</span> in App.jsx
          </div>
        </div>
      )}
      <button onClick={signOut} style={{width:"100%",background:"#ff333312",border:"1px solid #ff333330",borderRadius:7,padding:14,color:"#ff7777",fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:2,cursor:"pointer"}}>SIGN OUT OF ROTATEAI</button>
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────
const TABS=[{id:"brief",e:"☀️",l:"Morning Brief"},{id:"inventory",e:"📦",l:"Inventory"},{id:"taps",e:"🍺",l:"Tap Room"},{id:"waste",e:"📊",l:"Waste"},{id:"settings",e:"⚙️",l:"Settings"}];

function Dashboard() {
  const {tab,navigate,addToast,location,inventory,kegs,dataLoading}=useApp();
  const cF=inventory.filter(i=>dL(i)<=1.5).length, cK=kegs.filter(k=>dK(k)<=1).length;
  const fired=useRef(false);
  useEffect(()=>{
    if(!inventory.length||fired.current) return; fired.current=true;
    const kk=kegs.find(k=>dK(k)<=1);
    if(kk) setTimeout(()=>addToast({type:"🍺 KEG CRITICAL",msg:`${kk.name} kicks tonight — call ${kk.brewery} NOW`,icon:"🍺",color:"#f08200",tab:"taps",duration:10000}),1000);
    if(cF>0) setTimeout(()=>addToast({type:"🚨 FOOD CRITICAL",msg:`${cF} item${cF>1?"s":""} under 1.5 days supply`,icon:"🚨",color:"#ff5555",tab:"inventory",duration:10000}),2400);
  },[inventory.length,kegs.length]);

  return (
    <div style={{minHeight:"100vh",background:"#0a0c14",color:"#e8ddd0"}}>
      <style>{GCSS+`@media(min-width:500px){.tl{display:inline!important}}`}</style>
      {/* Header */}
      <div style={{background:"#0d0f18",borderBottom:"1px solid #f0820018",position:"sticky",top:0,zIndex:200}}>
        <div style={{maxWidth:1300,margin:"0 auto",padding:"0 14px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <div style={{width:4,height:30,background:"#f08200",borderRadius:2,flexShrink:0}}/>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:4,color:"#f08200",lineHeight:1}}>ROTATEAI</div>
              <div style={{fontSize:8,color:"#555",letterSpacing:2,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{location?.name?.toUpperCase()}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            {cK>0&&<button onClick={()=>navigate("taps")} style={{background:"#f0820014",border:"1px solid #f0820030",padding:"3px 9px",borderRadius:4,fontSize:9,color:"#f08200",fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>{cK} KEG 🍺</button>}
            {cF>0&&<button onClick={()=>navigate("inventory")} style={{background:"#ff555514",border:"1px solid #ff555530",padding:"3px 9px",borderRadius:4,fontSize:9,color:"#ff5555",fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>{cF} CRIT</button>}
            <div style={{width:6,height:6,borderRadius:"50%",background:"#00c853",animation:"pulse 2s infinite"}}/>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{background:"#0d0f18",borderBottom:"1px solid #161a24",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{maxWidth:1300,margin:"0 auto",padding:"0 14px",display:"flex"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>navigate(t.id)} style={{padding:"11px 12px",background:"none",border:"none",borderBottom:tab===t.id?"2px solid #f08200":"2px solid transparent",marginBottom:-1,color:tab===t.id?"#f08200":"#555",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1,display:"flex",alignItems:"center",gap:5}}>
              <span>{t.e}</span><span className="tl" style={{display:"none",fontSize:10}}>{t.l}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Content */}
      <div style={{maxWidth:1300,margin:"0 auto",padding:14}}>
        {dataLoading
          ? <div style={{textAlign:"center",padding:"80px 0"}}><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Spinner size={36}/></div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,color:"#555"}}>LOADING...</div></div>
          : <>{tab==="brief"&&<MorningBrief/>}{tab==="inventory"&&<InventoryView/>}{tab==="taps"&&<TapsView/>}{tab==="waste"&&<WasteView/>}{tab==="settings"&&<SettingsView/>}</>
        }
      </div>
      <Toaster/>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function AppInner() {
  const {session,authLoading,location}=useApp();
  if(authLoading) return <div style={{minHeight:"100vh",background:"#0a0c14",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{GCSS}</style><Spinner size={36}/></div>;
  if(!session)  return <LoginScreen/>;
  if(!location) return <LocationSelector/>;
  return <Dashboard/>;
}

export default function App() {
  return <AppProvider><AppInner/></AppProvider>;
}
