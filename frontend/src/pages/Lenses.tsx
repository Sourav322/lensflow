// ─── Lenses.tsx ───────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, rupee } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

const LENS_TYPES = ['single_vision','bifocal','progressive','toric','colored'];
const EMPTY_L = { brand:'', type:'single_vision', coating:'', index:'', powerRange:'', costPrice:'', sellPrice:'', stock:'0', minStock:'2', barcode:'' };

export function Lenses() {
  const toast = useToast(); const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_L);
  const [editing, setEditing] = useState<string|null>(null);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState<string|null>(null);

  const { data, isLoading } = useQuery({ queryKey:['lenses',search], queryFn:()=>api.get(`/lenses?search=${search}&limit=100`).then(r=>r.data) });

  const save = useMutation({
    mutationFn: () => { const b={...form,costPrice:parseFloat(form.costPrice),sellPrice:parseFloat(form.sellPrice),index:form.index?parseFloat(form.index):undefined,stock:parseInt(form.stock),minStock:parseInt(form.minStock)}; return editing?api.put(`/lenses/${editing}`,b):api.post('/lenses',b); },
    onSuccess: ()=>{ toast(editing?'Lens updated':'Lens added','success'); qc.invalidateQueries({queryKey:['lenses']}); setOpen(false); setForm(EMPTY_L); setEditing(null); },
    onError: (e:any)=>toast(e?.response?.data?.error??'Error','error'),
  });
  const del = useMutation({ mutationFn:(id:string)=>api.delete(`/lenses/${id}`), onSuccess:()=>{ toast('Lens removed','success'); qc.invalidateQueries({queryKey:['lenses']}); } });

  const openEdit = (l:any)=>{ setEditing(l.id); setForm({brand:l.brand,type:l.type,coating:l.coating||'',index:l.index?String(l.index):'',powerRange:l.powerRange||'',costPrice:String(l.costPrice),sellPrice:String(l.sellPrice),stock:String(l.stock),minStock:String(l.minStock),barcode:l.barcode||''}); setOpen(true); };

  const lenses = data?.data??[];
  return (
    <div>
      <div className="flex justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-serif text-[22px] text-ink">Lenses</h2><p className="text-[12.5px] text-ink-3">{lenses.length} items</p></div>
        <button className="btn btn-teal btn-sm" onClick={()=>{setEditing(null);setForm(EMPTY_L);setOpen(true);}}><Plus size={14}/> Add Lens</button>
      </div>
      <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 mb-4 max-w-sm">
        <Search size={13} className="text-ink-3"/><input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search brand, coating…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {isLoading?<PageSpinner/>:(
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Brand</th><th>Type</th><th>Coating</th><th>Index</th><th>Power Range</th><th>Sell Price</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {lenses.map((l:any)=>(
                  <tr key={l.id}>
                    <td className="font-semibold">{l.brand}</td>
                    <td><span className="badge badge-purple capitalize">{l.type.replace('_',' ')}</span></td>
                    <td className="text-ink-3 text-[12.5px]">{l.coating||'—'}</td>
                    <td className="text-center">{l.index??'—'}</td>
                    <td className="text-ink-3 text-[12px]">{l.powerRange||'—'}</td>
                    <td className="font-semibold">{rupee(l.sellPrice)}</td>
                    <td><span className={`badge ${l.stock<=l.minStock?'badge-coral':'badge-green'}`}>{l.stock}</span></td>
                    <td><div className="flex gap-1"><button className="btn btn-icon" onClick={()=>openEdit(l)}><Pencil size={13}/></button><button className="btn btn-icon hover:!border-coral hover:!text-coral" onClick={()=>setDelId(l.id)}><Trash2 size={13}/></button></div></td>
                  </tr>
                ))}
                {!lenses.length&&<tr><td colSpan={8}><EmptyState icon="👁️" title="No lenses found"/></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Lens':'Add Lens'}>
        <div className="grid grid-cols-2 gap-x-4">
          <div className="field col-span-2"><label className="label">Brand *</label><input className="input" value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value}))}/></div>
          <div className="field"><label className="label">Type</label><select className="input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>{LENS_TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</select></div>
          <div className="field"><label className="label">Coating</label><input className="input" value={form.coating} onChange={e=>setForm(p=>({...p,coating:e.target.value}))}/></div>
          <div className="field"><label className="label">Index</label><input className="input" type="number" step="0.01" value={form.index} onChange={e=>setForm(p=>({...p,index:e.target.value}))}/></div>
          <div className="field"><label className="label">Power Range</label><input className="input" value={form.powerRange} onChange={e=>setForm(p=>({...p,powerRange:e.target.value}))}/></div>
          <div className="field"><label className="label">Cost Price *</label><input className="input" type="number" value={form.costPrice} onChange={e=>setForm(p=>({...p,costPrice:e.target.value}))}/></div>
          <div className="field"><label className="label">Sell Price *</label><input className="input" type="number" value={form.sellPrice} onChange={e=>setForm(p=>({...p,sellPrice:e.target.value}))}/></div>
          <div className="field"><label className="label">Stock</label><input className="input" type="number" value={form.stock} onChange={e=>setForm(p=>({...p,stock:e.target.value}))}/></div>
          <div className="field"><label className="label">Min Stock</label><input className="input" type="number" value={form.minStock} onChange={e=>setForm(p=>({...p,minStock:e.target.value}))}/></div>
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-ghost btn-sm" onClick={()=>setOpen(false)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={()=>save.mutate()} disabled={save.isPending||!form.brand||!form.sellPrice}>{save.isPending?'Saving…':editing?'Update':'Add Lens'}</button>
        </div>
      </Modal>
      <ConfirmDialog open={!!delId} title="Remove Lens" message="This lens will be deactivated from inventory." confirmLabel="Remove" danger onConfirm={()=>del.mutate(delId!)} onClose={()=>setDelId(null)}/>
    </div>
  );
}

export default Lenses;
