
import React, { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Waves, ClipboardList, Gauge, Utensils, Flame, AlertTriangle, Plus, X, ChevronRight, Anchor } from "lucide-react";

const SCHEDULE = [
  { day: "Monday", sessions: [
    { id: "mon-am", time: "6:00am · school", title: "Erg — squad session", kind: "fixed", detail: "Erg selection set by coaches on the day." },
    { id: "mon-pm", time: "4:00pm · own time", title: "Steady state row/bike (UT2)", kind: "self", detail: "40–45 min continuous, easy conversational pace, rate 18–20spm. Aerobic base — not a hard session." },
  ]},
  { day: "Tuesday", sessions: [
    { id: "tue-am", time: "6:00am · school", title: "Gym circuit", kind: "fixed", detail: "5 exercises × 10–15 reps, 5 rounds through, then core." },
    { id: "tue-pm", time: "3:30pm · school", title: "Erg — squad session", kind: "fixed", detail: "Erg selection set by coaches on the day." },
  ]},
  { day: "Wednesday", sessions: [
    { id: "wed-am", time: "6:00am · school", title: "Erg — squad session", kind: "fixed", detail: "Erg selection set by coaches on the day." },
    { id: "wed-pm", time: "4:00pm · own time", title: "Strength support + core", kind: "self", detail: "3 sets: goblet/split squat, single-leg RDL, plank & side-plank series. Keep it light — legs already loaded Tue/Thu gym." },
  ]},
  { day: "Thursday", sessions: [
    { id: "thu-am", time: "6:00am · school", title: "Gym circuit", kind: "fixed", detail: "Same structure as Tuesday." },
    { id: "thu-pm", time: "4:00pm · school", title: "On water", kind: "fixed", detail: "" },
  ]},
  { day: "Friday", sessions: [
    { id: "fri-pm", time: "4:00pm · own time", title: "Recovery — easy spin or mobility", kind: "recovery", detail: "30 min genuinely easy bike/swim OR a full mobility + stretch session. This exists to help you arrive fresh for Saturday, not to add fatigue." },
  ]},
  { day: "Saturday", sessions: [
    { id: "sat-water", time: "AM · school", title: "On water", kind: "fixed", detail: "" },
    { id: "sat-run", time: "AM · school", title: "5km run", kind: "fixed", detail: "" },
  ]},
  { day: "Sunday", sessions: [
    { id: "sun-am", time: "Morning · own time", title: "Long steady row/bike", kind: "self", detail: "60 min steady aerobic, easy HR. On test weeks (every 3–4 weeks) this slot becomes the 10min + 500m test instead — see the Testing tab." },
    { id: "sun-pm", time: "Afternoon · own time", title: "Recovery — mobility & stretch", kind: "recovery", detail: "20–30 min foam roll + hip/shoulder mobility + stretching. Not a training stimulus — genuine recovery." },
  ]},
];

const ALT_ACTIVITIES = ["Bike", "Swim", "Mobility only", "Full rest", "Other"];
const GOAL_2K_SEC = 6 * 60 + 30;
const CURRENT_2K_SEC = 7 * 60;

