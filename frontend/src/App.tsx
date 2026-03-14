import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppShell      from './components/layout/AppShell';
import ToastStack    from './components/ui/Toast';
import Login         from './pages/Login';
import Setup         from './pages/Setup';
import Dashboard     from './pages/Dashboard';
import POS           from './pages/POS';
import Customers     from './pages/Customers';
import Prescriptions from './pages/Prescriptions';
import Frames        from './pages/Frames';
import Lenses        from './pages/Lenses';
import Barcodes      from './pages/Barcodes';
import Orders        from './pages/Orders';
import LabOrders     from './pages/LabOrders';
import Repairs       from './pages/Repairs';
import Reports       from './pages/Reports';
import Staff         from './pages/Staff';
import Settings      from './pages/Settings';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuthStore();
  if (!user || !accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <ToastStack />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/" element={<Guard><AppShell /></Guard>}>
          <Route index              element={<Dashboard />} />
          <Route path="pos"         element={<POS />} />
          <Route path="customers"   element={<Customers />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="frames"      element={<Frames />} />
          <Route path="lenses"      element={<Lenses />} />
          <Route path="barcodes"    element={<Barcodes />} />
          <Route path="orders"      element={<Orders />} />
          <Route path="lab-orders"  element={<LabOrders />} />
          <Route path="repairs"     element={<Repairs />} />
          <Route path="reports"     element={<Reports />} />
          <Route path="staff"       element={<Staff />} />
          <Route path="settings"    element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
