import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username || !password) { setError('Enter your username and password'); return; }
    setLoading(true); setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '60px 20px', overflowY: 'auto'
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 20, padding: '34px 38px', width: '100%', maxWidth: 400
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <div className="brand-icon" style={{ width: 38, height: 38, borderRadius: 10, fontSize: 16 }}>
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.03em' }}>OpsHub</div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Operations Platform
            </div>
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, letterSpacing: '-.03em' }}>Sign in</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 22 }}>
          Enter your username and password.
        </div>

        <form onSubmit={handleLogin}>
          <div className="fg">
            <label className="fl">Username</label>
            <input
              type="text" className="fi"
              placeholder="e.g. apex.siding"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="fg">
            <label className="fl">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} className="fi"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 13
                }}
              >
                <i className={`fa fa-${showPw ? 'eye-slash' : 'eye'}`}></i>
              </button>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red2)', marginBottom: 10, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 12, borderRadius: 'var(--r2)', border: 'none',
              background: loading ? 'rgba(58,123,213,.5)' : 'var(--blue)',
              color: '#fff', fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', transition: 'all .15s'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="spin" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