function uid() { return Math.random().toString(36).slice(2, 10); }
function secToSplit(sec) { const m = Math.floor(sec / 60); const s = (sec % 60).toFixed(1).padStart(4, "0"); return `${m}:${s}`; }
function parseSplitToSec(str) {
  const m = str.match(/^(\d+):(\d+(\.\d+)?)$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseFloat(m[2]);
}

const EMPTY_DATA = { logs: [], tests: [], diet: [], swaps: {} };

export default function RowTrainer() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rowtrainer-data");
      if (saved) setData(JSON.parse(saved));
    } catch (e) {}
    setLoaded(true);
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    try {
      localStorage.setItem("rowtrainer-data", JSON.stringify(next));
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2200); }

  if (!loaded) return <div style={S.loadingScreen}><div style={S.loadingText}>Loading logbook…</div></div>;

  return (
    <div style={S.app}>
      <GlobalStyle />
      <Header />
      <div style={S.body}>
        {tab === "dashboard" && <Dashboard data={data} setTab={setTab} />}
        {tab === "schedule" && <Schedule data={data} persist={persist} showToast={showToast} />}
        {tab === "log" && <LogTab data={data} persist={persist} showToast={showToast} />}
        {tab === "testing" && <Testing data={data} persist={persist} showToast={showToast} />}
        {tab === "diet" && <Diet data={data} persist={persist} showToast={showToast} />}
      </div>
      <NavBar tab={tab} setTab={setTab} />
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

function GlobalStyle() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #root { margin: 0; min-height: 100%; background: #0B1A22; }
    body { overscroll-behavior: none; }
    ::-webkit-scrollbar { width: 0px; height: 0px; }
    button { font-family: inherit; cursor: pointer; }
    input, textarea, select { font-family: inherit; }
  `}</style>;
}

const COLORS = {
  bg: "#0B1A22", bg2: "#0F222B", card: "#132B36", cardBorder: "#1E3D49",
  cyan: "#4FD1C5", amber: "#E8A33D", coral: "#E8735D",
  text: "#E7EEF1", muted: "#7FA0AC", mutedDim: "#5A7982",
};

const S = {
  app: { minHeight: "100dvh", background: `linear-gradient(180deg, ${COLORS.bg} 0%, #081319 100%)`, color: COLORS.text, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" },
  body: { flex: 1, padding: "0 16px calc(100px + env(safe-area-inset-bottom)) 16px", overflowY: "auto" },
  loadingScreen: { minHeight: "100dvh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" },
  loadingText: { color: COLORS.muted, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, letterSpacing: 1 },
  toast: { position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: COLORS.cyan, color: "#04211D", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 50, maxWidth: 380, textAlign: "center" },
};

function Header() {
  return <div style={{ padding: "22px 18px 16px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${COLORS.cardBorder}`, paddingTop: "calc(22px + env(safe-area-inset-top))" }}>
    <Anchor size={22} color={COLORS.cyan} />
    <div><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 0.5, lineHeight: 1 }}>ROAD TO THE EIGHT</div>
    <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>Season prep · sub-6:30</div></div>
  </div>;
}

function NavBar({ tab, setTab }) {
  const items = [
    { id: "dashboard", label: "Home", icon: Gauge }, { id: "schedule", label: "Schedule", icon: Waves },
    { id: "log", label: "Log", icon: ClipboardList }, { id: "testing", label: "Testing", icon: Flame },
    { id: "diet", label: "Diet", icon: Utensils },
  ];
  return <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 0, width: "100%", maxWidth: 480, background: "rgba(11,26,34,0.92)", backdropFilter: "blur(8px)", borderTop: `1px solid ${COLORS.cardBorder}`, display: "flex", padding: "8px 4px calc(8px + env(safe-area-inset-bottom))", zIndex: 40 }}>
    {items.map(({ id, label, icon: Icon }) => { const active = tab === id; return <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", color: active ? COLORS.cyan : COLORS.mutedDim }}>
      <Icon size={20} strokeWidth={active ? 2.4 : 1.8} /><span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, letterSpacing: 0.3 }}>{label}</span>
    </button>; })}
  </div>;
}

function SectionTitle({ children, sub }) { return <div style={{ margin: "22px 0 10px" }}><div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: 0.4 }}>{children}</div>{sub && <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 2 }}>{sub}</div>}</div>; }
function Card({ children, style }) { return <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14, padding: 16, ...style }}>{children}</div>; }

function getNextSession() {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], today = new Date().getDay();
  for (let i=0;i<7;i++) { const dayName = days[(today+i)%7], d=SCHEDULE.find(x=>x.day===dayName); if(d) return {day:dayName,session:d.sessions[0],isToday:i===0}; }
  return null;
}
function bestErgTrend(logs) { return logs.filter(l=>l.metricType==="split"&&l.splitSec).sort((a,b)=>new Date(a.date)-new Date(b.date)).map(l=>({date:l.date.slice(5),split:Math.round(l.splitSec*10)/10})); }

