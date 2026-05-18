import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from "firebase/firestore";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────
const USERS = [
  { id: "meron",  name: "Meron",  color: "#F5A623", initials: "ME" },
  { id: "aman",   name: "Aman",   color: "#4ECDC4", initials: "AM" },
  { id: "gideon", name: "Gideon", color: "#C084FC", initials: "GI" },
];

const EMPTY_METRICS = {
  calls: 0, ownersSpoken: 0, apptsBooked: 0,
  apptsCompleted: 0, apptsNoShow: 0,
  dealsClosed: 0, dealsLost: 0, leadsInPipeline: 0,
};

const DEFAULT_GOALS = { calls: 50, ownersSpoken: 10, apptsBooked: 3, dealsClosed: 1 };

const VERSES = [
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", ref: "2 Timothy 1:7" },
  { text: "Commit your work to the LORD, and your plans will be established.", ref: "Proverbs 16:3" },
  { text: "The plans of the diligent lead surely to abundance.", ref: "Proverbs 21:5" },
  { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged.", ref: "Joshua 1:9" },
  { text: "And my God will supply every need of yours according to his riches in glory.", ref: "Philippians 4:19" },
  { text: "Trust in the LORD with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened.", ref: "Matthew 7:7" },
  { text: "The LORD will open to you his good treasury and bless all the work of your hands.", ref: "Deuteronomy 28:12" },
  { text: "Delight yourself in the LORD, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
  { text: "Now faith is confidence in what we hope for and assurance about what we do not see.", ref: "Hebrews 11:1" },
  { text: "The LORD is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "For I know the plans I have for you, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" },
  { text: "With God all things are possible.", ref: "Matthew 19:26" },
  { text: "No weapon formed against you shall prosper.", ref: "Isaiah 54:17" },
  { text: "Your next YES is one dial away. Pick up the phone.", ref: "— Born Again" },
  { text: "Every call you make is an act of faith. Someone out there needs what you have.", ref: "— Born Again" },
  { text: "Champions are built in the moments they don't feel like it. Dial anyway.", ref: "— Born Again" },
  { text: "Rejection is redirection. Every no gets you closer to the yes God has for you.", ref: "— Born Again" },
  { text: "Wealth is built in the uncomfortable conversations you still choose to make.", ref: "— Born Again" },
  { text: "You were not built for comfort. You were built for conquest.", ref: "— Born Again" },
  { text: "The grind you put in today is the testimony you'll share tomorrow.", ref: "— Born Again" },
  { text: "God didn't bring you this far to leave you. Keep dialing.", ref: "— Born Again" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", ref: "— Winston Churchill" },
  { text: "The secret of getting ahead is getting started.", ref: "— Mark Twain" },
  { text: "You don't build a business. You build people, and people build the business.", ref: "— Zig Ziglar" },
  { text: "Discipline is choosing between what you want now and what you want most.", ref: "— Abraham Lincoln" },
  { text: "The difference between a successful person and others is not a lack of strength, not a lack of knowledge, but rather a lack of will.", ref: "— Vince Lombardi" },
  { text: "Make one more call. Then one more after that. That is the whole secret.", ref: "— Born Again" },
];

const todayKey = () => new Date().toISOString().split("T")[0];

const getWeekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const sumEntries = (arr) =>
  arr.reduce((acc, e) => {
    Object.keys(EMPTY_METRICS).forEach((k) => { acc[k] = (acc[k] || 0) + (Number(e[k]) || 0); });
    return acc;
  }, { ...EMPTY_METRICS });

const calcRates = (d) => ({
  ownerRate:   d.calls > 0 ? +((d.ownersSpoken / d.calls) * 100).toFixed(1) : 0,
  bookingRate: d.ownersSpoken > 0 ? +((d.apptsBooked / d.ownersSpoken) * 100).toFixed(1) : 0,
  showRate:    d.apptsCompleted + d.apptsNoShow > 0 ? +((d.apptsCompleted / (d.apptsCompleted + d.apptsNoShow)) * 100).toFixed(1) : 0,
  closeRate:   d.dealsClosed + d.dealsLost > 0 ? +((d.dealsClosed / (d.dealsClosed + d.dealsLost)) * 100).toFixed(1) : 0,
});

// ─── FIREBASE HOOK ──────────────────────────────────────────────────────────────
function useAllData() {
  const [allData,  setAllData]  = useState({});
  const [allGoals, setAllGoals] = useState({});
  const [readyCount, setReadyCount] = useState(0);
  const loadedRef = useRef(new Set());

  useEffect(() => {
    const unsubs = USERS.map((u) =>
      onSnapshot(doc(db, "users", u.id), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setAllData((prev)  => ({ ...prev, [u.id]: data.entries || {} }));
          setAllGoals((prev) => ({ ...prev, [u.id]: data.goals   || DEFAULT_GOALS }));
        } else {
          setAllData((prev)  => ({ ...prev, [u.id]: {} }));
          setAllGoals((prev) => ({ ...prev, [u.id]: DEFAULT_GOALS }));
        }
        if (!loadedRef.current.has(u.id)) {
          loadedRef.current.add(u.id);
          setReadyCount((n) => n + 1);
        }
      })
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  const saveEntry = useCallback(async (userId, date, entry) => {
    const ref  = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { [`entries.${date}`]: entry });
    } else {
      await setDoc(ref, { entries: { [date]: entry }, goals: DEFAULT_GOALS });
    }
  }, []);

  const saveGoals = useCallback(async (userId, goals) => {
    const ref  = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { goals });
    } else {
      await setDoc(ref, { entries: {}, goals });
    }
  }, []);

  return { allData, allGoals, saveEntry, saveGoals, ready: readyCount >= USERS.length };
}

// ─── STAT CARD ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent = "#F5A623", sub }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:"#111215", border:`1px solid ${hov?accent+"44":"#1E2025"}`, borderRadius:10, padding:"20px 22px", display:"flex", flexDirection:"column", gap:6, transition:"border-color 0.2s,transform 0.2s", transform:hov?"translateY(-2px)":"none", cursor:"default" }}>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.18em", color:"#444", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color:accent, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#383838" }}>{sub}</div>}
    </div>
  );
}

