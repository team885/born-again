import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from "firebase/firestore";

const T={bg:"#060B17",card:"#0C1526",card2:"#111F38",border:"#1C2D50",primary:"#6366F1",purple:"#A855F7",cyan:"#22D3EE",green:"#10B981",amber:"#F59E0B",red:"#EF4444",text:"#F1F5F9",sub:"#94A3B8",muted:"#475569"};

const USERS=[
  {id:"meron",name:"Meron",color:"#818CF8",initials:"ME"},
  {id:"aman",name:"Aman",color:"#22D3EE",initials:"AM"},
  {id:"gideon",name:"Gideon",color:"#C084FC",initials:"GI"},
];

const EMPTY_METRICS={calls:0,ownersSpoken:0,apptsBooked:0,apptsCompleted:0,apptsNoShow:0,dealsClosed:0,dealsLost:0,leadsInPipeline:0};
const DEFAULT_GOALS={calls:50,ownersSpoken:10,apptsBooked:3,dealsClosed:1};

const getWeekStart=()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());d.setHours(0,0,0,0);return d;};
const getLast7Days=()=>{const r=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);r.push(d.toISOString().split("T")[0]);}return r;};
const sumEntries=(arr)=>arr.reduce((a,e)=>{Object.keys(EMPTY_METRICS).forEach(k=>{a[k]=(a[k]||0)+(Number(e[k])||0);});return a;},{...EMPTY_METRICS});
const calcRates=(d)=>({ownerRate:d.calls>0?+((d.ownersSpoken/d.calls)*100).toFixed(1):0,bookingRate:d.ownersSpoken>0?+((d.apptsBooked/d.ownersSpoken)*100).toFixed(1):0,showRate:d.apptsCompleted+d.apptsNoShow>0?+((d.apptsCompleted/(d.apptsCompleted+d.apptsNoShow))*100).toFixed(1):0,closeRate:d.dealsClosed+d.dealsLost>0?+((d.dealsClosed/(d.dealsClosed+d.dealsLost))*100).toFixed(1):0});

const VERSES=[
  {text:"I can do all things through Christ who strengthens me.",ref:"Philippians 4:13"},
  {text:"For God has not given us a spirit of fear, but of power and of love and of a sound mind.",ref:"2 Timothy 1:7"},
  {text:"Commit your work to the LORD, and your plans will be established.",ref:"Proverbs 16:3"},
  {text:"The plans of the diligent lead surely to abundance.",ref:"Proverbs 21:5"},
  {text:"Be strong and courageous. Do not be afraid; do not be discouraged.",ref:"Joshua 1:9"},
  {text:"For I know the plans I have for you — plans to prosper you and not to harm you.",ref:"Jeremiah 29:11"},
  {text:"With God all things are possible.",ref:"Matthew 19:26"},
  {text:"Your next YES is one dial away. Pick up the phone.",ref:"— Born Again"},
  {text:"Every call you make is an act of faith. Someone out there needs what you have.",ref:"— Born Again"},
  {text:"Champions are built in the moments they don't feel like it. Dial anyway.",ref:"— Born Again"},
  {text:"Rejection is redirection. Every no gets you closer to the yes God has for you.",ref:"— Born Again"},
  {text:"God didn't bring you this far to leave you. Keep dialing.",ref:"— Born Again"},
  {text:"Make one more call. Then one more after that. That is the whole secret.",ref:"— Born Again"},
];

// Firebase hook
function useAllData(){
  const [allData,setAllData]=useState({});
  const [allGoals,setAllGoals]=useState({});
  const [allNotes,setAllNotes]=useState({});
  const [rc,setRc]=useState(0);
  const loaded=useRef(new Set());
  useEffect(()=>{
    const uns=USERS.map(u=>onSnapshot(doc(db,"users",u.id),(snap)=>{
      if(snap.exists()){const d=snap.data();setAllData(p=>({...p,[u.id]:d.entries||{}}));setAllGoals(p=>({...p,[u.id]:d.goals||DEFAULT_GOALS}));setAllNotes(p=>({...p,[u.id]:d.notes||{}}));}
      else{setAllData(p=>({...p,[u.id]:{}}));setAllGoals(p=>({...p,[u.id]:DEFAULT_GOALS}));setAllNotes(p=>({...p,[u.id]:{}}));}
      if(!loaded.current.has(u.id)){loaded.current.add(u.id);setRc(n=>n+1);}
    }));
    return ()=>uns.forEach(u=>u());
  },[]);
  const saveEntry=useCallback(async(uid,date,entry)=>{
    const ref=doc(db,"users",uid);const snap=await getDoc(ref);
    if(snap.exists())await updateDoc(ref,{[`entries.${date}`]:entry});
    else await setDoc(ref,{entries:{[date]:entry},goals:DEFAULT_GOALS,notes:{}});
  },[]);
  const saveGoals=useCallback(async(uid,goals)=>{
    const ref=doc(db,"users",uid);const snap=await getDoc(ref);
    if(snap.exists())await updateDoc(ref,{goals});else await setDoc(ref,{entries:{},goals,notes:{}});
  },[]);
  const saveNote=useCallback(async(uid,date,text)=>{
    const ref=doc(db,"users",uid);const snap=await getDoc(ref);
    if(snap.exists())await updateDoc(ref,{[`notes.${date}`]:text});
    else await setDoc(ref,{entries:{},goals:DEFAULT_GOALS,notes:{[date]:text}});
  },[]);
  return{allData,allGoals,allNotes,saveEntry,saveGoals,saveNote,ready:rc>=USERS.length};
}

function AnimatedBackground(){
  return(
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,#6366F118 0%,transparent 70%)",top:"-150px",left:"-150px",animation:"orbFloat1 20s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,#A855F714 0%,transparent 70%)",bottom:"-50px",right:"-100px",animation:"orbFloat2 25s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:450,height:450,borderRadius:"50%",background:"radial-gradient(circle,#22D3EE10 0%,transparent 70%)",top:"35%",left:"45%",animation:"orbFloat3 18s ease-in-out infinite"}}/>
    </div>
  );
}

function StatCard({label,value,accent=T.primary,sub}){
  const[hov,setHov]=useState(false);
  return(
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:T.card,border:`1px solid ${hov?accent+"55":T.border}`,borderRadius:12,padding:"20px 22px",display:"flex",flexDirection:"column",gap:6,transition:"all 0.25s",transform:hov?"translateY(-3px)":"none",boxShadow:hov?`0 8px 32px ${accent}22`:"none",cursor:"default",position:"relative",overflow:"hidden"}}>
      {hov&&<div style={{position:"absolute",inset:0,background:`radial-gradient(circle at 50% 0%,${accent}08,transparent 70%)`,pointerEvents:"none"}}/>}
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:T.muted,textTransform:"uppercase"}}>{label}</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,color:accent,lineHeight:1,textShadow:`0 0 20px ${accent}44`}}>{value}</div>
      {sub&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted}}>{sub}</div>}
    </div>
  );
}

