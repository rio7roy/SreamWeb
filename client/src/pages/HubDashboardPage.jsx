import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import api from "../lib/api";
import PdfReportModal from "../components/expert/PdfReportModal";
import StockManagementModal from "../components/expert/StockManagementModal";

export default function HubDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [brcData, setBrcData] = useState([]);
  const [selectedBrc, setSelectedBrc] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  const [eventStats, setEventStats] = useState({
    totalReported: 0,
    totalDrafted: 0,
    studentFootfall: 0,
    teacherFootfall: 0,
  });

  const hubBrcCode = user?.brcCode || user?.assignedBrcs?.[0] || null;

  // Fetch BRCs
  useEffect(() => {
    const fetchBrcs = async () => {
      try {
        const brcsRes = await api.get("/brcs");
        const brcs = brcsRes.data?.data || brcsRes.data || [];
        setBrcData(brcs);

        if (hubBrcCode) {
          const brc = brcs.find((b) => b.code === hubBrcCode);
          if (brc) setSelectedBrc(brc);
        }
      } catch (err) {
        console.error("Failed to fetch BRC data", err);
      }
    };
    fetchBrcs();
  }, [hubBrcCode]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!hubBrcCode) return;
    try {
      const statsRes = await api.get(`/events/stats?brcCode=${hubBrcCode}`);
      setEventStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  }, [hubBrcCode]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!hubBrcCode) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 text-center shadow-xl max-w-md">
          <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
          <h2 className="text-2xl font-bold text-on-surface mb-2">No BRC Assigned</h2>
          <p className="text-secondary mb-6">This hub account does not have a BRC code assigned. Contact your administrator.</p>
          <button onClick={handleLogout} className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-on-surface/10 shrink-0 sticky top-0 h-screen">
        <div className="p-6 border-b border-on-surface/10">
          <h1
            className="text-2xl tracking-wider text-primary"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            STREAM Hub
          </h1>
          <p className="text-xs font-mono text-secondary mt-1">{hubBrcCode}</p>
        </div>

        <nav className="flex-grow p-4">
          <div className="bg-primary-container/10 text-primary rounded-xl px-4 py-3 flex items-center gap-3 font-bold text-sm">
            <span className="material-symbols-outlined text-lg">dashboard</span>
            Dashboard
          </div>
        </nav>

        <div className="p-4 border-t border-on-surface/10">
          <div className="mb-4 px-2">
            <p className="text-sm font-bold text-on-surface truncate">{selectedBrc?.name || hubBrcCode}</p>
            <p className="text-xs text-secondary">{selectedBrc?.location}, {selectedBrc?.district}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-surface-container-low hover:bg-surface-container text-on-surface font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="w-full h-16 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:hidden border-b border-on-surface/10 shrink-0 sticky top-0 z-30">
          <h1 className="text-lg tracking-wider text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            STREAM Hub
          </h1>
          <button onClick={handleLogout} className="p-2 hover:bg-surface-container rounded-xl">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 md:px-20 space-y-6 max-w-[1280px] mx-auto w-full">
            {/* Hub Info Card */}
            <div className="bg-surface-container-low border border-on-surface/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/20 rounded-bl-full -z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-secondary font-mono">{selectedBrc?.code}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-widest">VIEW ONLY</span>
                </div>
                <h2
                  className="text-3xl md:text-4xl text-on-surface tracking-wide mb-1"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.2 }}
                >
                  {selectedBrc?.name || hubBrcCode}
                </h2>
                <p className="text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {selectedBrc?.location}, {selectedBrc?.district}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Reported Events</p>
                <p className="text-3xl text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {eventStats.totalReported}
                </p>
              </div>
              <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Student Footfall</p>
                <p className="text-3xl text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {eventStats.studentFootfall}
                </p>
              </div>
              <div className="bg-white border border-on-surface/10 rounded-xl p-4 md:p-5 flex flex-col justify-center shadow-sm">
                <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Teacher Footfall</p>
                <p className="text-3xl text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {eventStats.teacherFootfall}
                </p>
              </div>
            </section>

            {/* Tools - Only Upload Event Report */}
            <section>
              <h2
                className="text-2xl border-l-4 border-primary pl-4 tracking-wide mb-4"
                style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.3 }}
              >
                Hub Tools
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setShowPdfModal(true)}
                  className="group bg-white border border-on-surface/10 rounded-xl p-5 flex flex-col shadow-sm hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                    </div>
                    <h3 className="text-xl font-bold text-on-surface tracking-tight leading-tight">Upload Event Report</h3>
                  </div>
                  <p className="text-secondary text-sm flex-grow">Attach a PDF report to a previously submitted event.</p>
                  <div className="mt-4 pt-4 border-t border-on-surface/5 flex items-center justify-between text-primary group-hover:text-primary transition-colors">
                    <span className="text-sm font-bold uppercase tracking-wider">Upload PDF</span>
                    <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </div>
                </div>

                <div
                  onClick={() => setShowStockModal(true)}
                  className="group bg-white border border-on-surface/10 rounded-xl p-5 flex flex-col shadow-sm hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">inventory_2</span>
                    </div>
                    <h3 className="text-xl font-bold text-on-surface tracking-tight leading-tight">View Hub Stock</h3>
                  </div>
                  <p className="text-secondary text-sm flex-grow">Browse the inventory and check stock levels.</p>
                  <div className="mt-4 pt-4 border-t border-on-surface/5 flex items-center justify-between text-amber-600 group-hover:text-amber-700 transition-colors">
                    <span className="text-sm font-bold uppercase tracking-wider">View Stock</span>
                    <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* PDF Upload Modal */}
      {showPdfModal && selectedBrc && (
        <PdfReportModal
          brcCode={selectedBrc.code}
          onClose={() => setShowPdfModal(false)}
          onRefresh={fetchStats}
        />
      )}

      {/* Stock View Modal */}
      {showStockModal && selectedBrc && (
        <StockManagementModal
          brcCode={selectedBrc.code}
          brcName={selectedBrc.name}
          onClose={() => setShowStockModal(false)}
          isViewOnly={true}
        />
      )}
    </div>
  );
}
