import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

export default function EventReportModal({ brcCode, brcName, existingEvent, onClose, onRefresh }) {
  const [allBrcs, setAllBrcs] = useState([]);
  const [venueType, setVenueType] = useState('SELECTED_BRC');
  const [venueValue, setVenueValue] = useState(brcCode);
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    teachersCount: 0,
    studentsCount: 0,
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Fetch all BRCs for the "Other BRCs" dropdown
    const fetchBrcs = async () => {
      try {
        const res = await api.get('/brcs');
        setAllBrcs(res.data);
      } catch (e) {
        console.error('Failed to fetch BRCs', e);
      }
    };
    fetchBrcs();

    if (existingEvent) {
      setFormData({
        name: existingEvent.name || '',
        date: existingEvent.date || '',
        description: existingEvent.description || '',
        teachersCount: existingEvent.teachersCount || 0,
        studentsCount: existingEvent.studentsCount || 0,
      });
      if (existingEvent.venueType) setVenueType(existingEvent.venueType);
      if (existingEvent.venueValue) setVenueValue(existingEvent.venueValue);
    }
  }, [existingEvent]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    setPhotos(Array.from(e.target.files));
  };

  const handleSubmit = async (e, status) => {
    e.preventDefault();
    if (photos.length > 10) {
      setFeedback({ type: 'error', text: 'You can upload a maximum of 10 photos.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const data = new FormData();
    data.append('brcCode', brcCode);
    data.append('name', formData.name);
    data.append('date', formData.date);
    data.append('description', formData.description);
    data.append('teachersCount', formData.teachersCount);
    data.append('studentsCount', formData.studentsCount);
    data.append('status', status); // 'DRAFT' or 'SUBMITTED'
    
    data.append('venueType', venueType);
    let finalVenueValue = venueValue;
    if (venueType === 'SELECTED_BRC') finalVenueValue = brcCode;
    data.append('venueValue', finalVenueValue);

    photos.forEach(photo => {
      data.append('photos', photo);
    });

    try {
      if (existingEvent) {
        await api.put(`/events/${existingEvent.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/events', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setFeedback({ type: 'success', text: status === 'DRAFT' ? 'Report saved as draft!' : 'Report submitted successfully!' });
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to save report. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]">
        <div className="bg-primary px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl text-on-primary tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Attendance Tracker
            </h3>
            <p className="text-on-primary/80 text-sm">Report an event for {brcName}</p>
          </div>
          <button onClick={onClose} className="text-on-primary/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-grow">
          {feedback && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
              feedback.type === 'error' ? 'bg-error/10 text-error' : 'bg-green-100 text-green-700'
            }`}>
              <span className="material-symbols-outlined text-lg">
                {feedback.type === 'error' ? 'error' : 'check_circle'}
              </span>
              {feedback.text}
            </div>
          )}

          <form id="event-form" className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline/20 space-y-4">
              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Venue Type</label>
                <select 
                  value={venueType} 
                  onChange={(e) => {
                    setVenueType(e.target.value);
                    setVenueValue(e.target.value === 'SELECTED_BRC' ? brcCode : '');
                  }}
                  className="w-full bg-white border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none"
                >
                  <option value="SELECTED_BRC">Selected BRC ({brcName})</option>
                  <option value="OTHER_BRC">Other BRCs</option>
                  <option value="OTHER_VENUE">Other Venue</option>
                </select>
              </div>

              {venueType === 'OTHER_BRC' && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-bold text-secondary mb-1">Select Other BRC</label>
                  <select 
                    value={venueValue} 
                    onChange={(e) => setVenueValue(e.target.value)}
                    className="w-full bg-white border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none"
                  >
                    <option value="" disabled>Select a BRC...</option>
                    {allBrcs.filter(b => b.code !== brcCode).map(b => (
                      <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {venueType === 'OTHER_VENUE' && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-bold text-secondary mb-1">Custom Venue Name</label>
                  <input 
                    type="text" 
                    value={venueValue}
                    onChange={(e) => setVenueValue(e.target.value)}
                    list="venue-suggestions"
                    placeholder="Type venue name (e.g. CUSAT)"
                    className="w-full bg-white border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none"
                  />
                  <datalist id="venue-suggestions">
                    <option value="CUSAT" />
                    <option value="DPO" />
                  </datalist>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Event Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Event Date</label>
                <input required name="date" value={formData.date} onChange={handleChange} type="date" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-secondary mb-1">Description</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} placeholder="Briefly describe the topics covered and overall attendance..." className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none resize-none h-24" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Number of Teachers Attended</label>
                <input required name="teachersCount" value={formData.teachersCount} onChange={handleChange} type="number" min="0" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Number of Students Attended</label>
                <input required name="studentsCount" value={formData.studentsCount} onChange={handleChange} type="number" min="0" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
              </div>
            </div>

            <div className="pt-4 border-t border-outline/10">
              <label className="block text-sm font-bold text-secondary mb-1">Event Photos (Up to 10)</label>
              {existingEvent && existingEvent.photos && existingEvent.photos.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-secondary mb-2">Previously Uploaded Photos:</p>
                  <div className="flex gap-2 flex-wrap">
                    {existingEvent.photos.map((photo, idx) => (
                      <div key={idx} className="w-16 h-16 rounded-lg bg-surface-container-high overflow-hidden border border-outline/20">
                        <img src={`http://localhost:5000${photo}`} alt="Uploaded" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <input type="file" multiple accept="image/*" onChange={handlePhotoChange} className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              {photos.length > 0 && (
                <p className="text-xs text-secondary mt-2 font-medium">{photos.length} new file(s) selected.</p>
              )}
            </div>
          </form>
        </div>

        <div className="bg-surface-container-low px-8 py-5 flex justify-end gap-4 shrink-0 border-t border-outline/10">
          <button onClick={(e) => handleSubmit(e, 'DRAFT')} disabled={loading} className="px-6 py-2 rounded-xl text-primary border border-primary hover:bg-primary/5 transition-colors font-bold disabled:opacity-50">
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button onClick={(e) => handleSubmit(e, 'SUBMITTED')} disabled={loading} className="px-8 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50">
            {loading ? 'Processing...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
