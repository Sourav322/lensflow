import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { PageSpinner } from '../components/ui/Spinner';
import { LogOut, Save, Plus } from 'lucide-react';
import Modal from '../components/ui/Modal';

type SettingsTab = 'shop' | 'account' | 'users';

export default function Settings() {
  const toast    = useToast();
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [tab, setTab] = useState<SettingsTab>('shop');
  const isAdmin = user?.role === 'admin';

  // ── Shop form ──────────────────────────────────────────────────────────────
  const [shopForm, setShopForm] = useState({ name:'', address:'', city:'', state:'', pincode:'', phone:'', email:'', gstin:'', currency:'INR' });
  const { data: shopData, isLoading: shopLoading } = useQuery({ queryKey:['shop'], queryFn:()=>api.get('/shop').then(r=>r.data.data), enabled: tab==='shop' });
  useEffect(() => { if (shopData) setShopForm({ name:shopData.name||'', address:shopData.address||'', city:shopData.city||'', state:shopData.state||'', pincode:shopData.pincode||'', phone:shopData.phone||'', email:shopData.email||'', gstin:shopData.gstin||'', currency:shopData.currency||'INR' }); }, [shopData]);

  const saveShop = useMutation({
    mutationFn: () => api.put('/shop', shopForm),
    onSuccess: () => { toast('Shop settings saved', 'success'); qc.invalidateQueries({ queryKey:['shop'] }); },
    onError: (e:any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  // ── Account / password ─────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const changePw = useMutation({
    mutationFn: () => api.patch('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => { toast('Password changed', 'success'); setPwForm({ currentPassword:'', newPassword:'', confirm:'' }); },
    onError: (e:any) => toast(e?.response?.data?.error ?? 'Wrong password', 'error'),
  });

  // ── Users ──────────────────────────────────────────────────────────────────
  const { data: usersData } = useQuery({ queryKey:['shop-users'], queryFn:()=>api.get('/shop/users').then(r=>r.data.data), enabled: tab==='users' && isAdmin });
  const [userOpen, setUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name:'', email:'', password:'', role:'staff' });

  const addUser = useMutation({
    mutationFn: () => api.post('/shop/users', userForm),
    onSuccess: () => { toast('User added', 'success'); qc.invalidateQueries({ queryKey:['shop-users'] }); setUserOpen(false); setUserForm({ name:'', email:'', password:'', role:'staff' }); },
    onError: (e:any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  const SF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setShopForm(p => ({ ...p, [k]: e.target.value }));
  const UF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setUserForm(p => ({ ...p, [k]: e.target.value }));

  const doLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout(); navigate('/login');
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="font-serif text-[22px] text-ink">Settings</h2><p className="text-[12.5px] text-ink-3">Manage your shop & account</p></div>
        <button className="btn btn-ghost btn-sm text-coral hover:!border-coral" onClick={doLogout}><LogOut size={13}/> Sign Out</button>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab==='shop'?'tab-active':''}`} onClick={()=>setTab('shop')}>🏪 Shop Info</button>
        <button className={`tab-btn ${tab==='account'?'tab-active':''}`} onClick={()=>setTab('account')}>👤 Account</button>
        {isAdmin && <button className={`tab-btn ${tab==='users'?'tab-active':''}`} onClick={()=>setTab('users')}>👥 Users</button>}
      </div>

      {/* ── Shop Info ── */}
      {tab === 'shop' && (
        shopLoading ? <PageSpinner /> : (
          <div className="card mt-5">
            <div className="font-serif text-[17px] mb-5">Shop Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <div className="field sm:col-span-2"><label className="label">Shop Name</label><input className="input" value={shopForm.name} onChange={SF('name')}/></div>
              <div className="field sm:col-span-2"><label className="label">Address</label><input className="input" value={shopForm.address} onChange={SF('address')}/></div>
              <div className="field"><label className="label">City</label><input className="input" value={shopForm.city} onChange={SF('city')}/></div>
              <div className="field"><label className="label">State</label><input className="input" value={shopForm.state} onChange={SF('state')}/></div>
              <div className="field"><label className="label">Pincode</label><input className="input" value={shopForm.pincode} onChange={SF('pincode')}/></div>
              <div className="field"><label className="label">Phone</label><input className="input" value={shopForm.phone} onChange={SF('phone')}/></div>
              <div className="field"><label className="label">Email</label><input className="input" type="email" value={shopForm.email} onChange={SF('email')}/></div>
              <div className="field"><label className="label">GSTIN</label><input className="input" value={shopForm.gstin} onChange={SF('gstin')} placeholder="22AAAAA0000A1Z5"/></div>
              <div className="field">
                <label className="label">Currency</label>
                <select className="input" value={shopForm.currency} onChange={SF('currency')}>
                  {['INR','USD','EUR','GBP','AED'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-teal btn-sm" onClick={()=>saveShop.mutate()} disabled={saveShop.isPending}><Save size={13}/> {saveShop.isPending?'Saving…':'Save Changes'}</button>
          </div>
        )
      )}

      {/* ── Account ── */}
      {tab === 'account' && (
        <div className="space-y-4 mt-5">
          {/* Profile card */}
          <div className="card flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal to-teal-dark text-white flex items-center justify-center text-[22px] font-bold">{user?.name?.[0]}</div>
            <div>
              <div className="font-bold text-[16px]">{user?.name}</div>
              <div className="text-ink-3 text-[13px]">{user?.email}</div>
              <span className="badge badge-teal mt-1 capitalize">{user?.role}</span>
            </div>
          </div>
          {/* Change password */}
          <div className="card">
            <div className="font-serif text-[17px] mb-5">Change Password</div>
            <div className="space-y-3 max-w-sm">
              <div className="field"><label className="label">Current Password</label><input className="input" type="password" value={pwForm.currentPassword} onChange={e=>setPwForm(p=>({...p,currentPassword:e.target.value}))}/></div>
              <div className="field"><label className="label">New Password</label><input className="input" type="password" value={pwForm.newPassword} onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))}/></div>
              <div className="field"><label className="label">Confirm New Password</label><input className="input" type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}/></div>
            </div>
            <button
              className="btn btn-teal btn-sm mt-2"
              onClick={()=>changePw.mutate()}
              disabled={changePw.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirm}
            >
              {changePw.isPending?'Changing…':'Change Password'}
            </button>
            {pwForm.confirm && pwForm.newPassword !== pwForm.confirm && <p className="text-coral text-[12px] mt-2">Passwords don't match</p>}
          </div>
        </div>
      )}

      {/* ── Users (admin only) ── */}
      {tab === 'users' && isAdmin && (
        <div className="mt-5">
          <div className="flex justify-between items-center mb-4">
            <div className="font-serif text-[17px]">System Users</div>
            <button className="btn btn-teal btn-sm" onClick={()=>setUserOpen(true)}><Plus size={13}/> Add User</button>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last Login</th><th>Status</th></tr></thead>
              <tbody>
                {(usersData??[]).map((u:any)=>(
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[9px] bg-teal-light text-teal-dark font-bold text-[13px] flex items-center justify-center">{u.name[0]}</div>
                        <span className="font-semibold text-[13px]">{u.name}{u.id===user?.id&&<span className="badge badge-gold ml-1.5 text-[10px]">You</span>}</span>
                      </div>
                    </td>
                    <td className="text-ink-3 text-[12.5px]">{u.email}</td>
                    <td><span className={`badge badge-${u.role==='admin'?'coral':u.role==='optometrist'?'purple':'teal'} capitalize`}>{u.role}</span></td>
                    <td className="text-ink-3 text-[12.5px]">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}</td>
                    <td><span className={`badge ${u.isActive?'badge-green':'badge-coral'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal open={userOpen} onClose={()=>setUserOpen(false)} title="Add User">
        <div className="space-y-0">
          <div className="field"><label className="label">Name <span className="req">*</span></label><input className="input" value={userForm.name} onChange={UF('name')}/></div>
          <div className="field"><label className="label">Email <span className="req">*</span></label><input className="input" type="email" value={userForm.email} onChange={UF('email')}/></div>
          <div className="field"><label className="label">Password <span className="req">*</span></label><input className="input" type="password" value={userForm.password} onChange={UF('password')}/></div>
          <div className="field">
            <label className="label">Role</label>
            <select className="input" value={userForm.role} onChange={UF('role')}>
              <option value="staff">Staff</option>
              <option value="optometrist">Optometrist</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button className="btn btn-ghost btn-sm" onClick={()=>setUserOpen(false)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={()=>addUser.mutate()} disabled={addUser.isPending||!userForm.name||!userForm.email||!userForm.password}>
            {addUser.isPending?'Adding…':'Add User'}
          </button>
        </div>
      </Modal>
    </div>
  );
              }
