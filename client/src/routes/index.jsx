import { createBrowserRouter, ScrollRestoration, Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../components/layout/DashboardLayout';
import PortalPage from '../pages/PortalPage';
import DashboardPage from '../pages/DashboardPage';
import ExpertDashboardPage from '../pages/ExpertDashboardPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import BrcManagementPage from '../pages/admin/BrcManagementPage';
import ExpertManagementPage from '../pages/admin/ExpertManagementPage';
import ReportsPage from '../pages/admin/ReportsPage';
import ExpertOnboardingPage from '../pages/ExpertOnboardingPage';
import NotFoundPage from '../pages/NotFoundPage';
import ErrorPage from '../pages/ErrorPage';

const RootLayout = () => (
  <>
    <ScrollRestoration />
    <Outlet />
  </>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <PortalPage />,
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'profile',
        element: (
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <h1 className="text-3xl font-black text-on-surface tracking-tight mb-6" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
              My Profile
            </h1>
            <div className="bg-white border border-black/[0.04] rounded-2xl p-8">
              <p className="text-secondary">Profile management coming soon.</p>
            </div>
          </div>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <div className="max-w-6xl mx-auto animate-fade-in-up">
              <h1 className="text-3xl font-black text-on-surface tracking-tight mb-6" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                User Management
              </h1>
              <div className="bg-white border border-black/[0.04] rounded-2xl p-8">
                <p className="text-secondary">User management table coming soon.</p>
              </div>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
      {
        path: '/expert',
        element: (
          <ProtectedRoute allowedRoles={['EXPERT']}>
            <ExpertDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/brcs/:code',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <BrcManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/experts/:id',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ExpertManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/onboard/:token',
        element: <ExpertOnboardingPage />
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ]
  }
]);

export default router;
