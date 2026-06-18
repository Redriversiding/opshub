import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function FieldShell() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobTab, setJobTab] = useState('tasks');

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  const ini = n => n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);

  const navMap = {
    crew:   [{id:'jobs',icon:'fa-briefcase',l:'My Jobs'},{id:'tasks',icon:'fa-tasks',l:'My Tasks'},{id:'blueprints',icon:'fa-drafting-compass',l:'Blueprints'}],
    driver: [{id:'jobs',icon:'fa-briefcase',l:'My Jobs'},{id:'pos',icon:'fa-file-alt',l:'POs'},{id:'route',icon:'fa-route',l:'Route'}],
    painter:[{id:'paintq',icon:'fa-paint-roller',l:'Paint Queue'},{id:'rack',icon:'fa-warehouse',l:'My Rack'}],
    viewer: [{id:'jobs',icon:'fa-briefcase',l:'All Jobs'},{id:'sched',icon:'fa-calendar-week',l:'Schedule'}],
  };
  const navs = navMap[user?.role] || [];

  // Mark task done
  async function markDone(jobId, taskId) {
    try {
      await api.put(`/jobs/${jobId}/tasks/${taskId}`, { status: 'done' });
      await loadJobs();
    } catch(err) { alert('Failed to update task'); }
  }

  // Driver delivery status
  async function setDeliveryStatus(jobId, status) {
    try {
      await api.put(`/jobs/${jobId}/delivery`, { deliveryStatus: status });
      await loadJobs();
    } catch(err) { alert('Failed to update delivery'); }
  }

  // Get tasks visible to this user
  function getMyTasks(job) {
    if (user?.role === 'crew') return job.tasks.filter(t => t.crew_id === user.id);
    return job.tasks;
  }

  function renderJobs() {
    if (loading) return <div className="empty"><div className="spin" style={{margin:'0 auto 12px'}}></div></div>;
    if (!jobs.length) return <div className="empty"><i className="fa fa-inbox"></i>No jobs assigned</div>;

    return jobs.map(j => {
      const myTasks = getMyTasks(j);
      const done = myTasks.filter(t=>t.status==='done').length;
      const pct = Math.round(done/Math.max(myTasks.length,1)*100);
      const behind = myTasks.filter(t => {
        if (t.status==='done'||t.status==='hold'||!t.start_date) return false;
        return new Date(t.start_date) < new Date();
      }).length;

      return (
        <div key={j.id}
          style={{ background:'var(--bg2)',border:`1px solid var(--border)`,borderLeft:`3px solid ${j.status==='on-hold'?'var(--amber)':behind?'var(--red)':'var(--blue)'}`,borderRadius:'var(--r2)',marginBottom:10,cursor:'pointer'}}
          onClick={() => { setSelectedJobId(j.id); setJobTab('tasks'); setView('jobdetail'); }}
        >
          <div style={{padding:'11px 14px 9px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:7}}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{j.title}</div>
              <div style={{fontSize:11,color:'var(--tx3)'}}>{j.address}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
              <span className={`tag tag-${j.status==='in-progress'?'blue':j.status==='on-hold'?'amber':j.status==='completed'?'green':'gray'}`}>
                {j.status.replace('-',' ')}
              </span>
              {behind > 0 && <span className="tag tag-red" style={{fontSize:9}}><i className="fa fa-exclamation-circle"></i> {behind} behind</span>}
            </div>
          </div>
          <div style={{padding:'9px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--tx3)',marginBottom:3}}><span>{done}/{myTasks.length} tasks</span><span>{pct}%</span></div>
            <div className="pbar"><div className="pfill" style={{width:`${pct}%`,background:pct===100?'var(--green)':pct>50?'var(--blue)':'var(--amber)'}}></div></div>
          </div>
        </div>
      );
    });
  }

  function renderTasks() {
    const allTasks = [];
    jobs.forEach(j => getMyTasks(j).forEach(t => allTasks.push({j,t})));
    const behind = allTasks.filter(x => x.t.status==='pending' && x.t.start_date && new Date(x.t.start_date)<new Date());
    const pending = allTasks.filter(x => x.t.status==='pending' && !(x.t.start_date && new Date(x.t.start_date)<new Date()));
    const done = allTasks.filter(x => x.t.status==='done');

    return (
      <div>
        {behind.length > 0 && <>
          <div style={{fontSize:11,fontWeight:600,color:'var(--red2)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.07em'}}>
            <i className="fa fa-exclamation-circle"></i> Behind schedule ({behind.length})
          </div>
          {behind.map(({j,t}) => (
            <div key={t.id} style={{background:'var(--bg2)',border:'1px solid rgba(231,76,60,.3)',borderLeft:'3px solid var(--red)',borderRadius:'var(--r2)',padding:'10px 13px',display:'flex',alignItems:'center',gap:9,marginBottom:6}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{t.name}</div>
                <div style={{fontSize:11,color:'var(--red2)'}}>{j.title}</div>
              </div>
              <button className="btn btn-green btn-sm" onClick={() => markDone(j.id, t.id)}>
                <i className="fa fa-check"></i> Done
              </button>
            </div>
          ))}
        </>}
        {pending.length > 0 && <>
          <div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',marginBottom:8,marginTop:12,textTransform:'uppercase',letterSpacing:'.07em'}}>
            Pending ({pending.length})
          </div>
          {pending.map(({j,t}) => (
            <div key={t.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'3px solid var(--blue)',borderRadius:'var(--r2)',padding:'10px 13px',display:'flex',alignItems:'center',gap:9,marginBottom:6,cursor:'pointer'}}
              onClick={() => { setSelectedJobId(j.id); setJobTab('tasks'); setView('jobdetail'); }}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{t.name}</div>
                <div style={{fontSize:11,color:'var(--tx3)'}}>{j.title}{t.start_date?` · ${new Date(t.start_date).toLocaleDateString('en-CA',{month:'short',day:'numeric'})}`:''}</div>
              </div>
              <button className="btn btn-green btn-sm" onClick={e => { e.stopPropagation(); markDone(j.id, t.id); }}>
                <i className="fa fa-check"></i> Done
              </button>
            </div>
          ))}
        </>}
        {done.length > 0 && <>
          <div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',marginBottom:8,marginTop:12,textTransform:'uppercase',letterSpacing:'.07em'}}>
            Completed ({done.length})
          </div>
          {done.map(({j,t}) => (
            <div key={t.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'3px solid var(--green)',borderRadius:'var(--r2)',padding:'9px 13px',opacity:.65,marginBottom:5}}>
              <div style={{fontWeight:600}}>{t.name}</div>
              <div style={{fontSize:11,color:'var(--tx3)'}}>{j.title}</div>
            </div>
          ))}
        </>}
        {allTasks.length === 0 && <div className="empty"><i className="fa fa-check-circle" style={{color:'var(--green2)'}}></i>No tasks assigned</div>}
      </div>
    );
  }

  function renderJobDetail() {
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job) return null;
    const myTasks = getMyTasks(job);

    return (
      <div>
        <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:13}}>
          <button className="btn btn-sm" onClick={() => setView('jobs')}>
            <i className="fa fa-arrow-left"></i> Back
          </button>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600}}>{job.title}</div>
            <div style={{fontSize:11,color:'var(--tx3)'}}>{job.address}</div>
          </div>
        </div>

        {job.status==='on-hold' && job.hold_reason && (
          <div style={{background:'rgba(232,160,32,.08)',border:'1px solid rgba(232,160,32,.25)',borderRadius:'var(--r)',padding:'9px 12px',display:'flex',gap:8,marginBottom:12}}>
            <i className="fa fa-exclamation-triangle" style={{color:'var(--amber)'}}></i>
            <div>
              <div style={{fontWeight:600,fontSize:12,color:'var(--amber2)'}}>On hold</div>
              <div style={{fontSize:12,color:'var(--amber2)'}}>{job.hold_reason}</div>
            </div>
          </div>
        )}

        {/* Task list */}
        {myTasks.map(t => {
          const behind = t.status==='pending' && t.start_date && new Date(t.start_date)<new Date();
          return (
            <div key={t.id} style={{background:'var(--bg2)',border:`1px solid ${behind?'rgba(231,76,60,.3)':'var(--border)'}`,borderRadius:'var(--r2)',padding:'11px 14px',marginBottom:7}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600}}>{t.name}{behind?<span style={{fontSize:10,color:'var(--red2)',marginLeft:6}}>(overdue)</span>:null}</div>
                  <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>
                    {t.start_date?new Date(t.start_date).toLocaleDateString('en-CA',{month:'short',day:'numeric'}):''}{t.duration?` · ${t.duration}d`:''}
                  </div>
                </div>
                {t.status==='pending' && (
                  <button className="btn btn-green btn-sm" onClick={() => markDone(job.id, t.id)}>
                    <i className="fa fa-check"></i> Mark done
                  </button>
                )}
                {t.status==='done' && <span className="tag tag-green"><i className="fa fa-check"></i> Done</span>}
                {t.status==='hold' && <span className="tag tag-amber"><i className="fa fa-clock"></i> On hold</span>}
              </div>
            </div>
          );
        })}

        {/* Blueprints */}
        {job.blueprint_count > 0 && (
          <div style={{marginTop:14}}>
            <div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.07em'}}>
              <i className="fa fa-drafting-compass"></i> Documents ({job.blueprint_count})
            </div>
            <BlueprintsSection jobId={job.id} />
          </div>
        )}

        {/* Driver delivery buttons */}
        {user?.role==='driver' && (
          <div style={{marginTop:14,display:'flex',gap:7}}>
            <button className="btn btn-blue btn-sm" onClick={() => setDeliveryStatus(job.id,'in-transit')}>
              <i className="fa fa-truck"></i> In transit
            </button>
            <button className="btn btn-green btn-sm" onClick={() => setDeliveryStatus(job.id,'delivered')}>
              <i className="fa fa-check-circle"></i> Delivered
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderContent() {
    if (view === 'jobs') return renderJobs();
    if (view === 'tasks') return renderTasks();
    if (view === 'jobdetail') return renderJobDetail();
    if (view === 'blueprints') return <AllBlueprintsField jobs={jobs} />;
    if (view === 'pos') return <AllPOsField jobs={jobs} />;
    if (view === 'route') return <RouteField jobs={jobs} onStatusChange={setDeliveryStatus} />;
    if (view === 'paintq') return <PaintQueueField jobs={jobs} onRefresh={loadJobs} userId={user?.id} />;
    return renderJobs();
  }

  return (
    <div className="field-shell" style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      {/* Top bar */}
      <div style={{height:52,borderBottom:'1px solid var(--border)',background:'var(--bg2)',display:'flex',alignItems:'center',padding:'0 16px',gap:10,flexShrink:0}}>
        <div className="brand-icon" style={{width:28,height:28,fontSize:12,borderRadius:7}}>
          <i className="fa-solid fa-layer-group"></i>
        </div>
        <div style={{flex:1,marginLeft:8}}>
          <div style={{fontSize:13,fontWeight:600}}>OpsHub</div>
          <div style={{fontSize:10,color:'var(--tx3)'}}>{user?.role} portal</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'var(--sf2)',border:'1px solid var(--border)',padding:'5px 11px',borderRadius:20}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:(user?.color||'#3A7BD5')+'22',color:user?.color||'#3A7BD5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600}}>
            {user?ini(user.name):'?'}
          </div>
          <span style={{fontSize:12,fontWeight:500}}>{user?.name}</span>
        </div>
        <button className="btn btn-sm" onClick={logout} style={{color:'var(--tx3)'}}>
          <i className="fa fa-right-from-bracket"></i>
        </button>
      </div>

      {/* Nav tabs */}
      <div style={{display:'flex',gap:2,padding:'6px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',flexShrink:0,overflowX:'auto'}}>
        {navs.map(n => (
          <div key={n.id}
            onClick={() => setView(n.id)}
            style={{
              display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:7,cursor:'pointer',
              fontSize:12,color:view===n.id?'var(--blue2)':'var(--tx2)',
              background:view===n.id?'rgba(58,123,213,.15)':'transparent',
              border:`1px solid ${view===n.id?'rgba(58,123,213,.3)':'transparent'}`,
              transition:'all .15s',whiteSpace:'nowrap'
            }}>
            <i className={`fa ${n.icon}`}></i> {n.l}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto',padding:'18px 16px'}}>
        {loading ? <div className="empty"><div className="spin" style={{margin:'0 auto 12px'}}></div>Loading…</div> : renderContent()}
      </div>
    </div>
  );
}

// Simple blueprints loader for field view
function BlueprintsSection({ jobId }) {
  const [bps, setBps] = useState([]);
  useEffect(() => {
    api.get(`/jobs/${jobId}`).then(res => setBps(res.data.blueprints || []));
  }, [jobId]);

  return (
    <div>
      {bps.map(b => (
        <div key={b.id} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'9px 12px',display:'flex',alignItems:'center',gap:9,marginBottom:6}}>
          <div style={{width:28,height:28,borderRadius:7,background:b.category==='colour'?'rgba(155,89,182,.18)':'rgba(58,123,213,.18)',color:b.category==='colour'?'var(--paint2)':'var(--blue2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>
            <i className={`fa ${b.category==='colour'?'fa-palette':'fa-drafting-compass'}`}></i>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:500,fontSize:12}}>{b.label||b.name}</div>
            <div style={{fontSize:10,color:'var(--tx3)'}}>{b.category==='colour'?'Colour Selection':'Blueprint'}</div>
          </div>
          {b.file_url && (
            <a href={b.file_url} target="_blank" rel="noreferrer" className="btn btn-blue btn-sm">
              <i className="fa fa-eye"></i> View
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function AllBlueprintsField({ jobs }) {
  return (
    <div>
      <div style={{marginBottom:12,color:'var(--tx2)',fontSize:13}}>Blueprints across your jobs</div>
      {jobs.map(j => j.blueprint_count > 0 && (
        <div key={j.id} style={{marginBottom:14}}>
          <div style={{fontWeight:600,marginBottom:6,fontSize:12}}>{j.title}</div>
          <BlueprintsSection jobId={j.id} />
        </div>
      ))}
    </div>
  );
}

function AllPOsField({ jobs }) {
  return (
    <div>
      {jobs.map(j => (
        <div key={j.id} style={{marginBottom:14}}>
          <div style={{fontWeight:600,marginBottom:6,fontSize:12}}>{j.title}</div>
          <POsSection jobId={j.id} />
        </div>
      ))}
    </div>
  );
}

function POsSection({ jobId }) {
  const [pos, setPos] = useState([]);
  useEffect(() => {
    api.get(`/jobs/${jobId}`).then(res => setPos(res.data.pos || []));
  }, [jobId]);
  return pos.map(p => (
    <div key={p.id} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'9px 12px',display:'flex',alignItems:'center',gap:9,marginBottom:6}}>
      <div style={{width:28,height:28,borderRadius:7,background:'rgba(224,62,62,.2)',color:'var(--red2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>
        <i className="fa fa-file-pdf"></i>
      </div>
      <div style={{flex:1}}><div style={{fontWeight:500,fontSize:12}}>{p.name}</div><div style={{fontSize:10,color:'var(--tx3)'}}>{p.distributor} · {p.amount}</div></div>
      {p.file_url && <a href={p.file_url} target="_blank" rel="noreferrer" className="btn btn-blue btn-sm"><i className="fa fa-eye"></i> View</a>}
    </div>
  ));
}

function RouteField({ jobs, onStatusChange }) {
  return (
    <div>
      {jobs.map((j,i) => (
        <div key={j.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',marginBottom:9,overflow:'hidden'}}>
          <div style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(58,123,213,.2)',color:'var(--blue2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
            <div style={{flex:1}}><div style={{fontWeight:600}}>{j.title}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{j.address}</div></div>
            <span className={`tag tag-${j.delivery_status==='delivered'?'green':j.delivery_status==='in-transit'?'blue':'gray'}`}>{j.delivery_status||'pending'}</span>
          </div>
          <div style={{padding:'0 14px 12px',borderTop:'1px solid var(--border)',display:'flex',gap:6,paddingTop:9}}>
            <button className="btn btn-sm btn-blue" onClick={() => onStatusChange(j.id,'in-transit')}><i className="fa fa-truck"></i> In transit</button>
            <button className="btn btn-sm btn-green" onClick={() => onStatusChange(j.id,'delivered')}><i className="fa fa-check-circle"></i> Delivered</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaintQueueField({ jobs, onRefresh, userId }) {
  const colours = [];
  jobs.forEach(j => (j.colours||[]).filter(c => c.painter_id===userId||!c.painter_id).forEach(c => colours.push({...c,jt:j.title,jid:j.id})));

  async function markDone(jid, cid, rack) {
    if (!rack) { alert('Enter a rack number first'); return; }
    await api.put(`/jobs/${jid}/colours/${cid}`, { rack, status:'done', painterId: userId });
    onRefresh();
  }

  return (
    <div>
      {colours.filter(c=>c.status!=='done').map(c => (
        <div key={c.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',padding:'11px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
          <div style={{width:32,height:32,borderRadius:7,background:c.hex,border:'1px solid rgba(255,255,255,.12)',flexShrink:0}}></div>
          <div style={{flex:1}}><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{c.jt}</div></div>
          <div style={{display:'flex',gap:5,alignItems:'center'}}>
            <input id={`rack-${c.id}`} type="text" style={{width:70,padding:'4px 7px',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:6,color:'var(--tx)',fontFamily:"'DM Mono',monospace",fontSize:11}} placeholder="Rack #" />
            <button className="btn btn-green btn-sm" onClick={() => markDone(c.jid, c.id, document.getElementById(`rack-${c.id}`)?.value?.trim())}>
              <i className="fa fa-check"></i> Done
            </button>
          </div>
        </div>
      ))}
      {colours.filter(c=>c.status==='done').map(c => (
        <div key={c.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'3px solid var(--green)',borderRadius:'var(--r2)',padding:'9px 13px',opacity:.7,display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
          <div style={{width:26,height:26,borderRadius:6,background:c.hex,flexShrink:0}}></div>
          <div style={{flex:1}}><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{c.jt}</div></div>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,background:'var(--bg3)',padding:'2px 8px',borderRadius:6}}>{c.rack}</span>
          <span className="tag tag-green" style={{fontSize:10}}><i className="fa fa-check"></i> Done</span>
        </div>
      ))}
      {colours.length===0 && <div className="empty"><i className="fa fa-paint-roller"></i>No colours in queue</div>}
    </div>
  );
}
