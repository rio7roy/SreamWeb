import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import api from "../lib/api";
import EventReportModal from "../components/expert/EventReportModal";
import ExpertProfileTab from "../components/expert/ExpertProfileTab";
import ExpertSessionLogsTab from "../components/expert/ExpertSessionLogsTab";
import PdfReportModal from "../components/expert/PdfReportModal";
import StockManagementModal from "../components/expert/StockManagementModal";
import NotificationBar from "../components/ui/NotificationBar";

const EXPERT_NAV = [
  { label: "Dashboard", icon: "dashboard", active: true },
  { label: "Session Logs", icon: "history" },
];

const TOOLSET = [
  {
    title: "Attendance Tools",
    description:
      "Digital roster for expert sessions and student tracking at this BRC.",
    icon: "how_to_reg",
    cta: "Launch Tracker",
  },
  {
    title: "Upload Event Report",
    description: "Attach a PDF report to a previously submitted event.",
    icon: "picture_as_pdf",
    cta: "Upload PDF",
  },
  {
    title: "Observation Forms",
    description:
      "Standardized feedback forms for academic audits and classroom visits.",
    icon: "assignment",
    cta: "New Report",
  },
  {
    title: "Stock Management",
    description:
      "Review and update inventory levels for laboratory kits and academic materials.",
    icon: "inventory_2",
    cta: "Open Inventory",
  },
];

