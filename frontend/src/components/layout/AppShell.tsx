import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastStack from '../ui/Toast';

const TITLES: Record<string, string> = {
  '/':             'Dashboard',
  '/pos':          'POS Billing',
  '/customers':    'Customers',
  '/prescriptions':'Prescriptions',
  '/frames':       'Frames',
  '/lenses':       'Lenses',
  '/orders':       'Orders',
  '/lab-orders':   'Lab Orders',
  '/repairs':      'Repairs',
  '/reports':      'Reports',
  '/staff':        'Staff',
  '/settings':     'Settings',
};

export default function AppShell() {
  const [sideOpen, setSideOpen] = useState(false);
  const location = useLocation();

  const title = Object.entries(TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([k]) => location.pathname === k || location.pathname.startsWith(k + '/'))?.[1]
    ?? 'LensFlow';

  return (
    <div className="flex h-full overflow-hidden bg-bg">
      <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSideOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <ToastStack />
    </div>
  );
}
