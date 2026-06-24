import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../features/auth/AuthContext';

export default function ReportsPage() {
  const { user } = useAuth();
  const [brcs, setBrcs] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBrc, setSelectedBrc] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedExpert, setSelectedExpert] = useState('');
  const [previewEvents, setPreviewEvents] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/brcs'),
      api.get('/admin/users/experts').catch(() => ({ data: [] })) // Fallback if not authorized
    ])
      .then(([brcsRes, expertsRes]) => {
        setBrcs(brcsRes.data || []);
        setExperts(expertsRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const districts = useMemo(() => {
    const d = new Set(brcs.map(b => b.district).filter(Boolean));
    return Array.from(d).sort();
  }, [brcs]);

  const filteredBrcs = useMemo(() => {
    if (!selectedDistrict) return brcs;
    return brcs.filter(b => b.district === selectedDistrict);
  }, [brcs, selectedDistrict]);

  useEffect(() => {
    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        let url = '/events';
        const params = new URLSearchParams();
        if (selectedDistrict) params.append('district', selectedDistrict);
        if (selectedBrc) params.append('brcCode', selectedBrc);
        if (selectedMonth) params.append('month', selectedMonth);
        if (selectedExpert) params.append('expertId', selectedExpert);
        
        if (params.toString()) {
          url += '?' + params.toString();
        }
        
        const res = await api.get(url);
        setPreviewEvents(res.data);
      } catch (err) {
        console.error("Failed to fetch preview data", err);
      } finally {
        setPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [selectedDistrict, selectedBrc, selectedMonth, selectedExpert]);

  const handleDownload = (type) => {
    let url = `/events/export/${type}`;
    const params = new URLSearchParams();
    if (selectedDistrict) params.append('district', selectedDistrict);
    if (selectedBrc) params.append('brcCode', selectedBrc);
    if (selectedMonth) params.append('month', selectedMonth);
    if (selectedExpert) params.append('expertId', selectedExpert);
    
    if (params.toString()) {
      url += '?' + params.toString();
    }

    api.get(url, { responseType: 'blob' })
      .then(res => {
        const blob = res.data;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Event_Reports.${type === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch(err => {
        console.error('Download error:', err);
        alert('Failed to download report. Please try again.');
      });
  };

  const handleMonthEndDownload = () => {
    let url = '/reports/month-end-pdf';
    if (selectedMonth) {
      url += `?month=${selectedMonth}&year=${new Date().getFullYear()}`;
    }

    api.get(url, { responseType: 'blob' })
      .then(res => {
        const blob = res.data;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const mName = selectedMonth ? `Month_${selectedMonth}` : 'All_Time';
        a.download = `Month_End_Report_${mName}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch(err => {
        console.error('Download error:', err);
        alert('Failed to download Month-End report. Please try again.');
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 h-full">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col animate-fade-in-up bg-white rounded-2xl shadow-sm border border-black/[0.04] p-6">
      {/* Header and Filters */}
      <div className="shrink-0 mb-6">
        <h1 className="text-3xl font-black text-on-surface tracking-tight mb-6" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
          Events Report
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Filter by District</label>
            <select 
              className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedBrc('');
              }}
            >
              <option value="">All Districts</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Filter by STREAM Hub</label>
            <select 
              className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none disabled:opacity-50"
              value={selectedBrc}
              onChange={(e) => setSelectedBrc(e.target.value)}
              disabled={filteredBrcs.length === 0}
            >
              <option value="">All Hubs</option>
              {filteredBrcs.map(b => (
                <option key={b.code} value={b.code}>{b.location}/{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Filter by Expert</label>
            <select 
              className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
              value={selectedExpert}
              onChange={(e) => setSelectedExpert(e.target.value)}
            >
              <option value="">All Experts</option>
              {experts.map(expert => (
                <option key={expert.id} value={expert.id}>{expert.name || expert.email}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">Filter by Month</label>
            <select 
              className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
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
          </div>
        </div>
      </div>

      {/* Data Preview */}
      <div className="flex-grow border border-outline/10 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="bg-surface-container-low px-4 py-3 border-b border-outline/10 shrink-0 flex justify-between items-center">
          <span className="text-sm font-bold text-on-surface">Data Preview ({previewEvents.length} records)</span>
        </div>
        
        <div className="flex-grow overflow-y-auto bg-white relative">
          {previewLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
            </div>
          ) : null}
          
          {previewEvents.length === 0 && !previewLoading ? (
            <div className="flex items-center justify-center h-full text-secondary text-sm">
              No reports found for the selected filters.
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Standard Events Table */}
              {previewEvents.filter(e => e.creatorRole !== 'STREAM_LAB').length > 0 && (
                <div className="mb-6">
                  <div className="bg-surface-container-highest px-6 py-2 sticky top-0 z-10">
                    <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Programs Conducted</h4>
                  </div>
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-container-high border-b border-outline/10">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Event Name</th>
                        <th className="px-6 py-3 font-semibold">BRC Name</th>
                        <th className="px-6 py-3 font-semibold">Teachers</th>
                        <th className="px-6 py-3 font-semibold">Students</th>
                        <th className="px-6 py-3 font-semibold">Tag</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/10">
                      {previewEvents.filter(e => e.creatorRole !== 'STREAM_LAB').map(e => (
                        <tr 
                          key={e.id} 
                          className="hover:bg-surface-container-low transition-colors cursor-pointer"
                          onClick={() => setSelectedEvent(e)}
                        >
                          <td className="px-6 py-3">{new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-3 truncate max-w-[200px]" title={e.name}>{e.name}</td>
                          <td className="px-6 py-3 font-mono text-xs text-secondary">{e.brcName || e.brcCode}</td>
                          <td className="px-6 py-3 text-secondary">{e.teachersCount || 0}</td>
                          <td className="px-6 py-3 text-secondary">{e.studentsCount || 0}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${e.tag === 'other event' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'}`}>
                                {e.customTag || e.tag || 'N/A'}
                              </span>
                              {e.venueType === 'OTHER_BRC' && (
                                <span className="material-symbols-outlined text-[14px] text-amber-600" title="Other Venue">share_location</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Separate Hub Events Table */}
              {previewEvents.filter(e => e.creatorRole === 'STREAM_LAB').length > 0 && (
                <div>
                  <div className="bg-amber-50 border-y border-amber-200 px-6 py-2 sticky top-0 z-10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-sm">hub</span>
                    <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">Separate Hub Events</h4>
                  </div>
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-amber-50/50 border-b border-amber-100 text-amber-900">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Event Name</th>
                        <th className="px-6 py-3 font-semibold">BRC Name</th>
                        <th className="px-6 py-3 font-semibold">Teachers</th>
                        <th className="px-6 py-3 font-semibold">Students</th>
                        <th className="px-6 py-3 font-semibold">Tag</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 bg-amber-50/20">
                      {previewEvents.filter(e => e.creatorRole === 'STREAM_LAB').map(e => (
                        <tr 
                          key={e.id} 
                          className="hover:bg-amber-100/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedEvent(e)}
                        >
                          <td className="px-6 py-3 text-amber-900">{new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-3 truncate max-w-[200px] font-bold text-amber-900" title={e.name}>{e.name}</td>
                          <td className="px-6 py-3 font-mono text-xs text-amber-700">{e.brcName || e.brcCode}</td>
                          <td className="px-6 py-3 text-amber-800">{e.teachersCount || 0}</td>
                          <td className="px-6 py-3 text-amber-800">{e.studentsCount || 0}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${e.tag === 'other event' ? 'bg-indigo-200 text-indigo-900' : 'bg-blue-200 text-blue-900'}`}>
                                {e.customTag || e.tag || 'N/A'}
                              </span>
                              {e.venueType === 'OTHER_BRC' && (
                                <span className="material-symbols-outlined text-[14px] text-amber-600" title="Other Venue">share_location</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800">
                              HUB UPLOAD
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="shrink-0 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => handleDownload('excel')}
          disabled={previewLoading || previewEvents.length === 0}
          className="bg-primary text-on-primary py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
        >
          <span className="material-symbols-outlined text-xl">table_chart</span>
          Download as Excel
        </button>
        <button 
          onClick={() => handleDownload('pdf')}
          disabled={previewLoading || previewEvents.length === 0}
          className="bg-[#d32f2f] text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
        >
          <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
          Download as PDF
        </button>
        <button 
          onClick={handleMonthEndDownload}
          className="bg-[#785900] text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-xl">assessment</span>
          Generate Month-End Report
        </button>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-fade-in-up">
            <div className="p-6 border-b border-outline/10 flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-10">
              <div>
                <h3 className="text-xl font-bold text-on-surface" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  {selectedEvent.name}
                </h3>
                <p className="text-sm text-secondary font-medium">
                  {new Date(selectedEvent.date || selectedEvent.createdAt).toLocaleDateString()} &bull; {selectedEvent.brcCode}
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

              {/* Uploaded PDF Report */}
              {selectedEvent.reportPdf && (
                <div>
                  <h4 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Expert Report</h4>
                  <a 
                    href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${selectedEvent.reportPdf}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-3 bg-[#d32f2f]/10 text-[#d32f2f] hover:bg-[#d32f2f]/20 transition-colors rounded-xl font-bold text-sm border border-[#d32f2f]/20"
                  >
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                    View Uploaded PDF Report
                  </a>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-outline/10 bg-surface-container-low flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="px-6 py-2 bg-surface border border-outline/20 rounded-xl text-on-surface font-bold text-sm hover:bg-surface-container-high transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