function RateCard({label,value,sub}){
  const pct=Math.min(parseFloat(value)||0,100);
  const c=pct>=60?T.green:pct>=30?T.amber:pct>0?"#F97316":T.border;
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px 22px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:T.muted,textTransform:"uppercase"}}>{label}</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:c,lineHeight:1,textShadow:`0 0 16px ${c}44`}}>{value}%</div>
      <div style={{height:4,background:T.card2,borderRadius:2}}>
        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${c},${c}cc)`,borderRadius:2,transition:"width 0.8s cubic-bezier(.4,0,.2,1)",boxShadow:`0 0 8px ${c}66`}}/>
      </div>
      {sub&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted}}>{sub}</div>}
    </div>
  );
}

function WeeklyChart({allData,user}){
  const ue=allData[user.id]||{};
  const data=getLast7Days().map(d=>{const e=ue[d]||EMPTY_METRICS;return{key:d,label:new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"}).toUpperCase(),dateLabel:new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}),calls:e.calls,appts:e.apptsBooked,closed:e.dealsClosed,isToday:d===todayKey()};});
  const max=Math.max(...data.map(d=>d.calls),10);
  const BW=44,GAP=18,PL=44,PT=20,CH=150,TW=PL+data.length*(BW+GAP)+20;
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"24px 28px"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.2em",marginBottom:20}}>CALLS / APPTS / DEALS — LAST 7 DAYS</div>
      <div style={{overflowX:"auto"}}>
        <svg width={TW} height={CH+72} style={{display:"block"}}>
          <defs><linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={user.color} stopOpacity="0.9"/><stop offset="100%" stopColor={user.color} stopOpacity="0.2"/></linearGradient></defs>
          {[0.25,0.5,0.75,1].map(p=>{const y=PT+CH-p*CH;return(<g key={p}><line x1={PL} x2={TW-10} y1={y} y2={y} stroke={T.border} strokeWidth={1}/><text x={PL-6} y={y+4} textAnchor="end" fontSize={8} fill={T.muted} fontFamily="IBM Plex Mono,monospace">{Math.round(p*max)}</text></g>);})}
          {data.map((d,i)=>{const x=PL+i*(BW+GAP);const cH=(d.calls/max)*CH;const aH=(d.appts/max)*CH;const clH=(d.closed/max)*CH;return(<g key={d.key}>
            <rect x={x} y={PT+CH-cH} width={BW} height={cH||2} fill={d.isToday?"url(#bg2)":user.color+"33"} rx={4}/>
            {d.calls>0&&<text x={x+BW/2} y={PT+CH-cH-5} textAnchor="middle" fontSize={10} fill={user.color} fontFamily="Bebas Neue,sans-serif">{d.calls}</text>}
            {d.appts>0&&<circle cx={x+BW/2} cy={PT+CH-aH} r={5} fill={T.cyan}/>}
            {d.closed>0&&<circle cx={x+BW/2} cy={PT+CH-clH-12} r={6} fill={T.green} opacity={0.9}/>}
            <text x={x+BW/2} y={PT+CH+18} textAnchor="middle" fontSize={9} fill={d.isToday?T.text:T.muted} fontFamily="IBM Plex Mono,monospace">{d.label}</text>
            <text x={x+BW/2} y={PT+CH+32} textAnchor="middle" fontSize={8} fill={T.muted} fontFamily="IBM Plex Mono,monospace">{d.dateLabel}</text>
          </g>);})}
        </svg>
      </div>
      <div style={{display:"flex",gap:20,marginTop:4}}>
        {[{c:user.color,l:"Calls"},{c:T.cyan,l:"Appts"},{c:T.green,l:"Closed"}].map(({c,l})=>(<div key={l} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:c,boxShadow:`0 0 6px ${c}`}}/><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted}}>{l}</span></div>))}
      </div>
    </div>
  );
}

function GoalProgress({label,current,goal,color}){
  const pct=goal>0?Math.min((current/goal)*100,100):0;const done=current>=goal&&goal>0;
  return(
    <div style={{background:T.card,border:`1px solid ${done?color+"55":T.border}`,borderRadius:12,padding:"18px 22px",display:"flex",flexDirection:"column",gap:8,boxShadow:done?`0 0 20px ${color}22`:"none",transition:"all 0.3s"}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>{label}</div>
        {done&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.green,letterSpacing:"0.15em"}}>✓ HIT</div>}
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:6}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:done?T.green:color,lineHeight:1,textShadow:`0 0 16px ${done?T.green:color}44`}}>{current}</div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.muted}}>/ {goal}</div>
      </div>
      <div style={{height:4,background:T.card2,borderRadius:2}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${done?T.green:color},${done?T.green+"aa":color+"aa"})`,borderRadius:2,transition:"width 0.8s cubic-bezier(.4,0,.2,1)",boxShadow:`0 0 8px ${done?T.green:color}55`}}/></div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted}}>{pct.toFixed(0)}% of daily target</div>
    </div>
  );
}

function GoalSettingsModal({goals,userColor,onSave,onClose}){
  const[form,setForm]=useState({...goals});
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(8px)"}}>
      <div style={{background:T.card,border:`1px solid ${userColor}44`,borderRadius:16,width:420,padding:36,display:"flex",flexDirection:"column",gap:24,boxShadow:`0 0 40px ${userColor}22`}}>
        <div><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:userColor,letterSpacing:"0.2em",marginBottom:4}}>EDIT</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:T.text,letterSpacing:"0.06em"}}>DAILY GOALS</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[{key:"calls",label:"Daily Calls"},{key:"ownersSpoken",label:"Owners Target"},{key:"apptsBooked",label:"Appointments"},{key:"dealsClosed",label:"Closes Target"}].map(({key,label})=>(
            <div key={key}><label style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.12em",display:"block",marginBottom:6}}>{label}</label>
            <input type="number" min={1} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:Math.max(1,parseInt(e.target.value)||1)}))} onFocus={e=>e.target.style.borderColor=userColor} onBlur={e=>e.target.style.borderColor=T.border}
              style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:T.text,outline:"none",width:"100%",transition:"border-color 0.15s"}}/></div>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>onSave(form)} style={{flex:1,background:`linear-gradient(135deg,${userColor},${userColor}aa)`,color:T.bg,border:"none",borderRadius:8,padding:"14px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:"0.1em",cursor:"pointer"}}>SAVE GOALS</button>
          <button onClick={onClose} style={{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 20px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,cursor:"pointer"}}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

function EntryModal({user,date,initial,onSave,onClose}){
  const[form,setForm]=useState({...initial});
  const set=(k,v)=>setForm(f=>({...f,[k]:Math.max(0,parseInt(v)||0)}));
  const isToday=date===todayKey();
  const dateLabel=new Date(date+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const groups=[
    {label:"ACTIVITY",fields:[{key:"calls",label:"Calls Made",icon:"📞"},{key:"ownersSpoken",label:"Owners Spoken",icon:"🤝"},{key:"leadsInPipeline",label:"Pipeline",icon:"🔥"}]},
    {label:"APPOINTMENTS",fields:[{key:"apptsBooked",label:"Booked",icon:"📅"},{key:"apptsCompleted",label:"Completed",icon:"✅"},{key:"apptsNoShow",label:"No-Shows",icon:"🚫"}]},
    {label:"DEALS",fields:[{key:"dealsClosed",label:"Closed",icon:"💰"},{key:"dealsLost",label:"Lost",icon:"📉"}]},
  ];
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(8px)"}}>
      <div style={{background:T.card,border:`1px solid ${user.color}44`,borderRadius:16,width:520,maxHeight:"92vh",overflowY:"auto",padding:36,display:"flex",flexDirection:"column",gap:28,boxShadow:`0 0 60px ${user.color}18`}}>
        <div style={{borderBottom:`1px solid ${T.border}`,paddingBottom:20}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:user.color,marginBottom:4}}>{isToday?"LOGGING FOR":"EDITING ENTRY"}</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:T.text,letterSpacing:"0.06em"}}>{user.name} — {dateLabel}</div>
        </div>
        {groups.map(g=>(<div key={g.label}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.2em",marginBottom:12}}>{g.label}</div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${g.fields.length},1fr)`,gap:12}}>
            {g.fields.map(({key,label,icon})=>(<div key={key}>
              <label style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.12em",display:"block",marginBottom:6}}>{icon} {label}</label>
              <input type="number" min={0} value={form[key]} onChange={e=>set(key,e.target.value)} onFocus={e=>e.target.style.borderColor=user.color} onBlur={e=>e.target.style.borderColor=T.border}
                style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px",fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:T.text,outline:"none",width:"100%",transition:"border-color 0.15s"}}/>
            </div>))}
          </div>
        </div>))}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>onSave(form)} style={{flex:1,background:`linear-gradient(135deg,${user.color},${user.color}99)`,color:T.bg,border:"none",borderRadius:8,padding:"14px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:"0.1em",cursor:"pointer"}}>SAVE ENTRY</button>
          <button onClick={onClose} style={{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 20px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,cursor:"pointer"}}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

function HistoryLog({userData,userColor,onEdit}){
  const entries=Object.entries(userData).sort(([a],[b])=>b.localeCompare(a)).slice(0,60);
  const cols=[{key:"calls",l:"CALLS"},{key:"ownersSpoken",l:"OWNERS"},{key:"apptsBooked",l:"BOOKED"},{key:"apptsCompleted",l:"COMPL."},{key:"apptsNoShow",l:"NO-SHOW"},{key:"dealsClosed",l:"CLOSED"},{key:"dealsLost",l:"LOST"},{key:"leadsInPipeline",l:"PIPELINE"}];
  if(!entries.length)return<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:48,textAlign:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted,letterSpacing:"0.2em"}}>NO ENTRIES YET</div>;
  const gc=`180px repeat(${cols.length},1fr) 40px`;
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:gc,gap:0,borderBottom:`1px solid ${T.border}`,padding:"10px 20px"}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em"}}>DATE</div>
        {cols.map(c=><div key={c.key} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em"}}>{c.l}</div>)}
        <div/>
      </div>
      {entries.map(([date,entry],i)=>{
        const isToday=date===todayKey();
        const label=new Date(date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
        return(<div key={date} style={{display:"grid",gridTemplateColumns:gc,gap:0,padding:"12px 20px",background:isToday?T.primary+"0A":i%2===0?T.card:T.card2,borderBottom:i<entries.length-1?`1px solid ${T.border}`:"none",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:isToday?userColor:T.text}}>{label}</div>
            {isToday&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:userColor,letterSpacing:"0.15em",background:userColor+"18",padding:"2px 6px",borderRadius:3}}>TODAY</div>}
          </div>
          {cols.map(c=><div key={c.key} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,lineHeight:1,color:c.key==="dealsClosed"&&entry[c.key]>0?T.green:c.key==="dealsLost"&&entry[c.key]>0?T.red:T.text}}>{entry[c.key]||0}</div>)}
          <button onClick={()=>onEdit(date,entry)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.muted,fontSize:12}}>✏</button>
        </div>);
      })}
    </div>
  );
}