// ─── RATE CARD ──────────────────────────────────────────────────────────────────
function RateCard({ label, value, sub }) {
  const pct = Math.min(parseFloat(value) || 0, 100);
  const c = pct >= 60 ? "#39D353" : pct >= 30 ? "#F5A623" : pct > 0 ? "#FF6B35" : "#333";
  return (
    <div style={{ background:"#111215", border:"1px solid #1E2025", borderRadius:10, padding:"20px 22px", display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.18em", color:"#444", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, color:c, lineHeight:1 }}>{value}%</div>
      <div style={{ height:3, background:"#1A1D24", borderRadius:2 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:c, borderRadius:2, transition:"width 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      {sub && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#383838" }}>{sub}</div>}
    </div>
  );
}

// ─── WEEKLY CHART ───────────────────────────────────────────────────────────────
function WeeklyChart({ allData, user }) {
  const userEntries = allData[user.id] || {};
  const chartData = getLast7Days().map((d) => {
    const e = userEntries[d] || EMPTY_METRICS;
    return { key:d, label:new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"}).toUpperCase(), dateLabel:new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}), calls:e.calls, appts:e.apptsBooked, closed:e.dealsClosed, isToday:d===todayKey() };
  });
  const maxCalls = Math.max(...chartData.map((d) => d.calls), 10);
  const BAR_W=44, GAP=18, PAD_L=44, PAD_T=20, CH=160;
  const totalW = PAD_L + chartData.length*(BAR_W+GAP)+20;
  return (
    <div style={{ background:"#111215", border:"1px solid #1E2025", borderRadius:10, padding:"24px 28px" }}>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444", letterSpacing:"0.2em", marginBottom:20 }}>CALLS / APPTS / DEALS — LAST 7 DAYS</div>
      <div style={{ overflowX:"auto" }}>
        <svg width={totalW} height={CH+72} style={{ display:"block" }}>
          {[0.25,0.5,0.75,1].map((pct) => { const y=PAD_T+CH-pct*CH; return (<g key={pct}><line x1={PAD_L} x2={totalW-10} y1={y} y2={y} stroke="#1E2025" strokeWidth={1}/><text x={PAD_L-6} y={y+4} textAnchor="end" fontSize={8} fill="#333" fontFamily="IBM Plex Mono,monospace">{Math.round(pct*maxCalls)}</text></g>); })}
          {chartData.map((d,i) => { const x=PAD_L+i*(BAR_W+GAP); const callH=(d.calls/maxCalls)*CH; const apptH=(d.appts/maxCalls)*CH; const closeH=(d.closed/maxCalls)*CH; return (<g key={d.key}><rect x={x} y={PAD_T+CH-callH} width={BAR_W} height={callH||2} fill={d.isToday?user.color:user.color+"33"} rx={3}/>{d.calls>0&&<text x={x+BAR_W/2} y={PAD_T+CH-callH-5} textAnchor="middle" fontSize={10} fill={user.color} fontFamily="Bebas Neue,sans-serif">{d.calls}</text>}{d.appts>0&&<circle cx={x+BAR_W/2} cy={PAD_T+CH-apptH} r={5} fill="#4ECDC4"/>}{d.closed>0&&<circle cx={x+BAR_W/2} cy={PAD_T+CH-closeH-12} r={6} fill="#39D353" opacity={0.9}/>}<text x={x+BAR_W/2} y={PAD_T+CH+18} textAnchor="middle" fontSize={9} fill={d.isToday?"#FAFAF7":"#555"} fontFamily="IBM Plex Mono,monospace">{d.label}</text><text x={x+BAR_W/2} y={PAD_T+CH+32} textAnchor="middle" fontSize={8} fill="#2A2A2A" fontFamily="IBM Plex Mono,monospace">{d.dateLabel}</text></g>); })}
        </svg>
      </div>
      <div style={{ display:"flex", gap:20, marginTop:4 }}>
        {[{color:user.color,label:"Calls Made"},{color:"#4ECDC4",label:"Appts Booked"},{color:"#39D353",label:"Deals Closed"}].map(({color,label})=>(<div key={label} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:color}}/><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#444",letterSpacing:"0.1em"}}>{label}</span></div>))}
      </div>
    </div>
  );
}

// ─── GOAL PROGRESS ──────────────────────────────────────────────────────────────
function GoalProgress({ label, current, goal, color }) {
  const pct = goal > 0 ? Math.min((current/goal)*100,100) : 0;
  const done = current >= goal && goal > 0;
  return (
    <div style={{ background:"#111215", border:`1px solid ${done?color+"44":"#1E2025"}`, borderRadius:10, padding:"18px 22px", display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444", letterSpacing:"0.15em", textTransform:"uppercase" }}>{label}</div>
        {done && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#39D353", letterSpacing:"0.15em" }}>✓ HIT</div>}
      </div>
      <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, color:done?"#39D353":color, lineHeight:1 }}>{current}</div>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#444" }}>/ {goal}</div>
      </div>
      <div style={{ height:3, background:"#1A1D24", borderRadius:2 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:done?"#39D353":color, borderRadius:2, transition:"width 0.8s cubic-bezier(.4,0,.2,1)" }}/>
      </div>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#383838" }}>{pct.toFixed(0)}% of daily target</div>
    </div>
  );
}

// ─── GOAL SETTINGS MODAL ────────────────────────────────────────────────────────
function GoalSettingsModal({ goals, userColor, onSave, onClose }) {
  const [form, setForm] = useState({...goals});
  return (
    <div onClick={(e)=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(6px)" }}>
      <div style={{ background:"#0F1013", border:"1px solid #2A2D35", borderRadius:14, width:420, padding:36, display:"flex", flexDirection:"column", gap:24 }}>
        <div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:userColor, letterSpacing:"0.2em", marginBottom:4 }}>EDIT</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#FAFAF7", letterSpacing:"0.06em" }}>DAILY GOALS</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {[{key:"calls",label:"Daily Calls Target"},{key:"ownersSpoken",label:"Owners Spoken Target"},{key:"apptsBooked",label:"Appointments Target"},{key:"dealsClosed",label:"Deals Closed Target"}].map(({key,label})=>(
            <div key={key}>
              <label style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#555", letterSpacing:"0.12em", display:"block", marginBottom:6 }}>{label}</label>
              <input type="number" min={1} value={form[key]} onChange={(e)=>setForm((f)=>({...f,[key]:Math.max(1,parseInt(e.target.value)||1)}))} onFocus={(e)=>(e.target.style.borderColor=userColor)} onBlur={(e)=>(e.target.style.borderColor="#2A2D35")} style={{ background:"#1A1D24", border:"1px solid #2A2D35", borderRadius:8, padding:"10px 14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#FAFAF7", outline:"none", width:"100%", transition:"border-color 0.15s" }}/>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>onSave(form)} style={{ flex:1, background:userColor, color:"#0C0C0E", border:"none", borderRadius:8, padding:"14px 0", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"0.1em", cursor:"pointer" }}>SAVE GOALS</button>
          <button onClick={onClose} style={{ background:"transparent", color:"#555", border:"1px solid #2A2D35", borderRadius:8, padding:"14px 20px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, cursor:"pointer" }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ─── ENTRY MODAL (supports editing any date) ────────────────────────────────────
function EntryModal({ user, date, initial, onSave, onClose }) {
  const [form, setForm] = useState({...initial});
  const set = (k,v) => setForm((f)=>({...f,[k]:Math.max(0,parseInt(v)||0)}));
  const isToday = date === todayKey();
  const dateLabel = new Date(date+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});

  const groups = [
    { label:"ACTIVITY", fields:[{key:"calls",label:"Calls Made",icon:"📞"},{key:"ownersSpoken",label:"Owners Spoken To",icon:"🤝"},{key:"leadsInPipeline",label:"Leads in Pipeline",icon:"🔥"}]},
    { label:"APPOINTMENTS", fields:[{key:"apptsBooked",label:"Booked",icon:"📅"},{key:"apptsCompleted",label:"Completed",icon:"✅"},{key:"apptsNoShow",label:"No-Shows",icon:"🚫"}]},
    { label:"DEALS", fields:[{key:"dealsClosed",label:"Closed",icon:"💰"},{key:"dealsLost",label:"Lost",icon:"📉"}]},
  ];

  return (
    <div onClick={(e)=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(6px)" }}>
      <div style={{ background:"#0F1013", border:"1px solid #2A2D35", borderRadius:14, width:520, maxHeight:"92vh", overflowY:"auto", padding:36, display:"flex", flexDirection:"column", gap:28 }}>
        <div style={{ borderBottom:"1px solid #1E2025", paddingBottom:20 }}>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.2em", color:user.color, marginBottom:4 }}>
            {isToday ? "LOGGING ENTRY FOR" : "EDITING PAST ENTRY"}
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#FAFAF7", letterSpacing:"0.06em" }}>
            {user.name} — {dateLabel}
          </div>
        </div>
        {groups.map((g)=>(
          <div key={g.label}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444", letterSpacing:"0.2em", marginBottom:12 }}>{g.label}</div>
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${g.fields.length},1fr)`, gap:12 }}>
              {g.fields.map(({key,label,icon})=>(
                <div key={key}>
                  <label style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#555", letterSpacing:"0.12em", display:"block", marginBottom:6 }}>{icon} {label}</label>
                  <input type="number" min={0} value={form[key]} onChange={(e)=>set(key,e.target.value)} onFocus={(e)=>(e.target.style.borderColor=user.color)} onBlur={(e)=>(e.target.style.borderColor="#2A2D35")} style={{ background:"#1A1D24", border:"1px solid #2A2D35", borderRadius:8, padding:"12px 14px", fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#FAFAF7", outline:"none", width:"100%", transition:"border-color 0.15s" }}/>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>onSave(form)} style={{ flex:1, background:user.color, color:"#0C0C0E", border:"none", borderRadius:8, padding:"14px 0", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"0.1em", cursor:"pointer" }}>SAVE ENTRY</button>
          <button onClick={onClose} style={{ background:"transparent", color:"#555", border:"1px solid #2A2D35", borderRadius:8, padding:"14px 20px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, cursor:"pointer" }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY LOG (with edit) ────────────────────────────────────────────────────
function HistoryLog({ userData, userColor, onEdit }) {
  const entries = Object.entries(userData).sort(([a],[b])=>b.localeCompare(a)).slice(0,60);
  const cols = [{key:"calls",label:"CALLS"},{key:"ownersSpoken",label:"OWNERS"},{key:"apptsBooked",label:"BOOKED"},{key:"apptsCompleted",label:"COMPLETED"},{key:"apptsNoShow",label:"NO-SHOW"},{key:"dealsClosed",label:"CLOSED"},{key:"dealsLost",label:"LOST"},{key:"leadsInPipeline",label:"PIPELINE"}];

  if (!entries.length) return (
    <div style={{ background:"#111215", border:"1px solid #1E2025", borderRadius:10, padding:48, textAlign:"center" }}>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#2A2A2A", letterSpacing:"0.2em" }}>NO ENTRIES YET — LOG YOUR FIRST DAY</div>
    </div>
  );

  const gridCols = `180px repeat(${cols.length},1fr) 40px`;

  return (
    <div style={{ background:"#111215", border:"1px solid #1E2025", borderRadius:10, overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:0, borderBottom:"1px solid #1E2025", padding:"10px 20px" }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#333", letterSpacing:"0.15em" }}>DATE</div>
        {cols.map((c)=>(<div key={c.key} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#333", letterSpacing:"0.15em" }}>{c.label}</div>))}
        <div/>
      </div>
      {entries.map(([date,entry],i)=>{
        const isToday = date===todayKey();
        const label = new Date(date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
        return (
          <div key={date} style={{ display:"grid", gridTemplateColumns:gridCols, gap:0, padding:"12px 20px", background:isToday?"#13110A":i%2===0?"#111215":"#0F1013", borderBottom:i<entries.length-1?"1px solid #1A1D22":"none", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:isToday?userColor:"#FAFAF7" }}>{label}</div>
              {isToday&&<div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:userColor, letterSpacing:"0.15em", background:userColor+"18", padding:"2px 6px", borderRadius:3 }}>TODAY</div>}
            </div>
            {cols.map((c)=>(
              <div key={c.key} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, lineHeight:1, color:c.key==="dealsClosed"&&entry[c.key]>0?"#39D353":c.key==="dealsLost"&&entry[c.key]>0?"#FF4444":c.key==="apptsNoShow"&&entry[c.key]>0?"#FF6B35":"#FAFAF7" }}>{entry[c.key]||0}</div>
            ))}
            <button onClick={()=>onEdit(date,entry)} style={{ background:"transparent", border:"1px solid #2A2D35", borderRadius:6, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#444", fontSize:12 }}>✏</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── LEADERBOARD ────────────────────────────────────────────────────────────────
function Leaderboard({ allData, view }) {
  const rows = USERS.map((u)=>{
    const map = allData[u.id]||{};
    let entries = [];
    if (view==="today") entries=map[todayKey()]?[map[todayKey()]]:[];
    else if (view==="week") entries=Object.entries(map).filter(([d])=>new Date(d)>=getWeekStart()).map(([,v])=>v);
    else entries=Object.values(map);
    const totals=sumEntries(entries);
    return {user:u,totals,rates:calcRates(totals)};
  }).sort((a,b)=>b.totals.dealsClosed-a.totals.dealsClosed||b.totals.calls-a.totals.calls);

  const cols=[{label:"CALLS",key:"calls",color:null},{label:"OWNERS",key:"ownersSpoken",color:null},{label:"APPTS",key:"apptsBooked",color:null},{label:"CLOSED",key:"dealsClosed",color:"#39D353"},{label:"LOST",key:"dealsLost",color:"#FF4444"}];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"grid", gridTemplateColumns:"32px 160px 1fr 1fr 1fr 1fr 1fr 110px", gap:12, padding:"6px 20px" }}>
        <div/><div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#333", letterSpacing:"0.15em" }}>REP</div>
        {cols.map((c)=>(<div key={c.key} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#333", letterSpacing:"0.15em" }}>{c.label}</div>))}
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#333", letterSpacing:"0.15em" }}>CLOSE %</div>
      </div>
      {rows.map((row,i)=>(
        <div key={row.user.id} style={{ display:"grid", gridTemplateColumns:"32px 160px 1fr 1fr 1fr 1fr 1fr 110px", alignItems:"center", gap:12, background:i===0?"#13110A":"#111215", border:`1px solid ${i===0?"#F5A62322":"#1E2025"}`, borderRadius:10, padding:"16px 20px" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:i===0?"#F5A623":"#222", lineHeight:1 }}>{i+1}</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:row.user.color+"18", border:`2px solid ${row.user.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:row.user.color, fontWeight:600, flexShrink:0 }}>{row.user.initials}</div>
            <span style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:13, color:"#FAFAF7", letterSpacing:"0.06em" }}>{row.user.name.toUpperCase()}</span>
          </div>
          {cols.map((c)=>(<div key={c.key} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:c.color||"#FAFAF7", lineHeight:1 }}>{row.totals[c.key]}</div>))}
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, lineHeight:1, color:row.rates.closeRate>=30?"#39D353":row.rates.closeRate>0?"#F5A623":"#333" }}>{row.rates.closeRate}%</div>
        </div>
      ))}
    </div>
  );
}

