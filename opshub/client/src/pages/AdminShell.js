import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

// Page components (imported inline for brevity — split into files in production)
import AllJobs from '../components/AllJobs';
import { SchedOverview, TaskTypeView, PaintQueue, Dispatch, CrewsPage, UsersPage, MyAccount } from '../components/SchedOverview';

const TASK_TYPES = [
  {id:'Siding',       icon:'fa-border-all',  color:'#9B59B6'},
  {id:'Soffit/Fascia',icon:'fa-bars',        color:'#E8A020'},
  {id:'Trim',         icon:'fa-crop-simple', color:'#22A06B'},
  {id:'Parapet',      icon:'fa-building',    color:'#5F9EA0'},
  {id:'Cladding',     icon:'fa-border-none', color:'#3A7BD5'},
  {id:'Eaves',        icon:'fa-water',       color:'#5B9FE8'},
  {id:'Downpipes',    icon:'fa-arrows-down-to-line',color:'#2C4A6E'},
  {id:'Painting',     icon:'fa-paint-roller',color:'#C39BD3'},
];

export default function AdminShell() {
  const { user, logout, can } = useAuth();
  const [view, setView] = useState('alljobs');
  const [activeTT, setActiveTT] = useState(null);
  const [saved, setSaved] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  const ini = (n) => n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0,2);

  function NavItem({ id, icon, label, badge, badgeClass = 'nb-b' }) {
    return (
<div className={`ni${view === id ? ' on' : ''}`} onClick={() => { setView(id); loadJobs(); }}>
        <i className={`fa ${icon}`}></i> {label}
        {badge ? <span className={`nbadge ${badgeClass}`} style={{marginLeft:'auto'}}>{badge}</span> : null}
      </div>
    );
  }

  const behindCount = jobs.reduce((a,j) => {
    return a + j.tasks.filter(t => {
      if (t.status === 'done' || t.status === 'hold' || !t.start_date) return false;
      const d = new Date(t.start_date);
      const today = new Date();
      return d < today;
    }).length;
  }, 0);

  const onHoldCount = jobs.filter(j => j.status === 'on-hold').length;
  const paintCount = jobs.reduce((a,j) => a + (j.colour_count||0), 0);

  const renderPage = () => {
    if (view === 'alljobs') return <AllJobs jobs={jobs} onRefresh={loadJobs} />;
    if (view === 'hold') return <AllJobs jobs={jobs.filter(j=>j.status==='on-hold')} onRefresh={loadJobs} title="On hold" />;
    if (view === 'so') return <SchedOverview jobs={jobs} onSelectTT={(tt) => { setActiveTT(tt); setView('stt'); }} />;
    if (view === 'sb') return <SchedOverview jobs={jobs} behindOnly onSelectTT={(tt) => { setActiveTT(tt); setView('stt'); }} />;
    if (view === 'stt') return <TaskTypeView jobs={jobs} taskType={activeTT} onRefresh={loadJobs} />;
    if (view === 'pq') return <PaintQueue jobs={jobs} onRefresh={loadJobs} />;
    if (view === 'dispatch') return <Dispatch jobs={jobs} onRefresh={loadJobs} />;
    if (view === 'crews') return <CrewsPage jobs={jobs} />;
    if (view === 'users') return <UsersPage />;
    if (view === 'myacct') return <MyAccount />;
    return <AllJobs jobs={jobs} onRefresh={loadJobs} />;
  };

  const titles = {
    alljobs:'All jobs', hold:'On hold', so:'Task schedule', sb:'Behind schedule',
    stt: activeTT ? `${activeTT} — Schedule` : 'Schedule',
    pq:'Paint queue', rack:'Rack storage', dispatch:'Dispatch',
    crews:'Crews & Subs', users:'User management', myacct:'My account'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <div style={{ width: 238, minWidth: 238, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Brand + user */}
        <div style={{ padding: '14px 14px 11px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <div className="brand-icon" style={{ width: 30, height: 30, fontSize: 13, borderRadius: 8 }}>
              <i className="fa-solid fa-layer-group"></i>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.02em' }}>OpsHub</div>
              <div style={{ fontSize: 10, color: saved ? 'var(--green2)' : 'var(--amber2)' }}>
                {saved ? '● Saved' : '● Saving…'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', background: 'var(--sf2)', border: '1px solid var(--border)', borderRadius: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: (user?.color||'#3A7BD5')+'22', color: user?.color||'#3A7BD5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
              {user ? ini(user.name) : '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{user?.role}</div>
            </div>
            <button className="btn btn-sm" onClick={logout} style={{ padding: '2px 6px', color: 'var(--tx3)' }}>
              <i className="fa fa-right-from-bracket"></i>
            </button>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '5px 0' }}>
          <div className="ns">Construction</div>
          <NavItem id="alljobs" icon="fa-th-large" label="All jobs" badge={jobs.length} />
          <NavItem id="hold" icon="fa-pause-circle" label="On hold" badge={onHoldCount||undefined} badgeClass="nb-a" />

          <div className="ns">Schedule</div>
          <NavItem id="so" icon="fa-th-large" label="Task overview" badge={behindCount||undefined} badgeClass="nb-r" />
          <NavItem id="sb" icon="fa-exclamation-circle" label="Behind schedule" badge={behindCount||undefined} badgeClass="nb-r" />

          <div className="ns" style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 10 }}>
            Task types <span style={{ fontSize: 9, color: 'var(--tx3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>per trade</span>
          </div>
          {TASK_TYPES.map(tt => (
            <div key={tt.id} className={`tt-item${view==='stt'&&activeTT===tt.id?' on':''}`}
              onClick={() => { setActiveTT(tt.id); setView('stt'); loadJobs(); }}
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: tt.color, flexShrink: 0 }}></div>
              <span style={{ flex: 1 }}>{tt.id}</span>
            </div>
          ))}

          {can('seePaint') && <>
            <div className="ns">Paint Shop</div>
            <NavItem id="pq" icon="fa-paint-roller" label="Paint queue" badge={paintCount||undefined} badgeClass="nb-p" />
          </>}

          <div className="ns">Delivery</div>
          <NavItem id="dispatch" icon="fa-truck" label="Dispatch" />

          <div className="ns">System</div>
          <NavItem id="crews" icon="fa-hard-hat" label="Crews & Subs" />
          {can('manageUsers') && <NavItem id="users" icon="fa-users-gear" label="User management" />}
          <NavItem id="myacct" icon="fa-circle-user" label="My account" />
        </div>

        {/* Co tabs */}
        <div style={{ display: 'flex', gap: 3, padding: '7px 9px', borderTop: '1px solid var(--border)' }}>
          {[['c','🏗️','alljobs'],['s','📅','so'],['d','🚚','dispatch']].map(([k,e,v]) => (
            <div key={k} className={`co-tab${view===v?' on':''}`} onClick={() => setView(v)} style={{flex:1,padding:'5px 3px',borderRadius:6,textAlign:'center',cursor:'pointer',fontSize:10,fontWeight:500,color:'var(--tx3)',transition:'all .15s',border:'1px solid transparent'}}>
              {e}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 52, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.02em', flex: 1 }}>
            {titles[view] || view}
          </div>
          {loading && <div className="spin" style={{ width: 18, height: 18, borderWidth: 2 }}></div>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {loading ? (
            <div className="empty"><div className="spin" style={{margin:'0 auto 12px'}}></div>Loading…</div>
          ) : renderPage()}
        </div>
      </div>

      <style>{`
        .ns{padding:9px 14px 3px;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--tx3)}
        .ni{display:flex;align-items:center;gap:8px;padding:8px 12px;margin:1px 5px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--tx2);transition:all .15s;position:relative}
        .ni:hover{background:var(--sf2);color:var(--tx)}
        .ni.on{background:linear-gradient(135deg,rgba(58,123,213,.25),rgba(58,123,213,.1));color:var(--blue2);font-weight:500}
        .ni.on::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:2px;background:var(--blue);border-radius:1px}
        .ni .fa{width:14px;text-align:center;font-size:12px}
        .nbadge{font-size:10px;padding:1px 6px;border-radius:7px;font-weight:600}
        .nb-r{background:rgba(231,76,60,.2);color:var(--red2)}
        .nb-a{background:rgba(232,160,32,.2);color:var(--amber2)}
        .nb-b{background:rgba(58,123,213,.2);color:var(--blue2)}
        .nb-p{background:rgba(155,89,182,.2);color:var(--paint2)}
        .tt-item{display:flex;align-items:center;gap:7px;padding:7px 12px;margin:1px 5px;border-radius:8px;cursor:pointer;font-size:11px;color:var(--tx2);transition:all .15s}
        .tt-item:hover{background:var(--sf2);color:var(--tx)}
        .tt-item.on{background:rgba(58,123,213,.12);color:var(--blue2);font-weight:500}
        .co-tab.on{border-color:var(--border2)!important;color:var(--tx)!important;background:var(--sf2)!important}
      `}</style>
    </div>
  );
}
