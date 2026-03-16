import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmtDate } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

const EMPTY = {
  customerId:'', date:'', notes:'', nextVisit:'', ipd:'',
  reSph:'', reCyl:'', reAxis:'', reAdd:'', reVa:'',
  leSph:'', leCyl:'', leAxis:'', leAdd:'', leVa:'',
};

function RxRow({ label, sph, cyl, axis, add, va }: any) {
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="w-6 font-bold text-ink-3">{label}</span>
      <span className="badge badge-gray w-16 justify-center">{sph||'—'}</span>
      <span className="badge badge-gray w-16 justify-center">{cyl||'—'}</span>
      <span className="badge badge-gray w-12 justify-center">{axis||'—'}</span>
      {add !== undefined && <span className="badge badge-gold w-14 justify-center">{add||'—'}</span>}
      <span className="badge badge-teal w-12 justify-center">{va||'—'}</span>
    </div>
  );
}

export default function Prescriptions() {
  const toast = useToast(); const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string|null>(null);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState<string|null>(null);

  const { data: rxData, isLoading } = useQuery({
    queryKey: ['prescriptions', search],
    queryFn: () => api.get(`/prescriptions?search=${search}&limit=50`).then(r => r.data),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-rx'],
    queryFn: () => api.get('/customers?limit=500').then(r => r.data),
  });

  const save = useMutation({
    mutationFn: () => {
      const num = (v: string) => v ? parseFloat(v) : undefined;
      const int = (v: string) => v ? parseInt(v) : undefined;
      const body = {
        customerId: form.customerId,
        date: form.date || undefined,
        notes: form.notes || undefined,
        nextVisit: form.nextVisit || undefined,
        ipd: num(form.ipd),
        reSph: num(form.reSph), reCyl: num(form.reCyl), reAxis: int(form.reAxis), reAdd: num(form.reAdd), reVa: form.reVa || undefined,
        leSph: num(form.leSph), leCyl: num(form.leCyl), leAxis: int(form.leAxis), leAdd: num(form.leAdd), leVa: form.leVa || undefined,
      };
      return editing ? api.put(`/prescriptions/${editing}`, body) : api.post('/prescriptions', body);
    },
    onSuccess: () => { toast(editing ? 'Prescription updated' : 'Prescription saved', 'success'); qc.invalidateQueries({ queryKey: ['prescriptions'] }); setOpen(false); setForm(EMPTY); setEditing(null); },
    onError: (e: any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/prescriptions/${id}`),
    onSuccess: () => { toast('Prescription deleted', 'success'); qc.invalidateQueries({ queryKey: ['prescriptions'] }); },
  });

  const openEdit = (rx: any) => {
    setEditing(rx.id);
    setForm({
      customerId: rx.customerId, date: rx.date?.split('T')[0] || '', notes: rx.notes || '', nextVisit: rx.nextVisit?.split('T')[0] || '', ipd: rx.ipd ? String(rx.ipd) : '',
      reSph: rx.reSph != null ? String(rx.reSph) : '', reCyl: rx.reCyl != null ? String(rx.reCyl) : '', reAxis: rx.reAxis != null ? String(rx.reAxis) : '', reAdd: rx.reAdd != null ? String(rx.reAdd) : '', reVa: rx.reVa || '',
      leSph: rx.leSph != null ? String(rx.leSph) : '', leCyl: rx.leCyl != null ? String(rx.leCyl) : '', leAxis: rx.leAxis != null ? String(rx.leAxis) : '', leAdd: rx.leAdd != null ? String(rx.leAdd) : '', leVa: rx.leVa || '',
    });
    setOpen(true);
  };

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const prescriptions = rxData?.data ?? [];

  return (
    <div>
      <div className="flex justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-serif text-[22px] text-ink">Prescriptions</h2><p className="text-[12.5px] text-ink-3">{prescriptions.length} records</p></div>
        <button className="btn btn-teal btn-sm" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}><Plus size={14} /> New Rx</button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 mb-4 max-w-sm">
        <Search size={13} className="text-ink-3" />
        <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search customer name…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-3">
          {prescriptions.map((rx: any) => (
            <div key={rx.id} className="card">
              <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-light text-teal-dark flex items-center justify-center font-bold text-[15px]">
                    {rx.customer?.name?.[0]}
                  </div>
                  <div>
                    <div className="font-bold text-[14px]">{rx.customer?.name}</div>
                    <div className="text-[12px] text-ink-3">📅 {fmtDate(rx.date)} · 👤 Dr. {rx.doctor?.name || 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rx.nextVisit && <span className="badge badge-gold text-[11px]">Next visit: {fmtDate(rx.nextVisit)}</span>}
                  <button className="btn btn-icon" onClick={() => openEdit(rx)}><Pencil size={13} /></button>
                  <button className="btn btn-icon hover:!border-coral hover:!text-coral" onClick={() => setDelId(rx.id)}><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="bg-bg rounded-xl p-3 space-y-2">
                <div className="flex gap-2 text-[10px] font-bold text-ink-3 uppercase tracking-[.8px] mb-1 ml-8">
                  <span className="w-16 text-center">SPH</span>
                  <span className="w-16 text-center">CYL</span>
                  <span className="w-12 text-center">AXIS</span>
                  <span className="w-14 text-center">ADD</span>
                  <span className="w-12 text-center">VA</span>
                </div>
                <RxRow label="RE" sph={rx.reSph} cyl={rx.reCyl} axis={rx.reAxis} add={rx.reAdd} va={rx.reVa} />
                <RxRow label="LE" sph={rx.leSph} cyl={rx.leCyl} axis={rx.leAxis} add={rx.leAdd} va={rx.leVa} />
              </div>

              {(rx.ipd || rx.notes) && (
                <div className="mt-2 flex gap-3 text-[12.5px] text-ink-3">
                  {rx.ipd && <span>IPD: <strong className="text-ink">{rx.ipd} mm</strong></span>}
                  {rx.notes && <span>📝 {rx.notes}</span>}
                </div>
              )}
            </div>
          ))}
          {!prescriptions.length && <EmptyState icon="📋" title="No prescriptions yet" subtitle="Record your first prescription" action={<button className="btn btn-teal btn-sm" onClick={() => setOpen(true)}><Plus size={13} /> New Rx</button>} />}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Prescription' : 'New Prescription'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
          <div className="field sm:col-span-2">
            <label className="label">Customer <span className="req">*</span></label>
            <select className="input" value={form.customerId} onChange={F('customerId')}>
              <option value="">Select customer…</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Date</label>
            <input className="input" type="date" value={form.date} onChange={F('date')} />
          </div>
        </div>

        {/* Rx table */}
        <div className="mb-4">
          <div className="text-[11px] font-bold text-ink-3 uppercase tracking-[.8px] mb-2">Refraction Data</div>
          <div className="bg-bg rounded-xl overflow-hidden border border-border">
            <div className="grid grid-cols-6 gap-0 text-[10.5px] font-bold text-ink-3 uppercase tracking-[.8px] px-3 py-2 bg-[#f2f5f8] border-b border-border">
              <span>Eye</span><span>SPH</span><span>CYL</span><span>AXIS</span><span>ADD</span><span>VA</span>
            </div>
            {[['RE', 'reSph','reCyl','reAxis','reAdd','reVa'], ['LE','leSph','leCyl','leAxis','leAdd','leVa']].map(([eye,...fields]) => (
              <div key={eye} className="grid grid-cols-6 gap-1 px-3 py-2.5 border-b border-border last:border-0">
                <span className="flex items-center text-[12.5px] font-bold text-teal-dark">{eye}</span>
                {(fields as string[]).map(f => (
                  <input key={f} className="input input-sm text-center" type="number" step="0.25" placeholder="—" value={(form as any)[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
          <div className="field"><label className="label">IPD (mm)</label><input className="input" type="number" step="0.5" value={form.ipd} onChange={F('ipd')} /></div>
          <div className="field"><label className="label">Next Visit</label><input className="input" type="date" value={form.nextVisit} onChange={F('nextVisit')} /></div>
          <div className="field sm:col-span-1"><label className="label">Notes</label><input className="input" value={form.notes} onChange={F('notes')} /></div>
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={() => save.mutate()} disabled={save.isPending || !form.customerId}>
            {save.isPending ? 'Saving…' : editing ? 'Update Rx' : 'Save Rx'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} title="Delete Prescription" message="This prescription record will be permanently deleted." confirmLabel="Delete" danger onConfirm={() => del.mutate(delId!)} onClose={() => setDelId(null)} />
    </div>
  );
      }
