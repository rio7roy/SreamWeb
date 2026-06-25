import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import api from '../lib/api';
import MessageComposer from '../components/admin/MessageComposer';
import UserManagementTab from '../components/admin/UserManagementTab';
import ReportsPage from './admin/ReportsPage';
import StockAdministrationPage from './admin/StockAdministrationPage';
import ProfilePage from './ProfilePage';
import BroadcastLogsTab from '../components/admin/BroadcastLogsTab';
import UserManageModal from '../components/admin/UserManageModal';
import AdminFormDashboard from '../components/forms/AdminFormDashboard';

const ADMIN_NAV = [
  { label: 'Overview', icon: 'dashboard' },
  { label: 'User Management', icon: 'group_add' },
  { label: 'Observation Forms', icon: 'format_list_bulleted' },
  { label: 'Program Reports', icon: 'analytics' },
  { label: 'Stock Administration', icon: 'inventory_2' },
  { label: 'Broadcast Logs', icon: 'campaign' },
];

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Overview');
  const [showFormsModal, setShowFormsModal] = useState(false);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBrcCode, setSelectedBrcCode] = useState('');

  const [brcs, setBrcs] = useState([]);
  const [events, setEvents] = useState([]);
  const [experts, setExperts] = useState([]);
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [selectedExpertMonth, setSelectedExpertMonth] = useState('');
  const [showExpertManageModal, setShowExpertManageModal] = useState(false);
  const [showReportMonthModal, setShowReportMonthModal] = useState(false);

  // Fetch BRCs and Experts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brcsRes, eventsRes, expertsRes] = await Promise.all([
          api.get('/brcs'),
          api.get('/events'),
          api.get('/admin/users/experts')
        ]);
        setBrcs(brcsRes.data || []);
        setEvents(eventsRes.data || []);
        setExperts(expertsRes.data || []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    fetchData();
  }, []);

  const handleExpertReportDownload = () => {
    if (!selectedExpertId) return;
    
    let url = `/reports/expert/${selectedExpertId}/pdf`;
    if (selectedExpertMonth) {
      url += `?month=${selectedExpertMonth}&year=${new Date().getFullYear()}`;
    }

    setShowReportMonthModal(false);

    api.get(url, { responseType: 'blob' })
      .then(res => {
        const blob = res.data;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const expertName = experts.find(e => e.id === selectedExpertId)?.name || 'expert';
        const mName = selectedExpertMonth ? `_Month_${selectedExpertMonth}` : '';
        a.download = `${expertName}_Activity_Report${mName}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        setSelectedExpertMonth(''); // Reset for next time
      })
      .catch(err => {
        console.error('Download error:', err);
        alert('Failed to download report. Please try again.');
      });
  };

  // Derived Data
  const districts = useMemo(() => {
    const d = new Set(brcs.map((b) => b.district).filter(Boolean));
    return Array.from(d).sort();
  }, [brcs]);

  const filteredBrcs = useMemo(() => {
    if (!selectedDistrict) return brcs;
    return brcs.filter((b) => b.district === selectedDistrict);
  }, [selectedDistrict, brcs]);

  // Overall Stats calculation
  const stats = useMemo(() => {
    const totalBrcs = selectedDistrict ? filteredBrcs.length : brcs.length;
    
    // Filter events by selected district if applicable
    const validBrcCodes = new Set(filteredBrcs.map(b => b.code));
    const filteredEvents = selectedDistrict 
      ? events.filter(e => validBrcCodes.has(e.brcCode))
      : events;

    const programsConducted = filteredEvents.length;
    const studentFootfall = filteredEvents.reduce((acc, e) => acc + (e.studentsCount || 0), 0);
    const teacherFootfall = filteredEvents.reduce((acc, e) => acc + (e.teachersCount || 0), 0);
    
    return [
      { label: 'Total BRCs', value: totalBrcs, icon: 'account_balance', color: 'text-primary bg-primary-container/20' },
      { label: 'Programs Conducted', value: programsConducted, icon: 'event_available', color: 'text-green-700 bg-green-100' },
      { label: 'Student Footfall', value: studentFootfall.toLocaleString(), icon: 'groups', color: 'text-blue-700 bg-blue-100' },
      { label: 'Teacher Footfall', value: teacherFootfall.toLocaleString(), icon: 'school', color: 'text-amber-700 bg-amber-100' },
    ];
  }, [selectedDistrict, filteredBrcs, brcs.length, events]);

  // Derived Issues
  const issuesList = useMemo(() => {
    return filteredBrcs
      .filter(b => b.issues && b.issues.trim() !== '')
      .map(b => ({
        code: b.code,
        name: b.location + '/' + b.name,
        district: b.district,
        issues: b.issues
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBrcs]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
    setSelectedBrcCode(''); // Reset BRC selection when district changes
  };

  return (
    <div className="bg-[#fdfbf7] min-h-screen flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Side Navigation ── */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-72 flex flex-col bg-surface-container-low border-r border-on-surface/10 p-6 shrink-0 z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="mb-10 px-2">
          <h1
            className="text-2xl tracking-wider text-on-surface"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            STREAM PORTAL
          </h1>
        </div>

        {/* User Identity Card */}
        <div 
          onClick={() => {
            setActiveNav('My Profile');
            setSidebarOpen(false);
          }}
          className="mb-8 p-4 bg-white/50 rounded-xl border border-on-surface/10 cursor-pointer hover:bg-white/80 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-error/10 border border-error/20 flex items-center justify-center overflow-hidden shrink-0 relative">
              <span className="text-on-primary-container font-bold text-sm z-0">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
              {user?.avatar && (
                <img src={`${import.meta.env.VITE_API_URL || '/api'}/uploads/${user.avatar}`} alt="Admin" className="w-full h-full object-cover absolute inset-0 z-10 bg-surface" onError={(e) => { e.target.style.display = 'none'; }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-on-surface truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-secondary uppercase font-semibold truncate">System Admin</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-on-surface/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary group-hover:text-primary transition-colors">
              Manage Profile
            </span>
            <span className="material-symbols-outlined text-[14px] text-secondary group-hover:text-primary transition-colors">
              arrow_forward
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto min-h-0">
          {ADMIN_NAV.map(nav => (
            <button
              key={nav.label}
              onClick={() => {
                if (nav.label === 'Observation Forms') {
                  setShowFormsModal(true);
                  setSidebarOpen(false);
                } else {
                  setActiveNav(nav.label);
                  setSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold ${
                activeNav === nav.label
                  ? 'bg-primary-container text-primary shadow-sm'
                  : 'text-secondary hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined">{nav.icon}</span>
              <span style={{ fontFamily: "'Julius Sans One', sans-serif" }}>{nav.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto pt-6 border-t border-on-surface/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 text-secondary hover:text-error transition-colors w-full"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span style={{ fontFamily: "'Julius Sans One', sans-serif" }}>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="flex-grow overflow-y-auto flex flex-col relative z-10">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="w-full h-16 bg-white/80 backdrop-blur-md flex items-center px-4 md:hidden border-b border-on-surface/10 shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-surface-container rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        {/* ── Content Area ── */}
        {activeNav === 'Overview' ? (
          <div className="p-4 md:p-8 md:px-12 space-y-10 w-full animate-fade-in-up">
            
            {/* Header & Filter Section */}

          {/* Quick Management Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stream Hub Management */}
            <div className="bg-white border border-on-surface/10 rounded-xl p-6 shadow-sm hover:border-primary/30 transition-all group flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">school</span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-lg">Manage STREAM Hub</h3>
                  <p className="text-xs text-secondary font-medium">Select a BRC to edit details</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-sm">
                    search
                  </span>
                  <select
                    value={selectedBrcCode}
                    onChange={(e) => setSelectedBrcCode(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline/30 rounded-xl pl-9 pr-8 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select BRC Hub...</option>
                    {filteredBrcs.map(brc => (
                      <option key={brc.code} value={brc.code}>
                        {brc.location}/{brc.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-sm">
                    arrow_drop_down
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/admin/brcs/${selectedBrcCode}`)}
                  disabled={!selectedBrcCode}
                  className="shrink-0 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                  Manage
                </button>
              </div>
            </div>

            {/* Expert Management */}
            <div className="bg-white border border-on-surface/10 rounded-xl p-6 shadow-sm hover:border-amber-500/30 transition-all group flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined">person_add</span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-lg">Manage STREAM Expert</h3>
                  <p className="text-xs text-secondary font-medium">Assign or remove BRC hubs</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 pointer-events-none text-sm">
                    person
                  </span>
                  <select
                    value={selectedExpertId}
                    onChange={(e) => setSelectedExpertId(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline/30 rounded-xl pl-9 pr-8 py-3 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Expert...</option>
                    <option value="all">All Experts</option>
                    {experts.map(exp => (
                      <option key={exp.id} value={exp.id}>
                        {exp.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-sm">
                    arrow_drop_down
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setShowExpertManageModal(true)}
                    disabled={!selectedExpertId || selectedExpertId === 'all'}
                    className="px-6 py-3 bg-amber-500 text-white font-bold rounded-xl shadow hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Manage
                  </button>
                  <button
                    onClick={() => setShowReportMonthModal(true)}
                    disabled={!selectedExpertId}
                    className="px-6 py-3 bg-[#d32f2f] text-white font-bold rounded-xl shadow hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                    Activity Report
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Overall Stats Section */}
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3
                className="text-2xl border-l-4 border-primary pl-4 tracking-wide flex items-center gap-2"
                style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.3 }}
              >
                Overall System Stats
              </h3>
              
              <div className="w-full sm:w-64 relative shrink-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-sm">
                  map
                </span>
                <select
                  value={selectedDistrict}
                  onChange={handleDistrictChange}
                  className="w-full bg-surface-container-low border border-outline/20 rounded-xl pl-9 pr-8 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">All Districts Filter</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-sm">
                  arrow_drop_down
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="bg-white border border-on-surface/10 rounded-xl p-6 flex flex-col justify-between expert-brutalist-hover transition-all"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                      <span className="material-symbols-outlined text-2xl">
                        {stat.icon}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4
                      className="text-4xl text-on-surface mb-1 tracking-tight"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {stat.value}
                    </h4>
                    <p className="text-secondary text-sm font-medium uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Message Composer Section */}
          <MessageComposer />

          </div>
        ) : activeNav === 'User Management' ? (
          <UserManagementTab />
        ) : activeNav === 'Program Reports' ? (
          <div className="p-4 md:p-8 md:px-12 w-full h-full animate-fade-in-up">
            <ReportsPage />
          </div>
        ) : activeNav === 'Stock Administration' ? (
          <div className="p-4 md:p-8 md:px-12 w-full h-full animate-fade-in-up">
            <StockAdministrationPage />
          </div>
        ) : activeNav === 'My Profile' ? (
          <div className="w-full h-full overflow-y-auto">
            <ProfilePage />
          </div>
        ) : activeNav === 'Broadcast Logs' ? (
          <div className="p-4 md:p-8 md:px-12 w-full h-full animate-fade-in-up">
            <BroadcastLogsTab />
          </div>
        ) : (
          <div className="p-8 md:p-12 animate-fade-in-up flex flex-col items-center justify-center h-full text-secondary">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">construction</span>
            <p>The {activeNav} module is currently under construction.</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {showFormsModal && (
        <AdminFormDashboard onClose={() => setShowFormsModal(false)} />
      )}
      
      {showExpertManageModal && (
        <UserManageModal
          type="experts"
          entityName="STREAM Expert"
          initialUserId={selectedExpertId}
          onClose={() => setShowExpertManageModal(false)}
        />
      )}

      {showReportMonthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReportMonthModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-on-surface mb-4">Select Report Month</h3>
            <div className="mb-6">
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Month</label>
              <div className="relative">
                <select
                  value={selectedExpertMonth}
                  onChange={(e) => setSelectedExpertMonth(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline/30 rounded-xl pl-4 pr-8 py-3 text-sm focus:border-[#d32f2f] focus:ring-1 focus:ring-[#d32f2f] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Time</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-sm">
                  arrow_drop_down
                </span>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReportMonthModal(false)}
                className="px-4 py-2 rounded-xl text-secondary hover:bg-surface-container font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExpertReportDownload}
                className="px-6 py-2 bg-[#d32f2f] text-white rounded-xl font-bold hover:bg-[#b71c1c] shadow transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
