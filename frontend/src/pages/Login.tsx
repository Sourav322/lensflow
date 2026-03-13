import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Spinner';

export default function Login() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate('/', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex bg-white overflow-auto">
      {/* Left panel */}
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-navy via-navy-dark to-[#0a2d3d] px-16 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-radial-gradient opacity-20 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[320px] h-[320px] rounded-full bg-gold/10 pointer-events-none" />
        <div className="relative z-10 text-center w-full max-w-sm">
          <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center font-serif text-[42px] italic text-white mx-auto mb-5 shadow-[0_12px_40px_rgba(0,169,157,.4)]">
            L
          </div>
          <div className="font-serif text-[40px] text-white tracking-[-0.5px] leading-none">
            Lens<span className="text-teal">Flow</span>
          </div>
          <div className="text-[13px] text-white/40 mt-3 tracking-[2px] uppercase">Optical ERP</div>
          <div className="mt-12 flex flex-col gap-4 text-left">
            {[
              ['🛒', 'POS Billing', 'Fast checkout with barcode scanning'],
              ['👁️', 'Prescriptions', 'Full Rx management & history'],
              ['📦', 'Inventory', 'Frames, lenses & accessories'],
              ['🔬', 'Lab Orders', 'Track lab jobs end-to-end'],
              ['📊', 'Reports', 'Revenue & inventory analytics'],
            ].map(([ic, t, s]) => (
              <div key={t} className="flex items-center gap-4 text-white/65 text-[13.5px]">
                <div className="w-9 h-9 rounded-[9px] bg-teal/[.18] border border-teal/25 flex items-center justify-center text-[16px] shrink-0">
                  {ic}
                </div>
                <div>
                  <div className="font-semibold text-white/85 text-[13px]">{t}</div>
                  <div className="text-[12px] text-white/40">{s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full md:w-[460px] flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="font-serif text-[30px] text-ink leading-tight">Welcome back</h2>
            <p className="text-[14px] text-ink-3 mt-2">Sign in to your LensFlow account</p>
          </div>

          <div className="field">
            <label className="label">Email</label>
            <input
              className="input" type="email" placeholder="admin@yourshop.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go()} autoFocus
            />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input
              className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go()}
            />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 bg-coral-soft border border-coral/20 rounded-lg text-coral text-[12.5px] font-semibold">
              {error}
            </div>
          )}

          <button
            className="w-full py-3.5 text-[15px] font-bold rounded-xl border-none bg-gradient-to-r from-teal to-teal-dark text-white cursor-pointer transition-all hover:-translate-y-px hover:shadow-[0_6px_22px_rgba(0,169,157,.44)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            onClick={go} disabled={busy}
          >
            {busy ? <><Spinner size={16} /> Signing in…</> : 'Sign In →'}
          </button>

          <div className="mt-6 p-4 bg-bg rounded-xl border border-dashed border-border-dark">
            <div className="text-[11px] font-bold text-ink-3 uppercase tracking-[.8px] mb-2">Demo Credentials</div>
            {[
              ['Admin',   'admin@demo.com',  'Admin@123'],
              ['Doctor',  'doctor@demo.com', 'Opto@123'],
              ['Staff',   'staff@demo.com',  'Staff@123'],
            ].map(([role, em, pw]) => (
              <div
                key={role}
                className="text-[12.5px] text-ink-3 mb-1 cursor-pointer hover:text-teal transition-colors"
                onClick={() => { setEmail(em); setPassword(pw); }}
              >
                <span className="font-bold text-ink">{role}:</span> {em} / {pw}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