function Leaderboard({allData,view}){
  const rows=USERS.map(u=>{
    const map=allData[u.id]||{};
    let entries=[];
    if(view==="today")entries=map[todayKey()]?[map[todayKey()]]:[];
    else if(view==="week")entries=Object.entries(map).filter(([d])=>new Date(d)>=getWeekStart()).map(([,v])=>v);
    else entries=Object.values(map);
    const totals=sumEntries(entries);
    return{user:u,totals,rates:calcRates(totals)};
  }).sort((a,b)=>b.totals.dealsClosed-a.totals.dealsClosed||b.totals.calls-a.totals.calls);
  const cols=[{l:"CALLS",k:"calls"},{l:"OWNERS",k:"ownersSpoken"},{l:"APPTS",k:"apptsBooked"},{l:"CLOSED",k:"dealsClosed",c:T.green},{l:"LOST",k:"dealsLost",c:T.red}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"grid",gridTemplateColumns:"32px 160px 1fr 1fr 1fr 1fr 1fr 110px",gap:12,padding:"6px 20px"}}>
        <div/><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.15em"}}>REP</div>
        {cols.map(c=><div key={c.k} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.15em"}}>{c.l}</div>)}
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.15em"}}>CLOSE %</div>
      </div>
      {rows.map((row,i)=>(
        <div key={row.user.id} style={{display:"grid",gridTemplateColumns:"32px 160px 1fr 1fr 1fr 1fr 1fr 110px",alignItems:"center",gap:12,background:i===0?row.user.color+"0A":T.card,border:`1px solid ${i===0?row.user.color+"44":T.border}`,borderRadius:12,padding:"16px 20px",boxShadow:i===0?`0 0 20px ${row.user.color}18`:"none",transition:"all 0.2s"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:i===0?T.amber:T.muted,lineHeight:1,textShadow:i===0?`0 0 12px ${T.amber}88`:"none"}}>{i+1}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:row.user.color+"18",border:`2px solid ${row.user.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:row.user.color,fontWeight:600,flexShrink:0,boxShadow:`0 0 10px ${row.user.color}33`}}>{row.user.initials}</div>
            <span style={{fontFamily:"'Manrope',sans-serif",fontWeight:800,fontSize:13,color:T.text,letterSpacing:"0.06em"}}>{row.user.name.toUpperCase()}</span>
          </div>
          {cols.map(c=><div key={c.k} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:c.c||T.text,lineHeight:1}}>{row.totals[c.k]}</div>)}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,lineHeight:1,color:row.rates.closeRate>=30?T.green:row.rates.closeRate>0?T.amber:T.muted}}>{row.rates.closeRate}%</div>
        </div>
      ))}
    </div>
  );
}

// Live Dialer
function LiveDialer({user,allData,allGoals,saveEntry}){
  const[phase,setPhase]=useState("pre");
  const[sessionGoal,setSessionGoal]=useState("");
  const[countdown,setCountdown]=useState(3);
  const[calls,setCalls]=useState(0);
  const[owners,setOwners]=useState(0);
  const[saving,setSaving]=useState(false);
  const breakRef=useRef(null);
  const verseIdx=useMemo(()=>Math.floor(Math.random()*VERSES.length),[]);
  const verse=VERSES[verseIdx];
  const goals=allGoals[user.id]||DEFAULT_GOALS;
  const goal=parseInt(sessionGoal)||goals.calls;
  const pct=goal>0?Math.min((calls/goal)*100,100):0;
  const noOwners=calls-owners;
  const cp1=Math.round(goal/3),cp2=Math.round(goal*2/3);

  useEffect(()=>{
    if(phase!=="countdown")return;
    if(countdown===0){setTimeout(()=>setPhase("live"),700);return;}
    const t=setTimeout(()=>setCountdown(c=>c-1),1000);
    return()=>clearTimeout(t);
  },[phase,countdown]);

  useEffect(()=>{
    if(phase!=="live")return;
    breakRef.current=setInterval(()=>setPhase("break"),30*60*1000);
    return()=>clearInterval(breakRef.current);
  },[phase]);

  const handleCall=(isOwner)=>{
    const nc=calls+1;setCalls(nc);
    if(isOwner)setOwners(o=>o+1);
    if(nc===cp1||nc===cp2){clearInterval(breakRef.current);setPhase("break");}
  };

  const endSession=async()=>{
    setSaving(true);
    const ex=allData[user.id]?.[todayKey()]||EMPTY_METRICS;
    await saveEntry(user.id,todayKey(),{...ex,calls:(ex.calls||0)+calls,ownersSpoken:(ex.ownersSpoken||0)+owners});
    setSaving(false);setPhase("done");
  };

  const reset=()=>{setCalls(0);setOwners(0);setPhase("pre");setSessionGoal("");setCountdown(3);};

  if(phase==="pre")return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:32,paddingTop:40,animation:"slideUp 0.4s ease"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted,letterSpacing:"0.2em",marginBottom:8}}>READY TO MAKE MONEY?</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:60,color:T.text,letterSpacing:"0.04em",lineHeight:1,textShadow:`0 0 40px ${user.color}44`}}>SET YOUR GOAL</div>
      </div>
      <div style={{background:T.card,border:`1px solid ${user.color}33`,borderRadius:14,padding:"22px 36px",maxWidth:520,width:"100%",textAlign:"center",boxShadow:`0 0 30px ${user.color}11`}}>
        <div style={{fontSize:28,marginBottom:12}}>✨</div>
        <div style={{fontFamily:"'Manrope',sans-serif",fontSize:15,color:T.sub,lineHeight:1.7,fontStyle:"italic",marginBottom:10}}>"{verse.text}"</div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:user.color,letterSpacing:"0.15em"}}>{verse.ref}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.2em"}}>HOW MANY CALLS TODAY?</div>
        <input type="number" value={sessionGoal} placeholder={String(goals.calls)} onChange={e=>setSessionGoal(e.target.value)}
          style={{background:T.card,border:`2px solid ${user.color}55`,borderRadius:14,padding:"14px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:56,color:user.color,outline:"none",width:200,textAlign:"center",textShadow:`0 0 20px ${user.color}66`}}
          onFocus={e=>e.target.style.borderColor=user.color} onBlur={e=>e.target.style.borderColor=user.color+"55"}/>
        <button onClick={()=>{setCountdown(3);setPhase("countdown");}}
          style={{background:`linear-gradient(135deg,${user.color},${T.purple})`,color:"white",border:"none",borderRadius:16,padding:"18px 60px",fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:"0.12em",cursor:"pointer",boxShadow:`0 8px 40px ${user.color}55`,animation:"glow 2s ease-in-out infinite"}}>
          LET'S DIAL 🏁
        </button>
      </div>
    </div>
  );

  if(phase==="countdown")return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"55vh",gap:20,position:"relative"}}>
      <div style={{display:"flex",alignItems:"center",gap:40}}>
        <div style={{fontSize:64,animation:"raceFlag 0.6s ease-in-out infinite"}}>🏁</div>
        <div key={countdown} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:220,color:user.color,lineHeight:1,animation:"zoom 0.7s cubic-bezier(.2,1.4,.4,1)",textShadow:`0 0 80px ${user.color}88,0 0 160px ${user.color}44`}}>
          {countdown===0?"GO!":countdown}
        </div>
        <div style={{fontSize:64,animation:"raceFlag 0.6s ease-in-out infinite",animationDelay:"0.3s"}}>🏁</div>
      </div>
      {countdown===0&&<div style={{fontSize:52,animation:"carRace 0.8s ease-in-out forwards"}}>🏎️</div>}
    </div>
  );

  if(phase==="break")return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"55vh",gap:24,textAlign:"center",animation:"slideUp 0.4s ease"}}>
      <div style={{fontSize:64,animation:"float 3s ease-in-out infinite"}}>🧘</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,color:T.text,letterSpacing:"0.04em",textShadow:`0 0 30px ${T.cyan}44`}}>TAKE A BREAK</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.muted,letterSpacing:"0.15em"}}>{calls} CALLS DONE — REST YOUR MIND FOR 30 MINUTES</div>
      <div style={{background:T.card,border:`1px solid ${T.purple}33`,borderRadius:14,padding:"22px 36px",maxWidth:460,boxShadow:`0 0 30px ${T.purple}11`}}>
        <div style={{fontFamily:"'Manrope',sans-serif",fontSize:14,color:T.sub,lineHeight:1.7,fontStyle:"italic"}}>"{verse.text}"</div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:user.color,letterSpacing:"0.15em",marginTop:10}}>{verse.ref}</div>
      </div>
      <div style={{display:"flex",gap:12}}>
        <button onClick={()=>setPhase("live")} style={{background:`linear-gradient(135deg,${user.color},${T.purple})`,color:"white",border:"none",borderRadius:12,padding:"14px 36px",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:"0.1em",cursor:"pointer",boxShadow:`0 6px 30px ${user.color}44`}}>BACK TO DIALING</button>
        <button onClick={endSession} style={{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 24px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,cursor:"pointer"}}>END SESSION</button>
      </div>
    </div>
  );

  if(phase==="done"){
    const or=calls>0?+((owners/calls)*100).toFixed(1):0;
    return(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:28,paddingTop:40,textAlign:"center",animation:"slideUp 0.4s ease"}}>
        <div style={{fontSize:56,animation:"float 2s ease-in-out infinite"}}>🔥</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,color:T.text,letterSpacing:"0.04em",textShadow:`0 0 30px ${T.green}44`}}>SESSION SAVED</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {[{l:"CALLS MADE",v:calls,c:user.color},{l:"OWNERS REACHED",v:owners,c:T.green},{l:"OWNER RATE",v:or+"%",c:or>=20?T.green:T.amber}].map(item=>(
            <div key={item.l} style={{background:T.card,border:`1px solid ${item.c}33`,borderRadius:12,padding:"20px 28px",boxShadow:`0 0 20px ${item.c}18`}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.15em"}}>{item.l}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,color:item.c,lineHeight:1,textShadow:`0 0 16px ${item.c}44`}}>{item.v}</div>
            </div>
          ))}
        </div>
        <button onClick={reset} style={{background:`linear-gradient(135deg,${user.color},${T.purple})`,color:"white",border:"none",borderRadius:12,padding:"14px 36px",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:"0.1em",cursor:"pointer",boxShadow:`0 6px 30px ${user.color}44`}}>START NEW SESSION</button>
      </div>
    );
  }

  // LIVE phase
  const cp1Pct=goal>0?(cp1/goal)*100:33;
  const cp2Pct=goal>0?(cp2/goal)*100:66;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,paddingTop:8,maxWidth:640,margin:"0 auto",width:"100%"}}>
      <div style={{background:T.card,border:`1px solid ${user.color}22`,borderRadius:12,padding:"14px 24px",width:"100%",textAlign:"center",boxShadow:`0 0 20px ${user.color}11`}}>
        <div style={{fontFamily:"'Manrope',sans-serif",fontSize:12,color:T.sub,lineHeight:1.5,fontStyle:"italic"}}>"{verse.text}" <span style={{color:user.color,fontStyle:"normal"}}>— {verse.ref}</span></div>
      </div>
      <div style={{width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.15em"}}>PROGRESS TO GOAL</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:pct>=100?T.green:user.color}}>{calls} / {goal} &nbsp; {pct.toFixed(0)}%</div>
        </div>
        <div style={{position:"relative",height:14,background:T.card2,borderRadius:7}}>
          <div style={{position:"absolute",inset:0,borderRadius:7,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${T.primary},${user.color},${T.purple})`,borderRadius:7,transition:"width 0.3s ease",boxShadow:`0 0 14px ${user.color}88`}}/>
          </div>
          {[{p:cp1Pct,n:cp1,done:calls>=cp1},{p:cp2Pct,n:cp2,done:calls>=cp2}].map(({p,n,done},i)=>(
            <div key={i} style={{position:"absolute",left:`${p}%`,top:"-8px",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",zIndex:2}}>
              <div style={{fontSize:16,animation:"float 2s ease-in-out infinite",animationDelay:`${i*0.5}s`}}>🏁</div>
              <div style={{width:2,height:30,background:done?T.green:T.amber,boxShadow:`0 0 8px ${done?T.green:T.amber}88`}}/>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:done?T.green:T.amber,letterSpacing:"0.1em",whiteSpace:"nowrap",marginTop:2}}>BREAK {i+1}<br/>{n} calls</div>
            </div>
          ))}
        </div>
        {pct>=100&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.green,marginTop:12,letterSpacing:"0.15em",textAlign:"center"}}>🎯 GOAL HIT — KEEP GOING!</div>}
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.2em",marginBottom:2}}>CALLS THIS SESSION</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:120,color:T.text,lineHeight:1,textShadow:`0 0 40px ${user.color}33`}}>{calls}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,width:"100%"}}>
        <button onClick={()=>handleCall(true)}
          onMouseDown={e=>e.currentTarget.style.transform="scale(0.96)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
          style={{background:"linear-gradient(135deg,#041A0E,#062B18)",border:`2px solid ${T.green}`,borderRadius:18,padding:"28px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:T.green,letterSpacing:"0.06em",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"transform 0.1s",boxShadow:`0 4px 24px ${T.green}22,inset 0 0 30px ${T.green}08`}}>
          <span>✓ OWNER</span>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:32,fontWeight:600,textShadow:`0 0 12px ${T.green}88`}}>{owners}</span>
        </button>
        <button onClick={()=>handleCall(false)}
          onMouseDown={e=>e.currentTarget.style.transform="scale(0.96)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
          style={{background:"linear-gradient(135deg,#1A0404,#2B0606)",border:`2px solid ${T.red}`,borderRadius:18,padding:"28px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:T.red,letterSpacing:"0.06em",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"transform 0.1s",boxShadow:`0 4px 24px ${T.red}22,inset 0 0 30px ${T.red}08`}}>
          <span>✕ NO OWNER</span>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:32,fontWeight:600,textShadow:`0 0 12px ${T.red}88`}}>{noOwners}</span>
        </button>
      </div>
      <div style={{display:"flex",gap:32,alignItems:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em"}}>LIVE OWNER RATE</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:calls>0&&owners/calls>=0.2?T.green:T.amber,lineHeight:1}}>{calls>0?+((owners/calls)*100).toFixed(1):0}%</div>
        </div>
      </div>
      <button onClick={endSession} disabled={saving} style={{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 28px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,letterSpacing:"0.12em",cursor:saving?"default":"pointer",marginTop:4}}>
        {saving?"SAVING...":"END SESSION & SAVE"}
      </button>
    </div>
  );
}

// Notes
function Notes({user,allNotes,saveNote}){
  const[selDate,setSelDate]=useState(todayKey());
  const[text,setText]=useState("");
  const[saving,setSaving]=useState(false);
  const saveRef=useRef(null);
  const uNotes=allNotes[user.id]||{};
  useEffect(()=>{setText(uNotes[selDate]||"");},[selDate,uNotes]);
  const onChange=(v)=>{setText(v);clearTimeout(saveRef.current);saveRef.current=setTimeout(async()=>{setSaving(true);await saveNote(user.id,selDate,v);setSaving(false);},1000);};
  const dates=Array.from(new Set([todayKey(),...Object.keys(uNotes)])).sort((a,b)=>b.localeCompare(a)).slice(0,30);
  return(
    <div style={{display:"flex",gap:24,animation:"slideUp 0.4s ease",minHeight:"60vh"}}>
      <div style={{width:196,flexShrink:0}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.2em",marginBottom:12}}>── NOTES</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {dates.map(d=>{
            const isSel=d===selDate;const hasNote=uNotes[d]&&uNotes[d].trim();
            const lbl=new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
            return(<button key={d} onClick={()=>setSelDate(d)}
              style={{background:isSel?T.primary+"22":T.card,border:`1px solid ${isSel?T.primary+"55":T.border}`,borderRadius:10,padding:"10px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:isSel?T.text:T.muted,cursor:"pointer",textAlign:"left",transition:"all 0.15s",boxShadow:isSel?`0 0 12px ${T.primary}22`:null,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                {d===todayKey()&&<div style={{fontSize:7,color:T.primary,letterSpacing:"0.15em",marginBottom:2}}>TODAY</div>}
                {lbl}
              </div>
              {hasNote&&<div style={{width:6,height:6,borderRadius:"50%",background:T.primary,boxShadow:`0 0 6px ${T.primary}`,flexShrink:0}}/>}
            </button>);
          })}
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:T.text,letterSpacing:"0.04em"}}>{new Date(selDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
            {selDate===todayKey()&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.primary,letterSpacing:"0.15em",marginTop:2}}>TODAY</div>}
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:saving?T.amber:T.green,letterSpacing:"0.12em"}}>{saving?"SAVING...":"AUTO-SAVED ✓"}</div>
        </div>
        <textarea value={text} onChange={e=>onChange(e.target.value)} placeholder="Write your call notes, key insights, follow-ups, objections heard, or anything on your mind during this session..."
          style={{flex:1,minHeight:420,background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"20px 24px",fontFamily:"'Manrope',sans-serif",fontSize:14,color:T.text,lineHeight:1.75,outline:"none",resize:"none",transition:"border-color 0.2s",color:T.text}}
          onFocus={e=>e.target.style.borderColor=T.primary+"44"} onBlur={e=>e.target.style.borderColor=T.border}/>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.1em"}}>{text.length} chars · {text.split(/\s+/).filter(Boolean).length} words</div>
      </div>
    </div>
  );
}

