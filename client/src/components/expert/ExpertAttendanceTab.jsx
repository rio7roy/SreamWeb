import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

export default function ExpertAttendanceTab({ user, brcCode }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Independent state for the dashboard badge
  const [currentMonthUniqueDays, setCurrentMonthUniqueDays] = useState(0);

  // Build query param: if brcCode is provided (hub user), fetch by BRC; otherwise fetch own events
  const baseQuery = brcCode ? `brcCode=${brcCode}` : 'mine=true';

  // Fetch current month stats ONCE for the badge
  useEffect(() => {
    const fetchCurrentMonthStats = async () => {
      try {
        const currentMonthStr = (new Date().getMonth() + 1).toString();
        const res = await api.get(`/events?${baseQuery}&month=${currentMonthStr}`);
        const currentMonthEvents = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        
        const dates = new Set(currentMonthEvents.map(e => {
          let timestamp = e.locationTimestamp || e.createdAt;
          if (timestamp && !isNaN(Number(timestamp))) timestamp = Number(timestamp);
          return new Date(timestamp).toLocaleDateString();
        }));
        setCurrentMonthUniqueDays(dates.size);
      } catch (err) {
        console.error("Failed to fetch current month stats", err);
      }
    };
    fetchCurrentMonthStats();
  }, [baseQuery]);

  // Fetch events based on the selected filter for the table
  useEffect(() => {
    fetchEvents();
  }, [selectedMonth, baseQuery]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = `/events?${baseQuery}`;
      if (selectedMonth) {
        url += `&month=${selectedMonth}`;
      }
      const res = await api.get(url);
      setEvents(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    let url = `${import.meta.env.VITE_API_URL || '/api'}/events/export/excel?${baseQuery}`;
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
      const brcMatch = (e.brcLocation || e.brcName || e.brcCode || '').toLowerCase().includes(query);
      return nameMatch || brcMatch;
    });
  }, [events, searchQuery]);

  const uniqueDaysCount = useMemo(() => {
    const dates = new Set(filteredEvents.map(e => {
      let timestamp = e.locationTimestamp || e.createdAt;
      if (timestamp && !isNaN(Number(timestamp))) timestamp = Number(timestamp);
      return new Date(timestamp).toLocaleDateString();
    }));
    return dates.size;
  }, [filteredEvents]);

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

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
            This count represents the total number of unique days you have successfully reported an event this month. Click to view full details.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center bg-white shadow-xl rounded-2xl p-6 min-w-[200px] border border-outline/10 group-hover:-translate-y-1 transition-transform">
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-primary text-4xl mb-2">calendar_month</span>
            <span className="text-5xl font-black text-on-surface">{currentMonthUniqueDays}</span>
            <span className="text-xs font-bold text-secondary uppercase tracking-widest mt-1">Unique Days</span>
            <span className="text-[10px] font-medium text-secondary/70 mt-1 uppercase tracking-wider">for the month of {currentMonthName}</span>
          </div>
        </div>
      </button>

      {/* Floating Modal for Sheets View */}
      {showModal && createPortal(
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
                      placeholder="Search by Event or BRC Name..."
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
                          <th className="px-6 py-3 font-semibold">BRC Location</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline/10">
                        {filteredEvents.map(e => (
                          <tr 
                            key={e.id} 
                            onClick={() => setSelectedEvent(e)}
                            className="hover:bg-surface-container-low transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              {new Date(e.locationTimestamp && !isNaN(Number(e.locationTimestamp)) ? Number(e.locationTimestamp) : (e.locationTimestamp || e.createdAt)).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 truncate max-w-[300px]" title={e.name}>{e.name}</td>
                            <td className="px-6 py-4 font-mono text-xs text-secondary flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                {e.brcLocation || e.brcName}
                                {e.venueType === 'OTHER_BRC' && (
                                  <span className="material-symbols-outlined text-[14px] text-amber-600" title="Other Venue">share_location</span>
                                )}
                              </div>
                              <span className={`self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${e.tag === 'other event' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'}`}>
                                {e.customTag || e.tag || 'N/A'}
                              </span>
                            </td>
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

          {/* Event Details Sub-Modal */}
          {selectedEvent && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
              <div className="bg-surface rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-fade-in-up">
                <div className="p-6 border-b border-outline/10 flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-10">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                      {selectedEvent.name}
                    </h3>
                    <p className="text-sm text-secondary font-medium flex items-center gap-2">
                      {new Date(selectedEvent.locationTimestamp && !isNaN(Number(selectedEvent.locationTimestamp)) ? Number(selectedEvent.locationTimestamp) : (selectedEvent.locationTimestamp || selectedEvent.createdAt)).toLocaleDateString()} &bull; BRC: {selectedEvent.brcLocation || selectedEvent.brcName || selectedEvent.brcCode}
                      {(selectedEvent.venueType === 'OTHER_BRC' || selectedEvent.tag === 'other event') && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold uppercase tracking-widest">OTHER</span>
                      )}
                    </p>
                    {(selectedEvent.locationTimestamp || selectedEvent.createdAt) && (
                      <p className="text-xs text-primary/80 font-mono mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        GPS: {new Date(selectedEvent.locationTimestamp && !isNaN(Number(selectedEvent.locationTimestamp)) ? Number(selectedEvent.locationTimestamp) : (selectedEvent.locationTimestamp || selectedEvent.createdAt)).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                
                <div className="p-6 space-y-8 flex-grow">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-primary-container/30 p-4 rounded-2xl flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-primary mb-1">school</span>
                      <span className="text-2xl font-bold text-on-surface">{selectedEvent.teachersCount || 0}</span>
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">Teachers</span>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-2xl flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-blue-700 mb-1">groups</span>
                      <span className="text-2xl font-bold text-on-surface">{selectedEvent.studentsCount || 0}</span>
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">Students</span>
                    </div>
                    <div className="bg-surface-container p-4 rounded-2xl flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-secondary mb-1">label</span>
                      <span className="text-sm font-bold text-on-surface capitalize text-center leading-tight mt-1">{selectedEvent.customTag || selectedEvent.tag || 'N/A'}</span>
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Tag</span>
                    </div>
                    <div className="bg-surface-container p-4 rounded-2xl flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-secondary mb-1">info</span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${selectedEvent.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedEvent.status}
                      </span>
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider mt-1">Status</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Description</h4>
                    <div className="bg-surface-container-low p-4 rounded-2xl">
                      <p className="text-on-surface whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedEvent.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  {/* Photos */}
                  {selectedEvent.photos && selectedEvent.photos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Photos ({selectedEvent.photos.length})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedEvent.photos.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-surface-container border border-outline/10">
                            <img 
                              src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${photo}`}
                              alt={`Event photo ${i + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>,
        document.body
      )}
    </div>
  );
}