export default function ExpertDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessionActive, setSessionActive] = useState(false);
  const [brcSearch, setBrcSearch] = useState("");
  const [selectedBrc, setSelectedBrc] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isClosingSupport, setIsClosingSupport] = useState(false);
  const dropdownRef = useRef(null);

  const [brcData, setBrcData] = useState([]);

  const [showEventModal, setShowEventModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [eventStats, setEventStats] = useState({
    totalReported: 0,
    totalDrafted: 0,
    studentFootfall: 0,
    teacherFootfall: 0,
  });

  const [globalStats, setGlobalStats] = useState({
    totalReported: 0,
    studentFootfall: 0,
    teacherFootfall: 0,
  });

  const handleSupportClose = () => {
    setIsClosingSupport(true);
    setTimeout(() => {
      setShowSupportModal(false);
      setIsClosingSupport(false);
    }, 300);
  };

  const fetchStatsAndDrafts = useCallback(async (code) => {
    try {
      const statsRes = await api.get(`/events/stats?brcCode=${code}`);
      setEventStats(statsRes.data);

      const draftsRes = await api.get(`/events/drafts?brcCode=${code}`);
      setDrafts(draftsRes.data);
    } catch (err) {
      console.error("Failed to load stats or drafts", err);
    }
  }, []);

  const handleDeleteDraft = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    setIsDeleting(true);
    try {
      await api.delete(`/events/${id}`);
      fetchStatsAndDrafts(selectedBrc.code);
    } catch (err) {
      console.error("Failed to delete draft", err);
      alert("Failed to delete draft.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch BRCs and Messages
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [brcsRes] = await Promise.all([api.get("/brcs")]);
        setBrcData(brcsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchDashboardData();
  }, []);

  const assignedBrcCodes = user?.assignedBrcs || [];
  const allowedBrcs = brcData.filter((b) => assignedBrcCodes.includes(b.code));

  // Fetch global stats for all allowed BRCs when NOT in a session
  useEffect(() => {
    if (!sessionActive && allowedBrcs.length > 0) {
      const fetchGlobalStats = async () => {
        try {
          const promises = allowedBrcs.map((brc) =>
            api.get(`/events/stats?brcCode=${brc.code}`),
          );
          const results = await Promise.all(promises);

          let reported = 0;
          let students = 0;
          let teachers = 0;

          results.forEach((res) => {
            if (res.data) {
              reported += res.data.totalReported || 0;
              students += res.data.studentFootfall || 0;
              teachers += res.data.teacherFootfall || 0;
            }
          });

          setGlobalStats({
            totalReported: reported,
            studentFootfall: students,
            teacherFootfall: teachers,
          });
        } catch (error) {
          console.error("Failed to fetch global stats", error);
        }
      };
      fetchGlobalStats();
    }
  }, [sessionActive, allowedBrcs.length]);

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

  const displayMessages = useMemo(() => {
    return activeMessages
      .map((msg, idx) => ({ ...msg, __msgId: msg.id || `${msg.createdAt}-${idx}` }))
      .filter(msg => !clearedMessages.includes(msg.__msgId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeMessages, clearedMessages]);

  // Filtered BRCs
  const filteredBrcs = allowedBrcs;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleInitSession = (brc) => {
    if (brc) {
      setSelectedBrc(brc);
      setSessionActive(true);
    }
  };

  const handleChangeBrc = () => {
    setSessionActive(false);
    setSelectedBrc(null);
    setBrcSearch("");
  };

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
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
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

        <div
          onClick={() => {
            setActiveNav("Profile");
            setSidebarOpen(false);
          }}
          className="mb-4 p-3 bg-white/50 rounded-xl border border-on-surface/10 cursor-pointer hover:bg-white/80 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary-fixed overflow-hidden border border-outline/10 flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={`${import.meta.env.VITE_API_URL || "/api"}/uploads/${user.avatar}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-on-primary-container font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                {user?.name || "Expert"}
              </p>
              <p className="text-[11px] text-secondary uppercase font-semibold">
                Expert
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-on-surface/5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span className="material-symbols-outlined text-sm">
                location_on
              </span>
              <span>
                {selectedBrc ? selectedBrc.location : "No BRC selected"}
              </span>
            </div>
            {sessionActive && selectedBrc && (
              <div className="flex items-center gap-2 text-xs text-primary font-bold animate-fade-in">
                <span className="material-symbols-outlined text-sm">
                  school
                </span>
                <span>{selectedBrc.name}</span>
              </div>
            )}
          </div>
        </div>

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
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-secondary hover:bg-secondary-container/50"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span style={{ fontFamily: "'Julius Sans One', sans-serif" }}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-on-surface/5">
          <button
            onClick={() => setShowSupportModal(true)}
            className="flex items-center gap-3 px-3 py-2 text-secondary hover:text-primary transition-colors w-full"
          >
            <span className="material-symbols-outlined text-xl">
              contact_support
            </span>
            <span style={{ fontFamily: "'Julius Sans One', sans-serif" }}>
              Support
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-secondary hover:text-error transition-colors w-full"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span style={{ fontFamily: "'Julius Sans One', sans-serif" }}>
              Log Out
            </span>
          </button>
        </div>
      </aside>

      <div className="flex-grow flex flex-col overflow-hidden relative z-10">
        {sessionActive && selectedBrc && <NotificationBar selectedBrc={selectedBrc} />}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <header className="w-full h-16 bg-white/80 backdrop-blur-md flex items-center px-4 md:hidden border-b border-on-surface/10 shrink-0 sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-surface-container rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </header>

          <div className="p-4 md:p-8 md:px-20 space-y-6 max-w-[1280px] mx-auto w-full">
            {activeNav === "Profile" && (
              <ExpertProfileTab user={user} brcData={brcData} />
            )}

            {activeNav === "Session Logs" && (
              <ExpertSessionLogsTab
                selectedBrc={selectedBrc}
                drafts={drafts}
                refreshDrafts={fetchStatsAndDrafts}
                onResumeDraft={(draft) => {
                  setSelectedDraft(draft);
                  setShowEventModal(true);
                }}
              />
            )}

            {!sessionActive && activeNav === "Dashboard" && (
              <section className="flex flex-col items-center justify-center py-10 animate-fade-in w-full">
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-white border border-on-surface/10 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-primary-container/20 text-primary rounded-xl flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined">
                        description
                      </span>
                    </div>
                    <h3 className="text-3xl font-black text-on-surface mb-1">
                      {globalStats.totalReported}
                    </h3>
                    <p className="text-sm font-bold text-secondary uppercase tracking-widest text-center">
                      Total Reports
                    </p>
                  </div>
                  <div className="bg-white border border-on-surface/10 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <h3 className="text-3xl font-black text-on-surface mb-1">
                      {globalStats.studentFootfall}
                    </h3>
                    <p className="text-sm font-bold text-secondary uppercase tracking-widest text-center">
                      Student Footfall
                    </p>
                  </div>
                  <div className="bg-white border border-on-surface/10 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <h3 className="text-3xl font-black text-on-surface mb-1">
                      {globalStats.teacherFootfall}
                    </h3>
                    <p className="text-sm font-bold text-secondary uppercase tracking-widest text-center">
                      Teacher Footfall
                    </p>
                  </div>
                </div>

                <div className="max-w-4xl w-full bg-white border border-on-surface/10 rounded-2xl shadow-xl flex flex-col">
                  <div className="py-10 px-6 md:px-10 flex flex-col justify-center">
                    <div className="mb-8 text-center">
                      <h2
                        className="text-3xl md:text-[32px] text-on-surface mb-2 tracking-wide"
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          lineHeight: 1.2,
                        }}
                      >
                        Select Block Resource Centre
                      </h2>
                      <p
                        className="text-secondary leading-relaxed max-w-2xl mx-auto text-sm"
                        style={{ fontFamily: "'Julius Sans One', sans-serif" }}
                      >
                        Click on a BRC below to initialize a session and access
                        expert tools for that region.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allowedBrcs.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-secondary border-2 border-dashed border-outline/20 rounded-xl">
                          No BRCs have been assigned to your account yet.
                        </div>
                      ) : (
                        allowedBrcs.map((brc) => (
                          <button
                            key={brc.code}
                            onClick={() => handleInitSession(brc)}
                            className="text-left bg-surface-container-low hover:bg-primary-container/10 border border-outline/20 hover:border-primary/30 rounded-xl p-5 transition-all flex items-center gap-4 group"
                          >
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                              <span className="material-symbols-outlined text-primary">
                                location_city
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-on-surface mb-1 leading-tight group-hover:text-primary transition-colors">
                                {brc.name}
                              </h3>
                              <p className="text-xs text-secondary font-medium">
                                {brc.location}{" "}
                                {brc.district ? `• ${brc.district}` : ""}
                              </p>
                              <p className="text-[10px] font-mono text-secondary mt-1">
                                {brc.code}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {sessionActive && activeNav === "Dashboard" && (
              <div className="p-4 md:p-8 space-y-8 w-full animate-fade-in">
                <div className="bg-surface-container-low border border-on-surface/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm relative overflow-hidden expert-brutalist-hover">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/20 rounded-bl-full -z-0"></div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-secondary font-mono">
                        {selectedBrc?.code}
                      </span>
                    </div>
                    <h2
                      className="text-3xl md:text-4xl text-on-surface tracking-wide mb-1"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        lineHeight: 1.2,
                      }}
                    >
                      {selectedBrc?.name}
                    </h2>
                    <p className="text-secondary flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        location_on
                      </span>
                      {selectedBrc?.location}, {selectedBrc?.district}
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center gap-3">
                    <button
                      onClick={handleChangeBrc}
                      className="px-6 py-3 border border-outline/20 bg-white hover:bg-surface-container rounded-xl text-sm font-bold text-on-surface transition-colors shadow-sm flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">
                        swap_horiz
                      </span>
                      Change Hub
                    </button>
                  </div>
                </div>

                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                    <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">
                      Reported Events
                    </p>
                    <p
                      className="text-3xl text-primary"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {eventStats.totalReported}
                    </p>
                  </div>
                  <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                    <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">
                      Drafted Events
                    </p>
                    <p
                      className="text-3xl text-amber-600"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {eventStats.totalDrafted}
                    </p>
                  </div>
                  <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                    <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">
                      Student Footfall
                    </p>
                    <p
                      className="text-3xl text-primary"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {eventStats.studentFootfall}
                    </p>
                  </div>
                  <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                    <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">
                      Teacher Footfall
                    </p>
                    <p
                      className="text-3xl text-primary"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {eventStats.teacherFootfall}
                    </p>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2
                      className="text-2xl border-l-4 border-primary pl-4 tracking-wide"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        lineHeight: 1.3,
                      }}
                    >
                      Expert Toolset
                    </h2>
                    <span className="text-sm font-semibold text-secondary">
                      {TOOLSET.length} Modules Available
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
                    {TOOLSET.map((tool, idx) => (
                      <div
                        key={tool.title}
                        ref={(el) => (cardRef.current[idx] = el)}
                        onClick={() => {
                          if (tool.title === "Attendance Tools") {
                            if (drafts.length > 0) {
                              alert(
                                "A draft report already exists for this session! Please resume or delete it from the Session Logs tab.",
                              );
                              return;
                            }
                            setSelectedDraft(null);
                            setShowEventModal(true);
                          } else if (tool.title === "Upload Event Report") {
                            setShowPdfModal(true);
                          } else if (tool.title === "Stock Management") {
                            setShowStockModal(true);
                          }
                        }}
                        className="group bg-white border border-on-surface/10 rounded-xl p-5 flex flex-col shadow-sm hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-container/30 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-xl">
                              {tool.icon}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-on-surface tracking-tight leading-tight">
                            {tool.title}
                          </h3>
                        </div>
                        <p className="text-secondary text-sm leading-relaxed flex-grow">
                          {tool.description}
                        </p>
                        <div className="mt-4 flex items-center gap-1 text-primary font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {tool.cta}
                          <span className="material-symbols-outlined text-base">
                            arrow_forward
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {drafts.length > 0 && (
                  <section className="space-y-6">
                    <h2
                      className="text-2xl border-l-4 border-amber-500 pl-4 tracking-wide text-on-surface"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        lineHeight: 1.3,
                      }}
                    >
                      Saved Drafts
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-secondary font-semibold">
                                {new Date(draft.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteDraft(e, draft.id)}
                                disabled={isDeleting}
                                className="text-secondary hover:text-error transition-colors p-1 rounded-md hover:bg-error/10 disabled:opacity-50"
                                title="Delete Draft"
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-on-surface mb-2">
                            {draft.name || "Untitled Event"}
                          </h3>
                          <p className="text-secondary text-sm line-clamp-2 flex-grow">
                            {draft.description || "No description provided."}
                          </p>
                          <div className="mt-6 flex items-center justify-between text-amber-600 group-hover:text-amber-700 transition-colors">
                            <span className="text-sm font-bold uppercase tracking-wider">
                              Resume Editing
                            </span>
                            <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">
                              arrow_forward
                            </span>
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

        {/* Support Modal */}
        {showSupportModal && (
          <div
            className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isClosingSupport ? "animate-fade-out" : "animate-fade-in"}`}
          >
            <div
              className={`bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative ${isClosingSupport ? "animate-fade-out-down" : "animate-fade-in-up"}`}
            >
              <button
                onClick={handleSupportClose}
                className="absolute top-4 right-4 text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">
                    support_agent
                  </span>
                </div>
                <h2 className="text-2xl font-black text-on-surface">
                  Support Contacts
                </h2>
                <p className="text-secondary text-sm mt-2">
                  Reach out to the system administrators for assistance.
                </p>
              </div>
              <div className="space-y-4">
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10">
                  <p className="font-bold text-on-surface">Admin One</p>
                  <p className="text-sm text-secondary flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-sm">
                      mail
                    </span>{" "}
                    admin1@stream.edu
                  </p>
                  <p className="text-sm text-secondary flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-sm">
                      phone
                    </span>{" "}
                    +91 9876543210
                  </p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10">
                  <p className="font-bold text-on-surface">Admin Two</p>
                  <p className="text-sm text-secondary flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-sm">
                      mail
                    </span>{" "}
                    admin2@stream.edu
                  </p>
                  <p className="text-sm text-secondary flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-sm">
                      phone
                    </span>{" "}
                    +91 9876543211
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {showPdfModal && selectedBrc && (
          <PdfReportModal
            brcCode={selectedBrc.code}
            onClose={() => setShowPdfModal(false)}
            onRefresh={() => fetchStatsAndDrafts(selectedBrc.code)}
          />
        )}

        {showStockModal && selectedBrc && (
          <StockManagementModal
            brcCode={selectedBrc.code}
            brcName={selectedBrc.name}
            onClose={() => setShowStockModal(false)}
          />
        )}
      </div>
    </div>
  );
}
