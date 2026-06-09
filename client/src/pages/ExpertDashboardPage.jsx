import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import api from '../lib/api';
import EventReportModal from '../components/expert/EventReportModal';
import ExpertProfileTab from '../components/expert/ExpertProfileTab';
import ExpertSessionLogsTab from '../components/expert/ExpertSessionLogsTab';

const EXPERT_NAV = [
  { label: 'Dashboard', icon: 'dashboard', active: true },
  { label: 'Session Logs', icon: 'history' },
];

const TOOLSET = [
  {
    title: 'Stock Management',
    description: 'Review and update inventory levels for laboratory kits and academic materials.',
    icon: 'inventory_2',
    cta: 'Open Inventory',
  },
  {
    title: 'Attendance Tools',
    description: 'Digital roster for expert sessions and student tracking at this BRC.',
    icon: 'how_to_reg',
    cta: 'Launch Tracker',
  },
  {
    title: 'Observation Forms',
    description: 'Standardized feedback forms for academic audits and classroom visits.',
    icon: 'assignment',
    cta: 'New Report',
  },
];

export default function ExpertDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessionActive, setSessionActive] = useState(false);
  const [brcSearch, setBrcSearch] = useState('');
  const [selectedBrc, setSelectedBrc] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const dropdownRef = useRef(null);

  const [brcData, setBrcData] = useState([]);

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [eventStats, setEventStats] = useState({
    totalReported: 0,
    totalDrafted: 0,
    studentFootfall: 0,
    teacherFootfall: 0
  });

  const fetchStatsAndDrafts = useCallback(async (brcCode) => {
    if (!brcCode) return;
    try {
      const [statsRes, draftsRes] = await Promise.all([
        api.get(`/events/stats?brcCode=${brcCode}`),
        api.get(`/events/drafts?brcCode=${brcCode}`)
      ]);
      setEventStats(statsRes.data);
      setDrafts(draftsRes.data);
    } catch (err) {
      console.error('Failed to fetch stats or drafts', err);
    }
  }, []);

  const [messages, setMessages] = useState([]);

  // Fetch BRCs and Messages
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [brcsRes, msgsRes] = await Promise.all([
          api.get('/brcs'),
          api.get('/users/me/messages')
        ]);
        setBrcData(brcsRes.data);
        setMessages(msgsRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchDashboardData();
  }, []);

  // Fetch stats when a session starts
  useEffect(() => {
    if (sessionActive && selectedBrc) {
      fetchStatsAndDrafts(selectedBrc.code);
    }
  }, [sessionActive, selectedBrc, fetchStatsAndDrafts]);

  // Filter messages for the currently active session BRC
  const activeMessages = useMemo(() => {
    if (!sessionActive || !selectedBrc) return [];
    return messages.filter(msg => {
      if (!msg.to || !Array.isArray(msg.to)) return false;
      return msg.to.some(target => {
        if (target === 'ALL') return true;
        if (target === `DISTRICT:${selectedBrc.district}`) return true;
        if (target === `BRC:${selectedBrc.code}`) return true;
        return false;
      });
    });
  }, [messages, sessionActive, selectedBrc]);

  // Filter BRCs based on search query (match start of words in name/location/district, or start of code)
  // ONLY show BRCs assigned to the current expert.
  const assignedBrcCodes = user?.assignedBrcs || [];
  const allowedBrcs = brcData.filter(b => assignedBrcCodes.includes(b.code));

  const searchLower = brcSearch.trim().toLowerCase();
  const rawFiltered = searchLower
    ? allowedBrcs.filter((b) => {
        const nameLower = b.name.toLowerCase();
        const locLower = b.location.toLowerCase();
        const distLower = b.district ? b.district.toLowerCase() : '';
        const codeLower = b.code.toLowerCase();
        
        // Match if the string starts with the search term or contains it after a space
        const matches = (str) => str.startsWith(searchLower) || str.includes(` ${searchLower}`);
        
        return matches(nameLower) || matches(locLower) || matches(distLower) || codeLower.startsWith(searchLower);
      })
    : [];

  // Deduplicate by unique code and name combination
  const uniqueBrcsMap = new Map();
  rawFiltered.forEach((b) => {
    const key = `${b.code}-${b.name}`;
    if (!uniqueBrcsMap.has(key)) {
      uniqueBrcsMap.set(key, b);
    }
  });
  const filteredBrcs = Array.from(uniqueBrcsMap.values());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSelectBrc = (brc) => {
    setSelectedBrc(brc);
    setBrcSearch(brc.name);
    setShowDropdown(false);
  };

  const handleInitSession = () => {
    // If user typed but didn't pick from dropdown, try to match
    if (!selectedBrc && brcSearch.trim()) {
      const match = BRC_DATA.find(
        (b) =>
          b.name.toLowerCase() === brcSearch.toLowerCase() ||
          b.code.toLowerCase() === brcSearch.toLowerCase()
      );
      if (match) {
        setSelectedBrc(match);
      } else {
        // No match — use first filtered result or show error
        if (filteredBrcs.length > 0) {
          setSelectedBrc(filteredBrcs[0]);
        } else {
          return; // nothing to select
        }
      }
    }
    if (!selectedBrc && filteredBrcs.length === 0) return;
    setSessionActive(true);
  };

  const handleChangeBrc = () => {
    setSessionActive(false);
    setSelectedBrc(null);
    setBrcSearch('');
  };

  // Brutalist hover effect for cards
  const cardRef = useRef([]);

  return (
    <div className="bg-[#fdfbf7] min-h-screen flex overflow-hidden">
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
        <div className="mb-6 px-2">
          <h1
            className="text-2xl tracking-wider text-on-surface"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            STREAM PORTAL
          </h1>
          <p className="text-primary text-[10px] uppercase tracking-[0.2em] font-bold">
            Academic Ecosystem
          </p>
        </div>

        {/* User Identity Card */}
        <div 
          onClick={() => {
            setActiveNav('Profile');
            setSidebarOpen(false);
          }}
          className="mb-4 p-3 bg-white/50 rounded-xl border border-on-surface/10 cursor-pointer hover:bg-white/80 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary-fixed overflow-hidden border border-outline/10 flex items-center justify-center">
              {user?.avatar ? (
                <img src={`${import.meta.env.VITE_API_URL || '/api'}/uploads/${user.avatar}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-on-primary-container font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{user?.name || 'Expert'}</p>
              <p className="text-[11px] text-secondary uppercase font-semibold">Expert</p>
            </div>
          </div>
          <div className="pt-3 border-t border-on-surface/5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span>{selectedBrc ? selectedBrc.location : 'No BRC selected'}</span>
            </div>
            {sessionActive && selectedBrc && (
              <div className="flex items-center gap-2 text-xs text-primary font-bold animate-fade-in">
                <span className="material-symbols-outlined text-sm">school</span>
                <span>{selectedBrc.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 flex-grow">
          {EXPERT_NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setActiveNav(item.label);
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all active:scale-[0.98] ${
                activeNav === item.label
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-secondary hover:bg-secondary-container/50'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span style={{ fontFamily: "'Julius Sans One', sans-serif" }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4 border-t border-on-surface/5">
          <button className="flex items-center gap-3 px-3 py-2 text-secondary hover:text-primary transition-colors w-full">
            <span className="material-symbols-outlined text-xl">contact_support</span>
            <span style={{ fontFamily: "'Julius Sans One', sans-serif" }}>Support</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-secondary hover:text-error transition-colors w-full"
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
        <div className="p-4 md:p-8 md:px-20 space-y-6 max-w-[1280px] mx-auto w-full">

          {/* ── PROFILE STATE ── */}
          {activeNav === 'Profile' && (
            <ExpertProfileTab user={user} brcData={brcData} />
          )}

          {/* ── SESSION LOGS STATE ── */}
          {activeNav === 'Session Logs' && (
            <ExpertSessionLogsTab />
          )}

          {/* ── MESSAGES / ANNOUNCEMENTS removed from here ── */}

          {/* ── INITIAL STATE: BRC Selection ── */}
          {!sessionActive && activeNav === 'Dashboard' && (
            <section className="flex flex-col items-center justify-center min-h-[80vh] py-20 animate-fade-in">
              <div className="max-w-4xl w-full bg-white border border-on-surface/10 rounded-2xl shadow-xl flex flex-col text-center">
                <div className="flex-grow py-16 md:py-24 px-6 md:px-10 flex flex-col justify-center space-y-12">
                  <div>
                    <h2
                      className="text-3xl md:text-[32px] text-on-surface mb-4 tracking-wide"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.2 }}
                    >
                      Select block resource centre
                    </h2>
                    <p
                      className="text-secondary leading-relaxed max-w-2xl mx-auto"
                      style={{ fontFamily: "'Julius Sans One', sans-serif" }}
                    >
                      To access expert tools and regional data, please initialize a session at a specific Block Resource Centre (BRC).
                    </p>
                  </div>
                  <div className="space-y-8 mx-auto max-w-md w-full">
                    <div className="relative" ref={dropdownRef}>
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10">
                        search
                      </span>
                      <input
                        type="text"
                        value={brcSearch}
                        onChange={(e) => {
                          setBrcSearch(e.target.value);
                          setSelectedBrc(null);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full bg-surface-container-low border border-outline/30 rounded-xl pl-12 pr-4 py-4 focus:border-primary outline-none transition-shadow focus:shadow-inner disabled:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: "'Julius Sans One', sans-serif" }}
                        placeholder={assignedBrcCodes.length === 0 ? "No BRC has been assigned" : "Enter School Name or BRC Code..."}
                        disabled={assignedBrcCodes.length === 0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (filteredBrcs.length > 0 && !selectedBrc) {
                              handleSelectBrc(filteredBrcs[0]);
                            }
                            handleInitSession();
                          }
                        }}
                      />

                      {/* BRC Dropdown */}
                      {showDropdown && brcSearch.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-outline/20 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 animate-fade-in">
                          {filteredBrcs.length === 0 ? (
                            <div className="px-4 py-4 text-sm text-secondary text-center">
                              No BRCs found matching "{brcSearch}"
                            </div>
                          ) : (
                            filteredBrcs.map((brc) => (
                              <button
                                key={brc.code}
                                onClick={() => handleSelectBrc(brc)}
                                className={`w-full text-left px-4 py-3 hover:bg-primary-container/10 transition-colors flex items-center justify-between gap-4 border-b border-on-surface/5 last:border-b-0 ${
                                  selectedBrc?.code === brc.code ? 'bg-primary-container/10' : ''
                                }`}
                              >
                                <div>
                                  <p className="font-semibold text-sm text-on-surface">{brc.name}</p>
                                  <p className="text-xs text-secondary">{brc.location} {brc.district ? `• ${brc.district}` : ''}</p>
                                </div>
                                <span className="text-xs font-mono font-bold text-primary bg-primary-container/20 px-2 py-0.5 rounded shrink-0">
                                  {brc.code}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleInitSession}
                      disabled={!selectedBrc && filteredBrcs.length === 0}
                      className="w-full bg-primary-container text-on-primary-container py-4 rounded-xl font-bold transition-all active:scale-95 text-lg shadow-sm expert-brutalist-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Initialize Expert Session
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── DASHBOARD STATE ── */}
          {sessionActive && activeNav === 'Dashboard' && (
            <div className="p-4 md:p-8 space-y-8 w-full animate-fade-in">
              {/* Active Session Header */}
              <div className="bg-surface-container-low border border-on-surface/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm relative overflow-hidden expert-brutalist-hover">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/20 rounded-bl-full -z-0"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full tracking-wider animate-pulse">
                      Session Active
                    </span>
                    <span className="text-sm font-semibold text-secondary font-mono">{selectedBrc?.code}</span>
                  </div>
                  <h2
                    className="text-3xl md:text-4xl text-on-surface tracking-wide mb-1"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.2 }}
                  >
                    {selectedBrc?.name}
                  </h2>
                  <p className="text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {selectedBrc?.location}, {selectedBrc?.district}
                  </p>
                </div>
                
                <button
                  onClick={handleChangeBrc}
                  className="relative z-10 px-6 py-3 border border-outline/20 bg-white hover:bg-surface-container rounded-xl text-sm font-bold text-on-surface transition-colors shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">swap_horiz</span>
                  Change Hub
                </button>
              </div>

              {/* ── MESSAGES / ANNOUNCEMENTS ── */}
              {activeMessages.length > 0 && (
                <section className="mb-4 animate-fade-in-up">
                  <h2 className="text-xl border-l-4 border-error pl-4 tracking-wide text-on-surface mb-4 flex items-center gap-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    <span className="material-symbols-outlined text-error">campaign</span>
                    Official Announcements
                  </h2>
                  <div className="flex flex-col gap-4">
                    {activeMessages.map((msg, idx) => (
                      <div key={msg.id || idx} className="bg-error/5 border border-error/20 rounded-xl p-5 md:p-6 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow expert-brutalist-hover relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-error/10 rounded-bl-full -z-0"></div>
                        <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0 z-10 hidden md:flex">
                          <span className="material-symbols-outlined text-2xl">notifications_active</span>
                        </div>
                        <div className="flex-grow z-10">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-error/80 bg-error/10 px-2 py-1 rounded w-fit">
                              {msg.to.some(t => t === 'ALL') ? 'Global Broadcast' : 'Targeted Broadcast'}
                            </span>
                            <span className="text-xs font-bold text-secondary">{new Date(msg.createdAt).toLocaleDateString()} at {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-on-surface text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Statistics Bar */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                  <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Reported Events</p>
                  <p className="text-3xl text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{eventStats.totalReported}</p>
                </div>
                <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                  <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Drafted Events</p>
                  <p className="text-3xl text-amber-600" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{eventStats.totalDrafted}</p>
                </div>
                <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                  <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Student Footfall</p>
                  <p className="text-3xl text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{eventStats.studentFootfall}</p>
                </div>
                <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                  <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Teacher Footfall</p>
                  <p className="text-3xl text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{eventStats.teacherFootfall}</p>
                </div>
              </section>

              {/* Expert Toolset Grid */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2
                    className="text-2xl border-l-4 border-primary pl-4 tracking-wide"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.3 }}
                  >
                    Expert Toolset
                  </h2>
                  <span className="text-sm font-semibold text-secondary">
                    {TOOLSET.length} Modules Available
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {TOOLSET.map((tool, i) => (
                    <div
                      key={tool.title}
                      onClick={() => {
                        if (tool.title === 'Attendance Tools') {
                          setSelectedDraft(null); // Ensure no draft is selected for a new report
                          setShowEventModal(true);
                        }
                      }}
                      className="bg-white border border-on-surface/10 rounded-xl p-8 hover:border-primary/40 transition-all cursor-pointer group flex flex-col h-full expert-brutalist-hover"
                    >
                      <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center text-primary mb-6 group-hover:bg-primary-container transition-colors">
                        <span
                          className="material-symbols-outlined text-3xl"
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                        >
                          {tool.icon}
                        </span>
                      </div>
                      <h3
                        className="text-2xl mb-8 tracking-wide flex-grow"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.3 }}
                      >
                        {tool.title}
                      </h3>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-sm font-semibold text-primary group-hover:underline">
                          {tool.cta}
                        </span>
                        <span className="material-symbols-outlined text-primary">arrow_forward</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Saved Drafts */}
              {drafts.length > 0 && (
                <section className="space-y-6">
                  <h2
                    className="text-2xl border-l-4 border-amber-500 pl-4 tracking-wide text-on-surface"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.3 }}
                  >
                    Saved Drafts
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        onClick={() => {
                          setSelectedDraft(draft);
                          setShowEventModal(true);
                        }}
                        className="bg-[#fff9e6] border border-amber-200 rounded-xl p-6 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                            Draft
                          </span>
                          <span className="text-sm text-secondary font-semibold">{new Date(draft.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-xl font-bold text-on-surface mb-2">{draft.name || 'Untitled Event'}</h3>
                        <p className="text-secondary text-sm line-clamp-2 flex-grow">{draft.description || 'No description provided.'}</p>
                        <div className="mt-6 flex items-center justify-between text-amber-600 group-hover:text-amber-700 transition-colors">
                          <span className="text-sm font-bold uppercase tracking-wider">Resume Editing</span>
                          <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Contextual FAB ── */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-on-background text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-50">
        <span className="material-symbols-outlined text-2xl">chat_bubble</span>
        <span className="absolute right-16 bg-on-background text-on-primary px-3 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Help Desk
        </span>
      </button>

      {/* Modals */}
      {showEventModal && selectedBrc && (
        <EventReportModal
          brcCode={selectedBrc.code}
          brcName={selectedBrc.name}
          existingEvent={selectedDraft}
          onClose={() => {
            setShowEventModal(false);
            setSelectedDraft(null);
          }}
          onRefresh={() => fetchStatsAndDrafts(selectedBrc.code)}
        />
      )}
    </div>
  );
}