// ─── CALCULATOR ─────────────────────────────────────────────────────────────────
function Calculator({ onClose }) {
  const [display, setDisplay] = useState("0");
  const [prev,    setPrev]    = useState(null);
  const [op,      setOp]      = useState(null);
  const [fresh,   setFresh]   = useState(true);

  const press = (val) => {
    if (val === "C") { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); return; }
    if (val === "±") { setDisplay((d) => String(-parseFloat(d))); return; }
    if (val === "%") { setDisplay((d) => String(parseFloat(d)/100)); return; }
    if (val === "=") {
      if (op && prev !== null) {
        const a = parseFloat(prev), b = parseFloat(display);
        let r;
        if (op==="+") r=a+b; else if (op==="-") r=a-b; else if (op==="×") r=a*b; else if (op==="÷") r=b!==0?a/b:"ERR";
        setDisplay(String(+r.toFixed(10)));
        setPrev(null); setOp(null); setFresh(true);
      }
      return;
    }
    if (["+","-","×","÷"].includes(val)) { setPrev(display); setOp(val); setFresh(true); return; }
    if (val === ".") {
      if (fresh) { setDisplay("0."); setFresh(false); }
      else if (!display.includes(".")) setDisplay((d)=>d+".");
      return;
    }
    if (fresh) { setDisplay(val); setFresh(false); }
    else setDisplay((d) => d==="0" ? val : d.length<12 ? d+val : d);
  };

  const rows = [["C","±","%","÷"],["7","8","9","×"],["4","5","6","-"],["1","2","3","+"]];

  return (
    <div style={{ position:"fixed", bottom:100, left:28, zIndex:200, background:"#111215", border:"1px solid #2A2D35", borderRadius:14, padding:20, width:248, boxShadow:"0 20px 60px rgba(0,0,0,0.7)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444", letterSpacing:"0.2em" }}>CALCULATOR</div>
        <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#555", cursor:"pointer", fontSize:16, lineHeight:1 }}>✕</button>
      </div>
      <div style={{ background:"#0C0C0E", borderRadius:8, padding:"12px 16px", marginBottom:12, textAlign:"right" }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#333", marginBottom:2, minHeight:14 }}>{op?`${prev} ${op}`:""}</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#FAFAF7", lineHeight:1, wordBreak:"break-all" }}>{display.length>10?parseFloat(display).toPrecision(6):display}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {rows.flat().map((btn)=>{
          const isOp=["+","-","×","÷"].includes(btn);
          const isC=btn==="C";
          return (
            <button key={btn} onClick={()=>press(btn)} style={{ background:isC?"#2B0D0D":isOp?"#2A2D35":"#1A1D24", color:isC?"#FF4444":"#FAFAF7", border:"none", borderRadius:8, padding:"13px 0", fontFamily:isOp?"'Bebas Neue',sans-serif":"'IBM Plex Mono',monospace", fontSize:14, cursor:"pointer", transition:"background 0.1s" }}
              onMouseEnter={(e)=>(e.currentTarget.style.background=isC?"#3B1010":isOp?"#333":"#222")}
              onMouseLeave={(e)=>(e.currentTarget.style.background=isC?"#2B0D0D":isOp?"#2A2D35":"#1A1D24")}
            >{btn}</button>
          );
        })}
        <button onClick={()=>press("0")} style={{ gridColumn:"span 2", background:"#1A1D24", color:"#FAFAF7", border:"none", borderRadius:8, padding:"13px 0", fontFamily:"'IBM Plex Mono',monospace", fontSize:14, cursor:"pointer" }}
          onMouseEnter={(e)=>(e.currentTarget.style.background="#222")} onMouseLeave={(e)=>(e.currentTarget.style.background="#1A1D24")}>0</button>
        <button onClick={()=>press(".")} style={{ background:"#1A1D24", color:"#FAFAF7", border:"none", borderRadius:8, padding:"13px 0", fontFamily:"'IBM Plex Mono',monospace", fontSize:14, cursor:"pointer" }}
          onMouseEnter={(e)=>(e.currentTarget.style.background="#222")} onMouseLeave={(e)=>(e.currentTarget.style.background="#1A1D24")}>.</button>
        <button onClick={()=>press("=")} style={{ background:"#F5A623", color:"#0C0C0E", border:"none", borderRadius:8, padding:"13px 0", fontFamily:"'Bebas Neue',sans-serif", fontSize:16, cursor:"pointer" }}
          onMouseEnter={(e)=>(e.currentTarget.style.background="#FFB84D")} onMouseLeave={(e)=>(e.currentTarget.style.background="#F5A623")}>=</button>
      </div>
    </div>
  );
}

