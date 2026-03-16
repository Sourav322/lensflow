import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, rupee, fmtDate } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Modal from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Plus, Pencil, Search } from 'lucide-react';

const STATUSES = ['received','diagnosing','repairing','quality_check','ready','delivered','cancelled'];
const ITEM_TYPES = ['frame','lens','other'];
const EMPTY = { customerId:'', description:'', itemType:'frame', brand:'', issue:'', estimatedCost:'', estimatedDate:'', notes:'' };

export default function Repairs() {
  const toast = useToast(); const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [finalCostOpen, setFinalCostOpen] = useState<{id:string,cost:string}|null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string|null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['repairs', search, statusFilter],
    queryFn: () => api.get(`/repairs?search=${search}&status=${statusFilter}&limit=50`).then(r => r.data),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-repairs'],
    queryFn: () => api.get('/customers?limit=500').then(r => r.data),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined, estimatedDate: form.estimatedDate || undefined, brand: form.brand || undefined, issue: form.issue || undefined, notes: form.notes || undefined };
      return editing ? api.put(`/repairs/${editing}`, body) : api.post('/repairs', body);
    },
    onSuccess: () => { toast(editing ? 'Repair updated' : 'Repair ticket created', 'success'); qc.invalidateQueries({ queryKey: ['repairs'] }); setOpen(false); setForm(EMPTY); setEditing(null); },
    onError: (e: any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, finalCost }: { id: string; status: string; finalCost?: number }) =>
      api.patch(`/repairs/${id}/status`, { status, ...(finalCost ? { finalCost } : {}) }),
    onSuccess: () => { toast('Status updated', 'success'); qc.invalidateQueries({ queryKey: ['repairs'] }); setFinalCostOpen(null); },
    onError: (e: any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  const openEdit = (r: any) => {
    setEditing(r.id);
    setForm({ customerId: r.customerId, description: r.description, itemType: r.itemType, brand: r.brand || '', issue: r.issue || '', estimatedCost: r.estimatedCost ? String(r.estimatedCost) : '', estimatedDate: r.estimatedDate?.split('T')[0] || '', notes: r.notes || '' });
    setOpen(true);
  };

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleStatusChange = (id: string, status: string) => {
    if (status === 'delivered') {
      setFinalCostOpen({ id, cost: '' });
    } else {
      updateStatus.mutate({ id, status });
    }
  };

  const repairs = data?.data ?? [];
  const statusColor: Record<string, string> = { received:'badge-gold', diagnosing:'badge-navy', repairing:'badge-purple', quality_check:'badge-gold', ready:'badge-green', delivered:'badge-teal', cancelled:'badge-coral' };

  return (
    <div>
      <div className="flex justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-serif text-[22px] text-ink">Repairs</h2><p className="text-[12.5px] text-ink-3">{repairs.length} tickets</p></div>
        <button className="btn btn-teal btn-sm" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}><Plus size={14} /> New Repair</button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 flex-1 min-w-[200px]">
          <Search size={13} className="text-ink-3" />
          <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search ticket # or customer…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {repairs.map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-mono text-teal-dark font-bold text-[12px]">{r.ticketNumber}</span>
                  <div className="font-bold text-[14px] mt-0.5">{r.customer?.name}</div>
                  <div className="text-[12px] text-ink-3">{r.customer?.mobile}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${statusColor[r.status] || 'badge-gray'} capitalize`}>{r.status.replace(/_/g,' ')}</span>
                  <button className="btn btn-icon" onClick={() => openEdit(r)}><Pencil size={13} /></button>
                </div>
              </div>

              <div className="bg-bg rounded-xl p-3 mb-3 text-[13px]">
                <div className="font-semibold mb-1">{r.description}</div>
                <div className="text-ink-3 text-[12px]">{r.itemType} {r.brand ? `· ${r.brand}` : ''} {r.issue ? `· ${r.issue}` : ''}</div>
              </div>

              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex gap-3 text-[12.5px]">
                  <span className="text-ink-3">Est. <strong className="text-ink">{rupee(r.estimatedCost)}</strong></span>
                  {r.finalCost && <span className="text-ink-3">Final <strong className="text-teal-dark">{rupee(r.finalCost)}</strong></span>}
                  {r.estimatedDate && <span className="text-ink-3">Due <strong className="text-ink">{fmtDate(r.estimatedDate)}</strong></span>}
                </div>
                <select
                  className="input input-sm w-36 cursor-pointer text-[12px]"
                  value={r.status}
                  onChange={e => handleStatusChange(r.id, e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
          ))}
          {!repairs.length && <div className="col-span-2"><EmptyState icon="🔧" title="No repair tickets" subtitle="Log frames or lenses sent for repair" /></div>}
        </div>
      )}

      {/* New / Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Repair' : 'New Repair Ticket'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div className="field sm:col-span-2">
            <label className="label">Customer <span className="req">*</span></label>
            <select className="input" value={form.customerId} onChange={F('customerId')}>
              <option value="">Select customer…</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </select>
          </div>
          <div className="field sm:col-span-2"><label className="label">Description <span className="req">*</span></label><textarea className="input" rows={2} value={form.description} onChange={F('description')} /></div>
          <div className="field"><label className="label">Item Type</label><select className="input" value={form.itemType} onChange={F('itemType')}>{ITEM_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label className="label">Brand</label><input className="input" value={form.brand} onChange={F('brand')} /></div>
          <div className="field sm:col-span-2"><label className="label">Issue</label><input className="input" value={form.issue} onChange={F('issue')} /></div>
          <div className="field"><label className="label">Estimated Cost</label><input className="input" type="number" value={form.estimatedCost} onChange={F('estimatedCost')} /></div>
          <div className="field"><label className="label">Est. Ready Date</label><input className="input" type="date" value={form.estimatedDate} onChange={F('estimatedDate')} /></div>
          <div className="field sm:col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={F('notes')} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={() => save.mutate()} disabled={save.isPending || !form.customerId || !form.description}>
            {save.isPending ? 'Saving…' : editing ? 'Update' : 'Create Ticket'}
          </button>
        </div>
      </Modal>

      {/* Final cost modal for delivery */}
      <Modal open={!!finalCostOpen} onClose={() => setFinalCostOpen(null)} title="Mark as Delivered">
        <p className="text-[14px] text-ink-2 mb-4">Enter the final repair cost before marking as delivered.</p>
        <div className="field">
          <label className="label">Final Cost (₹)</label>
          <input className="input" type="number" value={finalCostOpen?.cost ?? ''} onChange={e => setFinalCostOpen(p => p ? { ...p, cost: e.target.value } : null)} autoFocus />
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-ghost btn-sm" onClick={() => setFinalCostOpen(null)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={() => finalCostOpen && updateStatus.mutate({ id: finalCostOpen.id, status: 'delivered', finalCost: parseFloat(finalCostOpen.cost) || undefined })} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? 'Saving…' : 'Confirm Delivery'}
          </button>
        </div>
      </Modal>
    </div>
  );
    }
