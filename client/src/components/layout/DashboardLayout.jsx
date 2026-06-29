import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import NotificationBar from '../ui/NotificationBar';

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  EXPERT: 'Expert',
  STREAM_LAB: 'STREAM Hub',
  ILAB_SCHOOL: 'iLab School',
  CREATIVE_CORNER: 'Creative Corner',
};

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: 'dashboard', roles: 'all' },
  { path: '/dashboard/users', label: 'Users', icon: 'group', roles: ['ADMIN'] },
  { path: '/dashboard/reports', label: 'Reports', icon: 'description', roles: ['ADMIN', 'STREAM_LAB'] },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Redirect users with dedicated dashboards away from the generic one
  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MAIN_ADMIN') {
      navigate('/admin');
    } else if (user?.role === 'EXPERT') {
      navigate('/expert');
    } else if (user?.role === 'STREAM_LAB') {
      navigate('/hub');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredNav = NAV_ITEMS.filter(
    (item) => item.roles === 'all' || item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-[280px] bg-white border-r border-black/[0.04] z-50 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-black/[0.04] shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/logo-2.png" alt="STREAM Logo" className="h-16 w-auto shrink-0" />
            <div className="flex flex-col justify-center">
              <span className="text-xl font-bold tracking-tight text-slate-900 leading-none" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>STREAM</span>
              <span className="text-[11px] font-bold tracking-widest text-brand-600 uppercase mt-0.5">Ecosystem</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Card & Logout (Anchored to bottom) */}
        <div className="p-4 border-t border-black/[0.04] mt-auto shrink-0 bg-white">
          <Link
            to="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/[0.02] transition-colors cursor-pointer group mb-2"
          >
            <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={`${import.meta.env.VITE_API_URL || '/api'}/uploads/${user.avatar}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-on-primary-container font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{user?.name}</p>
              <p className="text-xs text-secondary truncate">{ROLE_LABELS[user?.role]}</p>
            </div>
            <span className="material-symbols-outlined text-[14px] text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
              arrow_forward
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-error/80 hover:text-error hover:bg-error/5 mt-2"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-[280px]">
        <NotificationBar />
        
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.03] px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-surface-container rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden lg:block">
              <p className="text-sm text-secondary">
                Welcome back, <span className="font-bold text-on-surface">{user?.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 bg-primary-container/20 text-primary rounded-full">
                {ROLE_LABELS[user?.role]}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
