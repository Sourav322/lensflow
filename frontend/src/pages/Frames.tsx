import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, rupee } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Search, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

const EMPTY = { brand:'', model:'', color:'', size:'', material:'', type:'full_rim', gender:'Unisex', costPrice:'', sellPrice:'', mrp:'', stock:'0', minStock:'2', barcode:'' };

const FRAME_TYPES = ['full_rim','half_rim','rimless','sports'];

export default function Frames() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editing, setEditing] = useState<string|null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId]   = useState<string|null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['frames', search, lowStock],
    queryFn: () => api.get(`/frames?search=${search}&limit=100&lowStock=${lowStock}`).then(r => r.data),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, costPrice: parseFloat(form.costPrice), sellPrice: parseFloat(form.sellPrice), mrp: form.mrp ? parseFloat(form.mrp) : undefined, stock: parseInt(form.stock), minStock: parseInt(form.minStock) };
      return editing ? api.put(`/frames/${editing}`, body) : api.post('/frames', body);
    },
    onSuccess: () => { toast(editing ? 'Frame updated':'Frame added','success'); qc.invalidateQueries({queryKey:['frames']}); setModalOpen(false); setForm(EMPTY); setEditing(null); },
    onError: (e:any) => toast(e?.response?.data?.error ?? 'Error','error'),
  });

  const del = useMutation({
    mutationFn: (id:string) => api.delete(`/frames/${id}`),
    onSuccess: () => { toast('Frame deactivated','success'); qc.invalidateQueries({queryKey:['frames']}); },
  });

  const openEdit = (f:any) => { setEditing(f.id); setForm({ brand:f.brand, model:f.model, color:f.color||'', size:f.size||'', material:f.material||'', type:f.type||'full_rim', gender:f.gender||'Unisex', costPrice:String(f.costPrice), sellPrice:String(f.sellPrice), mrp:f.mrp?String(f.mrp):'', stock:String(f.stock), minStock:String(f.minStock), barcode:f.barcode||'' }); setModalOpen(true); };
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };

  const frames = data?.data ?? [];
  const F = (f:string) => (k:string) => setForm(p=>({...p,[k]:f}));

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-[22px] text-ink">Frames</h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">{frames.length} items in inventory</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className={`btn btn-sm ${lowStock ? 'btn-coral' : 'btn-ghost'}`} onClick={()=>setLowStock(l=>!l)}><AlertTriangle size={13}/> Low Stock</button>
          <button className="btn btn-teal btn-sm" onClick={openAdd}><Plus size={14}/> Add Frame</button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 mb-4 max-w-sm">
        <Search size={13} className="text-ink-3"/>
        <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search brand, model, barcode…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Brand / Model</th><th>Color</th><th>Type</th><th>Barcode</th><th>Cost</th><th>Sell</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {frames.map((f:any) => (
                  <tr key={f.id}>
                    <td>
                      <div className="font-semibold text-[13px]">{f.brand}</div>
                      <div className="text-[11.5px] text-ink-3">{f.model} · {f.gender}</div>
                    </td>
                    <td className="text-ink-3 text-[12.5px]">{f.color||'—'}</td>
                    <td><span className="badge badge-navy capitalize">{f.type?.replace('_',' ')}</span></td>
                    <td><span className="font-mono text-[11.5px] text-teal-dark">{f.barcode||'—'}</span></td>
                    <td className="text-ink-3">{rupee(f.costPrice)}</td>
                    <td className="font-semibold">{rupee(f.sellPrice)}</td>
                    <td>
                      <span className={`badge ${f.stock===0 ? 'badge-coral' : f.stock<=f.minStock ? 'badge-gold' : 'badge-green'}`}>
                        {f.stock===0 ? 'Out' : f.stock}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-icon" onClick={()=>openEdit(f)}><Pencil size={13}/></button>
                        <button className="btn btn-icon hover:!border-coral hover:!text-coral" onClick={()=>setDeleteId(f.id)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!frames.length && <tr><td colSpan={8}><EmptyState icon="🕶️" title="No frames found" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Frame':'Add Frame'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {[['brand','Brand *'],['model','Model *'],['color','Color'],['size','Size'],['material','Material'],['barcode','Barcode']].map(([k,l]) => (
            <div key={k} className="field"><label className="label">{l}</label><input className="input" value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>
          ))}
          <div className="field"><label className="label">Type</label>
            <select className="input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
              {FRAME_TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="field"><label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))}>
              {['Unisex','Men','Women','Kids'].map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          {[['costPrice','Cost Price *'],['sellPrice','Sell Price *'],['mrp','MRP'],['stock','Stock *'],['minStock','Min Stock']].map(([k,l]) => (
            <div key={k} className="field"><label className="label">{l}</label><input className="input" type="number" value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>
          ))}
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button className="btn btn-ghost btn-sm" onClick={()=>setModalOpen(false)}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={()=>save.mutate()} disabled={save.isPending||!form.brand||!form.model||!form.sellPrice}>
            {save.isPending?'Saving…':editing?'Update':'Add Frame'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Deactivate Frame" message="This frame will be hidden from inventory and POS. Existing order history is preserved." confirmLabel="Deactivate" danger onConfirm={()=>del.mutate(deleteId!)} onClose={()=>setDeleteId(null)}/>
    </div>
  );
                                                                                                                                                                                                                                                           }
