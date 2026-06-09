import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function BrcManagementPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  
  const [brc, setBrc] = useState(null);
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    district: '',
    location: ''
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
          setFormData({ name: found.name, district: found.district, location: found.location });
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
      // Keep them on the page to see success
      setTimeout(() => navigate('/admin'), 2000);
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
      <div className="w-full max-w-3xl flex items-center justify-between mb-8 animate-fade-in-up">
        <button 
          onClick={() => navigate('/admin')} 
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-secondary hover:text-primary transition-colors border border-outline/10 font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in-up border border-outline/10">
        <div className="bg-primary px-8 py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-4xl text-on-primary tracking-widest mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Manage STREAM Hub
            </h1>
            <p className="text-primary-container font-medium text-lg flex items-center gap-2">
              <span className="material-symbols-outlined">tag</span> {code}
            </p>
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

          {brc && (
            <form id="brc-form" onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Hub Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-5 py-4 text-lg focus:border-primary outline-none transition-colors" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">District</label>
                  <input required name="district" value={formData.district} onChange={handleChange} type="text" className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-5 py-4 text-lg focus:border-primary outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Location / Block</label>
                  <input required name="location" value={formData.location} onChange={handleChange} type="text" className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-5 py-4 text-lg focus:border-primary outline-none transition-colors" />
                </div>
              </div>
            </form>
          )}
        </div>

        {brc && (
          <div className="bg-surface-container-low px-8 py-6 flex justify-end gap-4 border-t border-outline/10">
            <button type="button" onClick={() => navigate('/admin')} className="px-8 py-3 rounded-xl text-secondary hover:bg-surface-container transition-colors font-bold text-lg">
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
          </div>
        )}
      </div>

      {brc && (
        <div className="w-full max-w-3xl mt-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">assessment</span>
            Submitted Reports
          </h2>
          
          {events.length === 0 ? (
            <div className="bg-white border border-outline/10 rounded-3xl p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-secondary/30 mb-4">folder_open</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">No Reports Found</h3>
              <p className="text-secondary">No expert has submitted an event report for this hub yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event) => (
                <div key={event.id} className="bg-white border border-outline/10 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-outline/10 pb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-on-surface mb-1">{event.name}</h3>
                      <div className="flex items-center gap-2 text-sm font-semibold text-secondary uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {new Date(event.date || event.createdAt).toLocaleDateString()}
                        <span className="mx-2 opacity-30">•</span>
                        {event.venueType === 'OTHER_VENUE' && event.venueValue ? (
                          <span className="flex items-center gap-1 text-primary">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {event.venueValue}
                          </span>
                        ) : (
                          <span>At {brc.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-on-surface/80 leading-relaxed">
                    {event.description}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-on-surface">{event.teachersCount || 0}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-secondary">Teachers</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">school</span>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-on-surface">{event.studentsCount || 0}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-secondary">Students</p>
                      </div>
                    </div>
                  </div>

                  {event.photos && event.photos.length > 0 && (
                    <div className="pt-4 border-t border-outline/10">
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3">Event Photos</p>
                      <div className="flex flex-wrap gap-3">
                        {event.photos.map((photo, idx) => (
                          <div key={idx} className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container-high border border-outline/20">
                            <img src={`/api${photo}`} alt="Event" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