// Calculator with projections
function CalculatorPanel({onClose}){
  const[mode,setMode]=useState("calc");
  const[display,setDisplay]=useState("0");
  const[prev,setPrev]=useState(null);
  const[op,setOp]=useState(null);
  const[fresh,setFresh]=useState(true);
  const[proj,setProj]=useState({dailyCloses:1,dealValue:5000,calls:50,owners:10,appts:3,closes:1});
  const[result,setResult]=useState(null);
  const[activeF,setActiveF]=useState(null);

  const press=(val)=>{
    if(val==="C"){setDisplay("0");setPrev(null);setOp(null);setFresh(true);return;}
    if(val==="±"){setDisplay(d=>String(-parseFloat(d)));return;}
    if(val==="%"){setDisplay(d=>String(parseFloat(d)/100));return;}
    if(val==="="){if(op&&prev!==null){const a=parseFloat(prev),b=parseFloat(display);let r=op==="+"?a+b:op==="-"?a-b:op==="x"?a*b:b!==0?a/b:"ERR";setDisplay(String(typeof r==="number"?+r.toFixed(10):r));setPrev(null);setOp(null);setFresh(true);}return;}
    if(["+"," -","x","÷"].includes(val)){setPrev(display);setOp(val);setFresh(true);return;}
    if(val==="."){if(fresh){setDisplay("0.");setFresh(false);}else if(!display.includes("."))setDisplay(d=>d+".");return;}
    if(fresh){setDisplay(val);setFresh(false);}else setDisplay(d=>d==="0"?val:d.length<12?d+val:d);
  };

  const calc=(fn)=>{
    setActiveF(fn);const p=proj;
    if(fn==="monthly")setResult({l:"Monthly Revenue",v:`$${(p.dailyCloses*p.dealValue*22).toLocaleString()}`,s:`${p.dailyCloses} closes/day x $${p.dealValue.toLocaleString()} x 22 working days`});
    else if(fn==="weekly")setResult({l:"Weekly Revenue",v:`$${(p.dailyCloses*p.dealValue*5).toLocaleString()}`,s:`${p.dailyCloses} closes/day x $${p.dealValue.toLocaleString()} x 5 days`});
    else if(fn==="annual")setResult({l:"Annual Revenue",v:`$${(p.dailyCloses*p.dealValue*260).toLocaleString()}`,s:`${p.dailyCloses} closes/day x $${p.dealValue.toLocaleString()} x 260 working days`});
    else if(fn==="ownerRate")setResult({l:"Owner Rate",v:`${p.calls>0?((p.owners/p.calls)*100).toFixed(1):0}%`,s:`${p.owners} owners spoken ÷ ${p.calls} calls made`});
    else if(fn==="bookingRate")setResult({l:"Booking Rate",v:`${p.owners>0?((p.appts/p.owners)*100).toFixed(1):0}%`,s:`${p.appts} appts ÷ ${p.owners} owners spoken`});
    else if(fn==="closeRate")setResult({l:"Close Rate",v:`${p.appts>0?((p.closes/p.appts)*100).toFixed(1):0}%`,s:`${p.closes} closed ÷ ${p.appts} appointments`});
    else if(fn==="callsNeeded"){const cr=p.appts>0?(p.closes/p.appts):0.3;const br=p.owners>0?(p.appts/p.owners):0.2;const or=p.calls>0?(p.owners/p.calls):0.15;const n=Math.ceil(p.dailyCloses/(cr*br*or));setResult({l:"Calls Needed / Day",v:String(n),s:`To close ${p.dailyCloses}x/day at your historical rates`});}
    else if(fn==="perClose")setResult({l:"Revenue Per Close",v:`$${p.dealValue.toLocaleString()}`,s:`Each deal closed = $${p.dealValue.toLocaleString()} in revenue`});
  };

  const rows=[["C","±","%","÷"],["7","8","9","x"],["4","5","6","-"],["1","2","3","+"]];
  const fns=[{id:"monthly",l:"Monthly Revenue 📅"},{id:"weekly",l:"Weekly Revenue 📆"},{id:"annual",l:"Annual Revenue 🏆"},{id:"ownerRate",l:"Owner Contact Rate"},{id:"bookingRate",l:"Booking Rate"},{id:"closeRate",l:"Close Rate"},{id:"callsNeeded",l:"Calls Needed / Day"},{id:"perClose",l:"Revenue Per Close"}];

  return(
    <div style={{position:"fixed",bottom:92,left:28,zIndex:300,background:T.card,border:`1px solid ${T.primary}44`,borderRadius:16,width:320,boxShadow:`0 20px 60px rgba(0,0,0,0.8),0 0 40px ${T.primary}18`,overflow:"hidden",maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        {["calc","proj"].map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{flex:1,background:mode===m?T.primary+"22":"transparent",border:"none",padding:"12px 0",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:mode===m?T.primary:T.muted,letterSpacing:"0.15em",cursor:"pointer",textTransform:"uppercase"}}>
            {m==="calc"?"CALCULATOR":"PROJECTIONS"}
          </button>
        ))}
        <button onClick={onClose} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",padding:"0 14px",fontSize:16}}>✕</button>
      </div>
      {mode==="calc"&&(
        <div style={{padding:14}}>
          <div style={{background:T.bg,borderRadius:10,padding:"10px 14px",marginBottom:12,textAlign:"right"}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,minHeight:14}}>{op?`${prev} ${op}`:""}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,color:T.text,lineHeight:1,wordBreak:"break-all",textShadow:`0 0 10px ${T.primary}44`}}>{display.length>10?parseFloat(display).toPrecision(6):display}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
            {rows.flat().map(btn=>{const isOp=["+"," -","x","÷"].includes(btn);const isC=btn==="C";
            return(<button key={btn} onClick={()=>press(btn)} style={{background:isC?T.red+"22":isOp?T.primary+"22":T.card2,color:isC?T.red:isOp?T.primary:T.text,border:`1px solid ${isC?T.red+"33":isOp?T.primary+"33":T.border}`,borderRadius:8,padding:"11px 0",fontFamily:isOp?"'Bebas Neue',sans-serif":"'IBM Plex Mono',monospace",fontSize:13,cursor:"pointer",transition:"background 0.1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=isC?T.red+"33":isOp?T.primary+"33":T.border}
              onMouseLeave={e=>e.currentTarget.style.background=isC?T.red+"22":isOp?T.primary+"22":T.card2}>{btn}</button>);})}
            <button onClick={()=>press("0")} style={{gridColumn:"span 2",background:T.card2,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"11px 0",fontFamily:"'IBM Plex Mono',monospace",fontSize:13,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.border} onMouseLeave={e=>e.currentTarget.style.background=T.card2}>0</button>
            <button onClick={()=>press(".")} style={{background:T.card2,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:"11px 0",fontFamily:"'IBM Plex Mono',monospace",fontSize:13,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.border} onMouseLeave={e=>e.currentTarget.style.background=T.card2}>.</button>
            <button onClick={()=>press("=")} style={{background:`linear-gradient(135deg,${T.primary},${T.purple})`,color:"white",border:"none",borderRadius:8,padding:"11px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:14,cursor:"pointer"}}>=</button>
          </div>
        </div>
      )}
      {mode==="proj"&&(
        <div style={{padding:14,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em",marginBottom:2}}>YOUR NUMBERS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[{k:"dailyCloses",l:"Closes/Day"},{k:"dealValue",l:"Deal Value $"},{k:"calls",l:"Calls"},{k:"owners",l:"Owners"},{k:"appts",l:"Appointments"},{k:"closes",l:"Total Closes"}].map(({k,l})=>(
              <div key={k}><label style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.12em",display:"block",marginBottom:3}}>{l}</label>
              <input type="number" min={0} value={proj[k]} onChange={e=>setProj(p=>({...p,[k]:parseFloat(e.target.value)||0}))} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,padding:"5px 8px",fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:T.text,outline:"none",width:"100%"}} onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border}/></div>
            ))}
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em",marginTop:4}}>CALCULATE</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {fns.map(fn=>(
              <button key={fn.id} onClick={()=>calc(fn.id)} style={{background:activeF===fn.id?T.primary+"22":T.card2,border:`1px solid ${activeF===fn.id?T.primary+"44":T.border}`,borderRadius:8,padding:"9px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:activeF===fn.id?T.primary:T.muted,cursor:"pointer",textAlign:"left",letterSpacing:"0.08em",transition:"all 0.12s"}}
                onMouseEnter={e=>{if(activeF!==fn.id){e.currentTarget.style.background=T.primary+"11";e.currentTarget.style.borderColor=T.primary+"33";}}}
                onMouseLeave={e=>{if(activeF!==fn.id){e.currentTarget.style.background=T.card2;e.currentTarget.style.borderColor=T.border;}}}>{fn.l} →</button>
            ))}
          </div>
          {result&&(
            <div style={{background:`linear-gradient(135deg,${T.primary}18,${T.purple}18)`,border:`1px solid ${T.primary}44`,borderRadius:12,padding:"14px 16px",boxShadow:`0 0 20px ${T.primary}18`}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em",marginBottom:4}}>{result.l.toUpperCase()}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:T.primary,lineHeight:1,textShadow:`0 0 16px ${T.primary}44`}}>{result.v}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,marginTop:4}}>{result.s}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Monthly Export
function MonthlyExport({user,allData}){
  const now=new Date();
  const[month,setMonth]=useState(now.getMonth());
  const[year,setYear]=useState(now.getFullYear());
  const ud=allData[user.id]||{};
  const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const entries=Object.entries(ud).filter(([d])=>{const dt=new Date(d+"T12:00:00");return dt.getMonth()===month&&dt.getFullYear()===year;}).sort(([a],[b])=>a.localeCompare(b));
  const totals=sumEntries(entries.map(([,v])=>v));
  const rates=calcRates(totals);
  const doExport=()=>{
    const headers="Date,Calls,Owners Spoken,Appts Booked,Appts Completed,No-Shows,Deals Closed,Deals Lost,Pipeline";
    const rows=entries.map(([d,e])=>`${d},${e.calls||0},${e.ownersSpoken||0},${e.apptsBooked||0},${e.apptsCompleted||0},${e.apptsNoShow||0},${e.dealsClosed||0},${e.dealsLost||0},${e.leadsInPipeline||0}`);
    const csv=[headers,...rows].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`born-again-${user.name}-${year}-${String(month+1).padStart(2,"0")}.csv`;a.click();URL.revokeObjectURL(url);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:24,animation:"slideUp 0.4s ease"}}>
      <div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.2em",marginBottom:8}}>── MONTHLY EXPORT</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:38,color:T.text,letterSpacing:"0.04em"}}>Export Your Stats</div>
        <div style={{fontFamily:"'Manrope',sans-serif",fontSize:13,color:T.muted,marginTop:6}}>Download a full CSV of your monthly performance to share, analyze, or celebrate.</div>
      </div>
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.15em"}}>SELECT PERIOD:</div>
        <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.text,outline:"none",cursor:"pointer"}}>
          {months.map((m,i)=><option key={i} value={i} style={{background:T.card}}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(parseInt(e.target.value))} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.text,outline:"none",cursor:"pointer"}}>
          {[2024,2025,2026,2027].map(y=><option key={y} value={y} style={{background:T.card}}>{y}</option>)}
        </select>
      </div>
      {entries.length===0?(
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:48,textAlign:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted,letterSpacing:"0.2em"}}>NO DATA FOR {months[month].toUpperCase()} {year}</div>
      ):(
        <>
          <div style={{background:`linear-gradient(135deg,${T.card},${T.card2})`,border:`1px solid ${T.primary}33`,borderRadius:16,padding:"32px 36px",boxShadow:`0 0 40px ${T.primary}11`}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:T.text,letterSpacing:"0.06em",marginBottom:4}}>{months[month].toUpperCase()} {year}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted,marginBottom:24}}>{entries.length} DAYS TRACKED · {user.name.toUpperCase()}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
              {[{l:"Total Calls",v:totals.calls,c:user.color},{l:"Owners Spoken",v:totals.ownersSpoken,c:T.cyan},{l:"Appts Booked",v:totals.apptsBooked,c:T.purple},{l:"Deals Closed",v:totals.dealsClosed,c:T.green}].map(item=>(
                <div key={item.l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,color:item.c,lineHeight:1,textShadow:`0 0 16px ${item.c}44`}}>{item.v}</div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.12em",marginTop:4}}>{item.l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginTop:20,paddingTop:20,borderTop:`1px solid ${T.border}`}}>
              {[{l:"Owner Rate",v:rates.ownerRate+"%"},{l:"Booking Rate",v:rates.bookingRate+"%"},{l:"Show Rate",v:rates.showRate+"%"},{l:"Close Rate",v:rates.closeRate+"%"}].map(item=>(
                <div key={item.l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:T.amber,lineHeight:1}}>{item.v}</div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.12em",marginTop:4}}>{item.l.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"130px repeat(8,1fr)",borderBottom:`1px solid ${T.border}`,padding:"10px 20px"}}>
              {["DATE","CALLS","OWNERS","BOOKED","COMPL.","NO-SHOW","CLOSED","LOST","PIPELINE"].map(h=><div key={h} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.12em"}}>{h}</div>)}
            </div>
            {entries.map(([date,e],i)=>(
              <div key={date} style={{display:"grid",gridTemplateColumns:"130px repeat(8,1fr)",padding:"10px 20px",background:i%2===0?T.card:T.card2,borderBottom:i<entries.length-1?`1px solid ${T.border}`:"none",alignItems:"center"}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.sub}}>{new Date(date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                {[e.calls||0,e.ownersSpoken||0,e.apptsBooked||0,e.apptsCompleted||0,e.apptsNoShow||0,e.dealsClosed||0,e.dealsLost||0,e.leadsInPipeline||0].map((v,j)=>(
                  <div key={j} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:j===5&&v>0?T.green:j===6&&v>0?T.red:T.text}}>{v}</div>
                ))}
              </div>
            ))}
          </div>
          <button onClick={doExport} style={{background:`linear-gradient(135deg,${T.primary},${T.purple})`,color:"white",border:"none",borderRadius:14,padding:"16px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:"0.1em",cursor:"pointer",boxShadow:`0 8px 32px ${T.primary}44`,transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 12px 48px ${T.primary}66`;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow=`0 8px 32px ${T.primary}44`;e.currentTarget.style.transform="translateY(0)";}}>
            ⬇ EXPORT {months[month].toUpperCase()} {year} AS CSV
          </button>
        </>
      )}
    </div>
  );
}

// Login + App Root
function LoginScreen({onLogin,allData}){
  const getStreak=(uid)=>{const map=allData[uid]||{};let s=0,d=new Date();while(true){const k=d.toISOString().split("T")[0];if(map[k]&&map[k].calls>0){s++;d.setDate(d.getDate()-1);}else break;}return s;};
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,position:"relative",overflow:"hidden"}}>
      <AnimatedBackground/>
      <div style={{position:"relative",zIndex:1,textAlign:"center",marginBottom:56}}>
        <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:80,height:80,background:`linear-gradient(135deg,${T.primary},${T.purple})`,borderRadius:24,marginBottom:24,boxShadow:`0 0 40px ${T.primary}66,0 0 80px ${T.purple}33`,animation:"float 4s ease-in-out infinite"}}>
          <span style={{fontFamily:"'Bebas Neue'",fontSize:34,color:"white",letterSpacing:"0.04em"}}>BA</span>
        </div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:52,color:T.text,letterSpacing:"0.1em",lineHeight:1,textShadow:`0 0 40px ${T.primary}44`}}>BORN AGAIN</div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.muted,letterSpacing:"0.25em",marginTop:8}}>SALES INTELLIGENCE PLATFORM</div>
      </div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,letterSpacing:"0.2em",color:T.muted,marginBottom:24,position:"relative",zIndex:1}}>SELECT YOUR PROFILE</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap",justifyContent:"center",position:"relative",zIndex:1}}>
        {USERS.map((u,ui)=>{
          const streak=getStreak(u.id);const td=allData[u.id]?.[todayKey()]||EMPTY_METRICS;
          return(
            <button key={u.id} onClick={()=>onLogin(u)}
              style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,padding:"32px 36px",width:220,display:"flex",flexDirection:"column",alignItems:"center",gap:14,cursor:"pointer",transition:"all 0.25s",animation:`slideUp 0.5s ease ${ui*0.1}s both`}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=u.color+"66";e.currentTarget.style.transform="translateY(-8px)";e.currentTarget.style.boxShadow=`0 20px 60px ${u.color}25`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{width:72,height:72,borderRadius:"50%",background:u.color+"15",border:`2px solid ${u.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue'",fontSize:24,color:u.color,boxShadow:`0 0 20px ${u.color}44`,animation:"float 4s ease-in-out infinite"}}>{u.initials}</div>
              <div style={{fontFamily:"'Manrope',sans-serif",fontWeight:800,fontSize:18,color:T.text,letterSpacing:"0.1em"}}>{u.name.toUpperCase()}</div>
              <div style={{display:"flex",gap:16}}>
                {[{val:td.calls,label:"CALLS",color:u.color},{val:streak,label:"STREAK",color:streak>0?T.green:T.muted},{val:td.dealsClosed,label:"CLOSED",color:td.dealsClosed>0?T.green:T.muted}].map((item,idx)=>(
                  <div key={idx} style={{display:"flex",alignItems:"center",gap:idx>0?16:0}}>
                    {idx>0&&<div style={{width:1,height:28,background:T.border}}/>}
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'Bebas Neue'",fontSize:24,color:item.color,lineHeight:1,textShadow:item.color!==T.muted?`0 0 8px ${item.color}44`:null}}>{item.val}</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:T.muted,letterSpacing:"0.12em",marginTop:2}}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{marginTop:52,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.border,position:"relative",zIndex:1}}>
        {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).toUpperCase()}
      </div>
    </div>
  );
}

export default function App(){
  const{allData,allGoals,allNotes,saveEntry,saveGoals,saveNote,ready}=useAllData();
  const[user,setUser]=useState(null);
  const[view,setView]=useState("today");
  const[tab,setTab]=useState("dashboard");
  const[modalDate,setModalDate]=useState(null);
  const[modalInitial,setModalInitial]=useState(null);
  const[showModal,setShowModal]=useState(false);
  const[showGoalEdit,setShowGoalEdit]=useState(false);
  const[showCalc,setShowCalc]=useState(false);

  const getDisplay=useCallback((uid,v)=>{
    const map=allData[uid]||{};
    if(v==="today")return sumEntries(map[todayKey()]?[map[todayKey()]]:[] );
    if(v==="week")return sumEntries(Object.entries(map).filter(([d])=>new Date(d)>=getWeekStart()).map(([,val])=>val));
    return sumEntries(Object.values(map));
  },[allData]);

  const displayData=user?getDisplay(user.id,view):EMPTY_METRICS;
  const rates=calcRates(displayData);
  const userGoals=user?(allGoals[user.id]||DEFAULT_GOALS):DEFAULT_GOALS;
  const todayData=user?(allData[user.id]?.[todayKey()]||EMPTY_METRICS):EMPTY_METRICS;
  const openModal=(date,initial)=>{setModalDate(date);setModalInitial(initial);setShowModal(true);};
  const handleSaveEntry=async(form)=>{await saveEntry(user.id,modalDate,form);setShowModal(false);};
  const SL=({txt})=><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.22em",marginBottom:12}}>── {txt}</div>;

  const TABS=[{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"dialer",icon:"📞",label:"Live Dialer"},{id:"notes",icon:"📝",label:"Notes"},{id:"charts",icon:"📈",label:"Charts"},{id:"goals",icon:"🎯",label:"Goals"},{id:"history",icon:"📋",label:"History"},{id:"team",icon:"👥",label:"Team"},{id:"export",icon:"⬇",label:"Export"}];

  if(!ready)return<div style={{height:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",color:T.primary,fontSize:11,letterSpacing:"0.2em",textShadow:`0 0 20px ${T.primary}66`}}>LOADING...</div>;
  if(!user)return<LoginScreen onLogin={setUser} allData={allData}/>;

  const viewLabel=view==="today"?"TODAY":view==="week"?"THIS WEEK":"ALL TIME";

  return(
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,color:T.text,position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px;}
        input[type=number]{appearance:textfield;-moz-appearance:textfield;}
        input[type=number]::-webkit-inner-spin-button{opacity:0;}
        button:focus,input:focus{outline:none;}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes glow{0%,100%{box-shadow:0 8px 40px ${T.primary}44}50%{box-shadow:0 8px 60px ${T.primary}88}}
        @keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(80px,-60px) scale(1.1)}66%{transform:translate(-40px,70px) scale(0.95)}}
        @keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-60px,50px) scale(1.05)}66%{transform:translate(50px,-60px) scale(0.92)}}
        @keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,-40px) scale(1.08)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes raceFlag{0%,100%{transform:rotate(-8deg) scale(1)}50%{transform:rotate(8deg) scale(1.18)}}
        @keyframes zoom{from{opacity:0;transform:scale(0.2) rotate(-10deg)}to{opacity:1;transform:scale(1) rotate(0deg)}}
        @keyframes carRace{from{transform:translateX(-400px)}to{transform:translateX(400px)}}
        select option{background:${T.card};}
        textarea{color:${T.text} !important;}
      `}</style>

      <AnimatedBackground/>

      {/* SIDEBAR */}
      <div style={{width:220,flexShrink:0,background:T.card+"EE",borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",zIndex:40,backdropFilter:"blur(12px)"}}>
        <div style={{padding:"22px 20px 18px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,background:`linear-gradient(135deg,${T.primary},${T.purple})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue'",fontSize:15,color:"white",boxShadow:`0 0 16px ${T.primary}44`,flexShrink:0}}>BA</div>
            <div>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:"0.12em",color:T.text}}>BORN AGAIN</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em"}}>SALES INTEL</div>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:user.color+"20",border:`1.5px solid ${user.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:user.color,fontWeight:600,flexShrink:0,boxShadow:`0 0 10px ${user.color}33`}}>{user.initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Manrope',sans-serif",fontWeight:800,fontSize:12,letterSpacing:"0.06em",color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name.toUpperCase()}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.green,letterSpacing:"0.1em"}}>● ACTIVE</div>
          </div>
          <button onClick={()=>{setUser(null);setView("today");setTab("dashboard");}} style={{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:6,padding:"3px 8px",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,cursor:"pointer",flexShrink:0,letterSpacing:"0.1em"}}>OUT</button>
        </div>
        <nav style={{flex:1,overflowY:"auto",padding:"10px 0"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"10px 20px",background:tab===t.id?T.primary+"18":"transparent",border:"none",borderLeft:`3px solid ${tab===t.id?user.color:"transparent"}`,color:tab===t.id?T.text:T.muted,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,letterSpacing:"0.1em",cursor:"pointer",transition:"all 0.15s",textAlign:"left"}}
              onMouseEnter={e=>{if(tab!==t.id)e.currentTarget.style.background=T.primary+"0A";}}
              onMouseLeave={e=>{if(tab!==t.id)e.currentTarget.style.background="transparent";}}>
              <span style={{fontSize:15,flexShrink:0}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"14px 14px",borderTop:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em",marginBottom:8}}>VIEW RANGE</div>
          <div style={{display:"flex",background:T.bg,borderRadius:8,padding:2,gap:1}}>
            {[["today","TODAY"],["week","WEEK"],["alltime","ALL"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{flex:1,background:view===v?T.primary+"33":"transparent",color:view===v?T.primary:T.muted,border:view===v?`1px solid ${T.primary}44`:"1px solid transparent",borderRadius:6,padding:"6px 0",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"0.08em",cursor:"pointer",transition:"all 0.15s"}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,position:"relative",zIndex:1}}>
        <div style={{background:T.card+"CC",borderBottom:`1px solid ${T.border}`,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",backdropFilter:"blur(8px)",position:"sticky",top:0,zIndex:30}}>
          <div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted,letterSpacing:"0.2em"}}>{TABS.find(t=>t.id===tab)?.icon} {TABS.find(t=>t.id===tab)?.label.toUpperCase()} — {viewLabel}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:T.text,letterSpacing:"0.04em",lineHeight:1.1}}>{user.name}'s Dashboard</div>
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted,letterSpacing:"0.15em"}}>{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"}).toUpperCase()}</div>
        </div>
        <main style={{flex:1,padding:"28px 32px",overflowY:"auto",paddingBottom:120}}>

          {tab==="dashboard"&&(<div style={{display:"flex",flexDirection:"column",gap:28,animation:"slideUp 0.4s ease"}}>
            <div><SL txt="ACTIVITY"/><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              <StatCard label="Calls Made" value={displayData.calls} accent={user.color} sub="Total dials"/>
              <StatCard label="Owners Spoken To" value={displayData.ownersSpoken} accent={user.color} sub="Decision makers"/>
              <StatCard label="Appointments Booked" value={displayData.apptsBooked} accent={T.cyan} sub="Meetings set"/>
              <StatCard label="Leads in Pipeline" value={displayData.leadsInPipeline} accent={T.purple} sub="Active opps"/>
            </div></div>
            <div><SL txt="CONVERSION RATES"/><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              <RateCard label="Owner Contact Rate" value={rates.ownerRate} sub={`${displayData.ownersSpoken} of ${displayData.calls} → owner`}/>
              <RateCard label="Booking Rate" value={rates.bookingRate} sub={`${displayData.apptsBooked} of ${displayData.ownersSpoken} → booked`}/>
              <RateCard label="Show-Up Rate" value={rates.showRate} sub={`${displayData.apptsCompleted} showed / ${displayData.apptsNoShow} no-show`}/>
              <RateCard label="Close Rate" value={rates.closeRate} sub={`${displayData.dealsClosed} closed / ${displayData.dealsLost} lost`}/>
            </div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div><SL txt="APPOINTMENTS"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <StatCard label="Completed" value={displayData.apptsCompleted} accent={T.green} sub="Showed up"/>
                <StatCard label="No-Shows" value={displayData.apptsNoShow} accent={T.red} sub="Ghosted"/>
              </div></div>
              <div><SL txt="DEALS"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <StatCard label="Closed 🔥" value={displayData.dealsClosed} accent={T.green} sub="Revenue in"/>
                <StatCard label="Lost" value={displayData.dealsLost} accent={T.red} sub="Fell through"/>
              </div></div>
            </div>
          </div>)}

          {tab==="dialer"&&<LiveDialer user={user} allData={allData} allGoals={allGoals} saveEntry={saveEntry}/>}
          {tab==="notes"&&<Notes user={user} allNotes={allNotes} saveNote={saveNote}/>}

          {tab==="charts"&&(<div style={{display:"flex",flexDirection:"column",gap:28,animation:"slideUp 0.4s ease"}}>
            <div><SL txt="YOUR LAST 7 DAYS"/><WeeklyChart allData={allData} user={user}/></div>
            <div><SL txt="TEAM — THIS WEEK"/><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {USERS.map(u=>{const map=allData[u.id]||{},ws=getWeekStart();const entries=Object.entries(map).filter(([d])=>new Date(d)>=ws).map(([,v])=>v);const totals=sumEntries(entries);
              return(<div key={u.id} style={{background:T.card,border:`1px solid ${u.color}22`,borderRadius:12,padding:"22px 24px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:u.color+"18",border:`2px solid ${u.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:u.color,fontWeight:600,boxShadow:`0 0 10px ${u.color}33`}}>{u.initials}</div>
                  <span style={{fontFamily:"'Manrope',sans-serif",fontWeight:800,fontSize:13,color:T.text,letterSpacing:"0.06em"}}>{u.name.toUpperCase()}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {[{l:"Calls",v:totals.calls,c:u.color},{l:"Owners",v:totals.ownersSpoken,c:u.color},{l:"Appts",v:totals.apptsBooked,c:T.cyan},{l:"Closed",v:totals.dealsClosed,c:T.green}].map(item=>(<div key={item.l}><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.12em"}}>{item.l}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:item.c,lineHeight:1,textShadow:`0 0 8px ${item.c}33`}}>{item.v}</div></div>))}
                </div>
              </div>);})}
            </div></div>
          </div>)}

          {tab==="goals"&&(<div style={{display:"flex",flexDirection:"column",gap:28,animation:"slideUp 0.4s ease"}}>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <SL txt="TODAY'S PROGRESS VS GOALS"/>
                <button onClick={()=>setShowGoalEdit(true)} style={{background:"transparent",color:user.color,border:`1px solid ${user.color}44`,borderRadius:6,padding:"6px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"0.12em",cursor:"pointer"}}>EDIT GOALS</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                <GoalProgress label="Calls Made" current={todayData.calls} goal={userGoals.calls} color={user.color}/>
                <GoalProgress label="Owners Spoken" current={todayData.ownersSpoken} goal={userGoals.ownersSpoken} color={user.color}/>
                <GoalProgress label="Appointments" current={todayData.apptsBooked} goal={userGoals.apptsBooked} color={T.cyan}/>
                <GoalProgress label="Deals Closed" current={todayData.dealsClosed} goal={userGoals.dealsClosed} color={T.green}/>
              </div>
            </div>
            <div><SL txt="THIS WEEK VS GOALS (×7)"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                {(()=>{const ws=getWeekStart(),map=allData[user.id]||{};const wE=Object.entries(map).filter(([d])=>new Date(d)>=ws).map(([,v])=>v);const wT=sumEntries(wE);
                return[{l:"Week Calls",c:wT.calls,g:userGoals.calls*7,col:user.color},{l:"Week Owners",c:wT.ownersSpoken,g:userGoals.ownersSpoken*7,col:user.color},{l:"Week Appts",c:wT.apptsBooked,g:userGoals.apptsBooked*7,col:T.cyan},{l:"Week Closed",c:wT.dealsClosed,g:userGoals.dealsClosed*7,col:T.green}].map(item=>(<GoalProgress key={item.l} label={item.l} current={item.c} goal={item.g} color={item.col}/>));})()}
              </div>
            </div>
            <div><SL txt="TEAM — TODAY"/>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {USERS.map(u=>{const td=allData[u.id]?.[todayKey()]||EMPTY_METRICS;const goals=allGoals[u.id]||DEFAULT_GOALS;const pct=goals.calls>0?Math.min((td.calls/goals.calls)*100,100):0;
                return(<div key={u.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 22px",display:"flex",alignItems:"center",gap:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,width:140,flexShrink:0}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:u.color+"18",border:`2px solid ${u.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:u.color,fontWeight:600,boxShadow:`0 0 8px ${u.color}33`}}>{u.initials}</div>
                    <span style={{fontFamily:"'Manrope',sans-serif",fontWeight:800,fontSize:13,color:T.text,letterSpacing:"0.06em"}}>{u.name.toUpperCase()}</span>
                  </div>
                  <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.muted}}>CALLS: {td.calls} / {goals.calls}</span><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:pct>=100?T.green:u.color,textShadow:pct>=100?`0 0 8px ${T.green}66`:null}}>{pct.toFixed(0)}%</span></div>
                  <div style={{height:4,background:T.card2,borderRadius:2}}><div style={{height:"100%",width:`${pct}%`,background:pct>=100?T.green:u.color,borderRadius:2,transition:"width 0.8s ease",boxShadow:`0 0 8px ${pct>=100?T.green:u.color}66`}}/></div></div>
                  <div style={{display:"flex",gap:20,flexShrink:0}}>
                    {[{l:"APPTS",v:`${td.apptsBooked}/${goals.apptsBooked}`},{l:"CLOSED",v:`${td.dealsClosed}/${goals.dealsClosed}`,c:td.dealsClosed>=goals.dealsClosed?T.green:undefined}].map(item=>(
                      <div key={item.l} style={{textAlign:"center"}}><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.1em"}}>{item.l}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:item.c||T.text}}>{item.v}</div></div>
                    ))}
                  </div>
                </div>);})}
              </div>
            </div>
          </div>)}

          {tab==="history"&&(<div style={{animation:"slideUp 0.4s ease"}}><SL txt="ENTRY HISTORY — ALL TIME (✏ to edit any entry)"/><HistoryLog userData={allData[user.id]||{}} userColor={user.color} onEdit={(date,entry)=>openModal(date,entry)}/></div>)}
          {tab==="team"&&(<div style={{animation:"slideUp 0.4s ease"}}><SL txt={`TEAM LEADERBOARD — ${viewLabel}`}/><Leaderboard allData={allData} view={view}/></div>)}
          {tab==="export"&&<MonthlyExport user={user} allData={allData}/>}

        </main>
      </div>

      {/* FAB */}
      {tab!=="dialer"&&(
        <button onClick={()=>openModal(todayKey(),allData[user.id]?.[todayKey()]||{...EMPTY_METRICS})}
          onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.boxShadow=`0 12px 48px ${user.color}66`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=`0 8px 36px ${user.color}44`;}}
          style={{position:"fixed",bottom:28,right:28,background:`linear-gradient(135deg,${user.color},${T.purple})`,color:"white",border:"none",borderRadius:14,padding:"14px 24px",fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:"0.1em",cursor:"pointer",boxShadow:`0 8px 36px ${user.color}44`,transition:"all 0.2s",zIndex:50}}>
          + LOG TODAY'S NUMBERS
        </button>
      )}

      {/* Calc FAB */}
      <button onClick={()=>setShowCalc(c=>!c)}
        style={{position:"fixed",bottom:28,left:240,background:showCalc?T.primary+"33":T.card,color:T.text,border:`1px solid ${showCalc?T.primary+"66":T.border}`,borderRadius:12,padding:"12px 18px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,letterSpacing:"0.1em",cursor:"pointer",zIndex:50,transition:"all 0.15s",boxShadow:showCalc?`0 0 20px ${T.primary}33`:"none"}}>
        🧮 CALC
      </button>

      {showCalc&&<CalculatorPanel onClose={()=>setShowCalc(false)}/>}
      {showModal&&<EntryModal user={user} date={modalDate} initial={modalInitial||{...EMPTY_METRICS}} onSave={handleSaveEntry} onClose={()=>setShowModal(false)}/>}
      {showGoalEdit&&<GoalSettingsModal goals={userGoals} userColor={user.color} onSave={async(goals)=>{await saveGoals(user.id,goals);setShowGoalEdit(false);}} onClose={()=>setShowGoalEdit(false)}/>}
    </div>
  );
}
