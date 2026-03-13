import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, rupee, fmtDate } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { PageSpinner } from '../components/ui/Spinner';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data.data),
  });

  if (isLoading) return <PageSpinner />;

  const d = data ?? {};
  const revChange = parseFloat(d.month?.revChange ?? '0');

  const stats = [
    { label: "Today's Revenue",  value: rupee(d.today?.revenue), sub: `${d.today?.orders ?? 0} orders today`,   pos: true,  ico: '💰', acc: 'from-teal to-[#00c9bc]',   bg: 'bg-teal-light' },
    { label: 'Monthly Revenue',  value: rupee(d.month?.revenue), sub: `${revChange >= 0 ? '+' : ''}${revChange}% vs last month`, pos: revChange >= 0, ico: '📈', acc: 'from-[#6c63ff] to-[#4d48cc]', bg: 'bg-[#f0efff]' },
    { label: 'Total Customers',  value: String(d.customers?.total ?? 0), sub: `+${d.customers?.newThisMonth ?? 0} new this month`, pos: true, ico: '👥', acc: 'from-gold to-gold-dark', bg: 'bg-gold-soft' },
    { label: 'Pending Tasks',    value: String((d.pending?.lab ?? 0) + (d.pending?.repairs ?? 0)), sub: `${d.pending?.lab ?? 0} lab · ${d.pending?.repairs ?? 0} repairs`, pos: false, ico: '⚡', acc: 'from-coral to-[#e85d5d]', bg: 'bg-coral-soft' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-light text-teal-dark text-[11px] font-bold mb-2">
            📅 {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
          </div>
          <h1 className="font-serif text-[22px] text-ink">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-[12.5px] text-ink-3 mt-1">{user?.shopName} overview</p>
        </div>
        <button className="btn btn-teal btn-sm" onClick={() => window.location.reload()}>⟳ Refresh</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="card relative overflow-hidden hover:-translate-y-0.5 transition-transform cursor-default">
            <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${s.acc}`} />
            <div className={`absolute top-4 right-4 w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center text-lg`}>{s.ico}</div>
            <div className="text-[11px] font-semibold text-ink-3 tracking-[.8px] uppercase mb-1.5 mt-1">{s.label}</div>
            <div className="font-serif text-[26px] text-ink leading-none mb-2">{s.value}</div>
            <div className="text-[12px] text-ink-3">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold ${s.pos ? 'bg-[#e8faf4] text-[#00875a]' : 'bg-coral-soft text-coral'}`}>
                {s.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 7-day revenue */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-serif text-[16px] text-ink">7-Day Revenue</div>
              <div className="text-[12px] text-ink-3 mt-0.5">Daily sales performance</div>
            </div>
            <span className="badge badge-green text-[11px]">● Live</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.dailyRevenue ?? []} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00a99d" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00a99d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
                <XAxis dataKey="label" stroke="#b8c4ce" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#b8c4ce" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => '₹' + (v/1000|0) + 'k'} />
                <Tooltip formatter={(v: any) => [rupee(v), 'Revenue']} contentStyle={{ background:'#fff', border:'1px solid #e2e8ef', borderRadius:10, fontSize:12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#00a99d" fill="url(#tealGrad)" strokeWidth={2.5} dot={{ r:3, fill:'#00a99d', strokeWidth:0 }} activeDot={{ r:5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6-month revenue */}
        <div className="card">
          <div className="font-serif text-[16px] text-ink mb-4">6-Month Revenue</div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.sixMonthRevenue ?? []} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
                <XAxis dataKey="month" stroke="#b8c4ce" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#b8c4ce" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => '₹' + (v/1000|0) + 'k'} />
                <Tooltip formatter={(v: any) => [rupee(v), 'Revenue']} contentStyle={{ background:'#fff', border:'1px solid #e2e8ef', borderRadius:10, fontSize:12 }} />
                <Bar dataKey="revenue" fill="#00a99d" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top frames */}
        <div className="card lg:col-span-2">
          <div className="font-serif text-[16px] text-ink mb-4">🏆 Top Selling Frames</div>
          {(d.topFrames ?? []).map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 cursor-pointer hover:bg-bg -mx-1 px-1 rounded-lg transition-colors" onClick={() => navigate('/frames')}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${['bg-teal-light text-teal-dark','bg-[#f0efff] text-[#4d48cc]','bg-gold-soft text-gold-dark','bg-coral-soft text-coral','bg-[#eef1f8] text-navy'][i]}`}>{i+1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold truncate">{f.frame?.brand} {f.frame?.model}</div>
                <div className="text-[11.5px] text-ink-3">{f.frame?.color}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-serif text-[14px] text-teal-dark">+{f.soldQty} sold</div>
                <div className="text-[11.5px] text-ink-3">{rupee(f.revenue)}</div>
              </div>
            </div>
          ))}
          {!(d.topFrames?.length) && <div className="text-ink-3 text-[13px] py-6 text-center">No sales data yet</div>}
        </div>

        {/* Quick cards */}
        <div className="flex flex-col gap-3">
          {[
            { ico:'🔬', title:'Lab Orders',  count: d.pending?.lab ?? 0,     color:'badge-gold',  page:'/lab-orders', sub:'active in queue' },
            { ico:'🔧', title:'Repairs',     count: d.pending?.repairs ?? 0, color:'badge-coral', page:'/repairs',    sub:'in progress' },
            { ico:'📦', title:'Low Stock',   count: (d.lowStock?.frames??0)+(d.lowStock?.lenses??0), color:'badge-navy', page:'/frames', sub:'items below min' },
          ].map(c => (
            <div key={c.title} className="card card-hover flex items-center gap-4" onClick={() => navigate(c.page)}>
              <span className="text-3xl">{c.ico}</span>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-[15px] text-ink">{c.title}</div>
                <div className="text-[12px] text-ink-3">{c.sub}</div>
              </div>
              <span className={`badge ${c.color} text-[13px] font-bold`}>{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
                  }
