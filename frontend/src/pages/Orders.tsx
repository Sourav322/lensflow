import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, rupee, fmtDate } from '../lib/api';
import { PageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Search, Download, MessageCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Orders() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);
  const [viewId, setViewId] = useState<string|null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', search, status, page],
    queryFn: () => api.get(`/orders?search=${search}&status=${status}&page=${page}&limit=20`).then(r => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['order', viewId],
    queryFn: () => api.get(`/orders/${viewId}`).then(r => r.data.data),
    enabled: !!viewId,
  });

  const downloadPdf = async (invoiceId: string, invoiceNo: string) => {
  try {
    const res = await fetch(
      import.meta.env.VITE_API_URL + `/invoices/${invoiceId}/pdf`
    );

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNo}.pdf`;
    a.click();

    URL.revokeObjectURL(url);

    toast('PDF downloaded', 'success');
  } catch {
    toast('PDF generation failed', 'error');
  }
};

  const getWhatsApp = async (invoiceId: string) => {
    try {
      const { data } = await api.get(`/invoices/${invoiceId}/whatsapp`);
      window.open(data.data.link, '_blank');
      toast('WhatsApp link opened', 'success');
    } catch { toast('Failed to generate WhatsApp link', 'error'); }
  };

  const orders = data?.data ?? [];
  const total  = data?.meta?.total ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-serif text-[22px] text-ink">Orders</h2><p className="text-[12.5px] text-ink-3">{total} total orders</p></div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 flex-1 min-w-[200px]">
          <Search size={13} className="text-ink-3"/>
          <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search order # or customer…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select className="input w-40" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
          <option value="">All Status</option>
          {['pending','confirmed','processing','ready','delivered','cancelled'].map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {orders.map((o:any) => (
                  <tr key={o.id} className="cursor-pointer" onClick={()=>setViewId(o.id)}>
                    <td><span className="font-mono text-teal-dark font-bold text-[12px]">{o.orderNumber}</span></td>
                    <td><div className="font-semibold text-[13px]">{o.customer?.name}</div><div className="text-[11.5px] text-ink-3">{o.customer?.mobile}</div></td>
                    <td className="text-ink-3 text-[12.5px]">{fmtDate(o.createdAt)}</td>
                    <td><span className="badge badge-gray">{o.items?.length} items</span></td>
                    <td className="font-semibold">{rupee(o.total)}</td>
                    <td><span className="badge badge-navy uppercase text-[10px]">{o.paymentMode}</span></td>
                    <td><span className={`status-${o.status}`}>{o.status}</span></td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div className="flex gap-1">
                        {o.invoice && <>
                          <button className="btn btn-icon" title="Download PDF" onClick={()=>downloadPdf(o.invoice.id, o.invoice.invoiceNumber)}><Download size={13}/></button>
                          <button className="btn btn-icon hover:!border-[#25D366] hover:!text-[#25D366]" title="WhatsApp" onClick={()=>getWhatsApp(o.invoice.id)}><MessageCircle size={13}/></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!orders.length && <tr><td colSpan={8}><EmptyState icon="📋" title="No orders found"/></td></tr>}
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

      {/* Order detail modal */}
      {viewId && detail && (
        <Modal open={!!viewId} onClose={()=>setViewId(null)} title={`Order ${detail.orderNumber}`} size="lg">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[['Customer',detail.customer?.name],['Date',fmtDate(detail.createdAt)],['Status',detail.status],['Payment',detail.paymentMode?.toUpperCase()],['Invoice',detail.invoice?.invoiceNumber||'—'],['Created By',detail.createdBy?.name]].map(([l,v])=>(
              <div key={l} className="bg-bg rounded-xl p-3">
                <div className="text-[10.5px] font-bold text-ink-3 uppercase tracking-[.8px] mb-1">{l}</div>
                <div className="text-[13.5px] font-bold capitalize">{v}</div>
              </div>
            ))}
          </div>
          <table className="tbl mb-4">
            <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>
              {detail.items?.map((i:any)=>(
                <tr key={i.id}><td>{i.name}</td><td>{i.qty}</td><td>{rupee(i.unitPrice)}</td><td className="font-semibold">{rupee(i.total)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-8 text-[13px] bg-bg rounded-xl p-4">
            <div className="space-y-1">
              <div className="flex justify-between gap-12"><span className="text-ink-3">Subtotal</span><span>{rupee(detail.subtotal)}</span></div>
              {Number(detail.discountAmt)>0&&<div className="flex justify-between gap-12 text-coral"><span>Discount</span><span>-{rupee(detail.discountAmt)}</span></div>}
              {Number(detail.taxAmt)>0&&<div className="flex justify-between gap-12"><span>Tax ({detail.taxPct}%)</span><span>+{rupee(detail.taxAmt)}</span></div>}
              <div className="flex justify-between gap-12 font-bold text-[15px] border-t border-border pt-2 mt-1"><span>Total</span><span className="text-teal-dark font-serif text-[18px]">{rupee(detail.total)}</span></div>
            </div>
          </div>
          {detail.invoice && (
            <div className="flex gap-3 mt-4">
              <button className="btn btn-outline btn-sm" onClick={()=>downloadPdf(detail.invoice.id, detail.invoice.invoiceNumber)}><Download size={13}/> Download PDF</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>getWhatsApp(detail.invoice.id)}><MessageCircle size={13}/> WhatsApp</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
              }
