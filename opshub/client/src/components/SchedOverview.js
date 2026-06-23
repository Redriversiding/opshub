// SchedOverview, TaskTypeView, PaintQueue, Dispatch, CrewsPage, UsersPage, MyAccount
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const TASK_TYPES = [
  {id:'Siding',icon:'fa-border-all',color:'#9B59B6',dd:5},
  {id:'Soffit/Fascia',icon:'fa-bars',color:'#E8A020',dd:2},
  {id:'Trim',icon:'fa-crop-simple',color:'#22A06B',dd:2},
  {id:'Parapet',icon:'fa-building',color:'#5F9EA0',dd:3},
  {id:'Cladding',icon:'fa-border-none',color:'#3A7BD5',dd:3},
  {id:'Eaves',icon:'fa-water',color:'#5B9FE8',dd:1},
  {id:'Downpipes',icon:'fa-arrows-down-to-line',color:'#2C4A6E',dd:1},
  {id:'Painting',icon:'fa-paint-roller',color:'#C39BD3',dd:3},
];

function isBehind(task) {
  if (task.status==='done'||task.status==='hold'||!task.start_date) return false;
  return new Date(task.start_date) < new Date();
}

// ── SCHED OVERVIEW ────────────────────────────────────────────
export function SchedOverview({ jobs, onSelectTT, behindOnly }) {
  const allTasks = [];
  jobs.forEach(j => j.tasks.forEach(t => allTasks.push({task:t, job:j})));
  const behind = allTasks.filter(x => isBehind(x.task));
  const today = allTasks.filter(x => {
    if (x.task.status==='done'||!x.task.start_date) return false;
    const d = new Date(x.task.start_date); const now = new Date();
    return d.toDateString()===now.toDateString();
  });
  const upcoming = allTasks.filter(x => {
    if (x.task.status==='done'||!x.task.start_date) return false;
    return new Date(x.task.start_date) > new Date();
  });
  const done = allTasks.filter(x => x.task.status==='done');

  if (behindOnly) return (
    <div>
      <div style={{fontSize:14,fontWeight:500,marginBottom:15}}>{behind.length} tasks behind schedule</div>
      {behind.length===0 && <div className="empty"><i className="fa fa-circle-check" style={{color:'var(--green2)'}}></i>Nothing behind!</div>}
      {behind.map(({task:t,job:j}) => {
        const tt = TASK_TYPES.find(x=>x.id===t.name);
        const ov = Math.round((new Date()-new Date(t.start_date))/(864e5));
        return (
          <div key={t.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'3px solid var(--red)',borderRadius:'var(--r2)',padding:'11px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            {tt&&<div style={{width:28,height:28,borderRadius:7,background:tt.color+'18',color:tt.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}><i className={`fa ${tt.icon}`}></i></div>}
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13}}>{t.name} — {j.title}</div>
              <div style={{fontSize:11,color:'var(--tx3)'}}>{j.address}</div>
              <div style={{fontSize:11,color:'var(--red2)',marginTop:2}}>{ov}d overdue</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
        {[['Behind',behind.length,'var(--red2)'],['Today',today.length,'var(--amber2)'],['Upcoming',upcoming.length,'var(--blue2)'],['Done',done.length,'var(--green2)']].map(([l,v,c])=>(
          <div key={l} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',padding:'13px 15px'}}>
            <div style={{fontSize:10,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>{l}</div>
            <div style={{fontSize:22,fontWeight:600,letterSpacing:'-.03em',color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:12,color:'var(--tx2)',marginBottom:14}}>Click any trade to see its full schedule.</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {TASK_TYPES.map(tt => {
          const its = allTasks.filter(x=>x.task.name===tt.id);
          if (!its.length) return null;
          const b=its.filter(x=>isBehind(x.task)).length,d=its.filter(x=>x.task.status==='done').length,u=its.filter(x=>!isBehind(x.task)&&x.task.status!=='done').length;
          return (
            <div key={tt.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',padding:13,cursor:'pointer',transition:'all .18s',position:'relative',overflow:'hidden'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(58,123,213,.4)';e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.transform='';}}
              onClick={()=>onSelectTT(tt.id)}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:tt.color,borderRadius:'3px 3px 0 0'}}></div>
              <div style={{width:30,height:30,borderRadius:8,background:tt.color+'18',color:tt.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,marginBottom:8}}><i className={`fa ${tt.icon}`}></i></div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:600}}>{tt.id}</div>
                <span className="tag tag-gray" style={{fontSize:10}}>{its.length} jobs</span>
              </div>
              <div style={{display:'flex',gap:2,height:5,borderRadius:3,overflow:'hidden',marginBottom:7}}>
                {d>0&&<div style={{background:'var(--green)',flex:d,height:'100%'}}></div>}
                {u>0&&<div style={{background:'var(--blue)',flex:u,height:'100%'}}></div>}
                {b>0&&<div style={{background:'var(--red)',flex:b,height:'100%'}}></div>}
              </div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {b>0&&<span style={{fontSize:10,padding:'2px 6px',borderRadius:5,fontWeight:500,background:'rgba(231,76,60,.15)',color:'var(--red2)'}}>{b} behind</span>}
                {u>0&&<span style={{fontSize:10,padding:'2px 6px',borderRadius:5,fontWeight:500,background:'rgba(58,123,213,.15)',color:'var(--blue2)'}}>{u} upcoming</span>}
                {d>0&&<span style={{fontSize:10,padding:'2px 6px',borderRadius:5,fontWeight:500,background:'rgba(34,160,107,.12)',color:'var(--green2)'}}>{d} done</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TASK TYPE VIEW ────────────────────────────────────────────
export function TaskTypeView({ jobs, taskType, onRefresh }) {
  const { can } = useAuth();
  const [filter, setFilter] = useState('all');
  const tt = TASK_TYPES.find(t=>t.id===taskType);
  const allTasks = [];
  jobs.forEach(j => j.tasks.filter(t=>t.name===taskType).forEach(t => allTasks.push({task:t,job:j})));

  function getStatus(t, j) {
    if (t.status==='done') return 'done';
    if (t.status==='hold') return 'hold';
    if (!t.start_date) return 'nodate';
    if (isBehind(t)) return 'behind';
    const d=new Date(t.start_date),now=new Date();
    if (d.toDateString()===now.toDateString()) return 'today';
    return 'upcoming';
  }

  const filters = ['all','behind','today','upcoming','nodate','hold','done'];
  const filtered = filter==='all' ? allTasks : allTasks.filter(({task:t,job:j})=>getStatus(t,j)===filter);

  async function markDone(jobId, taskId) {
    await api.put(`/jobs/${jobId}/tasks/${taskId}`, {status:'done'});
    onRefresh();
  }

  if (!tt) return <div className="empty"><i className="fa fa-question-circle"></i>Task type not found</div>;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:15}}>
        <div style={{width:36,height:36,borderRadius:9,background:tt.color+'18',color:tt.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}><i className={`fa ${tt.icon}`}></i></div>
        <div><div style={{fontSize:16,fontWeight:600}}>{tt.id}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{allTasks.length} tasks · default {tt.dd}d</div></div>
      </div>
      <div style={{display:'flex',gap:5,marginBottom:13,flexWrap:'wrap'}}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'3px 10px',borderRadius:20,border:'1px solid var(--border)',background:filter===f?'rgba(58,123,213,.2)':'transparent',borderColor:filter===f?'rgba(58,123,213,.5)':'rgba(255,255,255,.08)',fontSize:11,cursor:'pointer',color:filter===f?'var(--blue2)':'var(--tx3)',fontFamily:"'DM Sans',sans-serif",transition:'all .15s'}}>
            {f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1)}
            {f!=='all'?` (${allTasks.filter(({task:t,job:j})=>getStatus(t,j)===f).length})`:' ('+allTasks.length+')'}
          </button>
        ))}
      </div>
      {filtered.length===0 && <div className="empty"><i className="fa fa-calendar-check"></i>No tasks</div>}
      {filtered.map(({task:t,job:j})=>{
        const ss = getStatus(t,j);
        const colors = {behind:'var(--red)',today:'var(--amber)',upcoming:'var(--blue)',done:'var(--green)',hold:'var(--tx3)',nodate:'var(--tx3)'};
        const dbColors = {behind:'rgba(231,76,60,.15)',today:'rgba(232,160,32,.15)',upcoming:'rgba(58,123,213,.15)',done:'rgba(34,160,107,.12)',nodate:'rgba(255,255,255,.05)'};
        const dbTextColors = {behind:'var(--red2)',today:'var(--amber2)',upcoming:'var(--blue2)',done:'var(--green2)',nodate:'var(--tx3)'};
        return (
          <div key={t.id} style={{background:'var(--bg2)',border:`1px solid var(--border)`,borderLeft:`3px solid ${colors[ss]||'var(--tx3)'}`,borderRadius:'var(--r2)',padding:'11px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{j.title}</div>
              <div style={{fontSize:11,color:'var(--tx3)'}}>{j.address}</div>
              <div style={{display:'flex',gap:6,alignItems:'center',marginTop:4,flexWrap:'wrap'}}>
                {t.crew_name ? <span style={{fontSize:10,padding:'2px 7px',borderRadius:9,fontWeight:500,background:'rgba(58,123,213,.15)',color:'var(--blue2)'}}><i className="fa fa-hard-hat" style={{fontSize:9}}></i> {t.crew_name}</span> : <span className="tag tag-amber" style={{fontSize:10}}>Unassigned</span>}
                <span className="tag tag-gray" style={{fontSize:10}}><i className="fa fa-clock" style={{fontSize:9}}></i> {t.duration||tt.dd}d</span>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
              <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",padding:'3px 9px',borderRadius:7,fontWeight:500,background:dbColors[ss]||'rgba(255,255,255,.05)',color:dbTextColors[ss]||'var(--tx3)',border:`1px solid ${dbColors[ss]?.replace('.15','')?.replace('.12','')?.replace('.05','')+'22'||'var(--border)'}`}}>
                {t.start_date ? new Date(t.start_date).toLocaleDateString('en-CA',{month:'short',day:'numeric'}) : 'No date'}
              </div>
              {can('editTasks') && t.status==='pending' && (
                <button className="btn btn-green btn-sm" onClick={()=>markDone(j.id,t.id)}>
                  <i className="fa fa-check"></i> Done
                </button>
              )}
              {t.status==='done' && <span className="tag tag-green" style={{fontSize:10}}><i className="fa fa-check"></i> Done</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PAINT QUEUE ───────────────────────────────────────────────
export function PaintQueue({ jobs, onRefresh }) {
  const all = [];
  jobs.forEach(j => (j.colours||[]).forEach(c => all.push({...c, jt:j.title, jid:j.id})));
  const ua=all.filter(c=>c.status==='unassigned'), ip=all.filter(c=>c.status==='painting'||c.status==='pending'), dn=all.filter(c=>c.status==='done');

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
        {[['Unassigned',ua.length,'var(--tx3)'],['In progress',ip.length,'var(--paint2)'],['Done',dn.length,'var(--green2)']].map(([l,v,c])=>(
          <div key={l} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',padding:'13px 15px'}}>
            <div style={{fontSize:10,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>{l}</div>
            <div style={{fontSize:22,fontWeight:600,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      {[...ua,...ip,...dn].map(c=>(
        <div key={c.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',padding:'11px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
          <div style={{width:32,height:32,borderRadius:7,background:c.hex,border:'1px solid rgba(255,255,255,.12)',flexShrink:0}}></div>
          <div style={{flex:1}}><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{c.jt}</div></div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
            {c.painter_name?<span className="tag tag-paint" style={{fontSize:10}}><i className="fa fa-user"></i> {c.painter_name}</span>:<span className="tag tag-gray" style={{fontSize:10}}>Unassigned</span>}
            {c.rack&&<span style={{background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:6,padding:'2px 8px',fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:500,color:'var(--tx2)'}}>{c.rack}</span>}
          </div>
        </div>
      ))}
      {all.length===0&&<div className="empty"><i className="fa fa-palette"></i>No colours in queue</div>}
    </div>
  );
}

// ── DISPATCH ──────────────────────────────────────────────────
export function Dispatch({ jobs, onRefresh }) {
  const [drivers, setDrivers] = useState([]);
  useEffect(()=>{api.get('/users/drivers').then(r=>setDrivers(r.data));}, []);

  async function update(jobId, field, value) {
    const updates = field==='driverId' ? {driverId:value} : {deliveryStatus:value};
    await api.put(`/jobs/${jobId}/delivery`, updates);
    onRefresh();
  }

  return (
    <div>
      {jobs.map(j=>(
        <div key={j.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',marginBottom:9,overflow:'hidden'}}>
          <div style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:4,alignSelf:'stretch',background:j.delivery_status==='delivered'?'var(--green)':j.delivery_status==='in-transit'?'var(--blue)':'var(--tx3)',borderRadius:2,flexShrink:0,marginRight:2}}></div>
            <div style={{flex:1}}><div style={{fontWeight:600}}>{j.title}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{j.address}</div></div>
            <div style={{display:'flex',gap:7}}>
              <select className="fs" style={{width:160,padding:'4px 7px',fontSize:11}} value={j.driver_id||''} onChange={e=>update(j.id,'driverId',e.target.value||null)}>
                <option value="">Assign driver…</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.name}{d.truck?' — '+d.truck:''}</option>)}
              </select>
              <select className="fs" style={{width:130,padding:'4px 7px',fontSize:11}} value={j.delivery_status||'pending'} onChange={e=>update(j.id,'deliveryStatus',e.target.value)}>
                {['pending','scheduled','in-transit','delivered'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
      {jobs.length===0&&<div className="empty"><i className="fa fa-truck"></i>No jobs</div>}
    </div>
  );
}

// ── CREWS PAGE ────────────────────────────────────────────────
export function CrewsPage({ jobs }) {
  const { can } = useAuth();
  const [crews, setCrews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editCrew, setEditCrew] = useState(null);
  const [form, setForm] = useState({name:'',username:'',password:'',type:'sub',trades:[],rate:0,rateUnit:'sq ft',color:'#3A7BD5'});
  const [err, setErr] = useState('');

  useEffect(()=>{api.get('/users/crews').then(r=>setCrews(r.data));}, []);

  const TRADE_COLOURS = {'Siding':'#9B59B6','Soffit/Fascia':'#E8A020','Trim':'#22A06B','Parapet':'#5F9EA0','Cladding':'#3A7BD5','Eaves':'#5B9FE8','Downpipes':'#2C4A6E','Painting':'#C39BD3'};

  async function saveCrew() {
    setErr('');
    if (!form.name||!form.username) { setErr('Name and username required'); return; }
    if (!editCrew && form.password.length<6) { setErr('Password min 6 chars'); return; }
    try {
      if (editCrew) await api.put(`/users/${editCrew.id}`, {...form, role:'crew'});
      else await api.post('/users', {...form, role:'crew'});
      const r = await api.get('/users/crews');
      setCrews(r.data); setShowForm(false); setEditCrew(null);
      setForm({name:'',username:'',password:'',type:'sub',trades:[],rate:0,rateUnit:'sq ft',color:'#3A7BD5'});
    } catch(e) { setErr(e.response?.data?.error||'Save failed'); }
  }

  const ini = n => n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);

  return (
    <div>
      <div className="ibox"><i className="fa fa-info-circle" style={{color:'var(--blue2)',fontSize:15,marginTop:1}}></i>
        <div>Each crew/sub is tagged with their <b style={{color:'var(--tx)'}}>trade specialties</b>. Task assignment dropdowns only show crews that do that specific trade.</div>
      </div>
      {can('manageUsers') && <button className="btn btn-blue btn-sm" style={{marginBottom:14}} onClick={()=>{setShowForm(true);setEditCrew(null);setForm({name:'',username:'',password:'',type:'sub',trades:[],rate:0,rateUnit:'sq ft',color:'#3A7BD5'});}}><i className="fa fa-plus"></i> Add crew / sub</button>}
      {crews.map(c=>{
        const active = jobs.reduce((a,j)=>a+j.tasks.filter(t=>t.crew_id===c.id&&t.status!=='done').length,0);
        return (
          <div key={c.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:12,marginBottom:9,transition:'all .15s'}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:c.color+'22',color:c.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:600,flexShrink:0}}>{ini(c.name)}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <div style={{fontWeight:600,fontSize:14}}>{c.name}</div>
                <span style={{fontSize:10,padding:'2px 7px',borderRadius:5,fontWeight:600,background:c.type==='sub'?'rgba(58,123,213,.2)':'rgba(34,160,107,.18)',color:c.type==='sub'?'var(--blue2)':'var(--green2)'}}>{c.type==='sub'?'Subcontractor':'In-house'}</span>
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',marginBottom:6,fontFamily:"'DM Mono',monospace"}}>{c.username} · ${c.rate}/{c.rate_unit}</div>
              <div style={{display:'flex',flexWrap:'wrap'}}>
                {(c.trades||[]).map(t=><span key={t} style={{fontSize:10,padding:'2px 8px',borderRadius:6,fontWeight:600,background:(TRADE_COLOURS[t]||'#999')+'22',color:TRADE_COLOURS[t]||'#999',margin:'2px'}}>{t}</span>)}
                {!(c.trades||[]).length&&<span style={{fontSize:11,color:'var(--amber2)'}}><i className="fa fa-exclamation-triangle"></i> No trades assigned</span>}
              </div>
              {active>0&&<div style={{fontSize:11,color:'var(--tx3)',marginTop:5}}>{active} active task{active>1?'s':''}</div>}
            </div>
            {can('manageUsers')&&<button className="btn btn-sm" onClick={()=>{setEditCrew(c);setForm({name:c.name,username:c.username,password:'',type:c.type||'sub',trades:c.trades||[],rate:c.rate||0,rateUnit:c.rate_unit||'sq ft',color:c.color});setShowForm(true);}}><i className="fa fa-pen"></i> Edit</button>}
          </div>
        );
      })}
      {crews.length===0&&<div className="empty"><i className="fa fa-hard-hat"></i>No crews yet</div>}

      {showForm&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget){setShowForm(false);setEditCrew(null);}}}>
          <div className="modal" style={{maxWidth:540}} onClick={e=>e.stopPropagation()}>
            <div className="mhd"><div style={{fontSize:14,fontWeight:600,flex:1}}>{editCrew?'Edit crew':'Add crew / sub'}</div><button className="btn btn-sm" style={{padding:'4px 7px'}} onClick={()=>{setShowForm(false);setEditCrew(null);}}><i className="fa fa-times"></i></button></div>
            <div className="mbody">
              <div className="fgrid">
                <div className="fg"><label className="fl">Business / crew name</label><input className="fi" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Apex Siding Ltd."/></div>
                <div className="fg"><label className="fl">Username</label><input className="fi" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="e.g. apex.siding" style={{fontFamily:"'DM Mono',monospace"}}/></div>
              </div>
              <div className="fgrid">
                <div className="fg"><label className="fl">{editCrew?'New password (blank = keep)':'Password'}</label><input type="text" className="fi" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={editCrew?'Leave blank to keep':'Min 6 chars'}/></div>
                <div className="fg"><label className="fl">Type</label><select className="fs" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="sub">Subcontractor</option><option value="inhouse">In-house / hourly</option></select></div>
              </div>
              <div className="fgrid">
                <div className="fg"><label className="fl">Rate</label><input type="number" className="fi" value={form.rate} onChange={e=>setForm({...form,rate:parseFloat(e.target.value)||0})} min="0" step="0.01"/></div>
                <div className="fg"><label className="fl">Rate unit</label><select className="fs" value={form.rateUnit} onChange={e=>setForm({...form,rateUnit:e.target.value})}><option value="sq ft">Per sq ft</option><option value="lin ft">Per lin ft</option><option value="hr">Per hour</option><option value="job">Per job (flat)</option></select></div>
              </div>
              <div className="fg"><label className="fl">Profile colour</label><input type="color" className="fi" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} style={{height:36,padding:3,cursor:'pointer'}}/></div>
              <div className="fg">
                <label className="fl">Trade specialties</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {Object.keys(TRADE_COLOURS).map(t=>{
                    const on = form.trades.includes(t);
                    return <label key={t} onClick={()=>setForm({...form,trades:on?form.trades.filter(x=>x!==t):[...form.trades,t]})}
                      style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:8,border:`1px solid ${on?(TRADE_COLOURS[t]||'#999')+'80':'var(--border)'}`,background:on?(TRADE_COLOURS[t]||'#999')+'18':'var(--sf)',fontSize:11,cursor:'pointer',margin:3,transition:'all .15s',color:on?TRADE_COLOURS[t]:'var(--tx2)'}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:TRADE_COLOURS[t]||'#999',flexShrink:0}}></span>{t}
                    </label>;
                  })}
                </div>
              </div>
              {err&&<div style={{fontSize:11,color:'var(--red2)',minHeight:15}}>{err}</div>}
            </div>
            <div className="mfoot">
              {editCrew&&<button className="btn btn-sm" style={{color:'var(--red2)',marginRight:'auto'}} onClick={async()=>{if(window.confirm('Remove this crew?')){await api.delete(`/users/${editCrew.id}`);const r=await api.get('/users/crews');setCrews(r.data);setShowForm(false);setEditCrew(null);}}}><i className="fa fa-trash"></i> Remove</button>}
              <button className="btn" onClick={()=>{setShowForm(false);setEditCrew(null);}}>Cancel</button>
              <button className="btn btn-blue" onClick={saveCrew}><i className="fa fa-check"></i> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── USERS PAGE ────────────────────────────────────────────────
export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({name:'',username:'',password:'',role:'crew',color:'#3A7BD5',active:true});
  const [err, setErr] = useState('');
  const ROLES = ['owner','admin','crew','driver','painter','viewer'];
  const roleColors = {owner:'#E8A020',admin:'#3A7BD5',crew:'#22A06B',driver:'#5B9FE8',painter:'#9B59B6',viewer:'#64748B'};
  const ini = n => n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);

  useEffect(()=>{api.get('/users').then(r=>setUsers(r.data)).catch(()=>{});}, []);

  async function save() {
    setErr('');
    if (!form.name||!form.username) { setErr('Name and username required'); return; }
    if (!editUser&&form.password.length<6) { setErr('Password min 6 chars'); return; }
    try {
      if (editUser) await api.put(`/users/${editUser.id}`, form);
      else await api.post('/users', form);
      const r = await api.get('/users'); setUsers(r.data);
      setShowForm(false); setEditUser(null);
      setForm({name:'',username:'',password:'',role:'crew',color:'#3A7BD5',active:true});
    } catch(e) { setErr(e.response?.data?.error||'Save failed'); }
  }

  return (
    <div>
      <div className="ibox"><i className="fa fa-info-circle" style={{color:'var(--blue2)',fontSize:15,marginTop:1}}></i>
        <div><b style={{color:'var(--tx)'}}>POs</b>: Owner, Admin, Driver · <b style={{color:'var(--tx)'}}>Paint queue</b>: Owner, Admin, Painter, Driver · <b style={{color:'var(--tx)'}}>Crew portals</b> only show tasks matching their trade specialties</div>
      </div>
      <button className="btn btn-blue btn-sm" style={{marginBottom:14}} onClick={()=>{setShowForm(true);setEditUser(null);setForm({name:'',username:'',password:'',role:'crew',color:'#3A7BD5',active:true});}}>
        <i className="fa fa-plus"></i> New user
      </button>
      {ROLES.map(role=>{
        const ru = users.filter(u=>u.role===role);
        if (!ru.length) return null;
        return (
          <div key={role} style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.07em'}}>{role}s ({ru.length})</div>
            {ru.map(u=>(
              <div key={u.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',padding:'12px 14px',display:'flex',alignItems:'center',gap:11,marginBottom:7}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:u.color+'22',color:u.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,flexShrink:0}}>{ini(u.name)}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{fontWeight:600}}>{u.name}</div><span className={`tag tag-${u.active?'green':'red'}`} style={{fontSize:10}}>{u.active?'Active':'Inactive'}</span></div>
                  <div style={{fontSize:11,color:'var(--tx3)',marginTop:2,fontFamily:"'DM Mono',monospace"}}>{u.username}</div>
                </div>
                <button className="btn btn-sm" onClick={()=>{setEditUser(u);setForm({name:u.name,username:u.username,password:'',role:u.role,color:u.color,active:u.active});setShowForm(true);}}><i className="fa fa-pen"></i> Edit</button>
              </div>
            ))}
          </div>
        );
      })}
      {showForm&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget){setShowForm(false);setEditUser(null);}}}>
          <div className="modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div className="mhd"><div style={{fontSize:14,fontWeight:600,flex:1}}>{editUser?'Edit user':'New user'}</div><button className="btn btn-sm" style={{padding:'4px 7px'}} onClick={()=>{setShowForm(false);setEditUser(null);}}><i className="fa fa-times"></i></button></div>
            <div className="mbody">
              <div className="fgrid">
                <div className="fg"><label className="fl">Full name</label><input className="fi" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name"/></div>
                <div className="fg"><label className="fl">Username</label><input className="fi" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} style={{fontFamily:"'DM Mono',monospace"}}/></div>
              </div>
              <div className="fgrid">
                <div className="fg"><label className="fl">{editUser?'New password (blank = keep)':'Password'}</label><input type="text" className="fi" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
                <div className="fg"><label className="fl">Role</label><select className="fs" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
              </div>
              <div className="fg"><label className="fl">Profile colour</label><input type="color" className="fi" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} style={{height:36,padding:3,cursor:'pointer'}}/></div>
              {err&&<div style={{fontSize:11,color:'var(--red2)',minHeight:15}}>{err}</div>}
            </div>
            <div className="mfoot">
              {editUser&&editUser.id!==me?.id&&<button className="btn btn-sm" style={{color:'var(--amber2)',marginRight:'auto'}} onClick={async()=>{await api.put(`/users/${editUser.id}`,{active:!editUser.active});const r=await api.get('/users');setUsers(r.data);setShowForm(false);}}><i className="fa fa-ban"></i> {editUser.active?'Disable':'Enable'}</button>}
              <button className="btn" onClick={()=>{setShowForm(false);setEditUser(null);}}>Cancel</button>
              <button className="btn btn-blue" onClick={save}><i className="fa fa-check"></i> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MY ACCOUNT ────────────────────────────────────────────────
export function MyAccount() {
  const { user, updateUser } = useAuth();
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [con, setCon] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const ini = n => n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);

  async function changePass() {
    setErr(''); setOk('');
    if (nw.length<6) { setErr('New password min 6 chars'); return; }
    if (nw!==con) { setErr('Passwords do not match'); return; }
    try {
      await api.put('/auth/password', { currentPassword:cur, newPassword:nw });
      setOk('Password updated!'); setCur(''); setNw(''); setCon('');
    } catch(e) { setErr(e.response?.data?.error||'Failed'); }
  }

  if (!user) return null;
  return (
    <div style={{maxWidth:460}}>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
        <div style={{width:52,height:52,borderRadius:'50%',background:user.color+'22',color:user.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:600}}>{ini(user.name)}</div>
        <div><div style={{fontSize:17,fontWeight:600}}>{user.name}</div><div style={{fontSize:12,color:'var(--tx3)',marginTop:3}}>{user.role} · <span style={{fontFamily:"'DM Mono',monospace"}}>{user.username}</span></div></div>
      </div>
      <div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',marginBottom:11,textTransform:'uppercase',letterSpacing:'.07em'}}><i className="fa fa-lock"></i> Change password</div>
      <div className="fg"><label className="fl">Current password</label><input type="password" className="fi" value={cur} onChange={e=>setCur(e.target.value)}/></div>
      <div className="fg"><label className="fl">New password</label><input type="password" className="fi" value={nw} onChange={e=>setNw(e.target.value)} placeholder="Min 6 characters"/></div>
      <div className="fg"><label className="fl">Confirm new password</label><input type="password" className="fi" value={con} onChange={e=>setCon(e.target.value)}/></div>
      {err&&<div style={{fontSize:11,color:'var(--red2)',marginBottom:8}}>{err}</div>}
      {ok&&<div style={{fontSize:11,color:'var(--green2)',marginBottom:8}}><i className="fa fa-check-circle"></i> {ok}</div>}
      <button className="btn btn-blue btn-sm" onClick={changePass}><i className="fa fa-key"></i> Update password</button>
    </div>
  );
}

export default SchedOverview;
