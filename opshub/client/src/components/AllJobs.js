// AllJobs.js - Job list and grid view
import React, { useState } from 'react';
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

export default function AllJobs({ jobs = [], onRefresh, title }) {
  const { can } = useAuth();
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [newJob, setNewJob] = useState({ title:'', address:'', status:'scheduled', scheduledDate:'' });
  const [selectedJob, setSelectedJob] = useState(null);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);
  const pct = j => j.tasks.length ? Math.round(j.tasks.filter(t=>t.status==='done').length/j.tasks.length*100) : 0;

  async function createJob() {
    if (!newJob.title || !newJob.address) return;
    try {
      await api.post('/jobs', newJob);
      setShowNew(false); setNewJob({title:'',address:'',status:'scheduled',scheduledDate:''});
      onRefresh();
    } catch(err) { alert(err.response?.data?.error || 'Failed to create job'); }
  }

  return (
    <div>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
        {[['Total',jobs.length,'var(--tx)'],['In progress',jobs.filter(j=>j.status==='in-progress').length,'var(--blue2)'],
          ['On hold',jobs.filter(j=>j.status==='on-hold').length,'var(--amber2)'],
          ['Scheduled',jobs.filter(j=>j.status==='scheduled').length,'var(--green2)']].map(([l,v,c]) => (
          <div key={l} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',padding:'13px 15px'}}>
            <div style={{fontSize:10,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>{l}</div>
            <div style={{fontSize:22,fontWeight:600,letterSpacing:'-.03em',color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filter + new */}
      <div style={{display:'flex',gap:5,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        {['all','in-progress','on-hold','scheduled','completed'].map(s => (
          <button key={s} className={`chip${filter===s?' on':''}`}
            style={{padding:'3px 10px',borderRadius:20,border:'1px solid var(--border)',background:'transparent',fontSize:11,cursor:'pointer',color:'var(--tx3)',fontFamily:"'DM Sans',sans-serif",transition:'all .15s'}}
            onClick={() => setFilter(s)}>
            {s==='all'?'All':s.replace('-',' ')}
          </button>
        ))}
        {can('editJobs') && (
          <button className="btn btn-blue btn-sm" style={{marginLeft:'auto'}} onClick={() => setShowNew(true)}>
            <i className="fa fa-plus"></i> New job
          </button>
        )}
      </div>

      {/* Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:11}}>
        {filtered.map(j => {
          const p = pct(j);
          const behind = j.tasks.filter(t => t.status==='pending' && t.start_date && new Date(t.start_date)<new Date()).length;
          const taskTypes = [...new Set(j.tasks.map(t=>t.name))];
          return (
            <div key={j.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r2)',overflow:'hidden',cursor:'pointer',transition:'all .18s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(58,123,213,.4)';e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.transform='';}}
              onClick={() => setSelectedJob(j)}>
              <div style={{padding:'12px 13px 9px',borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:5}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:170}}>{j.title}</div>
                    <div style={{fontSize:11,color:'var(--tx3)'}}><i className="fa fa-map-marker-alt" style={{fontSize:9}}></i> {j.address}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                    <span className={`tag tag-${j.status==='in-progress'?'blue':j.status==='on-hold'?'amber':j.status==='completed'?'green':'gray'}`}>{j.status.replace('-',' ')}</span>
                    {behind>0 && <span className="tag tag-red" style={{fontSize:9}}><i className="fa fa-exclamation-circle"></i> {behind} behind</span>}
                  </div>
                </div>
              </div>
              <div style={{padding:'9px 13px'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--tx3)',marginBottom:3}}><span>{j.tasks.filter(t=>t.status==='done').length}/{j.tasks.length} tasks</span><span>{p}%</span></div>
                <div className="pbar"><div className="pfill" style={{width:`${p}%`,background:p===100?'var(--green)':p>50?'var(--blue)':'var(--amber)'}}></div></div>
                <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:7}}>
                  {taskTypes.map(n => { const tt=TASK_TYPES.find(t=>t.id===n); return tt ? <span key={n} className="tag" style={{background:tt.color+'18',color:tt.color,fontSize:10}}>{n}</span>:null; })}
                </div>
              </div>
              <div style={{padding:'7px 13px 11px',display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--tx3)'}}>
                <span>{j.pos_count>0?`${j.pos_count} PO${j.pos_count>1?'s':''}`:''}</span>
                <span>{j.scheduledDate||j.scheduled_date||''}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <div className="empty"><i className="fa fa-inbox"></i>No jobs match</div>}

      {/* New job modal */}
      {showNew && (
        <div className="overlay" onClick={e => { if(e.target===e.currentTarget)setShowNew(false); }}>
          <div className="modal" style={{maxWidth:490}} onClick={e=>e.stopPropagation()}>
            <div className="mhd"><div style={{fontSize:14,fontWeight:600,flex:1}}>New job</div><button className="btn btn-sm" style={{padding:'4px 7px'}} onClick={()=>setShowNew(false)}><i className="fa fa-times"></i></button></div>
            <div className="mbody">
              <div className="fg"><label className="fl">Job name</label><input className="fi" value={newJob.title} onChange={e=>setNewJob({...newJob,title:e.target.value})} placeholder="e.g. Daytona Homes — 20x22 Garage"/></div>
              <div className="fg"><label className="fl">Address</label><input className="fi" value={newJob.address} onChange={e=>setNewJob({...newJob,address:e.target.value})} placeholder="123 Main St"/></div>
              <div className="fgrid">
                <div className="fg"><label className="fl">Status</label><select className="fs" value={newJob.status} onChange={e=>setNewJob({...newJob,status:e.target.value})}><option value="scheduled">Scheduled</option><option value="in-progress">In progress</option><option value="on-hold">On hold</option></select></div>
                <div className="fg"><label className="fl">Start date</label><input type="date" className="fi" value={newJob.scheduledDate} onChange={e=>setNewJob({...newJob,scheduledDate:e.target.value})}/></div>
              </div>
            </div>
            <div className="mfoot"><button className="btn" onClick={()=>setShowNew(false)}>Cancel</button><button className="btn btn-blue" onClick={createJob}><i className="fa fa-check"></i> Create</button></div>
          </div>
        </div>
      )}

      {/* Job detail modal - simplified */}
      {selectedJob && <JobDetailModal job={selectedJob} onClose={()=>setSelectedJob(null)} onRefresh={()=>{onRefresh();setSelectedJob(null);}} />}
    </div>
  );
}

function JobDetailModal({ job, onClose, onRefresh }) {
  const { can } = useAuth();
  const [fullJob, setFullJob] = useState(null);
  const [tab, setTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [crews, setCrews] = useState([]);

  const TASK_TYPES_MAP = {};
  TASK_TYPES.forEach(t => { TASK_TYPES_MAP[t.id] = t; });

  useEffect(() => {
    Promise.all([
      api.get(`/jobs/${job.id}`),
      api.get('/users/crews')
    ]).then(([jRes, cRes]) => {
      setFullJob(jRes.data);
      setCrews(cRes.data);
    }).finally(() => setLoading(false));
  }, [job.id]);

  async function updateTask(taskId, updates) {
    await api.put(`/jobs/${job.id}/tasks/${taskId}`, updates);
    const res = await api.get(`/jobs/${job.id}`);
    setFullJob(res.data);
  }

  const tabs = [
    {id:'tasks',l:'Tasks'},
    ...(can('seePOs') ? [{id:'pos',l:'POs'}] : []),
    ...(can('seePaint') ? [{id:'colours',l:'Colours'}] : []),
    {id:'blueprints',l:'Blueprints'},
    {id:'delivery',l:'Delivery'},
  ];

  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="mhd">
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{job.title}</div><div style={{fontSize:11,color:'var(--tx3)'}}><i className="fa fa-map-marker-alt"></i> {job.address}</div></div>
          <button className="btn btn-sm" style={{padding:'4px 7px'}} onClick={onClose}><i className="fa fa-times"></i></button>
        </div>
        <div className="mtabs">{tabs.map(t=><div key={t.id} className={`mtab${tab===t.id?' on':''}`} onClick={()=>setTab(t.id)}>{t.l}</div>)}</div>
        <div className="mbody">
          {loading ? <div style={{textAlign:'center',padding:24}}><div className="spin" style={{margin:'0 auto'}}></div></div> : (
            <>
              {tab==='tasks' && fullJob?.tasks && (
                <table style={{width:'100%',borderCollapse:'collapse',border:'1px solid var(--border)',borderRadius:'var(--r)',overflow:'hidden'}}>
                  <thead><tr style={{background:'var(--bg3)'}}>
                    <th style={{padding:'7px 10px',fontSize:10,fontWeight:600,color:'var(--tx3)',textAlign:'left',textTransform:'uppercase',letterSpacing:'.06em',width:24}}></th>
                    <th style={{padding:'7px 10px',fontSize:10,fontWeight:600,color:'var(--tx3)',textAlign:'left',textTransform:'uppercase',letterSpacing:'.06em'}}>Trade</th>
                    <th style={{padding:'7px 10px',fontSize:10,fontWeight:600,color:'var(--tx3)',textAlign:'left',textTransform:'uppercase',letterSpacing:'.06em'}}>Crew</th>
                    <th style={{padding:'7px 10px',fontSize:10,fontWeight:600,color:'var(--tx3)',textAlign:'left',textTransform:'uppercase',letterSpacing:'.06em'}}>Start</th>
                    <th style={{padding:'7px 10px',fontSize:10,fontWeight:600,color:'var(--tx3)',textAlign:'left',textTransform:'uppercase',letterSpacing:'.06em'}}>Status</th>
                  </tr></thead>
                  <tbody>
                    {fullJob.tasks.map(t => {
                      const tt = TASK_TYPES_MAP[t.name];
                      const specialists = crews.filter(c => (c.trades||[]).includes(t.name));
                      return (
                        <tr key={t.id} style={{borderTop:'1px solid var(--border)'}}>
                          <td style={{padding:'7px 10px'}}>
                            <div style={{width:16,height:16,borderRadius:4,background:tt?.color||'#999',opacity:.8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <i className={`fa ${tt?.icon||'fa-wrench'}`} style={{fontSize:9,color:'#fff'}}></i>
                            </div>
                          </td>
                          <td style={{padding:'7px 10px',fontWeight:500,fontSize:12}}>{t.name}</td>
                          <td style={{padding:'7px 10px',fontSize:12}}>
                            {can('editTasks') ? (
                              <select className="fs" style={{padding:'2px 5px',fontSize:11}} value={t.crew_id||''} onChange={e=>updateTask(t.id,{crewId:e.target.value||null,status:t.status,startDate:t.start_date,duration:t.duration})}>
                                <option value="">— Assign —</option>
                                {specialists.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                {specialists.length===0 && <option disabled>No specialists</option>}
                              </select>
                            ) : t.crew_name||'—'}
                          </td>
                          <td style={{padding:'7px 10px',fontSize:12}}>
                            {can('editTasks') ? (
                              <input type="date" className="fi" style={{padding:'2px 5px',fontSize:11,minWidth:100}} value={t.start_date||''} onChange={e=>updateTask(t.id,{crewId:t.crew_id,status:t.status,startDate:e.target.value,duration:t.duration})}/>
                            ) : t.start_date||'—'}
                          </td>
                          <td style={{padding:'7px 10px',fontSize:12}}>
                            {can('editTasks') ? (
                              <select className="fs" style={{padding:'2px 5px',fontSize:11}} value={t.status} onChange={e=>updateTask(t.id,{crewId:t.crew_id,status:e.target.value,startDate:t.start_date,duration:t.duration})}>
                                <option value="pending">Pending</option>
                                <option value="done">Done</option>
                                <option value="hold">On hold</option>
                              </select>
                            ) : <span className={`tag tag-${t.status==='done'?'green':t.status==='hold'?'amber':'gray'}`}>{t.status}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tab==='pos' && (
                <div>
                  {(fullJob?.pos||[]).length===0 && <div style={{fontSize:12,color:'var(--tx3)',padding:'7px 0'}}>No POs</div>}
                  {(fullJob?.pos||[]).map(p => (
                    <div key={p.id} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'10px 13px',display:'flex',alignItems:'center',gap:9,marginBottom:7}}>
                      <div style={{width:28,height:28,borderRadius:7,background:'rgba(224,62,62,.2)',color:'var(--red2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}><i className="fa fa-file-pdf"></i></div>
                      <div style={{flex:1}}><div style={{fontWeight:500,fontSize:12}}>{p.name}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{p.distributor} · {p.amount}</div></div>
                      {p.file_url && <a href={p.file_url} target="_blank" rel="noreferrer" className="btn btn-blue btn-sm"><i className="fa fa-eye"></i> View</a>}
                    </div>
                  ))}
                  {can('editJobs') && <FileUploader jobId={job.id} type="po" onUploaded={()=>{api.get(`/jobs/${job.id}`).then(r=>setFullJob(r.data));}} />}
                </div>
              )}

              {tab==='colours' && (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:12}}>
                    {(fullJob?.colours||[]).map(c => (
                      <div key={c.id} style={{borderRadius:'var(--r)',overflow:'hidden',border:'1px solid var(--border)'}}>
                        <div style={{height:44,background:c.hex}}></div>
                        <div style={{padding:'7px 9px',background:'var(--bg3)'}}>
                          <div style={{fontSize:11,fontWeight:600}}>{c.name}</div>
                          {c.code && <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'DM Mono',monospace"}}>{c.code}</div>}
                          <div style={{marginTop:4}}><span className={`tag tag-${c.status==='done'?'green':c.status==='painting'?'paint':'gray'}`} style={{fontSize:10}}>{c.status}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab==='blueprints' && (
                <div>
                  {(fullJob?.blueprints||[]).length===0 && <div style={{fontSize:12,color:'var(--tx3)',padding:'7px 0'}}>No blueprints yet</div>}
                  {(fullJob?.blueprints||[]).map(b => (
                    <div key={b.id} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'10px 13px',display:'flex',alignItems:'center',gap:9,marginBottom:7}}>
                      <div style={{width:28,height:28,borderRadius:7,background:b.category==='colour'?'rgba(155,89,182,.18)':'rgba(58,123,213,.18)',color:b.category==='colour'?'var(--paint2)':'var(--blue2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>
                        <i className={`fa ${b.category==='colour'?'fa-palette':'fa-drafting-compass'}`}></i>
                      </div>
                      <div style={{flex:1}}><div style={{fontWeight:500,fontSize:12}}>{b.label||b.name}</div><div style={{fontSize:10,color:'var(--tx3)',textTransform:'capitalize'}}>{b.category}</div></div>
                      {b.file_url && <a href={b.file_url} target="_blank" rel="noreferrer" className="btn btn-blue btn-sm"><i className="fa fa-eye"></i> View</a>}
                    </div>
                  ))}
                  {can('editJobs') && <FileUploader jobId={job.id} type="blueprint" onUploaded={()=>{api.get(`/jobs/${job.id}`).then(r=>setFullJob(r.data));}} />}
                </div>
              )}

              {tab==='delivery' && (
                <div>
                  <div style={{fontSize:12,color:'var(--tx2)',marginBottom:12}}>Delivery status: <span style={{fontWeight:600}}>{fullJob?.delivery_status||'pending'}</span></div>
                  {fullJob?.delivery_notes && <div style={{fontSize:12,color:'var(--tx3)',marginBottom:12}}>{fullJob.delivery_notes}</div>}
                </div>
              )}
            </>
          )}
        </div>
        <div className="mfoot">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function FileUploader({ jobId, type, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (type === 'blueprint') {
        const n = file.name.toLowerCase();
        const category = n.includes('color')||n.includes('colour') ? 'colour' : 'blueprint';
        formData.append('category', category);
        formData.append('label', category==='colour' ? 'Colour Selection' : file.name);
        await api.post(`/files/blueprint/${jobId}`, formData, { headers:{'Content-Type':'multipart/form-data'} });
      } else {
        await api.post(`/files/po/${jobId}`, formData, { headers:{'Content-Type':'multipart/form-data'} });
      }
      onUploaded();
    } catch(err) { alert('Upload failed: ' + (err.response?.data?.error||err.message)); }
    finally { setUploading(false); e.target.value=''; }
  }

  return (
    <div style={{border:'2px dashed var(--border2)',borderRadius:'var(--r2)',padding:'18px 20px',textAlign:'center',cursor:'pointer',transition:'all .2s',background:'var(--sf)',marginTop:9,position:'relative'}}>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
      {uploading ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:12,color:'var(--tx2)'}}>
          <div className="spin" style={{width:16,height:16,borderWidth:2}}></div> Uploading…
        </div>
      ) : (
        <>
          <div style={{fontSize:20,color:'var(--tx3)',marginBottom:5}}><i className="fa fa-cloud-upload-alt"></i></div>
          <div style={{fontSize:12,color:'var(--tx2)',fontWeight:500}}>Upload {type === 'po' ? 'PO' : 'blueprint / colour selection'}</div>
          <div style={{fontSize:11,color:'var(--tx3)',marginTop:3}}>PDF, JPG, or PNG</div>
        </>
      )}
    </div>
  );
}