function Dashboard({data,setTab}) {
  const next=getNextSession(), trend=bestErgTrend(data.logs), totalSessions=SCHEDULE.reduce((a,d)=>a+d.sessions.length,0);
  const thisWeekLogs=data.logs.filter(l=>{const d=new Date(l.date),now=new Date();const diff=(now-d)/86400000;return diff>=0&&diff<7;});
  const pct=Math.min(100,Math.round((thisWeekLogs.length/totalSessions)*100));
  return <div><SectionTitle sub="Where you're at, at a glance">Dashboard</SectionTitle>
    <Card style={{background:`linear-gradient(135deg, ${COLORS.card}, #0E2530)`,position:"relative",overflow:"hidden"}}><div style={{fontSize:11,color:COLORS.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>2k pace gap to goal</div>
      <PaceGauge current={trend.length?trend[trend.length-1].split:CURRENT_2K_SEC} goal={GOAL_2K_SEC}/><div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:12.5,color:COLORS.muted}}><span>Current: <b style={{color:COLORS.text}}>{secToSplit(trend.length?trend[trend.length-1].split:CURRENT_2K_SEC)}</b></span><span>Goal: <b style={{color:COLORS.cyan}}>{secToSplit(GOAL_2K_SEC)}</b></span></div>
    </Card>
    {next&&<Card style={{marginTop:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,color:COLORS.amber,textTransform:"uppercase",letterSpacing:1.2,fontWeight:700}}>{next.isToday?"Today":next.day}</div><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:20,fontWeight:700,marginTop:2}}>{next.session.title}</div><div style={{fontSize:12.5,color:COLORS.muted,marginTop:2}}>{next.session.time}</div></div><button onClick={()=>setTab("schedule")} style={{background:"none",border:"none",color:COLORS.cyan}}><ChevronRight size={22}/></button></div></Card>}
    <Card style={{marginTop:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}><div style={{fontSize:13,fontWeight:600}}>This week's consistency</div><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:22,fontWeight:700,color:COLORS.cyan}}>{pct}%</div></div><div style={{height:8,background:"#0A1D25",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.amber})`}}/></div><div style={{fontSize:11.5,color:COLORS.mutedDim,marginTop:6}}>{thisWeekLogs.length} of {totalSessions} sessions logged</div></Card>
    {trend.length>=2&&<Card style={{marginTop:14}}><div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Split trend</div><ResponsiveContainer width="100%" height={140}><LineChart data={trend}><CartesianGrid stroke="#1E3D49" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" stroke={COLORS.mutedDim} fontSize={10} tickLine={false} axisLine={false}/><YAxis domain={["dataMin - 3","dataMax + 3"]} stroke={COLORS.mutedDim} fontSize={10} tickLine={false} axisLine={false} tickFormatter={secToSplit} width={44} reversed/><Tooltip contentStyle={{background:COLORS.bg2,border:`1px solid ${COLORS.cardBorder}`,borderRadius:8,fontSize:12}} formatter={v=>[secToSplit(v),"split /500m"]}/><Line type="monotone" dataKey="split" stroke={COLORS.amber} strokeWidth={2.5} dot={{r:3}}/></LineChart></ResponsiveContainer></Card>}
  </div>;
}
function PaceGauge({current,goal}) { const spread=CURRENT_2K_SEC-goal+10, clamped=Math.max(goal-5,Math.min(CURRENT_2K_SEC+5,current)), pct=Math.max(2,Math.min(100,((CURRENT_2K_SEC+5-clamped)/spread)*100)); return <div style={{marginTop:4}}><div style={{position:"relative",height:10,background:"#0A1D25",borderRadius:6}}><div style={{position:"absolute",inset:"0 auto 0 0",width:`${pct}%`,background:`linear-gradient(90deg, ${COLORS.coral}, ${COLORS.amber}, ${COLORS.cyan})`,borderRadius:6}}/><div style={{position:"absolute",right:0,top:-3,width:3,height:16,background:COLORS.cyan,borderRadius:2}}/></div></div>; }

function Schedule({data,persist,showToast}) {
  const [swapModal,setSwapModal]=useState(null), todayKey=new Date().toISOString().slice(0,10);
  function applySwap(sessionId,activity,note){persist({...data,swaps:{...data.swaps,[`${todayKey}_${sessionId}`]:{activity,note,date:todayKey}}});showToast(`Swapped to ${activity} for today`);setSwapModal(null);}
  function clearSwap(id){const key=`${todayKey}_${id}`,next={...data,swaps:{...data.swaps}};delete next.swaps[key];persist(next);}
  return <div><SectionTitle sub="Fixed = set by the squad. Own time = sessions you run yourself.">Weekly Schedule</SectionTitle>{SCHEDULE.map(d=><div key={d.day} style={{marginBottom:18}}><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:15,fontWeight:700,color:COLORS.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{d.day}</div>{d.sessions.map(s=>{const swap=data.swaps[`${todayKey}_${s.id}`];return <Card key={s.id} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}><Badge kind={s.kind}/><div style={{fontWeight:700,fontSize:14.5}}>{swap?`${s.title} → ${swap.activity}`:s.title}</div></div><div style={{fontSize:12,color:COLORS.muted,marginTop:4}}>{s.time}</div>{s.detail&&<div style={{fontSize:12.5,color:COLORS.mutedDim,marginTop:6,lineHeight:1.4}}>{s.detail}</div>}{swap&&<div style={{fontSize:12,color:COLORS.amber,marginTop:6}}>Swapped today{swap.note?`: ${swap.note}`:""}</div>}</div>{swap?<button onClick={()=>clearSwap(s.id)} style={{background:"none",border:`1px solid ${COLORS.cardBorder}`,borderRadius:8,color:COLORS.mutedDim,padding:"6px 8px",fontSize:11}}>Undo</button>:<button onClick={()=>setSwapModal(s)} style={{background:"none",border:`1px solid ${COLORS.cardBorder}`,borderRadius:8,color:COLORS.coral,padding:"6px 8px",fontSize:11,whiteSpace:"nowrap"}}>Injury swap</button>}</div></Card>})}</div>)}{swapModal&&<SwapModal session={swapModal} onClose={()=>setSwapModal(null)} onApply={applySwap}/>}</div>;
}
function Badge({kind}){const map={fixed:{label:"SQUAD",color:COLORS.cyan},self:{label:"OWN TIME",color:COLORS.amber},recovery:{label:"RECOVERY",color:COLORS.mutedDim}},m=map[kind]||map.self;return <span style={{fontSize:9.5,fontWeight:700,letterSpacing:.8,color:m.color,border:`1px solid ${m.color}55`,borderRadius:5,padding:"2px 6px"}}>{m.label}</span>;}
function SwapModal({session,onClose,onApply}){const [activity,setActivity]=useState(ALT_ACTIVITIES[0]),[note,setNote]=useState("");return <ModalShell onClose={onClose} title={`Swap: ${session.title}`}><div style={{fontSize:12.5,color:COLORS.muted,marginBottom:12}}>Injured or need a lighter option today? Log a substitute so it's still tracked.</div><FieldLabel>Replace with</FieldLabel><select value={activity} onChange={e=>setActivity(e.target.value)} style={inputStyle}>{ALT_ACTIVITIES.map(a=><option key={a}>{a}</option>)}</select><FieldLabel>Note (optional)</FieldLabel><input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. sore left knee, took it easy" style={inputStyle}/><div style={{fontSize:11.5,color:COLORS.coral,marginTop:10,lineHeight:1.4}}>If pain persists more than a couple of sessions, tell your coach or a physio — don't just keep swapping around it.</div><button onClick={()=>onApply(session.id,activity,note)} style={primaryBtn}>Confirm swap</button></ModalShell>;}

