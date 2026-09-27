import { lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Route-level code splitting keeps recharts and heavy pages out of the initial bundle.
const pages = {
  Dashboard: () => import('./pages/Dashboard'),
  Sites: () => import('./pages/Sites'),
  SiteDetail: () => import('./pages/SiteDetail'),
  Staff: () => import('./pages/Staff'),
  StaffDetail: () => import('./pages/StaffDetail'),
  Attendance: () => import('./pages/Attendance'),
  Leaves: () => import('./pages/Leaves'),
  Payments: () => import('./pages/Payments'),
  PaymentSlip: () => import('./pages/PaymentSlip'),
  Advances: () => import('./pages/Advances'),
  PayrollNew: () => import('./pages/PayrollNew'),
  PayrollSheet: () => import('./pages/PayrollSheet'),
  Expenses: () => import('./pages/Expenses'),
  Muster: () => import('./pages/Muster'),
  Reports: () => import('./pages/Reports'),
  Performance: () => import('./pages/Performance'),
  Settings: () => import('./pages/Settings'),
  NotFound: () => import('./pages/NotFound'),
};

const Dashboard = lazy(pages.Dashboard);
const Sites = lazy(pages.Sites);
const SiteDetail = lazy(pages.SiteDetail);
const Staff = lazy(pages.Staff);
const StaffDetail = lazy(pages.StaffDetail);
const Attendance = lazy(pages.Attendance);
const Leaves = lazy(pages.Leaves);
const Payments = lazy(pages.Payments);
const PaymentSlip = lazy(pages.PaymentSlip);
const Advances = lazy(pages.Advances);
const PayrollNew = lazy(pages.PayrollNew);
const PayrollSheet = lazy(pages.PayrollSheet);
const Expenses = lazy(pages.Expenses);
const Muster = lazy(pages.Muster);
const Reports = lazy(pages.Reports);
const Performance = lazy(pages.Performance);
const Settings = lazy(pages.Settings);
const NotFound = lazy(pages.NotFound);

// After the first screen is up, quietly download the other pages so later taps open instantly
// (skipped when the phone asks to save data or is on a very slow connection).
function usePrefetchPages() {
  useEffect(() => {
    const conn = navigator.connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType || '')) return undefined;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = idle(() => Object.values(pages).forEach((load) => load().catch(() => {})));
    return () => cancel(handle);
  }, []);
}

export default function App() {
  usePrefetchPages();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/sites/:id" element={<SiteDetail />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/staff/:id" element={<StaffDetail />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/payments/:id" element={<PaymentSlip />} />
          <Route path="/advances" element={<Advances />} />
          <Route path="/payroll/new" element={<PayrollNew />} />
          <Route path="/payroll/:id" element={<PayrollSheet />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports/muster" element={<Muster />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
