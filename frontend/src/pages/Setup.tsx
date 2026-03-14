import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Spinner';
import { CheckCircle, Store, User, Lock, Phone, MapPin, Eye, EyeOff } from 'lucide-react';

const STEPS = ['Shop Details', 'Admin Account', 'Complete'];

export default function Setup() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const [step, setStep]   = useState(0);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [show, setShow]   = useState(false);

  const [form, setForm] = useState({
    shopName:  '',
    address:   '',
    city:      '',
    state:     '',
    phone:     '',
    gstin:     '',
    name:      '',
    email:     '',
    password:  '',
    password2: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const nextStep = () => {
    setError('');
    if (step === 0) {
      if (!form.shopName.trim()) { setError('Shop ka naam zaroori hai'); return; }
      if (!form.city.trim())     { setError('City zaroori hai'); return; }
    }
    if (step === 1) {
      if (!form.name.trim())    { setError('Aapka naam zaroori hai'); return; }
      if (!form.email.trim())   { setError('Email zaroori hai'); return; }
      if (form.password.length < 8) { setError('Password kam se kam 8 characters ka hona chahiye'); return; }
      if (form.password !== form.password2) { setError('Dono passwords match nahi kar rahe'); return; }
    }
    setStep(s => s + 1);
  };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/register', {
        shopName: form.shopName,
        city:     form.city,
        phone:    form.phone,
        name:     form.name,
        email:    form.email,
        password: form.password,
      });
      // Update shop details
      if (form.address || form.state || form.gstin) {
        const tokens = data.data;
        await api.put('/shop', {
          address: form.address,
          state:   form.state,
          gstin:   form.gstin,
        }, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
      }
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      setStep(2);
      setTimeout(() => navigate('/', { replace: true }), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Setup failed — dobara try karein');
      setStep(1);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-dark to-[#0a2d3d] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center font-serif text-3xl italic text-white mx-auto mb-4 shadow-[0_12px_40px_rgba(0,169,157,.4)]">L</div>
          <div className="font-serif text-3xl text-white">Lens<span className="text-teal">Flow</span></div>
          <div className="text-white/50 text-sm mt-1">Apna optical shop setup karein</div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-teal text-white' : i === step ? 'bg-white text-navy' : 'bg-white/20 text-white/40'
              }`}>
                {i < step ? <CheckCircle size={16}/> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-white/40'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-teal' : 'bg-white/20'}`}/>}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Step 0 — Shop Details */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-light flex items-center justify-center"><Store size={18} className="text-teal"/></div>
                <div>
                  <div className="font-serif text-xl text-ink">Shop Details</div>
                  <div className="text-xs text-ink-3">Apni optical shop ki jaankari bharein</div>
                </div>
              </div>

              <div className="field">
                <label className="label">Shop Ka Naam *</label>
                <input className="input" placeholder="jaise: Vision Plus Optical" value={form.shopName} onChange={e => set('shopName', e.target.value)} autoFocus/>
              </div>
              <div className="field">
                <label className="label">Address</label>
                <input className="input" placeholder="Shop ka pata" value={form.address} onChange={e => set('address', e.target.value)}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="label">City *</label>
                  <input className="input" placeholder="Mumbai" value={form.city} onChange={e => set('city', e.target.value)}/>
                </div>
                <div className="field">
                  <label className="label">State</label>
                  <input className="input" placeholder="Maharashtra" value={form.state} onChange={e => set('state', e.target.value)}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="label">Phone</label>
                  <input className="input" placeholder="9876543210" value={form.phone} onChange={e => set('phone', e.target.value)}/>
                </div>
                <div className="field">
                  <label className="label">GSTIN</label>
                  <input className="input" placeholder="27AABFV..." value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())}/>
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Admin Account */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-light flex items-center justify-center"><User size={18} className="text-teal"/></div>
                <div>
                  <div className="font-serif text-xl text-ink">Admin Account</div>
                  <div className="text-xs text-ink-3">Apna login account banayein</div>
                </div>
              </div>

              <div className="field">
                <label className="label">Aapka Naam *</label>
                <input className="input" placeholder="Poora naam" value={form.name} onChange={e => set('name', e.target.value)} autoFocus/>
              </div>
              <div className="field">
                <label className="label">Email Address *</label>
                <input className="input" type="email" placeholder="aapka@email.com" value={form.email} onChange={e => set('email', e.target.value)}/>
              </div>
              <div className="field">
                <label className="label">Password *</label>
                <div className="relative">
                  <input className="input pr-10" type={show ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)}/>
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" onClick={() => setShow(s => !s)}>
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div className="field">
                <label className="label">Password Confirm Karein *</label>
                <input className="input" type="password" placeholder="Wahi password dobara likhein" value={form.password2} onChange={e => set('password2', e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}/>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-600 border border-blue-100">
                🔐 Yeh credentials sirf aapke paas rahenge — kisi ko share mat karein
              </div>
            </div>
          )}

          {/* Step 2 — Success */}
          {step === 2 && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-teal-light flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-teal"/>
              </div>
              <div className="font-serif text-2xl text-ink mb-2">Setup Complete! 🎉</div>
              <div className="text-ink-3 text-sm mb-4">
                <strong>{form.shopName}</strong> successfully setup ho gayi!
              </div>
              <div className="text-xs text-ink-4">Dashboard par ja rahe hain...</div>
              <div className="mt-4 flex justify-center">
                <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin"/>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          {step < 2 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button className="btn btn-ghost flex-1 justify-center" onClick={() => { setError(''); setStep(s => s - 1); }}>
                  ← Wapas
                </button>
              )}
              {step === 0 && (
                <button className="btn btn-teal flex-1 justify-center" onClick={nextStep}>
                  Aage Badho →
                </button>
              )}
              {step === 1 && (
                <button className="btn btn-teal flex-1 justify-center" onClick={submit} disabled={busy}>
                  {busy ? <><Spinner size={16}/> Setup ho raha hai...</> : '🚀 Shop Launch Karein'}
                </button>
              )}
            </div>
          )}

          {/* Login link */}
          {step < 2 && (
            <div className="mt-4 text-center text-sm text-ink-3">
              Pehle se account hai?{' '}
              <a href="/login" className="text-teal font-semibold hover:underline">Sign In Karein</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

