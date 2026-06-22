import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function ExpertManagementPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [expert, setExpert] = useState(null);
  const [allBrcs, setAllBrcs] = useState([]);
  const [assignedCodes, setAssignedCodes] = useState([]);
  const [expertEvents, setExpertEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brcSearch, setBrcSearch] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expertsRes, brcsRes, eventsRes] = await Promise.all([
          api.get('/admin/users/experts'),
          api.get('/brcs'),
          api.get(`/events?expertId=${id}`)
        ]);
        
        const foundExpert = expertsRes.data.find(e => e.id === id);
        if (foundExpert) {
          setExpert(foundExpert);
          setAssignedCodes(foundExpert.assignedBrcs || []);
        } else {
          setFeedback({ type: 'error', text: 'Expert not found' });
        }
        
        setAllBrcs(brcsRes.data);
        setExpertEvents(eventsRes.data || []);
      } catch (err) {
        console.error(err);
        setFeedback({ type: 'error', text: 'Failed to fetch data' });
      } finally {
        setLoading(false);
        setEventsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const assignedBrcs = allBrcs.filter(b => assignedCodes.includes(b.code));
  
  const searchLower = brcSearch.trim().toLowerCase();
  const searchResults = searchLower 
    ? allBrcs.filter(b => 
        !assignedCodes.includes(b.code) && 
        (b.name.toLowerCase().includes(searchLower) || b.code.toLowerCase().includes(searchLower) || b.district.toLowerCase().includes(searchLower))
      ).slice(0, 8)
    : [];

  const handleAddBrc = (code) => {
    if (!assignedCodes.includes(code)) {
      setAssignedCodes([...assignedCodes, code]);
    }
    setBrcSearch('');
  };

  const handleRemoveBrc = (code) => {
    setAssignedCodes(assignedCodes.filter(c => c !== code));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await api.put(`/admin/users/experts/${id}/brcs`, { brcCodes: assignedCodes });
      setFeedback({ type: 'success', text: 'Expert assigned BRCs updated successfully!' });
      setTimeout(() => navigate('/admin'), 2000);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update expert BRCs.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8 animate-fade-in-up">
        <button 
          onClick={() => navigate('/admin')} 
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-secondary hover:text-amber-500 transition-colors border border-outline/10 font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in-up border border-outline/10">
        <div className="bg-amber-500 px-8 py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-4xl text-white tracking-widest mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Manage Expert Assignments
            </h1>
            {expert && (
              <p className="text-amber-100 font-medium text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">person</span> {expert.name} ({expert.email})
              </p>
            )}
          </div>
        </div>

        <div className="p-8">
          {feedback && (
            <div className={`mb-8 p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-fade-in-up ${
              feedback.type === 'error' ? 'bg-error/10 text-error' : 'bg-green-100 text-green-700'
            }`}>
              <span className="material-symbols-outlined text-xl">
                {feedback.type === 'error' ? 'error' : 'check_circle'}
              </span>
              {feedback.text}
            </div>
          )}

          {expert && (
            <>
              <div className="flex flex-col gap-8">
                {/* Header with Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h4 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">school</span>
                    Assigned BRCs ({assignedBrcs.length})
                  </h4>
                  
                  <div className="relative w-full md:w-96 z-20">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">search</span>
                    <input 
                      type="text" 
                      value={brcSearch}
                      onChange={(e) => setBrcSearch(e.target.value)}
                      placeholder="Assign additional hubs..."
                      className="w-full bg-surface-container-low border border-outline/20 rounded-2xl pl-12 pr-4 py-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm font-medium"
                    />
                    
                    {/* Dropdown Overlay */}
                    {brcSearch && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-outline/10 overflow-hidden z-50 max-h-[300px] flex flex-col">
                        {searchResults.length > 0 ? (
                          <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {searchResults.map(brc => (
                              <button
                                key={brc.code}
                                onClick={() => handleAddBrc(brc.code)}
                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-amber-50 flex items-center justify-between group transition-all"
                              >
                                <div>
                                  <p className="font-bold text-on-surface">{brc.location}/{brc.name}</p>
                                  <p className="text-xs text-secondary mt-0.5">{brc.code} • {brc.district}</p>
                                </div>
                                <span className="material-symbols-outlined text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">add_circle</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-secondary">
                            No matching unassigned BRCs found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned BRCs List */}
                {assignedBrcs.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-surface-container-low border border-dashed border-outline/30 text-center text-secondary">
                    <span className="material-symbols-outlined text-4xl mb-3 opacity-30">map</span>
                    <p className="font-medium">No BRCs currently assigned to this expert.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedBrcs.map(brc => (
                      <div key={brc.code} className="flex flex-col p-5 bg-white rounded-2xl shadow-sm border border-outline/10 group hover:border-amber-300 transition-colors animate-fade-in-up relative overflow-hidden">
                        <div className="flex-grow pr-10">
                          <p className="font-bold text-on-surface text-lg leading-tight mb-3">{brc.location}/{brc.name}</p>
                          <div className="flex flex-wrap gap-2 mt-auto">
                            <span className="px-2 py-1 bg-surface-container text-secondary rounded-lg text-[10px] font-bold uppercase tracking-wider">{brc.code}</span>
                            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">{brc.district}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveBrc(brc.code)}
                          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-secondary hover:text-error hover:bg-error/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 bg-surface-container"
                          title="Remove BRC"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            
            {/* Attendance Log */}
            <div className="mt-12 bg-white rounded-2xl shadow-sm border border-outline/10 flex flex-col min-h-[300px]">
              <div className="px-6 py-4 border-b border-outline/10">
                <h4 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">event_available</span>
                  Attendance & Submissions
                </h4>
              </div>
              
              <div className="p-6">
                {eventsLoading ? (
                  <div className="flex justify-center py-8">
                    <span className="material-symbols-outlined animate-spin text-amber-500 text-4xl">refresh</span>
                  </div>
                ) : expertEvents.length === 0 ? (
                  <div className="text-center py-12 text-secondary bg-surface-container-low rounded-xl border border-dashed border-outline/30">
                    <span className="material-symbols-outlined text-4xl mb-3 opacity-30">pending_actions</span>
                    <p className="font-medium">No events submitted yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-outline/10">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-surface-container-low border-b border-outline/10 text-secondary uppercase text-[10px] tracking-wider font-bold">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Event Name</th>
                          <th className="px-6 py-4">Hub Code</th>
                          <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline/5">
                        {expertEvents.map(e => (
                          <tr key={e.id} className="hover:bg-amber-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-on-surface">{new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 max-w-[250px] truncate" title={e.name}>{e.name || 'Untitled'}</td>
                            <td className="px-6 py-4 font-mono text-xs text-secondary">{e.brcCode}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                e.status === 'SUBMITTED' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                {e.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
          </>
        )}
      </div>

        {expert && (
          <div className="bg-surface-container-low px-8 py-6 flex justify-end gap-4 border-t border-outline/10">
            <button onClick={() => navigate('/admin')} className="px-8 py-3 rounded-xl text-secondary hover:bg-surface-container transition-colors font-bold text-lg">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || loading} className="px-10 py-3 rounded-xl bg-amber-500 text-white font-bold text-lg shadow-lg hover:shadow-amber-500/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none flex items-center gap-2">
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Assignments
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
