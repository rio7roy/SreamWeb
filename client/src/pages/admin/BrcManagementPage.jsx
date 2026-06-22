import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function BrcManagementPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  
  const [brc, setBrc] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'stock', 'reports'
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    district: '',
    location: '',
    inchargeName: '',
    issues: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/brcs'),
      api.get(`/events?brcCode=${code}`)
    ])
      .then(([brcRes, eventsRes]) => {
        const found = brcRes.data.find(b => b.code === code);
        if (found) {
          setBrc(found);
          setFormData({ 
            name: found.name || '', 
            district: found.district || '', 
            location: found.location || '',
            inchargeName: found.inchargeName || '',
            issues: found.issues || ''
          });
        } else {
          setFeedback({ type: 'error', text: 'BRC not found' });
        }
        setEvents(eventsRes.data || []);
      })
      .catch(() => setFeedback({ type: 'error', text: 'Failed to fetch BRC data' }))
      .finally(() => setLoading(false));
  }, [code]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await api.put(`/brcs/${code}`, formData);
      setFeedback({ type: 'success', text: 'BRC Details updated successfully!' });
      setBrc({ ...brc, ...formData });
      setIsEditing(false);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update BRC details.' });
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
      <div className="w-full max-w-7xl flex items-center justify-between mb-8 animate-fade-in-up">
        <button 
          onClick={() => navigate('/admin')} 
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-secondary hover:text-primary transition-colors border border-outline/10 font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-7xl bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in-up border border-outline/10">
        <div className="bg-primary px-8 pt-8 relative overflow-hidden rounded-t-3xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div className="relative z-10 mb-6">
            <h1 className="text-4xl text-on-primary tracking-widest mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Manage STREAM Hub
            </h1>
            <p className="text-primary-container font-medium text-lg flex items-center gap-2">
              <span className="material-symbols-outlined">tag</span> {code}
            </p>
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar relative z-10 mt-auto">
            {['details', 'stock', 'reports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-bold text-sm uppercase tracking-wider whitespace-nowrap transition-all border-b-4 ${
                  activeTab === tab
                    ? 'border-white text-white'
                    : 'border-transparent text-white/60 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {tab === 'details' && 'Hub Details'}
                {tab === 'stock' && 'Stock Status'}
                {tab === 'reports' && 'Reported Events'}
              </button>
            ))}
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

          {/* --- TAB CONTENT --- */}
          
          {/* DETAILS TAB */}
          {activeTab === 'details' && brc && (
            <div className="animate-fade-in-up space-y-8">
              
              {/* Stats Overview */}
              <div className="bg-surface-container-low border border-outline/10 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Total Events Conducted</span>
                  <span className="text-3xl font-black text-primary">{events.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Footfall (Students)</span>
                  <span className="text-3xl font-black text-on-surface">{events.reduce((sum, e) => sum + (e.studentsCount || 0), 0)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-secondary uppercase tracking-wider mb-1">Footfall (Teachers)</span>
                  <span className="text-3xl font-black text-on-surface">{events.reduce((sum, e) => sum + (e.teachersCount || 0), 0)}</span>
                </div>
              </div>

              {/* Read-Only or Form */}
              {!isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-1 uppercase tracking-wider">Hub Name</label>
                    <p className="text-xl font-bold text-on-surface">{brc.location ? brc.location + '/' + brc.name : brc.name || 'N/A'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1 uppercase tracking-wider">In-charge Name</label>
                      <p className="text-lg text-on-surface">{brc.inchargeName || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1 uppercase tracking-wider">District</label>
                      <p className="text-lg text-on-surface">{brc.district || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1 uppercase tracking-wider">Location / Block</label>
                      <p className="text-lg text-on-surface">{brc.location || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-secondary mb-1 uppercase tracking-wider">Issues / Notes</label>
                    <p className="text-lg text-on-surface bg-surface-container-low p-4 rounded-xl border border-outline/10 whitespace-pre-wrap">
                      {brc.issues || 'No reported issues or notes.'}
                    </p>
                  </div>
                </div>
              ) : (
                <form id="brc-form" onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Hub Name</label>
                    <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-5 py-4 text-lg focus:border-primary outline-none transition-colors" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">In-charge Name</label>
                      <input name="inchargeName" value={formData.inchargeName} onChange={handleChange} type="text" className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-5 py-4 text-lg focus:border-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">District</label>
                      <input required name="district" value={formData.district} onChange={handleChange} type="text" className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-5 py-4 text-lg focus:border-primary outline-none transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Location / Block</label>
                      <input required name="location" value={formData.location} onChange={handleChange} type="text" className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-5 py-4 text-lg focus:border-primary outline-none transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Issues / Notes</label>
                    <textarea name="issues" value={formData.issues} onChange={handleChange} rows="4" className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-5 py-4 text-lg focus:border-primary outline-none transition-colors resize-y" placeholder="Describe any hardware issues, general notes, or constraints here..."></textarea>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STOCK STATUS TAB */}
          {activeTab === 'stock' && (
            <div className="animate-fade-in-up">
              <div className="bg-surface-container-low border border-outline/10 rounded-2xl p-8 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-on-surface">Inventory Overview</h3>
                  <button className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold shadow hover:-translate-y-1 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Stock
                  </button>
                </div>
                
                {/* Mock Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-outline/20 text-secondary text-sm">
                        <th className="pb-3 font-bold uppercase tracking-wider">Item Code</th>
                        <th className="pb-3 font-bold uppercase tracking-wider">Equipment Name</th>
                        <th className="pb-3 font-bold uppercase tracking-wider text-right">Quantity</th>
                        <th className="pb-3 font-bold uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-on-surface">
                      <tr className="border-b border-outline/5 hover:bg-black/[0.02] transition-colors">
                        <td className="py-4 font-mono text-sm">RBT-001</td>
                        <td className="py-4 font-bold">Lego Mindstorms EV3</td>
                        <td className="py-4 text-right font-bold">5</td>
                        <td className="py-4 text-right"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">In Stock</span></td>
                      </tr>
                      <tr className="border-b border-outline/5 hover:bg-black/[0.02] transition-colors">
                        <td className="py-4 font-mono text-sm">ARD-102</td>
                        <td className="py-4 font-bold">Arduino Uno R3 Kit</td>
                        <td className="py-4 text-right font-bold">12</td>
                        <td className="py-4 text-right"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">In Stock</span></td>
                      </tr>
                      <tr className="border-b border-outline/5 hover:bg-black/[0.02] transition-colors">
                        <td className="py-4 font-mono text-sm">SDR-045</td>
                        <td className="py-4 font-bold">Soldering Iron Set</td>
                        <td className="py-4 text-right font-bold">0</td>
                        <td className="py-4 text-right"><span className="bg-error/10 text-error px-3 py-1 rounded-full text-xs font-bold">Out of Stock</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">assessment</span>
                  Submitted Reports
                </h2>
              </div>
              
              {events.length === 0 ? (
                <div className="bg-white border border-outline/10 rounded-3xl p-12 text-center shadow-sm">
                  <span className="material-symbols-outlined text-5xl text-secondary/30 mb-4">folder_open</span>
                  <h3 className="text-xl font-bold text-on-surface mb-2">No Reports Found</h3>
                  <p className="text-secondary">No expert has submitted an event report for this hub yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => {
                    const isExpanded = expandedEventId === event.id;
                    return (
                      <div key={event.id} className="bg-surface-container-low border border-outline/10 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
                        
                        {/* Minimalistic Thumbnail Row */}
                        <div 
                          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-black/[0.02] transition-colors"
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        >
                          {/* Thumbnail */}
                          <div className="w-16 h-16 rounded-xl bg-surface-container-high border border-outline/20 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {event.photos && event.photos.length > 0 ? (
                              <img src={`${import.meta.env.VITE_API_URL || '/api'}${event.photos[0]}`} alt="Thumbnail" className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-secondary/50 text-3xl">image</span>
                            )}
                          </div>
                          
                          {/* Basic Info */}
                          <div className="flex-grow">
                            <h3 className="text-lg font-bold text-on-surface leading-tight mb-1">{event.name}</h3>
                            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-secondary">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">school</span>
                                {event.studentsCount || 0} Students
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">person</span>
                                {event.teachersCount || 0} Teachers
                              </span>
                            </div>
                          </div>
                          
                          {/* Expand Icon */}
                          <div className="pl-4 text-secondary/50">
                            <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-6 border-t border-outline/10 bg-white animate-fade-in-up">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                {new Date(event.date || event.createdAt).toLocaleDateString()}
                              </span>
                              <span className="mx-1 opacity-30">•</span>
                              {event.venueType === 'OTHER_VENUE' && event.venueValue ? (
                                <span className="flex items-center gap-1 text-primary">
                                  <span className="material-symbols-outlined text-sm">location_on</span>
                                  {event.venueValue}
                                </span>
                              ) : (
                                <span>At {brc.location}/{brc.name}</span>
                              )}
                              
                              {event.latitude && event.longitude && (
                                <>
                                  <span className="mx-1 opacity-30">•</span>
                                  <a href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 hover:bg-green-100 transition-colors" title="View on Google Maps">
                                    <span className="material-symbols-outlined text-sm">my_location</span>
                                    GPS: {parseFloat(event.latitude).toFixed(4)}, {parseFloat(event.longitude).toFixed(4)}
                                  </a>
                                </>
                              )}
                            </div>
                            
                            <div className="text-on-surface/80 leading-relaxed mb-6">
                              {event.description}
                            </div>

                            {event.photos && event.photos.length > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3">All Photos</p>
                                <div className="flex flex-wrap gap-3">
                                  {event.photos.map((photo, idx) => (
                                    <div key={idx} className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container-high border border-outline/20">
                                      <img src={`${import.meta.env.VITE_API_URL || '/api'}${photo}`} alt="Event" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {activeTab === 'details' && brc && (
          <div className="bg-surface-container-low px-8 py-6 flex justify-end gap-4 border-t border-outline/10 rounded-b-3xl">
            {!isEditing ? (
              <button type="button" onClick={() => setIsEditing(true)} className="px-10 py-3 rounded-xl bg-primary text-on-primary font-bold text-lg shadow-lg hover:shadow-primary/30 hover:-translate-y-1 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit Hub Details
              </button>
            ) : (
              <>
                <button type="button" onClick={() => {
                  setIsEditing(false);
                  setFormData({ 
                    name: brc.name || '', 
                    district: brc.district || '', 
                    location: brc.location || '',
                    inchargeName: brc.inchargeName || '',
                    issues: brc.issues || ''
                  });
                }} className="px-8 py-3 rounded-xl text-secondary hover:bg-surface-container transition-colors font-bold text-lg">
                  Cancel
                </button>
                <button form="brc-form" type="submit" disabled={saving} className="px-10 py-3 rounded-xl bg-primary text-on-primary font-bold text-lg shadow-lg hover:shadow-primary/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none flex items-center gap-2">
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
