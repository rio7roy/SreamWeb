import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';

export default function ExpertAttendanceTab({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [selectedMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = '/events?mine=true';
      if (selectedMonth) {
        url += `&month=${selectedMonth}`;
      }
      const res = await api.get(url);
      setEvents(res.data || []);
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    let url = `${import.meta.env.VITE_API_URL || '/api'}/events/export/excel?mine=true`;
    if (selectedMonth) {
      url += `&month=${selectedMonth}`;
    }
    
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = url;
    
    // Add auth token if available
    const token = localStorage.getItem('stream_token');
    if (token) {
      link.href = `${url}&token=${token}`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(e => {
      const nameMatch = (e.name || '').toLowerCase().includes(query);
      const brcMatch = (e.brcCode || '').toLowerCase().includes(query);
      return nameMatch || brcMatch;
    });
  }, [events, searchQuery]);

  const uniqueDaysCount = useMemo(() => {
    const dates = new Set(filteredEvents.map(e => new Date(e.date || e.createdAt).toLocaleDateString()));
    return dates.size;
  }, [filteredEvents]);

  return (
    <div className="flex flex-col animate-fade-in w-full">
      {/* Attendance Header (Clickable Panel) */}
      <button 
        onClick={() => setShowModal(true)}
        className="w-full text-left bg-primary/5 border border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm group"
      >
        <div>
          <h2 className="text-4xl font-black text-primary mb-2 group-hover:scale-105 transform origin-left transition-transform">My Attendance</h2>
          <p className="text-secondary text-sm">
            This count represents the total number of unique days you have successfully reported an event. Click to view full details.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center bg-white shadow-xl rounded-2xl p-6 min-w-[200px] border border-outline/10 group-hover:-translate-y-1 transition-transform">
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-primary text-4xl mb-2">calendar_month</span>
            <span className="text-5xl font-black text-on-surface">{uniqueDaysCount}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-widest mt-1">Unique Days</span>
          </div>
        </div>
      </button>

      {/* Floating Modal for Sheets View */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          
          <div className="relative bg-surface rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-surface px-6 py-4 flex items-center justify-between border-b border-outline/10 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-primary" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  Attendance Log
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-grow flex flex-col p-6 space-y-6 overflow-hidden">
              {/* Filters & Export */}
              <div className="bg-white border border-outline/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 shadow-sm items-end shrink-0">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Search Events</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by event name or BRC code..."
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline/20 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>
                
                <div className="w-full md:w-48 shrink-0">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Month</label>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline/20 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium appearance-none"
                    >
                      <option value="">All Time</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">arrow_drop_down</span>
                  </div>
                </div>

                <button 
                  onClick={handleDownload}
                  disabled={loading || filteredEvents.length === 0}
                  className="w-full md:w-auto bg-green-600 text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none shrink-0"
                >
                  <span className="material-symbols-outlined text-xl">table_chart</span>
                  Download Excel
                </button>
              </div>

              {/* Sheets Form (Table) */}
              <div className="flex-grow bg-white border border-outline/10 rounded-2xl overflow-hidden flex flex-col min-h-0 shadow-sm">
                <div className="bg-surface-container-low px-4 py-3 border-b border-outline/10 shrink-0 flex justify-between items-center">
                  <span className="text-sm font-bold text-on-surface">Event Records ({filteredEvents.length})</span>
                </div>
                
                <div className="flex-grow overflow-y-auto relative">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
                      <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                    </div>
                  ) : null}
                  
                  {filteredEvents.length === 0 && !loading ? (
                    <div className="flex items-center justify-center h-full text-secondary text-sm p-10">
                      No reported events found.
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-surface-container-high sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Date</th>
                          <th className="px-6 py-3 font-semibold">Event Name</th>
                          <th className="px-6 py-3 font-semibold">BRC Code</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline/10">
                        {filteredEvents.map(e => (
                          <tr key={e.id} className="hover:bg-surface-container-low transition-colors">
                            <td className="px-6 py-4">{new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 truncate max-w-[300px]" title={e.name}>{e.name}</td>
                            <td className="px-6 py-4 font-mono text-xs text-secondary">{e.brcCode}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {e.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
