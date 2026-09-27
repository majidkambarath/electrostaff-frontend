import { lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '@/app/layouts/AdminLayout';
import { useAuth } from '@/features/auth/AuthContext';

// Route-level code splitting: each page (and heavy libraries like recharts) loads on demand.
const officePages = {
  Dashboard: () => import('@/features/dashboard/DashboardPage'),
  Sites: () => import('@/features/sites/SitesPage'),
  SiteDetail: () => import('@/features/sites/SiteDetailPage'),
  Staff: () => import('@/features/staff/StaffPage'),
  StaffDetail: () => import('@/features/staff/StaffDetailPage'),
  Attendance: () => import('@/features/attendance/AttendancePage'),
  Leaves: () => import('@/features/leaves/LeavesPage'),
  Requests: () => import('@/features/requests/RequestsPage'),
  Payments: () => import('@/features/payments/PaymentsPage'),
  PaymentSlip: () => import('@/features/payments/PaymentSlipPage'),
  Advances: () => import('@/features/advances/AdvancesPage'),
  PayrollNew: () => import('@/features/payroll/PayrollNewPage'),
  PayrollSheet: () => import('@/features/payroll/PayrollSheetPage'),
  Expenses: () => import('@/features/expenses/ExpensesPage'),
  Muster: () => import('@/features/reports/MusterPage'),
  Reports: () => import('@/features/reports/ReportsPage'),
  Performance: () => import('@/features/performance/PerformancePage'),
  Settings: () => import('@/features/settings/SettingsPage'),
  NotFound: () => import('@/app/NotFound'),
};
const staffPages = {
  Layout: () => import('@/features/portal/PortalLayout'),
  Home: () => import('@/features/portal/PortalHome'),
  Attendance: () => import('@/features/portal/PortalAttendance'),
  Payslips: () => import('@/features/portal/PortalPayslips').then((m) => ({ default: m.PortalPayslips })),
  Payslip: () => import('@/features/portal/PortalPayslips').then((m) => ({ default: m.PortalPayslip })),
  Leaves: () => import('@/features/portal/PortalLeaves'),
  Requests: () => import('@/features/portal/PortalRequests'),
  Profile: () => import('@/features/portal/PortalProfile'),
};

const O = Object.fromEntries(Object.entries(officePages).map(([k, load]) => [k, lazy(load)]));
const S = Object.fromEntries(Object.entries(staffPages).map(([k, load]) => [k, lazy(load)]));

// After the first screen is up, quietly download the other pages of this role so later taps open
// instantly (skipped when the phone asks to save data or is on a very slow connection).
function usePrefetch(pages) {
  useEffect(() => {
    const conn = navigator.connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType || '')) return undefined;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = idle(() => Object.values(pages).forEach((load) => load().catch(() => {})));
    return () => cancel(handle);
  }, [pages]);
}

function OfficeRoutes() {
  usePrefetch(officePages);
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<O.Dashboard />} />
        <Route path="/sites" element={<O.Sites />} />
        <Route path="/sites/:id" element={<O.SiteDetail />} />
        <Route path="/staff" element={<O.Staff />} />
        <Route path="/staff/:id" element={<O.StaffDetail />} />
        <Route path="/attendance" element={<O.Attendance />} />
        <Route path="/leaves" element={<O.Leaves />} />
        <Route path="/requests" element={<O.Requests />} />
        <Route path="/payments" element={<O.Payments />} />
        <Route path="/payments/:id" element={<O.PaymentSlip />} />
        <Route path="/advances" element={<O.Advances />} />
        <Route path="/payroll/new" element={<O.PayrollNew />} />
        <Route path="/payroll/:id" element={<O.PayrollSheet />} />
        <Route path="/expenses" element={<O.Expenses />} />
        <Route path="/reports/muster" element={<O.Muster />} />
        <Route path="/reports" element={<O.Reports />} />
        <Route path="/performance" element={<O.Performance />} />
        <Route path="/settings" element={<O.Settings />} />
        <Route path="/me/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<O.NotFound />} />
      </Route>
    </Routes>
  );
}

function StaffRoutes() {
  usePrefetch(staffPages);
  return (
    <Routes>
      <Route element={<S.Layout />}>
        <Route path="/me" element={<S.Home />} />
        <Route path="/me/attendance" element={<S.Attendance />} />
        <Route path="/me/payslips" element={<S.Payslips />} />
        <Route path="/me/payslips/:id" element={<S.Payslip />} />
        <Route path="/me/leaves" element={<S.Leaves />} />
        <Route path="/me/requests" element={<S.Requests />} />
        <Route path="/me/profile" element={<S.Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/me" replace />} />
    </Routes>
  );
}

// Only rendered once signed in (AuthProvider shows setup / sign-in screens before that).
export default function App() {
  const { principal } = useAuth();
  return <BrowserRouter>{principal.role === 'staff' ? <StaffRoutes /> : <OfficeRoutes />}</BrowserRouter>;
}