// ─── LIVE CALLER ────────────────────────────────────────────────────────────────
function LiveCaller({ user, allData, allGoals, saveEntry }) {
  const [phase,       setPhase]       = useState("pre");
  const [sessionGoal, setSessionGoal] = useState("");
  const [countdown,   setCountdown]   = useState(3);
  const [calls,       setCalls]       = useState(0);
  const [owners,      setOwners]      = useState(0);
  const [saving,      setSaving]      = useState(false);
  const breakTimerRef = useRef(null);
  const verseIndex    = useMemo(() => Math.floor(Math.random() * VERSES.length), []);
  const verse         = VERSES[verseIndex];
  const userGoals     = allGoals[user.id] || DEFAULT_GOALS;
  const goal          = parseInt(sessionGoal) || userGoals.calls;
  const pct           = goal > 0 ? Math.min((calls/goal)*100, 100) : 0;
  const noOwners      = calls - owners;

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) { setTimeout(()=>setPhase("live"),700); return; }
    const t = setTimeout(()=>setCountdown((c)=>c-1), 1000);
    return ()=>clearTimeout(t);
  }, [phase, countdown]);

  // 30-min break timer
  useEffect(() => {
    if (phase !== "live") return;
    breakTimerRef.current = setInterval(()=>setPhase("break"), 30*60*1000);
    return ()=>clearInterval(breakTimerRef.current);
  }, [phase]);

  const handleCall = (isOwner) => {
    const newCalls = calls + 1;
    setCalls(newCalls);
    if (isOwner) setOwners((o)=>o+1);
    if (newCalls > 0 && newCalls % 30 === 0) {
      clearInterval(breakTimerRef.current);
      setPhase("break");
    }
  };

  const endSession = async () => {
    setSaving(true);
    const existing = allData[user.id]?.[todayKey()] || EMPTY_METRICS;
    const updated = { ...existing, calls:(existing.calls||0)+calls, ownersSpoken:(existing.ownersSpoken||0)+owners };
    await saveEntry(user.id, todayKey(), updated);
    setSaving(false);
    setPhase("done");
  };

  const resetSession = () => { setCalls(0); setOwners(0); setPhase("pre"); setSessionGoal(""); setCountdown(3); };

  // ── PRE ──
  if (phase === "pre") return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:32, paddingTop:40 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#444", letterSpacing:"0.2em", marginBottom:8 }}>READY TO DIAL?</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:56, color:"#FAFAF7", letterSpacing:"0.04em", lineHeight:1 }}>SET YOUR GOAL</div>
      </div>
      <div style={{ background:"#111215", border:`1px solid ${user.color}22`, borderRadius:12, padding:"20px 32px", maxWidth:520, width:"100%", textAlign:"center" }}>
        <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:14, color:"#AAAAAA", lineHeight:1.7, fontStyle:"italic", marginBottom:8 }}>"{verse.text}"</div>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:user.color, letterSpacing:"0.15em" }}>{verse.ref}</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444", letterSpacing:"0.2em" }}>HOW MANY CALLS TODAY?</div>
        <input type="number" value={sessionGoal} placeholder={String(userGoals.calls)} onChange={(e)=>setSessionGoal(e.target.value)}
          style={{ background:"#111215", border:`2px solid ${user.color}44`, borderRadius:12, padding:"14px 0", fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color:user.color, outline:"none", width:200, textAlign:"center", transition:"border-color 0.15s" }}
          onFocus={(e)=>(e.target.style.borderColor=user.color)} onBlur={(e)=>(e.target.style.borderColor=user.color+"44")}/>
        <button onClick={()=>{setCountdown(3);setPhase("countdown");}}
          style={{ background:user.color, color:"#0C0C0E", border:"none", borderRadius:14, padding:"18px 56px", fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:"0.1em", cursor:"pointer", boxShadow:`0 8px 32px ${user.color}44` }}>
          LET'S DIAL →
        </button>
      </div>
    </div>
  );

  // ── COUNTDOWN ──
  if (phase === "countdown") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"55vh" }}>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.4)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:countdown===0?120:200, color:user.color, lineHeight:1, animation:"popIn 0.6s cubic-bezier(.2,1.4,.4,1)", key:countdown }}>
        {countdown === 0 ? "DIAL." : countdown}
      </div>
    </div>
  );

  // ── BREAK ──
  if (phase === "break") return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"55vh", gap:24, textAlign:"center" }}>
      <div style={{ fontSize:56 }}>🧘</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color:"#FAFAF7", letterSpacing:"0.04em" }}>TAKE A BREAK</div>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#555", letterSpacing:"0.15em" }}>{calls} CALLS DONE — REST YOUR MIND FOR 30 MINUTES</div>
      <div style={{ background:"#111215", border:"1px solid #1E2025", borderRadius:12, padding:"20px 32px", maxWidth:460 }}>
        <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:13, color:"#AAAAAA", lineHeight:1.7, fontStyle:"italic" }}>"{verse.text}"</div>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:user.color, letterSpacing:"0.15em", marginTop:8 }}>{verse.ref}</div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <button onClick={()=>setPhase("live")} style={{ background:user.color, color:"#0C0C0E", border:"none", borderRadius:12, padding:"14px 36px", fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"0.1em", cursor:"pointer" }}>BACK TO DIALING</button>
        <button onClick={endSession} style={{ background:"transparent", color:"#555", border:"1px solid #2A2D35", borderRadius:12, padding:"14px 24px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, cursor:"pointer" }}>END SESSION</button>
      </div>
    </div>
  );

  // ── DONE ──
  if (phase === "done") {
    const ownerRate = calls>0 ? +((owners/calls)*100).toFixed(1) : 0;
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:28, paddingTop:40, textAlign:"center" }}>
        <div style={{ fontSize:52 }}>🔥</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color:"#FAFAF7", letterSpacing:"0.04em" }}>SESSION SAVED</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[{label:"CALLS MADE",val:calls,color:user.color},{label:"OWNERS REACHED",val:owners,color:"#39D353"},{label:"OWNER RATE",val:ownerRate+"%",color:ownerRate>=20?"#39D353":"#F5A623"}].map((item)=>(
            <div key={item.label} style={{ background:"#111215", border:"1px solid #1E2025", borderRadius:10, padding:"20px 28px" }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444", letterSpacing:"0.15em" }}>{item.label}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:item.color, lineHeight:1 }}>{item.val}</div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#383838", letterSpacing:"0.15em" }}>CALLS + OWNERS ADDED TO TODAY'S LOG</div>
        <button onClick={resetSession} style={{ background:user.color, color:"#0C0C0E", border:"none", borderRadius:12, padding:"14px 36px", fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"0.1em", cursor:"pointer" }}>START NEW SESSION</button>
      </div>
    );
  }

  // ── LIVE ──
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, paddingTop:8, maxWidth:620, margin:"0 auto", width:"100%" }}>
      {/* Verse */}
      <div style={{ background:"#111215", border:`1px solid ${user.color}22`, borderRadius:10, padding:"12px 24px", width:"100%", textAlign:"center" }}>
        <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:"#777", lineHeight:1.5, fontStyle:"italic" }}>
          "{verse.text}" <span style={{ color:user.color, fontStyle:"normal" }}>— {verse.ref}</span>
        </div>
      </div>

      {/* Progress */}
      <div style={{ width:"100%" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444", letterSpacing:"0.15em" }}>PROGRESS TOWARD GOAL</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:pct>=100?"#39D353":user.color }}>{calls} / {goal} &nbsp;{pct.toFixed(0)}%</div>
        </div>
        <div style={{ height:10, background:"#1A1D24", borderRadius:5 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:pct>=100?"#39D353":user.color, borderRadius:5, transition:"width 0.3s ease", boxShadow:pct>=100?"0 0 12px #39D35388":undefined }}/>
        </div>
        {pct < 100 && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#383838", marginTop:5 }}>{Math.max(0,goal-calls)} calls to goal</div>}
        {pct >= 100 && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#39D353", marginTop:5 }}>🎯 GOAL HIT — KEEP GOING!</div>}
      </div>

      {/* Call counter */}
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444", letterSpacing:"0.2em", marginBottom:2 }}>CALLS THIS SESSION</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:110, color:"#FAFAF7", lineHeight:1 }}>{calls}</div>
      </div>

      {/* Big buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, width:"100%" }}>
        <button onClick={()=>handleCall(true)}
          onMouseDown={(e)=>(e.currentTarget.style.transform="scale(0.96)")}
          onMouseUp={(e)=>(e.currentTarget.style.transform="scale(1)")}
          onMouseLeave={(e)=>(e.currentTarget.style.transform="scale(1)")}
          style={{ background:"#0A2016", border:"2px solid #39D353", borderRadius:16, padding:"28px 0", fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#39D353", letterSpacing:"0.06em", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, transition:"transform 0.1s, box-shadow 0.1s", boxShadow:"0 4px 20px #39D35322" }}>
          <span>✓ OWNER</span>
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:32, fontWeight:600 }}>{owners}</span>
        </button>
        <button onClick={()=>handleCall(false)}
          onMouseDown={(e)=>(e.currentTarget.style.transform="scale(0.96)")}
          onMouseUp={(e)=>(e.currentTarget.style.transform="scale(1)")}
          onMouseLeave={(e)=>(e.currentTarget.style.transform="scale(1)")}
          style={{ background:"#200A0A", border:"2px solid #FF4444", borderRadius:16, padding:"28px 0", fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#FF4444", letterSpacing:"0.06em", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, transition:"transform 0.1s, box-shadow 0.1s", boxShadow:"0 4px 20px #FF444422" }}>
          <span>✕ NO OWNER</span>
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:32, fontWeight:600 }}>{noOwners}</span>
        </button>
      </div>

      {/* Live owner rate */}
      <div style={{ display:"flex", gap:32, alignItems:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#444", letterSpacing:"0.15em" }}>OWNER RATE</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:calls>0&&owners/calls>=0.2?"#39D353":"#F5A623", lineHeight:1 }}>
            {calls>0?+((owners/calls)*100).toFixed(1):0}%
          </div>
        </div>
      </div>

      {/* End session */}
      <button onClick={endSession} disabled={saving}
        style={{ background:"transparent", color:saving?"#333":"#555", border:"1px solid #2A2D35", borderRadius:8, padding:"10px 28px", fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.12em", cursor:saving?"default":"pointer", marginTop:4 }}>
        {saving ? "SAVING..." : "END SESSION & SAVE"}
      </button>
    </div>
  );
}

// ─── LOGIN SCREEN ───────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, allData }) {
  const getStreak = (uid) => {
    const map = allData[uid]||{};
    let streak=0, d=new Date();
    while(true) { const k=d.toISOString().split("T")[0]; if(map[k]&&map[k].calls>0){streak++;d.setDate(d.getDate()-1);}else break; }
    return streak;
  };
  return (
    <div style={{ minHeight:"100vh", background:"#0C0C0E", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
      <div style={{ textAlign:"center", marginBottom:60 }}>
        <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:72, height:72, background:"linear-gradient(135deg,#F5A623,#FF6B35)", borderRadius:20, marginBottom:24 }}>
          <span style={{ fontFamily:"'Bebas Neue'", fontSize:32, color:"#0C0C0E" }}>BA</span>
        </div>
        <div style={{ fontFamily:"'Bebas Neue'", fontSize:48, color:"#FAFAF7", letterSpacing:"0.1em", lineHeight:1 }}>BORN AGAIN</div>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#333", letterSpacing:"0.25em", marginTop:8 }}>SALES INTELLIGENCE PLATFORM</div>
      </div>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:"0.2em", color:"#333", marginBottom:24 }}>SELECT YOUR PROFILE</div>
      <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"center" }}>
        {USERS.map((u)=>{
          const streak=getStreak(u.id);
          const td=allData[u.id]?.[todayKey()]||EMPTY_METRICS;
          return (
            <button key={u.id} onClick={()=>onLogin(u)}
              style={{ background:"#111215", border:"1px solid #1E2025", borderRadius:18, padding:"32px 36px", width:210, display:"flex", flexDirection:"column", alignItems:"center", gap:14, cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={(e)=>{e.currentTarget.style.borderColor=u.color;e.currentTarget.style.transform="translateY(-6px)";e.currentTarget.style.boxShadow=`0 16px 48px ${u.color}20`;}}
              onMouseLeave={(e)=>{e.currentTarget.style.borderColor="#1E2025";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ width:68, height:68, borderRadius:"50%", background:u.color+"15", border:`2px solid ${u.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue'", fontSize:24, color:u.color }}>{u.initials}</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:18, color:"#FAFAF7", letterSpacing:"0.1em" }}>{u.name.toUpperCase()}</div>
              <div style={{ display:"flex", gap:16 }}>
                {[{val:td.calls,label:"CALLS TODAY",color:u.color},{val:streak,label:"STREAK",color:streak>0?"#39D353":"#2A2A2A"},{val:td.dealsClosed,label:"CLOSED",color:td.dealsClosed>0?"#39D353":"#2A2A2A"}].map((item,idx)=>(
                  <div key={idx} style={{ display:"flex", alignItems:"center", gap:idx>0?16:0 }}>
                    {idx>0&&<div style={{ width:1, height:28, background:"#1E2025" }}/>}
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:"'Bebas Neue'", fontSize:24, color:item.color, lineHeight:1 }}>{item.val}</div>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:"#333", letterSpacing:"0.12em", marginTop:2 }}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop:56, fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#1E2025" }}>
        {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).toUpperCase()}
      </div>
    </div>
  );
}

// ─── APP ROOT ───────────────────────────────────────────────────────────────────
export default function App() {
  const { allData, allGoals, saveEntry, saveGoals, ready } = useAllData();
  const [user,         setUser]         = useState(null);
  const [view,         setView]         = useState("today");
  const [tab,          setTab]          = useState("dashboard");
  const [modalDate,    setModalDate]    = useState(null);
  const [modalInitial, setModalInitial] = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showCalc,     setShowCalc]     = useState(false);

  const getDisplay = useCallback((uid,v)=>{
    const map=allData[uid]||{};
    if(v==="today")   return sumEntries(map[todayKey()]?[map[todayKey()]]:[]);
    if(v==="week")    return sumEntries(Object.entries(map).filter(([d])=>new Date(d)>=getWeekStart()).map(([,val])=>val));
    return sumEntries(Object.values(map));
  },[allData]);

  const displayData = user ? getDisplay(user.id,view) : EMPTY_METRICS;
  const rates       = calcRates(displayData);
  const userGoals   = user ? (allGoals[user.id]||DEFAULT_GOALS) : DEFAULT_GOALS;
  const todayData   = user ? (allData[user.id]?.[todayKey()]||EMPTY_METRICS) : EMPTY_METRICS;

  const openModal = (date, initial) => { setModalDate(date); setModalInitial(initial); setShowModal(true); };

  const handleSaveEntry = async (form) => {
    await saveEntry(user.id, modalDate, form);
    setShowModal(false);
  };

  const SL = ({txt}) => (
    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#383838", letterSpacing:"0.22em", marginBottom:12 }}>── {txt}</div>
  );

  if (!ready) return (
    <div style={{ height:"100vh", background:"#0C0C0E", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", color:"#F5A623", fontSize:11, letterSpacing:"0.2em" }}>LOADING...</div>
  );

  if (!user) return <LoginScreen onLogin={setUser} allData={allData}/>;

  const viewLabel = view==="today"?"TODAY":view==="week"?"THIS WEEK":"ALL TIME";
  const tabs = [["dashboard","DASHBOARD"],["dialer","LIVE DIALER"],["charts","CHARTS"],["goals","GOALS"],["history","HISTORY"],["team","TEAM"]];

  return (
    <div style={{ minHeight:"100vh", background:"#0C0C0E", color:"#FAFAF7", paddingBottom:100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#2A2D35;border-radius:2px;}
        input[type=number]{appearance:textfield;-moz-appearance:textfield;}
        input[type=number]::-webkit-inner-spin-button{opacity:0;}
        button:focus{outline:none;}
      `}</style>

      {/* HEADER */}
      <header style={{ background:"#0C0C0E", borderBottom:"1px solid #1A1D22", padding:"0 32px", height:58, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, background:"linear-gradient(135deg,#F5A623,#FF6B35)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue'", fontSize:15, color:"#0C0C0E" }}>BA</div>
          <span style={{ fontFamily:"'Bebas Neue'", fontSize:19, letterSpacing:"0.12em", color:"#FAFAF7" }}>BORN AGAIN</span>
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#2A2A2A", letterSpacing:"0.15em", marginLeft:4 }}>SALES INTEL</span>
        </div>
        <div style={{ display:"flex", background:"#111215", border:"1px solid #1E2025", borderRadius:8, padding:3, gap:2 }}>
          {[["today","TODAY"],["week","THIS WEEK"],["alltime","ALL TIME"]].map(([v,lbl])=>(
            <button key={v} onClick={()=>setView(v)} style={{ background:view===v?"#1E2025":"transparent", color:view===v?"#FAFAF7":"#444", border:"none", borderRadius:6, padding:"6px 16px", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.12em", cursor:"pointer", transition:"all 0.15s" }}>{lbl}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:user.color+"20", border:`1.5px solid ${user.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:user.color, fontWeight:600 }}>{user.initials}</div>
            <span style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:13, letterSpacing:"0.06em" }}>{user.name.toUpperCase()}</span>
          </div>
          <button onClick={()=>{setUser(null);setView("today");setTab("dashboard");}} style={{ background:"transparent", color:"#444", border:"1px solid #1E2025", borderRadius:6, padding:"5px 12px", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.1em", cursor:"pointer" }}>SWITCH</button>
        </div>
      </header>

      {/* SUB NAV */}
      <nav style={{ borderBottom:"1px solid #1A1D22", padding:"0 32px", display:"flex", gap:0 }}>
        {tabs.map(([t,lbl])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ background:"transparent", border:"none", borderBottom:`2px solid ${tab===t?user.color:"transparent"}`, color:tab===t?"#FAFAF7":"#444", padding:"13px 18px", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.15em", cursor:"pointer", transition:"all 0.15s" }}>{lbl}</button>
        ))}
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ maxWidth:1180, margin:"0 auto", padding:"32px 24px", display:"flex", flexDirection:"column", gap:28 }}>

        {/* Page title */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#383838", letterSpacing:"0.2em", marginBottom:6 }}>{tab.toUpperCase()} — {viewLabel}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#FAFAF7", letterSpacing:"0.04em", lineHeight:1 }}>{user.name}'s Dashboard</div>
          </div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#2A2A2A", letterSpacing:"0.15em" }}>
            {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"}).toUpperCase()}
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(<>
          <div><SL txt="ACTIVITY"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <StatCard label="Calls Made" value={displayData.calls} accent="#F5A623" sub="Total outreach dials"/>
              <StatCard label="Owners Spoken To" value={displayData.ownersSpoken} accent="#F5A623" sub="Decision makers reached"/>
              <StatCard label="Appointments Booked" value={displayData.apptsBooked} accent="#4ECDC4" sub="Meetings on calendar"/>
              <StatCard label="Leads in Pipeline" value={displayData.leadsInPipeline} accent="#C084FC" sub="Active opportunities"/>
            </div>
          </div>
          <div><SL txt="CONVERSION RATES"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <RateCard label="Owner Contact Rate" value={rates.ownerRate} sub={`${displayData.ownersSpoken} of ${displayData.calls} calls → owner`}/>
              <RateCard label="Booking Rate" value={rates.bookingRate} sub={`${displayData.apptsBooked} of ${displayData.ownersSpoken} spoken → booked`}/>
              <RateCard label="Show-Up Rate" value={rates.showRate} sub={`${displayData.apptsCompleted} showed / ${displayData.apptsNoShow} no-showed`}/>
              <RateCard label="Close Rate" value={rates.closeRate} sub={`${displayData.dealsClosed} closed / ${displayData.dealsLost} lost`}/>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
            <div><SL txt="APPOINTMENTS"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <StatCard label="Completed" value={displayData.apptsCompleted} accent="#39D353" sub="Showed up"/>
                <StatCard label="No-Shows" value={displayData.apptsNoShow} accent="#FF4444" sub="Ghosted"/>
              </div>
            </div>
            <div><SL txt="DEALS"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <StatCard label="Closed 🔥" value={displayData.dealsClosed} accent="#39D353" sub="Revenue in"/>
                <StatCard label="Lost" value={displayData.dealsLost} accent="#FF4444" sub="Fell through"/>
              </div>
            </div>
          </div>
        </>)}

        {/* ── LIVE DIALER ── */}
        {tab==="dialer"&&(
          <LiveCaller user={user} allData={allData} allGoals={allGoals} saveEntry={saveEntry}/>
        )}

        {/* ── CHARTS ── */}
        {tab==="charts"&&(<>
          <div><SL txt="YOUR LAST 7 DAYS"/><WeeklyChart allData={allData} user={user}/></div>
          <div><SL txt="TEAM — THIS WEEK"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {USERS.map((u)=>{
                const map=allData[u.id]||{};
                const ws=getWeekStart();
                const entries=Object.entries(map).filter(([d])=>new Date(d)>=ws).map(([,v])=>v);
                const totals=sumEntries(entries);
                return (
                  <div key={u.id} style={{ background:"#111215", border:`1px solid ${u.color}22`, borderRadius:10, padding:"22px 24px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:u.color+"18", border:`2px solid ${u.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:u.color, fontWeight:600 }}>{u.initials}</div>
                      <span style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:13, color:"#FAFAF7", letterSpacing:"0.06em" }}>{u.name.toUpperCase()}</span>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {[{label:"Calls",val:totals.calls,color:u.color},{label:"Owners",val:totals.ownersSpoken,color:u.color},{label:"Appts",val:totals.apptsBooked,color:"#4ECDC4"},{label:"Closed",val:totals.dealsClosed,color:"#39D353"}].map((item)=>(
                        <div key={item.label}><div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#444", letterSpacing:"0.12em" }}>{item.label}</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:item.color, lineHeight:1 }}>{item.val}</div></div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>)}

        {/* ── GOALS ── */}
        {tab==="goals"&&(<>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <SL txt="TODAY'S PROGRESS VS GOALS"/>
              <button onClick={()=>setShowGoalEdit(true)} style={{ background:"transparent", color:user.color, border:`1px solid ${user.color}44`, borderRadius:6, padding:"6px 14px", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:"0.12em", cursor:"pointer" }}>EDIT GOALS</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <GoalProgress label="Calls Made" current={todayData.calls} goal={userGoals.calls} color={user.color}/>
              <GoalProgress label="Owners Spoken" current={todayData.ownersSpoken} goal={userGoals.ownersSpoken} color={user.color}/>
              <GoalProgress label="Appointments Booked" current={todayData.apptsBooked} goal={userGoals.apptsBooked} color="#4ECDC4"/>
              <GoalProgress label="Deals Closed" current={todayData.dealsClosed} goal={userGoals.dealsClosed} color="#39D353"/>
            </div>
          </div>
          <div><SL txt="THIS WEEK VS DAILY GOALS (×7)"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {(()=>{
                const ws=getWeekStart();
                const map=allData[user.id]||{};
                const wE=Object.entries(map).filter(([d])=>new Date(d)>=ws).map(([,v])=>v);
                const wT=sumEntries(wE);
                return [{label:"Week Calls",current:wT.calls,goal:userGoals.calls*7,color:user.color},{label:"Week Owners",current:wT.ownersSpoken,goal:userGoals.ownersSpoken*7,color:user.color},{label:"Week Appts",current:wT.apptsBooked,goal:userGoals.apptsBooked*7,color:"#4ECDC4"},{label:"Week Closed",current:wT.dealsClosed,goal:userGoals.dealsClosed*7,color:"#39D353"}].map((item)=>(<GoalProgress key={item.label} {...item}/>));
              })()}
            </div>
          </div>
          <div><SL txt="TEAM — TODAY'S GOALS"/>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {USERS.map((u)=>{
                const td=allData[u.id]?.[todayKey()]||EMPTY_METRICS;
                const goals=allGoals[u.id]||DEFAULT_GOALS;
                const pct=goals.calls>0?Math.min((td.calls/goals.calls)*100,100):0;
                return (
                  <div key={u.id} style={{ background:"#111215", border:"1px solid #1E2025", borderRadius:10, padding:"16px 22px", display:"flex", alignItems:"center", gap:20 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, width:140, flexShrink:0 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:u.color+"18", border:`2px solid ${u.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:u.color, fontWeight:600 }}>{u.initials}</div>
                      <span style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:13, color:"#FAFAF7", letterSpacing:"0.06em" }}>{u.name.toUpperCase()}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#444" }}>CALLS: {td.calls} / {goals.calls}</span>
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:pct>=100?"#39D353":u.color }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height:4, background:"#1A1D24", borderRadius:2 }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:pct>=100?"#39D353":u.color, borderRadius:2, transition:"width 0.8s ease" }}/>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:20, flexShrink:0 }}>
                      {[{label:"APPTS",val:`${td.apptsBooked}/${goals.apptsBooked}`},{label:"CLOSED",val:`${td.dealsClosed}/${goals.dealsClosed}`,color:td.dealsClosed>=goals.dealsClosed?"#39D353":undefined}].map((item)=>(
                        <div key={item.label} style={{ textAlign:"center" }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:"#444", letterSpacing:"0.1em" }}>{item.label}</div>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:item.color||"#FAFAF7" }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>)}

        {/* ── HISTORY ── */}
        {tab==="history"&&(
          <div>
            <SL txt="ENTRY HISTORY — ALL TIME (click ✏ to edit any entry)"/>
            <HistoryLog userData={allData[user.id]||{}} userColor={user.color} onEdit={(date,entry)=>openModal(date,entry)}/>
          </div>
        )}

        {/* ── TEAM ── */}
        {tab==="team"&&(
          <div><SL txt={`TEAM LEADERBOARD — ${viewLabel}`}/><Leaderboard allData={allData} view={view}/></div>
        )}

      </main>

      {/* FAB — Log numbers */}
      {tab!=="dialer"&&(
        <button onClick={()=>openModal(todayKey(), allData[user.id]?.[todayKey()]||{...EMPTY_METRICS})}
          onMouseEnter={(e)=>(e.currentTarget.style.transform="scale(1.04)")}
          onMouseLeave={(e)=>(e.currentTarget.style.transform="scale(1)")}
          style={{ position:"fixed", bottom:28, right:28, background:user.color, color:"#0C0C0E", border:"none", borderRadius:12, padding:"13px 22px", fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:"0.1em", cursor:"pointer", boxShadow:`0 8px 36px ${user.color}44`, transition:"transform 0.15s", zIndex:50 }}>
          + LOG TODAY'S NUMBERS
        </button>
      )}

      {/* Calculator FAB */}
      <button onClick={()=>setShowCalc((c)=>!c)}
        style={{ position:"fixed", bottom:28, left:28, background:showCalc?"#1E2025":"#111215", color:"#FAFAF7", border:"1px solid #2A2D35", borderRadius:12, padding:"12px 18px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:"0.1em", cursor:"pointer", zIndex:50, transition:"background 0.15s" }}>
        🧮
      </button>

      {showCalc && <Calculator onClose={()=>setShowCalc(false)}/>}

      {showModal && (
        <EntryModal user={user} date={modalDate} initial={modalInitial||{...EMPTY_METRICS}} onSave={handleSaveEntry} onClose={()=>setShowModal(false)}/>
      )}
      {showGoalEdit && (
        <GoalSettingsModal goals={userGoals} userColor={user.color} onSave={async(goals)=>{await saveGoals(user.id,goals);setShowGoalEdit(false);}} onClose={()=>setShowGoalEdit(false)}/>
      )}
    </div>
  );
}
