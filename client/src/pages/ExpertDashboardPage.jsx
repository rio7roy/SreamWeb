import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import api from "../lib/api";
import EventReportModal from "../components/expert/EventReportModal";
import ExpertProfileTab from "../components/expert/ExpertProfileTab";
import ExpertSessionLogsTab from "../components/expert/ExpertSessionLogsTab";
import PdfReportModal from "../components/expert/PdfReportModal";
import ExpertAttendanceTab from "../components/expert/ExpertAttendanceTab";
import StockManagementModal from "../components/expert/StockManagementModal";
import ExpertFormDashboard from "../components/forms/ExpertFormDashboard";
import NotificationBar from "../components/ui/NotificationBar";

const EXPERT_NAV = [
  { label: "Dashboard", icon: "dashboard", active: true },
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
  const [showFormsModal, setShowFormsModal] = useState(false);
  const [isClosingSupport, setIsClosingSupport] = useState(false);
  const dropdownRef = useRef(null);

  const [brcData, setBrcData] = useState([]);

  const [showEventModal, setShowEventModal] = useState(false);
  const [showOtherBrcModal, setShowOtherBrcModal] = useState(false);
  const [otherLocationSelected, setOtherLocationSelected] = useState("");
  const [otherBrcSelected, setOtherBrcSelected] = useState("");
  const [customBrcText, setCustomBrcText] = useState("");
  const [otherBrcForReport, setOtherBrcForReport] = useState(null);
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

  // Fetch BRCs
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const brcsRes = await api.get("/brcs");
        setBrcData(brcsRes.data?.data || brcsRes.data || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchDashboardData();
  }, []);

  const assignedBrcCodes = user?.assignedBrcs || [];
  const allowedBrcs = brcData.filter((b) => assignedBrcCodes.includes(b.code));

  const uniqueLocations = useMemo(() => {
    const locs = new Set(brcData.map(b => b.location).filter(Boolean));
    return Array.from(locs).sort();
  }, [brcData]);

  const filteredOtherBrcs = useMemo(() => {
    if (!otherLocationSelected) return [];
    return brcData.filter(b => b.location === otherLocationSelected);
  }, [brcData, otherLocationSelected]);

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
  const handleNotificationBrcSelect = (brcCode) => {
    const brc = allowedBrcs.find(b => b.code === brcCode);
    if (brc) {
      handleInitSession(brc);
    }
  };

  const cardRef = useRef([]);

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
            <div className="h-10 w-10 rounded-full bg-primary-fixed overflow-hidden border border-outline/10 flex items-center justify-center relative">
              <span className="text-on-primary-container font-bold text-sm z-0">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
              {user?.avatar && (
                <img
                  src={`${import.meta.env.VITE_API_URL || "/api"}/uploads/${user.avatar}`}
                  alt="Profile"
                  className="w-full h-full object-cover absolute inset-0 z-10 bg-surface"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
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
                <span>{selectedBrc.location}/{selectedBrc.name}</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-grow overflow-y-auto min-h-0">
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
        <NotificationBar selectedBrc={selectedBrc} assignedBrcs={allowedBrcs} onSelectBrc={handleNotificationBrcSelect} />
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
              <section className="flex flex-col items-center justify-center py-10 animate-fade-in w-full h-full">
                <div className="w-full mb-12">
                  <ExpertAttendanceTab user={user} />
                </div>

                <div className="max-w-4xl w-full bg-white border border-on-surface/10 rounded-2xl shadow-xl flex flex-col">
                  <div className="py-10 px-6 md:px-10 flex flex-col justify-center">
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div className="text-left">
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
                          className="text-secondary leading-relaxed max-w-2xl text-sm"
                          style={{ fontFamily: "'Julius Sans One', sans-serif" }}
                        >
                          Click on a BRC below to initialize a session and access
                          expert tools for that region.
                        </p>
                      </div>
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

                    <div className="mt-8 border-t border-outline/10 pt-6">
                      <p className="text-secondary text-sm mb-4">Did you conduct a session at a BRC not assigned to you?</p>
                      <button 
                        onClick={() => setShowOtherBrcModal(true)}
                        className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition-colors border border-amber-300 flex items-center gap-2 w-fit"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Report Other Event
                      </button>
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
                      {selectedBrc?.location}/{selectedBrc?.name}
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
                          } else if (tool.title === "Observation Forms") {
                            setShowFormsModal(true);
                          }
                        }}
                        className="group bg-white border border-on-surface/10 rounded-xl p-5 flex flex-col shadow-sm hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex flex-col gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl">
                              {tool.icon}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-on-surface tracking-tight leading-tight">
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
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full tracking-wider shrink-0">
                              Draft
                            </span>
                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                              <span className="text-[11px] text-secondary font-semibold">
                                {new Date(draft.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteDraft(e, draft.id)}
                                disabled={isDeleting}
                                className="text-secondary hover:text-error transition-colors p-1 rounded-md hover:bg-error/10 disabled:opacity-50"
                                title="Delete Draft"
                              >
                                <span className="material-symbols-outlined text-[18px]">
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
      </div>

      {/* Forms Management Modal */}
      {showFormsModal && (
        <ExpertFormDashboard onClose={() => setShowFormsModal(false)} />
      )}

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

        {showEventModal && selectedBrc && (
          <EventReportModal
          brcCode={otherBrcForReport ? otherBrcForReport.code : selectedBrc?.code}
          brcName={otherBrcForReport ? otherBrcForReport.location + '/' + otherBrcForReport.name : selectedBrc ? selectedBrc.location + '/' + selectedBrc.name : ''}
          existingEvent={selectedDraft}
          defaultTag={otherBrcForReport ? 'other event' : ''}
          venueType={otherBrcForReport ? 'OTHER_BRC' : 'SELECTED_BRC'}
          venueValue={otherBrcForReport ? otherBrcForReport.code : null}
          onClose={() => {
            setShowEventModal(false);
            setOtherBrcForReport(null);
            setSelectedDraft(null);
            fetchStatsAndDrafts();
          }}
          onRefresh={fetchStatsAndDrafts}
        />
      )}

      {showOtherBrcModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button onClick={() => setShowOtherBrcModal(false)} className="absolute top-4 right-4 text-secondary hover:text-on-surface">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined">domain_add</span>
              </div>
              <h3 className="text-2xl font-bold text-on-surface" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Report Event in Other BRC</h3>
            </div>
            <p className="text-secondary text-sm mb-6">Select the BRC where you conducted this event. This will be automatically tagged as an 'other event'.</p>
            
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-secondary mb-2">BRC</label>
                <select 
                  value={otherLocationSelected} 
                  onChange={(e) => {
                    setOtherLocationSelected(e.target.value);
                    setOtherBrcSelected("");
                    setCustomBrcText("");
                  }}
                  className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 focus:border-primary focus:ring-1 outline-none transition-all"
                >
                  <option value="" disabled>Select BRC...</option>
                  <option value="OTHER">Other (Custom Venue)</option>
                  <optgroup label="Registered BRCs">
                    {uniqueLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {(otherLocationSelected && otherLocationSelected !== 'OTHER') && (
                <div className="animate-fade-in-up">
                  <label className="block text-sm font-bold text-secondary mb-2">School</label>
                  <select 
                    value={otherBrcSelected} 
                    onChange={(e) => setOtherBrcSelected(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 focus:border-primary focus:ring-1 outline-none transition-all"
                  >
                    <option value="" disabled>Select School...</option>
                    <option value="OTHER">Other School in {otherLocationSelected}</option>
                    <optgroup label="Registered BRCs">
                      {filteredOtherBrcs.map(b => (
                        <option key={b.code} value={b.code}>{b.location}/{b.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
              
              {(otherLocationSelected === 'OTHER' || otherBrcSelected === 'OTHER') && (
                <div className="animate-fade-in-up mt-3">
                  <label className="block text-sm font-bold text-secondary mb-2">Custom Venue Name</label>
                  <input
                    type="text"
                    placeholder="Enter custom venue name"
                    value={customBrcText}
                    onChange={(e) => setCustomBrcText(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowOtherBrcModal(false)}
                className="flex-1 py-3 px-4 bg-surface-container-low text-on-surface font-bold rounded-xl hover:bg-surface-container-high transition-colors border border-outline/10"
              >
                Cancel
              </button>
              <button 
                disabled={(!otherLocationSelected) || (otherLocationSelected !== 'OTHER' && !otherBrcSelected) || ((otherLocationSelected === 'OTHER' || otherBrcSelected === 'OTHER') && !customBrcText.trim())}
                onClick={() => {
                  let venueName = "";
                  
                  if (otherLocationSelected === 'OTHER') {
                    venueName = customBrcText.trim();
                  } else if (otherBrcSelected === 'OTHER') {
                    venueName = `${customBrcText.trim()} (${otherLocationSelected})`;
                  } else {
                    venueName = otherBrcSelected; // This is the BRC code
                  }

                  let brc = brcData.find(b => b.code === venueName);
                  if (!brc) {
                    brc = { code: venueName, name: venueName };
                  }
                  
                  if (brc) {
                    setOtherBrcForReport(brc);
                    setSelectedBrc(brc);
                    setShowEventModal(true);
                    setShowOtherBrcModal(false);
                  }
                }}
                className="flex-1 py-3 px-4 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Continue
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
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
            brcName={selectedBrc.location + '/' + selectedBrc.name}
            onClose={() => setShowStockModal(false)}
          />
        )}
    </div>
  );
}
