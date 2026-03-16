import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, rupee, fmtDate } from '../lib/api';
import { PageSpinner } from '../components/ui/Spinner';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const TABS = ['Sales', 'Inventory', 'Customers'] as const;
type Tab = typeof TABS[number];

const COLORS = ['#00a99d','#6c63ff','#f5a623','#ff6b6b','#00c9bc'];

export default function Reports() {
  const [tab, setTab] = useState<Tab>('Sales');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [page, setPage] = useState(1);

  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/reports/dashboard').then(r => r.data) });
  const { data: inv  } = useQuery({ queryKey: ['inv-report'],  queryFn: () => api.get('/reports/inventory').then(r => r.data),  enabled: tab === 'Inventory' });
  const { data: cust } = useQuery({ queryKey: ['cust-report'], queryFn: () => api.get('/reports/customers').then(r => r.data),  enabled: tab === 'Customers' });
  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', from, to, page],
    queryFn: () => api.get(`/reports/sales?from=${from}&to=${to}&page=${page}&limit=20`).then(r => r.data),
    enabled: tab === 'Sales',
  });

  const d = dash ?? {};

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="font-serif text-[22px] text-ink">Reports</h2><p className="text-[12.5px] text-ink-3">Analytics & insights</p></div>
      </div>

      <div className="tab-bar mb-0">
        {TABS.map(t => <button key={t} className={`tab-btn ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {/* ── Sales Tab ── */}
      {tab === 'Sales' && (
        <div className="mt-5 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Today's Revenue",  value: rupee(d.today?.revenue),  sub: `${d.today?.orders ?? 0} orders`, color: 'from-teal to-teal-dark' },
              { label: 'This Month',        value: rupee(d.month?.revenue),  sub: `${d.month?.orders ?? 0} orders`, color: 'from-[#6c63ff] to-[#4d48cc]' },
              { label: 'Last Month',        value: rupee(d.lastMonth?.revenue), sub: `${d.lastMonth?.orders ?? 0} orders`, color: 'from-gold to-gold-dark' },
              { label: 'Change',            value: `${Number(d.month?.revChange ?? 0) >= 0 ? '▲' : '▼'} ${Math.abs(Number(d.month?.revChange ?? 0))}%`, sub: 'vs last month', color: Number(d.month?.revChange ?? 0) >= 0 ? 'from-[#00c9bc] to-teal' : 'from-coral to-[#e85d5d]' },
            ].map(s => (
              <div key={s.label} className="card overflow-hidden relative">
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${s.color}`} />
                <div className="text-[10.5px] font-bold text-ink-3 tracking-[.8px] uppercase mb-1">{s.label}</div>
                <div className="font-serif text-[24px] text-ink leading-none">{s.value}</div>
                <div className="text-[12px] text-ink-3 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="font-serif text-[16px] mb-4">7-Day Revenue Trend</div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.dailyRevenue ?? []}>
                    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00a99d" stopOpacity={0.15}/><stop offset="95%" stopColor="#00a99d" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false}/>
                    <XAxis dataKey="label" stroke="#b8c4ce" fontSize={11} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#b8c4ce" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => '₹'+(v/1000|0)+'k'}/>
                    <Tooltip formatter={(v: any) => [rupee(v), 'Revenue']} contentStyle={{ background:'#fff', border:'1px solid #e2e8ef', borderRadius:10, fontSize:12 }}/>
                    <Area type="monotone" dataKey="revenue" stroke="#00a99d" fill="url(#g1)" strokeWidth={2.5} dot={{ r:3, fill:'#00a99d' }} activeDot={{ r:5 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="font-serif text-[16px] mb-4">6-Month Revenue</div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.sixMonthRevenue ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false}/>
                    <XAxis dataKey="month" stroke="#b8c4ce" fontSize={11} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#b8c4ce" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => '₹'+(v/1000|0)+'k'}/>
                    <Tooltip formatter={(v: any) => [rupee(v), 'Revenue']} contentStyle={{ background:'#fff', border:'1px solid #e2e8ef', borderRadius:10, fontSize:12 }}/>
                    <Bar dataKey="revenue" fill="#00a99d" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sales table with filters */}
          <div className="card">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="font-serif text-[16px]">Sales Transactions</div>
              <div className="flex gap-2 items-center flex-wrap">
                <input className="input input-sm w-36" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
                <span className="text-ink-3 text-[12px]">to</span>
                <input className="input input-sm w-36" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
              </div>
            </div>
            {sales?.summary && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[['Revenue', rupee(sales.summary.totalRevenue)],['Discount',rupee(sales.summary.totalDiscount)],['Orders', String(sales.summary.orderCount)]].map(([l,v]) => (
                  <div key={l} className="bg-bg rounded-xl p-3 text-center"><div className="text-[11px] text-ink-3">{l}</div><div className="font-serif text-[18px] text-teal-dark">{v}</div></div>
                ))}
              </div>
            )}
            {salesLoading ? <PageSpinner /> : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Items</th><th>Discount</th><th>Total</th><th>Payment</th></tr></thead>
                  <tbody>
                    {(sales?.data ?? []).map((o: any) => (
                      <tr key={o.id}>
                        <td><span className="font-mono text-teal-dark text-[12px]">{o.orderNumber}</span></td>
                        <td className="font-semibold text-[13px]">{o.customer?.name}</td>
                        <td className="text-ink-3 text-[12.5px]">{fmtDate(o.createdAt)}</td>
                        <td><span className="badge badge-gray">{o.items?.length}</span></td>
                        <td className="text-coral">{Number(o.discountAmt) > 0 ? rupee(o.discountAmt) : '—'}</td>
                        <td className="font-semibold">{rupee(o.total)}</td>
                        <td><span className="badge badge-navy uppercase text-[10px]">{o.paymentMode}</span></td>
                      </tr>
                    ))}
                    {!(sales?.data?.length) && <tr><td colSpan={7} className="text-center py-8 text-ink-3 text-[13px]">No sales in this period</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {(sales?.meta?.total ?? 0) > 20 && (
              <div className="flex justify-between items-center mt-3 text-[13px]">
                <span className="text-ink-3">Page {page}</span>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-xs" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
                  <button className="btn btn-ghost btn-xs" disabled={page*20>=sales!.meta.total} onClick={() => setPage(p=>p+1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Inventory Tab ── */}
      {tab === 'Inventory' && inv && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(inv).map(([key, v]: any) => (
              <div key={key} className="card">
                <div className="font-serif text-[18px] capitalize mb-3">{key}</div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-ink-3">Total SKUs</span><strong>{v.total}</strong></div>
                  <div className="flex justify-between"><span className="text-ink-3">Low Stock</span><strong className="text-gold">{v.lowStock}</strong></div>
                  <div className="flex justify-between"><span className="text-ink-3">Out of Stock</span><strong className="text-coral">{v.outOfStock}</strong></div>
                  <div className="flex justify-between border-t border-border pt-2 mt-1"><span className="text-ink-3">Stock Value</span><strong className="text-teal-dark">{rupee(v.stockValue)}</strong></div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="font-serif text-[16px] mb-4">Stock Distribution</div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={Object.entries(inv).map(([k,v]:any) => ({ name:k, value:v.total }))} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({name,value}) => `${name}: ${value}`}>
                    {Object.keys(inv).map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Customers Tab ── */}
      {tab === 'Customers' && (
        <div className="mt-5">
          <div className="card">
            <div className="font-serif text-[16px] mb-4">🏆 Top 10 Customers by Revenue</div>
            {!cust ? <PageSpinner /> : (
              <table className="tbl">
                <thead><tr><th>#</th><th>Customer</th><th>Mobile</th><th>Orders</th><th>Total Spent</th><th>Loyalty Pts</th></tr></thead>
                <tbody>
                  {cust.map((c: any, i: number) => (
                    <tr key={c.id}>
                      <td>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11.5px] font-bold ${['bg-teal-light text-teal-dark','bg-[#f0efff] text-[#4d48cc]','bg-gold-soft text-gold-dark'][i] || 'bg-bg text-ink-3'}`}>{i+1}</div>
                      </td>
                      <td><div className="font-semibold text-[13px]">{c.name}</div><div className="text-ink-3 text-[12px]">{c.email||''}</div></td>
                      <td className="font-mono text-[12px]">{c.mobile}</td>
                      <td><span className="badge badge-teal">{c.totalOrders}</span></td>
                      <td className="font-semibold text-teal-dark">{rupee(c.totalSpent)}</td>
                      <td><span className="badge badge-gold">⭐ {c.loyaltyPoints}</span></td>
                    </tr>
                  ))}
                  {!cust?.length && <tr><td colSpan={6} className="text-center py-8 text-ink-3 text-[13px]">No customer data</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
                    }