const METRIC_TYPES=[{id:"split",label:"Erg split (e.g. 1:48.2 /500m)"},{id:"distance",label:"Distance (m)"},{id:"weight",label:"Weight lifted (kg)"},{id:"rpe",label:"RPE only (1–10)"},{id:"note",label:"Notes only"}];
function LogTab({data,persist,showToast}){const [showForm,setShowForm]=useState(false),sorted=[...data.logs].sort((a,b)=>new Date(b.date)-new Date(a.date));function addLog(entry){persist({...data,logs:[{id:uid(),...entry},...data.logs]});showToast("Session logged");setShowForm(false)}function deleteLog(id){persist({...data,logs:data.logs.filter(l=>l.id!==id)})}return <div><SectionTitle sub="Enter what you actually did — splits, weights, or just how it felt">Session Log</SectionTitle><button onClick={()=>setShowForm(true)} style={{...primaryBtn,marginTop:0,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Plus size={16}/> Log a session</button>{sorted.length===0&&<EmptyState text="No sessions logged yet. Add your first one above."/>}{sorted.map(l=><Card key={l.id} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:700,fontSize:14}}>{l.title}</div><div style={{fontSize:11.5,color:COLORS.muted,marginTop:2}}>{l.date}</div>{l.value&&<div style={{fontSize:13,color:COLORS.cyan,marginTop:6,fontWeight:600}}>{l.value}</div>}{l.rpe&&<div style={{fontSize:11.5,color:COLORS.amber,marginTop:4}}>RPE {l.rpe}/10</div>}{l.notes&&<div style={{fontSize:12.5,color:COLORS.mutedDim,marginTop:4}}>{l.notes}</div>}</div><button onClick={()=>deleteLog(l.id)} style={{background:"none",border:"none",color:COLORS.mutedDim}}><X size={16}/></button></div></Card>)}{showForm&&<LogForm onClose={()=>setShowForm(false)} onSave={addLog}/>}</div>;}
function LogForm({onClose,onSave}){const [title,setTitle]=useState(""),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[metricType,setMetricType]=useState("split"),[rawValue,setRawValue]=useState(""),[rpe,setRpe]=useState(""),[notes,setNotes]=useState("");function save(){if(!title.trim())return;let value=rawValue,splitSec=null;if(metricType==="split"){splitSec=parseSplitToSec(rawValue.trim());value=rawValue.trim()?`${rawValue.trim()} /500m`:""}else if(metricType==="distance")value=rawValue?`${rawValue} m`:"";else if(metricType==="weight")value=rawValue?`${rawValue} kg`:"";else if(metricType==="rpe")value="";onSave({title:title.trim(),date,metricType,value,splitSec,rpe:rpe||null,notes:notes.trim()})}return <ModalShell onClose={onClose} title="Log a session"><FieldLabel>What did you do</FieldLabel><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Mon PM steady state" style={inputStyle}/><FieldLabel>Date</FieldLabel><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/><FieldLabel>Metric</FieldLabel><select value={metricType} onChange={e=>setMetricType(e.target.value)} style={inputStyle}>{METRIC_TYPES.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select>{metricType!=="note"&&metricType!=="rpe"&&<input value={rawValue} onChange={e=>setRawValue(e.target.value)} placeholder={metricType==="split"?"1:48.2":"e.g. 8500"} style={inputStyle}/>}<FieldLabel>RPE (optional, 1–10)</FieldLabel><input value={rpe} onChange={e=>setRpe(e.target.value.replace(/[^0-9]/g,""))} placeholder="6" style={inputStyle}/><FieldLabel>Notes</FieldLabel><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="How did it feel? Anything to remember?" style={{...inputStyle,resize:"vertical"}}/><button onClick={save} style={primaryBtn}>Save session</button></ModalShell>;}

function Testing({data,persist,showToast}){const [showForm,setShowForm]=useState(false),tests10=data.tests.filter(t=>t.type==="10min").sort((a,b)=>new Date(a.date)-new Date(b.date)),tests500=data.tests.filter(t=>t.type==="500m").sort((a,b)=>new Date(a.date)-new Date(b.date)),lastTest=[...data.tests].sort((a,b)=>new Date(b.date)-new Date(a.date))[0],daysSince=lastTest?Math.floor((new Date()-new Date(lastTest.date))/86400000):null;function addTest(entry){persist({...data,tests:[{id:uid(),...entry},...data.tests]});showToast("Test result saved");setShowForm(false)}function deleteTest(id){persist({...data,tests:data.tests.filter(t=>t.id!==id)})}return <div><SectionTitle sub="Every 3–4 weeks, not every week">Testing</SectionTitle><Card style={{borderColor:`${COLORS.amber}55`}}><div style={{display:"flex",gap:8,alignItems:"flex-start"}}><AlertTriangle size={16} color={COLORS.amber}/><div style={{fontSize:12.5,color:COLORS.muted,lineHeight:1.5}}>Max-effort test pieces are useful but taxing. Testing weekly adds fatigue without adding much new information — {daysSince!==null?<>it's been <b style={{color:COLORS.text}}>{daysSince} days</b> since your last test.</>:"space these out every 3–4 weeks."}</div></div></Card><button onClick={()=>setShowForm(true)} style={{...primaryBtn,marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Plus size={16}/> Record a test result</button>{tests500.length>0&&<Card style={{marginTop:14}}><div style={{fontSize:13,fontWeight:600,marginBottom:10}}>500m test trend</div><ResponsiveContainer width="100%" height={130}><LineChart data={tests500.map(t=>({date:t.date.slice(5),sec:t.valueSec}))}><CartesianGrid stroke="#1E3D49" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" stroke={COLORS.mutedDim} fontSize={10} tickLine={false} axisLine={false}/><YAxis stroke={COLORS.mutedDim} fontSize={10} tickLine={false} axisLine={false} tickFormatter={secToSplit} width={44} reversed/><Tooltip contentStyle={{background:COLORS.bg2,border:`1px solid ${COLORS.cardBorder}`,borderRadius:8,fontSize:12}} formatter={v=>[secToSplit(v),"500m time"]}/><Line type="monotone" dataKey="sec" stroke={COLORS.cyan} strokeWidth={2.5} dot={{r:3}}/></LineChart></ResponsiveContainer></Card>}{tests10.length>0&&<Card style={{marginTop:14}}><div style={{fontSize:13,fontWeight:600,marginBottom:10}}>10min test — meters covered</div><ResponsiveContainer width="100%" height={130}><LineChart data={tests10.map(t=>({date:t.date.slice(5),m:t.valueMeters}))}><CartesianGrid stroke="#1E3D49" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" stroke={COLORS.mutedDim} fontSize={10} tickLine={false} axisLine={false}/><YAxis stroke={COLORS.mutedDim} fontSize={10} tickLine={false} axisLine={false} width={44}/><Tooltip contentStyle={{background:COLORS.bg2,border:`1px solid ${COLORS.cardBorder}`,borderRadius:8,fontSize:12}}/><Line type="monotone" dataKey="m" stroke={COLORS.amber} strokeWidth={2.5} dot={{r:3}}/></LineChart></ResponsiveContainer></Card>}<div style={{marginTop:14}}>{[...data.tests].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=><Card key={t.id} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:700,fontSize:13.5}}>{t.type==="10min"?"10 minute test":"500m test"}</div><div style={{fontSize:11.5,color:COLORS.muted,marginTop:2}}>{t.date}</div><div style={{fontSize:13,color:COLORS.cyan,marginTop:4,fontWeight:600}}>{t.type==="10min"?`${t.valueMeters} m`:secToSplit(t.valueSec)}</div>{t.notes&&<div style={{fontSize:12,color:COLORS.mutedDim,marginTop:4}}>{t.notes}</div>}</div><button onClick={()=>deleteTest(t.id)} style={{background:"none",border:"none",color:COLORS.mutedDim}}><X size={16}/></button></div></Card>)}</div>{showForm&&<TestForm onClose={()=>setShowForm(false)} onSave={addTest}/>}</div>;}
function TestForm({onClose,onSave}){const [type,setType]=useState("500m"),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[val,setVal]=useState(""),[notes,setNotes]=useState("");function save(){if(type==="500m"){const sec=parseSplitToSec(val.trim());if(!sec)return;onSave({type,date,valueSec:sec,notes:notes.trim()})}else{const m=parseInt(val);if(!m)return;onSave({type,date,valueMeters:m,notes:notes.trim()})}}return <ModalShell onClose={onClose} title="Record test result"><FieldLabel>Test type</FieldLabel><select value={type} onChange={e=>setType(e.target.value)} style={inputStyle}><option value="500m">500m time trial</option><option value="10min">10 minute test (distance)</option></select><FieldLabel>Date</FieldLabel><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/><FieldLabel>{type==="500m"?"Time (m:ss.s)":"Distance (m)"}</FieldLabel><input value={val} onChange={e=>setVal(e.target.value)} placeholder={type==="500m"?"1:44.0":"2650"} style={inputStyle}/><FieldLabel>Notes</FieldLabel><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Conditions, how it felt, damper setting…" style={{...inputStyle,resize:"vertical"}}/><button onClick={save} style={primaryBtn}>Save result</button></ModalShell>;}

const TIPS=[
  {t:"Fuel around training, not just meals",d:"A carb-containing snack in the 1–2 hours before a session and something with carbs + protein within an hour after helps you recover for the next one — especially on double-session days."},
  {t:"Protein spread through the day",d:"Aim to have a protein source at each meal rather than loading it all at dinner — it supports recovery better across a heavy week."},
  {t:"Hydration is a session variable",d:"Turning up under-hydrated makes an easy session feel hard. Water through the day, not just during training."},
  {t:"Growing + training = more fuel needed, not less",d:"You're still growing and training a lot — this is not a time to be cutting food intake. If weight or energy feels off, that's a conversation for a sports dietitian, not a guess."},
  {t:"Sleep is part of the program",d:"Adaptation happens at rest. A late night before an early erg session costs you more than most people realise."},
];
function Diet({data,persist,showToast}){const [showForm,setShowForm]=useState(false),sorted=[...data.diet].sort((a,b)=>new Date(b.date)-new Date(a.date));function addEntry(entry){persist({...data,diet:[{id:uid(),...entry},...data.diet]});showToast("Reflection saved");setShowForm(false)}function deleteEntry(id){persist({...data,diet:data.diet.filter(d=>d.id!==id)})}return <div><SectionTitle sub="A place to notice patterns — not a place for strict rules">Diet & Attention</SectionTitle><Card style={{borderColor:`${COLORS.coral}44`,marginBottom:14}}><div style={{fontSize:12.5,color:COLORS.muted,lineHeight:1.5}}>This tab is for tracking how you're feeling — energy, focus, sleep, hunger — so patterns show up over time. It deliberately doesn't do calorie or macro targets: at your age, with this training load, that's worth getting right from a sports dietitian rather than a guess, since your needs will keep changing as you grow.</div></Card><button onClick={()=>setShowForm(true)} style={{...primaryBtn,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Plus size={16}/> Add today's reflection</button>{sorted.map(d=><Card key={d.id} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between"}}><div style={{flex:1}}><div style={{fontSize:11.5,color:COLORS.muted}}>{d.date}</div><div style={{display:"flex",gap:14,marginTop:6,flexWrap:"wrap"}}><MiniStat label="Energy" value={d.energy}/><MiniStat label="Focus" value={d.focus}/><MiniStat label="Sleep" value={d.sleep?`${d.sleep}h`:"—"}/><MiniStat label="Meals" value={d.meals}/></div>{d.notes&&<div style={{fontSize:12.5,color:COLORS.mutedDim,marginTop:8,lineHeight:1.4}}>{d.notes}</div>}</div><button onClick={()=>deleteEntry(d.id)} style={{background:"none",border:"none",color:COLORS.mutedDim}}><X size={16}/></button></div></Card>)}<SectionTitle>Fuelling notes</SectionTitle>{TIPS.map((tip,i)=><Card key={i} style={{marginBottom:8}}><div style={{fontWeight:700,fontSize:13.5,marginBottom:4}}>{tip.t}</div><div style={{fontSize:12.5,color:COLORS.mutedDim,lineHeight:1.5}}>{tip.d}</div></Card>)}{showForm&&<DietForm onClose={()=>setShowForm(false)} onSave={addEntry}/>}</div>;}
function MiniStat({label,value}){return <div><div style={{fontSize:9.5,color:COLORS.mutedDim,textTransform:"uppercase",letterSpacing:.6}}>{label}</div><div style={{fontSize:13,fontWeight:700,color:COLORS.cyan}}>{value||"—"}</div></div>;}
function ScaleInput({label,value,onChange}){return <div style={{marginBottom:4}}><FieldLabel>{label} (1–5)</FieldLabel><div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>onChange(n)} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1px solid ${value===n?COLORS.cyan:COLORS.cardBorder}`,background:value===n?`${COLORS.cyan}22`:"transparent",color:value===n?COLORS.cyan:COLORS.muted,fontWeight:700}}>{n}</button>)}</div></div>;}
function DietForm({onClose,onSave}){const [date,setDate]=useState(new Date().toISOString().slice(0,10)),[energy,setEnergy]=useState(0),[focus,setFocus]=useState(0),[meals,setMeals]=useState(0),[sleep,setSleep]=useState(""),[notes,setNotes]=useState("");function save(){onSave({date,energy:energy||null,focus:focus||null,meals:meals||null,sleep:sleep||null,notes:notes.trim()})}return <ModalShell onClose={onClose} title="Today's reflection"><FieldLabel>Date</FieldLabel><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/><ScaleInput label="Energy today" value={energy} onChange={setEnergy}/><ScaleInput label="Focus / attention today" value={focus} onChange={setFocus}/><ScaleInput label="How consistent were meals" value={meals} onChange={setMeals}/><FieldLabel>Sleep last night (hours)</FieldLabel><input value={sleep} onChange={e=>setSleep(e.target.value.replace(/[^0-9.]/g,""))} placeholder="8" style={inputStyle}/><FieldLabel>Anything to note</FieldLabel><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="e.g. skipped breakfast, felt flat by 3rd session…" style={{...inputStyle,resize:"vertical"}}/><button onClick={save} style={primaryBtn}>Save reflection</button></ModalShell>;}

function EmptyState({text}){return <div style={{textAlign:"center",padding:"30px 10px",color:COLORS.mutedDim,fontSize:13}}>{text}</div>;}
function FieldLabel({children}){return <div style={{fontSize:11.5,color:COLORS.muted,marginTop:12,marginBottom:5,fontWeight:600,letterSpacing:.3}}>{children}</div>;}
const inputStyle={width:"100%",background:COLORS.bg2,border:`1px solid ${COLORS.cardBorder}`,borderRadius:9,padding:"10px 12px",color:COLORS.text,fontSize:14,outline:"none"};
const primaryBtn={width:"100%",marginTop:18,background:COLORS.cyan,color:"#04211D",border:"none",borderRadius:10,padding:"13px 0",fontWeight:700,fontSize:14.5,letterSpacing:.3};
function ModalShell({title,onClose,children}){return <div style={{position:"fixed",inset:0,background:"rgba(5,13,17,.7)",display:"flex",alignItems:"flex-end",zIndex:100}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:COLORS.bg2,borderTop:`1px solid ${COLORS.cardBorder}`,borderRadius:"18px 18px 0 0",padding:"18px 18px calc(24px + env(safe-area-inset-bottom))",width:"100%",maxWidth:480,margin:"0 auto",maxHeight:"85vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:19,fontWeight:700}}>{title}</div><button onClick={onClose} style={{background:"none",border:"none",color:COLORS.muted}}><X size={20}/></button></div>{children}</div></div>;}
