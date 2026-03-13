import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, rupee, fmtDate } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY = { name:'', role:'', phone:'', email:'', salary:'', joinDate:'' };
const ROLES = ['Sales Executive','Optometrist','Billing Staff','Manager','Receptionist','Delivery','Other'];

export default function Staff() {
  const toast = useToast(); const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string|null>(null);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState<string|null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data.data),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, salary: form.salary ? parseFloat(form.salary) : undefined, joinDate: form.joinDate || undefined, email: form.email || undefined };
      return editing ? api.put(`/staff/${editing}`, body) : api.post('/staff', body);
    },
    onSuccess: () => { toast(editing ? 'Staff updated' : 'Staff added', 'success'); qc.invalidateQueries({ queryKey: ['staff'] }); setOpen(false); setForm(EMPTY); setEditing(null); },
    onError: (e: any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => { toast('Staff deactivated', 'success'); qc.invalidateQueries({ queryKey: ['staff'] }); },
  });

  const openEdit = (s: any) => {
    setEditing(s.id);
    setForm({ name: s.name, role: s.role, phone: s.phone || '', email: s.email || '', salary: s.salary ? String(s.salary) : '', joinDate: s.joinDate?.split('T')[0] || '' });
    setOpen(true);
  };

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const roleColor: Record<string, string> = { Manager:'badge-navy', Optometrist:'badge-purple', 'Sales Executive':'badge-teal', 'Billing Staff':'badge-gold' };

  return (
    <div>
      <div className="flex justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-serif text-[22px] text-ink">Staff</h2><p className="text-[12.5px] text-ink-3">{data.length} members</p></div>
        <button className="btn btn-teal btn-sm" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}><Plus size={14} /> Add Staff</button>
      </div>

      {isLoading ? <PageSpinner /> : (
        data.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((s: any) => (
              <div key={s.id} className="card hover:-translate-y-0.5 transition-transform">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal to-teal-dark text-white flex items-center justify-center text-[18px] font-bold shrink-0">{s.name[0]}</div>
                    <div>
                      <div className="font-bold text-[14.5px]">{s.name}</div>
                      <span className={`badge ${roleColor[s.role] || 'badge-gray'} text-[10.5px] mt-0.5`}>{s.role}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-icon" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                    <button className="btn btn-icon hover:!border-coral hover:!text-coral" onClick={() => setDelId(s.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="space-y-1.5 text-[12.5px] text-ink-3">
                  {s.phone && <div>📱 {s.phone}</div>}
                  {s.email && <div>✉️ {s.email}</div>}
                  {s.salary && <div>💰 <strong className="text-teal-dark">{rupee(s.salary)}</strong> / month</div>}
                  {s.joinDate && <div>📅 Joined {fmtDate(s.joinDate)}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon="👥" title="No staff members" subtitle="Add your first team member" action={<button className="btn btn-teal btn-sm" onClick={() => setOpen(true)}><Plus size={13} /> Add Staff</button>} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Staff' : 'Add Staff Member'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div className="field sm:col-span-2"><label className="label">Full Name <span className="req">*</span></label><input className="input" value={form.name} onChange={F('name')} /></div>
          <div className="field">
            <label className="label">Role <span className="req">*</span></label>
            <select className="input" value={form.role} onChange={F('role')}>
              <option value="">Select role…</option>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field"><label className="label">Phone</label><input className="input" type="tel" value={form.phone} onChange={F('phone')} /></div>
          <div className="field"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={F('email')} /></div>
          <div className="field"><label className="label">Monthly Salary (₹)</label><input className="input" type="number" value={form.salary} onChange={F('salary')} /></div>
          <div className="field sm:col-span-2"><label className="label">Join Date</label><input className="input" type="date" value={form.joinDate} onChange={F('joinDate')} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.role}>
            {save.isPending ? 'Saving…' : editing ? 'Update' : 'Add Staff'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} title="Deactivate Staff" message="This staff member will be deactivated. Their records will be preserved." confirmLabel="Deactivate" danger onConfirm={() => del.mutate(delId!)} onClose={() => setDelId(null)} />
    </div>
  );
              }
