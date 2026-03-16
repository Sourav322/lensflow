import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, rupee, fmtDate } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react';

const EMPTY = { name:'', mobile:'', email:'', city:'', address:'', notes:'' };

export default function Customers() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [form, setForm]     = useState(EMPTY);
  const [editing, setEditing] = useState<string|null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId]   = useState<string|null>(null);
  const [viewId, setViewId]       = useState<string|null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => api.get(`/customers?search=${search}&page=${page}&limit=20`).then(r => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['customer', viewId],
    queryFn: () => api.get(`/customers/${viewId}`).then(r => r.data),
    enabled: !!viewId,
  });

  const save = useMutation({
    mutationFn: () => editing
      ? api.put(`/customers/${editing}`, form)
      : api.post('/customers', form),
    onSuccess: () => {
      toast(editing ? 'Customer updated' : 'Customer added', 'success');
      qc.invalidateQueries({ queryKey:['customers'] });
      setModalOpen(false); setForm(EMPTY); setEditing(null);
    },
    onError: (e:any) => toast(e?.response?.data?.error ?? 'Error', 'error'),
  });

  const del = useMutation({
    mutationFn: (id:string) => api.delete(`/customers/${id}`),
    onSuccess: () => { toast('Customer deleted', 'success'); qc.invalidateQueries({ queryKey:['customers'] }); },
  });

  const openEdit = (c: any) => { setEditing(c.id); setForm({ name:c.name, mobile:c.mobile, email:c.email||'', city:c.city||'', address:c.address||'', notes:c.notes||'' }); setModalOpen(true); };
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };

  const customers = data?.data ?? [];
  const total     = data?.meta?.total ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-[22px] text-ink">Customers</h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">{total} total customers</p>
        </div>
        <button className="btn btn-teal btn-sm" onClick={openAdd}><Plus size={14}/> Add Customer</button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 mb-4 max-w-sm">
        <Search size={13} className="text-ink-3" />
        <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search name, mobile, email…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th><th>Mobile</th><th>City</th><th>Orders</th><th>Spent</th><th>Loyalty</th><th>Last Visit</th><th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[9px] bg-teal-light text-teal-dark flex items-center justify-center text-[13px] font-bold shrink-0">{c.name[0]}</div>
                        <div>
                          <div className="font-semibold text-[13px]">{c.name}</div>
                          {c.email && <div className="text-[11.5px] text-ink-3">{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-[12px]">{c.mobile}</td>
                    <td className="text-ink-3">{c.city || '—'}</td>
                    <td><span className="badge badge-teal">{c._count?.orders ?? c.totalOrders}</span></td>
                    <td className="font-semibold">{rupee(c.totalSpent)}</td>
                    <td><span className="badge badge-gold">⭐ {c.loyaltyPoints}</span></td>
                    <td className="text-ink-3 text-[12px]">{fmtDate(c.updatedAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="btn btn-icon" onClick={()=>setViewId(c.id)} title="View"><Eye size={13}/></button>
                        <button className="btn btn-icon" onClick={()=>openEdit(c)} title="Edit"><Pencil size={13}/></button>
                        <button className="btn btn-icon hover:!border-coral hover:!text-coral" onClick={()=>setDeleteId(c.id)} title="Delete"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!customers.length && <tr><td colSpan={8}><EmptyState icon="👥" title="No customers yet" subtitle="Add your first customer to get started" /></td></tr>}
              </tbody>
            </table>
          </div>
          {total > 20 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-border text-[13px]">
              <span className="text-ink-3">Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-xs" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                <button className="btn btn-ghost btn-xs" disabled={page*20>=total} onClick={()=>setPage(p=>p+1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {[['name','Name','text',true],['mobile','Mobile','tel',true],['email','Email','email',false],['city','City','text',false],['address','Address','text',false],['notes','Notes','text',false]].map(([f,l,t,req]) => (
            <div key={f as string} className="field">
              <label className="label">{l as string}{req && <span className="req"> *</span>}</label>
              {f === 'address' || f === 'notes'
                ? <textarea className="input" rows={2} value={(form as any)[f as string]} onChange={e=>setForm(p=>({...p,[f as string]:e.target.value}))} />
                : <input className="input" type={t as string} value={(form as any)[f as string]} onChange={e=>setForm(p=>({...p,[f as string]:e.target.value}))} />
              }
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button className="btn btn-ghost btn-sm" onClick={()=>setModalOpen(false)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={()=>save.mutate()} disabled={save.isPending || !form.name || !form.mobile}>
            {save.isPending ? 'Saving…' : editing ? 'Update' : 'Add Customer'}
          </button>
        </div>
      </Modal>

      {/* View Modal */}
      {viewId && detail && (
        <Modal open={!!viewId} onClose={()=>setViewId(null)} title="Customer Details" size="lg">
          <div className="flex items-center gap-4 mb-5 p-4 bg-bg rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-teal-light text-teal-dark flex items-center justify-center text-2xl font-bold">{detail.name[0]}</div>
            <div>
              <div className="font-serif text-[20px]">{detail.name}</div>
              <div className="text-ink-3 text-[13px]">{detail.mobile} {detail.email && `· ${detail.email}`}</div>
            </div>
            <div className="ml-auto flex gap-3">
              <div className="text-center"><div className="font-serif text-[20px] text-teal-dark">{rupee(detail.totalSpent)}</div><div className="text-[11px] text-ink-3">Total Spent</div></div>
              <div className="text-center"><div className="font-serif text-[20px]">{detail.totalOrders}</div><div className="text-[11px] text-ink-3">Orders</div></div>
              <div className="text-center"><div className="font-serif text-[20px] text-gold">⭐{detail.loyaltyPoints}</div><div className="text-[11px] text-ink-3">Points</div></div>
            </div>
          </div>
          <h3 className="font-semibold text-[13px] mb-2">Recent Orders</h3>
          {detail.orders?.length ? detail.orders.slice(0,5).map((o:any) => (
            <div key={o.id} className="flex justify-between items-center py-2.5 border-b border-border last:border-0 text-[13px]">
              <div><span className="font-mono text-teal-dark">{o.orderNumber}</span> <span className="text-ink-3">{fmtDate(o.createdAt)}</span></div>
              <div className="flex items-center gap-2"><span className={`status-${o.status}`}>{o.status}</span><span className="font-semibold">{rupee(o.total)}</span></div>
            </div>
          )) : <div className="text-ink-3 text-[13px] py-4 text-center">No orders yet</div>}
        </Modal>
      )}

      <ConfirmDialog open={!!deleteId} title="Delete Customer" message="This will permanently delete the customer and all their data. This action cannot be undone." confirmLabel="Delete" danger onConfirm={()=>del.mutate(deleteId!)} onClose={()=>setDeleteId(null)} />
    </div>
  );
                    }
