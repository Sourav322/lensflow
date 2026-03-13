import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, ShoppingCart, Users, FileText,
  Glasses, Eye, ClipboardList, FlaskConical,
  Wrench, BarChart2, UserCog, Settings, X,
} from 'lucide-react';

const GROUPS = [
  {
    label: 'Overview',
    items: [
      { key: '/',            label: 'Dashboard',     Icon: LayoutDashboard },
      { key: '/pos',         label: 'POS Billing',   Icon: ShoppingCart },
      { key: '/customers',   label: 'Customers',     Icon: Users },
      { key: '/prescriptions', label: 'Prescriptions', Icon: FileText },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { key: '/frames', label: 'Frames', Icon: Glasses },
      { key: '/lenses', label: 'Lenses', Icon: Eye },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: '/orders',     label: 'Orders',      Icon: ClipboardList, badge: 'orders' },
      { key: '/lab-orders', label: 'Lab Orders',  Icon: FlaskConical,  badge: 'lab' },
      { key: '/repairs',    label: 'Repairs',     Icon: Wrench,        badge: 'repairs' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { key: '/reports', label: 'Reports', Icon: BarChart2 },
      { key: '/staff',   label: 'Staff',   Icon: UserCog },
    ],
  },
  {
    label: 'System',
    items: [
      { key: '/settings', label: 'Settings', Icon: Settings },
    ],
  },
];

interface Props { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: Props) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuthStore();

  const go = (path: string) => { navigate(path); onClose(); };
  const active = (key: string) => key === '/' ? location.pathname === '/' : location.pathname.startsWith(key);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-navy/50 z-[199] backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-[200] w-64 bg-navy flex flex-col overflow-hidden
          transition-transform duration-[280ms] ease-[cubic-bezier(.4,0,.2,1)]
          md:relative md:translate-x-0 md:z-auto md:flex-shrink-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-[22px] border-b border-white/[.07] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shadow-[0_4px_14px_rgba(0,169,157,.4)] font-serif text-xl italic text-white shrink-0">
              L
            </div>
            <span className="font-serif text-[18px] text-white tracking-[-0.2px]">
              Lens<span className="text-teal">Flow</span>
            </span>
          </div>
          <button className="md:hidden text-white/40 hover:text-white p-1" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Shop pill */}
        <div className="mx-4 mt-3 bg-white/[.06] border border-white/[.09] rounded-[10px] px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors">
          <div className="text-[12px] font-bold text-white/85 truncate">{user?.shopName}</div>
          <div className="text-[10.5px] text-white/35 mt-0.5">📍 Optical Shop</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2.5">
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-1">
              <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-white/22 px-2.5 py-3">
                {g.label}
              </div>
              {g.items.map(({ key, label, Icon }) => (
                <div
                  key={key}
                  className={`nav-item ${active(key) ? 'nav-active' : ''}`}
                  onClick={() => go(key)}
                >
                  <Icon size={15} className="shrink-0 opacity-70" />
                  <span className="flex-1">{label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/[.07]">
          <div
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] cursor-pointer hover:bg-white/[.07] transition-colors"
            onClick={() => go('/settings')}
          >
            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center text-[13px] font-bold text-white shrink-0">
              {user?.name?.[0]}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold text-white/85 truncate">{user?.name}</div>
              <div className="text-[10px] text-white/35 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
          }
