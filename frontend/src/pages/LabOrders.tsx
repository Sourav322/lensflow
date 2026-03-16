import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, rupee, fmtDate } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Modal from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Plus, Pencil, Search } from 'lucide-react';

const STATUSES = ['pending','sent_to_lab','in_progress','quality_check','ready','delivered','cancelled'];

const EMPTY = { labName:'', lensId:'', status:'pending', expectedDate:'', cost:'', notes:'' };

export default function LabOrders() {
  const toast = useToast(); const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string|null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['lab-orders', search, statusFilter],
    queryFn: () => api.get(`/lab-orders?search=${search}&status=${statusFilter}&limit=50`).then(r => r.data),
  });

  const { data: lenses = [] } = useQuery({
    queryKey: ['lenses-lab'],
    queryFn: () => api.get('/lenses?limit=200').then(r => r.data),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, cost: form.cost ? parseFloat(form.cost) : undefined, expectedDate: form.expectedDate || undefined, lensId: form.lensId || undefined };
      return editing ? api.put(`/lab-orders/${editing}`, body) : api.post('/lab-orders', body);
    },
    onSuccess: () => { toast(editing ? 'Lab order updated' : 'Lab order created', 'success'); qc.invalidateQueries({ queryKey: ['lab-orders'] }); setOpen(false); setForm(EMPTY); setEditing(null); },
    onError: (e: any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/lab-orders/${id}/status`, { status }),
    onSuccess: () => { toast('Status updated', 'success'); qc.invalidateQueries({ queryKey: ['lab-orders'] }); },
    onError: (e: any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  const openEdit = (l: any) => {
    setEditing(l.id);
    setForm({ labName: l.labName, lensId: l.lensId || '', status: l.status, expectedDate: l.expectedDate?.split('T')[0] || '', cost: l.cost ? String(l.cost) : '', notes: l.notes || '' });
    setOpen(true);
  };

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const labOrders = data?.data ?? [];

  return (
    <div>
      <div className="flex justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-serif text-[22px] text-ink">Lab Orders</h2><p className="text-[12.5px] text-ink-3">{labOrders.length} active jobs</p></div>
        <button className="btn btn-teal btn-sm" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}><Plus size={14} /> New Lab Order</button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 flex-1 min-w-[200px]">
          <Search size={13} className="text-ink-3" />
          <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search lab or order #…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Lab Order #</th><th>Lab Name</th><th>Lens</th><th>Sent</th><th>Expected</th><th>Cost</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {labOrders.map((l: any) => (
                  <tr key={l.id}>
                    <td><span className="font-mono text-teal-dark font-bold text-[12px]">{l.labOrderNumber}</span></td>
                    <td className="font-semibold">{l.labName}</td>
                    <td className="text-ink-3 text-[12.5px]">{l.lens ? `${l.lens.brand} ${l.lens.type.replace('_',' ')}` : '—'}</td>
                    <td className="text-ink-3 text-[12.5px]">{fmtDate(l.sentDate)}</td>
                    <td className="text-[12.5px]">{fmtDate(l.expectedDate)}</td>
                    <td>{l.cost ? rupee(l.cost) : '—'}</td>
                    <td>
                      <select
                        className={`status-${l.status} cursor-pointer border-none bg-transparent font-semibold text-[11.5px] outline-none`}
                        value={l.status}
                        onChange={e => updateStatus.mutate({ id: l.id, status: e.target.value })}
                        onClick={e => e.stopPropagation()}
                      >
                        {STATUSES.map(s => <option key={s} value={s} className="text-ink bg-white">{s.replace(/_/g,' ')}</option>)}
                      </select>
                    </td>
                    <td><button className="btn btn-icon" onClick={() => openEdit(l)}><Pencil size={13} /></button></td>
                  </tr>
                ))}
                {!labOrders.length && <tr><td colSpan={8}><EmptyState icon="🔬" title="No lab orders" subtitle="Create lab orders to track lens jobs" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Lab Order' : 'New Lab Order'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div className="field sm:col-span-2"><label className="label">Lab Name <span className="req">*</span></label><input className="input" value={form.labName} onChange={F('labName')} placeholder="e.g. ClearVision Lab" /></div>
          <div className="field">
            <label className="label">Lens (optional)</label>
            <select className="input" value={form.lensId} onChange={F('lensId')}>
              <option value="">Select lens…</option>
              {lenses.map((l: any) => <option key={l.id} value={l.id}>{l.brand} — {l.type.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="field"><label className="label">Status</label><select className="input" value={form.status} onChange={F('status')}>{STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></div>
          <div className="field"><label className="label">Expected Date</label><input className="input" type="date" value={form.expectedDate} onChange={F('expectedDate')} /></div>
          <div className="field"><label className="label">Cost (₹)</label><input className="input" type="number" value={form.cost} onChange={F('cost')} /></div>
          <div className="field sm:col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={F('notes')} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={() => save.mutate()} disabled={save.isPending || !form.labName}>
            {save.isPending ? 'Saving…' : editing ? 'Update' : 'Create Lab Order'}
          </button>
        </div>
      </Modal>
    </div>
  );
      }
