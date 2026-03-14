import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Spinner';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate  = useNavigate();
  const setAuth   = useAuthStore((s) => s.setAuth);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  const go = async () => {
    if (!email || !password) { setError('Email aur password dono zaroori hain'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate('/', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Login failed — email ya password galat hai');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-navy via-navy-dark to-[#0a2d3d]">
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-16 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-teal/10 blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-gold/5 blur-3xl pointer-events-none"/>
        <div className="relative z-10 text-center w-full max-w-sm">
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center font-serif text-5xl italic text-white mx-auto mb-6 shadow-[0_20px_60px_rgba(0,169,157,.4)]">
            L
          </div>
          <div className="font-serif text-5xl text-white tracking-tight">
            Lens<span className="text-teal">Flow</span>
          </div>
          <div className="text-sm text-white/40 mt-3 tracking-[3px] uppercase">Optical ERP</div>
          <div className="mt-12 grid gap-4 text-left">
            {[
              ['🛒', 'POS Billing',    'Barcode scanning ke saath fast billing'],
              ['👁️', 'Prescriptions', 'Poora Rx history aur management'],
              ['📦', 'Inventory',      'Frames, lenses aur accessories'],
              ['🔬', 'Lab Orders',     'Lab jobs track karein end-to-end'],
              ['📊', 'Reports',        'Sales aur inventory analytics'],
            ].map(([ic, t, s]) => (
              <div key={String(t)} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">{ic}</div>
                <div>
                  <div className="font-semibold text-white/90 text-sm">{t}</div>
                  <div className="text-xs text-white/40">{s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="w-full lg:w-[480px] flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center font-serif text-2xl italic text-white">L</div>
            <div className="font-serif text-2xl text-ink">Lens<span className="text-teal">Flow</span></div>
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-3xl text-ink">Welcome back</h1>
            <p className="text-sm text-ink-3 mt-2">Apne shop account mein sign in karein</p>
          </div>

          {/* Email */}
          <div className="field">
            <label className="label">Email Address</label>
            <input
              className="input" type="email"
              placeholder="aapka@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go()}
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="field">
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && go()}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                onClick={() => setShow(s => !s)}
              >
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="btn btn-teal w-full justify-center py-3 text-base mt-1"
            onClick={go}
            disabled={busy}
          >
            {busy ? <Spinner size={18}/> : 'Sign In →'}
          </button>

          {/* Register link */}
          <div className="mt-6 text-center text-sm text-ink-3">
            Pehli baar use kar rahe hain?{' '}
            <Link to="/setup" className="text-teal font-semibold hover:underline">
              Shop Setup Karein
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center text-xs text-ink-4">
            LensFlow Optical ERP © 2024 — Secure & Private
          </div>
        </div>
      </div>
    </div>
  );
}
