import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, rupee } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useBarcode } from '../hooks/useBarcode';
import { PageSpinner } from '../components/ui/Spinner';
import { Search, X, Plus, Minus, ShoppingCart, User, Scan } from 'lucide-react';

type Tab = 'frames' | 'lenses' | 'accessories';
interface CartItem { k: string; id: string; type: Tab; name: string; sub: string; price: number; qty: number; }

const PAYMENT_MODES = ['cash','upi','card','netbanking','cheque','credit'];

export default function POS() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab]       = useState<Tab>('frames');
  const [q, setQ]           = useState('');
  const [cart, setCart]     = useState<CartItem[]>([]);
  const [customer, setCust] = useState<any>(null);
  const [custQ, setCustQ]   = useState('');
  const [custDrop, setCustDrop] = useState(false);
  const [discType, setDiscType] = useState<'flat'|'percent'>('flat');
  const [discVal, setDiscVal]   = useState('');
  const [taxPct, setTaxPct]     = useState('');
  const [payMode, setPayMode]   = useState('upi');
  const [tend, setTend]         = useState('');
  const [paying, setPaying]     = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const { data: frames = [],   isLoading: fl } = useQuery({ queryKey:['frames-pos'],    queryFn: () => api.get('/frames?limit=200').then(r=>r.data) });
  const { data: lenses = [],   isLoading: ll } = useQuery({ queryKey:['lenses-pos'],    queryFn: () => api.get('/lenses?limit=200').then(r=>r.data) });
  const { data: accs   = [],   isLoading: al } = useQuery({ queryKey:['accs-pos'],      queryFn: () => api.get('/accessories').then(r=>r.data) });
  const { data: customers = [] }               = useQuery({ queryKey:['customers-pos'], queryFn: () => api.get('/customers?limit=200').then(r=>r.data) });

  const createOrder = useMutation({
    mutationFn: (body: any) => api.post('/orders', body),
    onSuccess: (res) => {
      toast(`Invoice ${res.data.invoice.invoiceNumber} created! 🎉`, 'success');
      setCart([]); setCust(null); setDiscVal(''); setTaxPct(''); setTend(''); setPaying(false);
      qc.invalidateQueries({ queryKey:['frames-pos'] });
      qc.invalidateQueries({ queryKey:['dashboard'] });
    },
    onError: (e: any) => toast(e?.response?.data?.error ?? 'Order failed', 'error'),
  });

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setCustDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Barcode scanner
  useBarcode((code) => {
    const lookups = [
      api.get(`/frames/barcode/${code}`).catch(() => null),
      api.get(`/lenses/barcode/${code}`).catch(() => null),
      api.get(`/accessories/barcode/${code}`).catch(() => null),
    ];
    Promise.all(lookups).then(([f, l, a]) => {
      const item = f?.data?.data || l?.data?.data || a?.data?.data;
      if (!item) { toast(`Barcode ${code} not found`, 'error'); return; }
      const type: Tab = f?.data?.data ? 'frames' : l?.data?.data ? 'lenses' : 'accessories';
      addToCart(item, type);
      toast(`Scanned: ${item.brand || item.name}`, 'success');
    });
  });

  const items = useMemo(() => {
    const base = tab === 'frames' ? frames : tab === 'lenses' ? lenses : accs;
    if (!q) return base;
    const ql = q.toLowerCase();
    return base.filter((it: any) =>
      `${it.brand||''} ${it.model||it.name||''} ${it.color||it.coating||''}`.toLowerCase().includes(ql)
    );
  }, [tab, q, frames, lenses, accs]);

  const addToCart = (it: any, t: Tab = tab) => {
    if (t === 'frames' && it.stock === 0) { toast('Out of stock', 'error'); return; }
    const k = `${it.id}:${t}`;
    const name = it.brand ? `${it.brand} ${it.model||it.type||it.name}` : it.name;
    setCart(prev => {
      const ex = prev.find(c => c.k === k);
      if (ex) return prev.map(c => c.k===k ? { ...c, qty: c.qty+1 } : c);
      return [...prev, { k, id: it.id, type: t, name, sub: it.color||it.coating||it.category||'', price: Number(it.sellPrice), qty: 1 }];
    });
    toast(`${name} added`, 'success');
  };

  const updQty = (k: string, d: number) => setCart(p => p.map(c => c.k===k ? { ...c, qty: Math.max(1, c.qty+d) } : c));
  const removeItem = (k: string) => setCart(p => p.filter(c => c.k !== k));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discAmt  = discType === 'percent' ? subtotal * (parseFloat(discVal)||0)/100 : (parseFloat(discVal)||0);
  const taxAmt   = (subtotal - discAmt) * (parseFloat(taxPct)||0)/100;
  const total    = Math.max(0, subtotal - discAmt + taxAmt);
  const change   = parseFloat(tend||'0') - total;

  const filteredCusts = customers.filter((c: any) =>
    !custQ || `${c.name} ${c.mobile}`.toLowerCase().includes(custQ.toLowerCase())
  ).slice(0, 6);

  const confirmPayment = () => {
    if (!cart.length) { toast('Add items to cart', 'error'); return; }
    if (!customer)    { toast('Select a customer', 'error'); return; }
    createOrder.mutate({
      customerId: customer.id,
      items: cart.map(c => ({
        itemType:    c.type === 'frames' ? 'frame' : c.type === 'lenses' ? 'lens' : 'accessory',
        frameId:     c.type === 'frames'      ? c.id : undefined,
        lensId:      c.type === 'lenses'      ? c.id : undefined,
        accessoryId: c.type === 'accessories' ? c.id : undefined,
        name: c.name, qty: c.qty, unitPrice: c.price,
      })),
      discountType:  discVal ? discType : undefined,
      discountValue: parseFloat(discVal)||0,
      taxPct: parseFloat(taxPct)||0,
      paymentMode: payMode,
      amountPaid: parseFloat(tend)||total,
    });
  };

  const loading = fl || ll || al;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Customer bar */}
      <div className="relative" ref={dropRef}>
        <div
          className={`bg-white border-2 ${customer ? 'border-teal shadow-[0_0_0_3px_rgba(0,169,157,.1)]' : 'border-border-dark'} rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-all`}
          onClick={() => setCustDrop(!custDrop)}
        >
          <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center text-[14px] font-bold shrink-0 ${customer ? 'bg-teal text-white' : 'bg-bg text-ink-3'}`}>
            {customer ? customer.name[0] : <User size={16} />}
          </div>
          {customer
            ? <div className="flex-1"><div className="text-[13.5px] font-bold">{customer.name}</div><div className="text-[11.5px] text-ink-3">📱 {customer.mobile} · ⭐ {customer.loyaltyPoints} pts</div></div>
            : <span className="text-[13.5px] text-ink-4 flex-1">Search or select a customer…</span>
          }
          {customer && <button className="text-ink-4 hover:text-coral transition-colors" onClick={e=>{e.stopPropagation();setCust(null);}}><X size={14}/></button>}
        </div>
        {custDrop && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-2xl z-30 shadow-[0_16px_48px_rgba(0,0,0,.14)] overflow-hidden">
            <div className="p-2.5 border-b border-border">
              <div className="flex items-center gap-2 bg-bg border border-border rounded-[9px] px-3 py-2">
                <Search size={13} className="text-ink-3" />
                <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search name or mobile…" value={custQ} onChange={e=>setCustQ(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filteredCusts.map((c: any) => (
                <div key={c.id} className="px-4 py-2.5 hover:bg-bg cursor-pointer flex justify-between items-center transition-colors" onClick={()=>{setCust(c);setCustDrop(false);setCustQ('');}}>
                  <div><span className="font-bold text-[13px]">{c.name}</span> <span className="text-ink-3 text-[12px]">{c.mobile}</span></div>
                  <span className="badge badge-gold text-[10px]">⭐ {c.loyaltyPoints}</span>
                </div>
              ))}
              {!filteredCusts.length && <div className="px-4 py-4 text-center text-ink-3 text-[13px]">No customers found</div>}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
        {/* Products panel */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            {(['frames','lenses','accessories'] as Tab[]).map(t => (
              <button key={t} className={`btn btn-sm capitalize ${tab===t ? 'btn-teal' : 'btn-ghost'}`} onClick={()=>setTab(t)}>{t}</button>
            ))}
            <div className="flex items-center gap-2 bg-white border border-border-dark rounded-[9px] px-3 py-2 flex-1 min-w-[140px] ml-auto">
              <Search size={13} className="text-ink-3 shrink-0"/>
              <input className="flex-1 bg-transparent border-none outline-none text-[13px]" placeholder="Search or scan barcode…" value={q} onChange={e=>setQ(e.target.value)} />
              {q && <button className="text-ink-4 hover:text-coral" onClick={()=>setQ('')}><X size={12}/></button>}
            </div>
            <button className="btn btn-ghost btn-sm" title="Barcode scan active"><Scan size={14}/> Scan</button>
          </div>

          {loading ? <PageSpinner /> : (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {items.map((it: any) => {
                  const oos = tab==='frames' && it.stock===0;
                  return (
                    <div
                      key={it.id}
                      className={`bg-white border-2 rounded-2xl p-3.5 cursor-pointer transition-all relative overflow-hidden ${oos ? 'opacity-40 pointer-events-none' : 'border-border hover:border-teal hover:shadow-[0_4px_20px_rgba(0,169,157,.15)] hover:-translate-y-0.5'}`}
                      onClick={() => addToCart(it)}
                    >
                      {tab==='frames' && (
                        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${it.stock<=it.minStock ? 'bg-coral-soft text-coral' : 'bg-teal-light text-teal-dark'}`}>
                          {it.stock}
                        </span>
                      )}
                      <div className="text-[10.5px] font-bold text-ink-3 uppercase tracking-[.7px] mb-0.5">{it.brand||it.category}</div>
                      <div className="text-[13px] font-bold text-ink mb-1 leading-tight line-clamp-2">{it.model||it.type||it.name}</div>
                      <div className="text-[11px] text-ink-3 mb-2">{it.color||it.coating||''}</div>
                      <div className="font-serif text-[17px] text-teal-dark leading-none">
                        {rupee(it.sellPrice)}
                        {it.mrp && <span className="text-[11px] text-ink-4 line-through ml-1">{rupee(it.mrp)}</span>}
                      </div>
                    </div>
                  );
                })}
                {!items.length && <div className="col-span-4 py-12 text-center text-ink-3 text-[13px]">No items found</div>}
              </div>
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div className="w-full md:w-[340px] flex flex-col gap-2 shrink-0 min-h-0 overflow-hidden">
          {/* Cart header */}
          <div className="bg-white rounded-2xl px-4 py-3 border border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-serif text-[15px]"><ShoppingCart size={16} className="text-teal"/> Cart <span className="badge badge-teal text-[11px]">{cart.length}</span></div>
            {cart.length > 0 && <button className="text-[12px] text-coral hover:underline font-semibold" onClick={()=>setCart([])}>Clear</button>}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {cart.length === 0 && (
              <div className="bg-white rounded-2xl border border-border p-8 text-center text-ink-3 text-[13px]">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30"/>Add items to cart
              </div>
            )}
            {cart.map(c => (
              <div key={c.k} className="bg-white border border-border rounded-xl p-3">
                <div className="flex justify-between items-start mb-2">
                  <div><div className="text-[13px] font-bold">{c.name}</div><div className="text-[11.5px] text-ink-3">{c.sub}</div></div>
                  <button className="text-ink-4 hover:text-coral transition-colors ml-2" onClick={()=>removeItem(c.k)}><X size={14}/></button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-bg border border-border rounded-lg">
                    <button className="w-7 h-7 flex items-center justify-center text-ink hover:text-teal" onClick={()=>updQty(c.k,-1)}><Minus size={12}/></button>
                    <span className="w-6 text-center text-[13.5px] font-bold">{c.qty}</span>
                    <button className="w-7 h-7 flex items-center justify-center text-ink hover:text-teal" onClick={()=>updQty(c.k,+1)}><Plus size={12}/></button>
                  </div>
                  <span className="ml-auto font-serif text-[15px] text-teal-dark">{rupee(c.price*c.qty)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white border border-border rounded-2xl p-4 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-[11px]">Discount</label>
                <div className="flex gap-1">
                  <select className="input input-sm w-16 shrink-0" value={discType} onChange={e=>setDiscType(e.target.value as any)}>
                    <option value="flat">₹</option>
                    <option value="percent">%</option>
                  </select>
                  <input className="input input-sm flex-1 min-w-0" placeholder="0" value={discVal} onChange={e=>setDiscVal(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label text-[11px]">Tax %</label>
                <input className="input input-sm" placeholder="0" value={taxPct} onChange={e=>setTaxPct(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1 text-[13px] text-ink-2 pt-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{rupee(subtotal)}</span></div>
              {discAmt > 0 && <div className="flex justify-between text-coral"><span>Discount</span><span>-{rupee(discAmt)}</span></div>}
              {taxAmt  > 0 && <div className="flex justify-between"><span>Tax</span><span>+{rupee(taxAmt)}</span></div>}
            </div>
            <div className="flex justify-between items-center border-t-2 border-border pt-2 mt-1">
              <span className="font-bold text-[15px]">Total</span>
              <span className="font-serif text-[22px] text-teal-dark">{rupee(total)}</span>
            </div>

            {!paying ? (
              <button className="btn btn-teal w-full justify-center mt-1" onClick={()=>{if(!cart.length){toast('Add items','error');return;}if(!customer){toast('Select customer','error');return;}setTend(total.toFixed(0));setPaying(true);}}>
                Proceed to Payment →
              </button>
            ) : (
              <div className="space-y-2 mt-1">
                <div className="grid grid-cols-3 gap-1">
                  {PAYMENT_MODES.map(m => (
                    <button key={m} className={`py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${payMode===m ? 'bg-teal text-white border-teal' : 'bg-white text-ink-2 border-border hover:border-teal'}`} onClick={()=>setPayMode(m)}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label text-[11px]">Amount Tendered</label>
                  <input className="input" value={tend} onChange={e=>setTend(e.target.value)} />
                </div>
                {change > 0 && <div className="flex justify-between text-[13px] font-bold"><span>Change</span><span className="text-teal-dark">{rupee(change)}</span></div>}
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm flex-1" onClick={()=>setPaying(false)}>Back</button>
                  <button className="btn btn-teal btn-sm flex-1" onClick={confirmPayment} disabled={createOrder.isPending}>
                    {createOrder.isPending ? 'Processing…' : '✓ Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
