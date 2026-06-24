import { createBrowserRouter, ScrollRestoration, Outlet, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../components/layout/DashboardLayout';
import PortalPage from '../pages/PortalPage';
import DashboardPage from '../pages/DashboardPage';
import ExpertDashboardPage from '../pages/ExpertDashboardPage';
import HubDashboardPage from '../pages/HubDashboardPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import BrcManagementPage from '../pages/admin/BrcManagementPage';
import ExpertManagementPage from '../pages/admin/ExpertManagementPage';
import ReportsPage from '../pages/admin/ReportsPage';
import ExpertOnboardingPage from '../pages/ExpertOnboardingPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import ProfilePage from '../pages/ProfilePage';
import PublicFormPage from '../pages/PublicFormPage';

const RootLayout = () => (
  <>
    <ScrollRestoration />
    <Outlet />
  </>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <Navigate to="/" replace />,
    children: [
      {
        path: '/',
        element: <PortalPage />,
      },
      {
        path: '/f/:id',
        element: <PublicFormPage />,
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
        element: <ProfilePage />,
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
        path: '/hub',
        element: (
          <ProtectedRoute allowedRoles={['STREAM_LAB']}>
            <HubDashboardPage />
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
        path: '/reset-password/:token',
        element: <ResetPasswordPage />
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ]
  }
]);

export default router;
