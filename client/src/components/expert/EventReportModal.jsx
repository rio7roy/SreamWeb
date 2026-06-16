import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

export default function EventReportModal({ brcCode, brcName, existingEvent, isReadOnly, onClose, onRefresh, defaultTag = '', venueType = 'SELECTED_BRC', venueValue = null }) {
  const actualVenueValue = venueValue || brcCode;
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    teachersCount: 0,
    studentsCount: 0,
    tag: defaultTag,
    customTag: '',
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [location, setLocation] = useState(existingEvent?.latitude && existingEvent?.longitude ? { lat: existingEvent.latitude, lng: existingEvent.longitude, timestamp: existingEvent.locationTimestamp || existingEvent.createdAt } : null);
  const [locationStatus, setLocationStatus] = useState(existingEvent?.latitude ? 'captured' : 'idle');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    if (!isReadOnly && !existingEvent && 'geolocation' in navigator) {
      setLocationStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: position.timestamp
          });
          setLocationStatus('captured');
        },
        (error) => {
          console.error("Location error:", error);
          setLocationStatus('error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [existingEvent]);

  useEffect(() => {
    if (existingEvent) {
      setFormData({
        name: existingEvent.name || '',
        date: existingEvent.date || '',
        description: existingEvent.description || '',
        teachersCount: existingEvent.teachersCount || 0,
        studentsCount: existingEvent.studentsCount || 0,
        tag: existingEvent.tag || '',
        customTag: existingEvent.customTag || '',
      });
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
    if (photos.length > 1) {
      setFeedback({ type: 'error', text: 'You can upload a maximum of 1 photo.' });
      return;
    }

    if (status === 'SUBMITTED') {
      if (locationStatus !== 'captured' || !location) {
        setFeedback({ type: 'error', text: 'GPS location is required before submitting the attendance report.' });
        return;
      }
      
      const { name, date, description, tag, customTag } = formData;
      if (!name || !date || !description || !tag || (tag === 'other event' && !customTag)) {
        setFeedback({ type: 'error', text: 'Please fill out all required fields before submitting.' });
        return;
      }

      if (photos.length === 0 && (!existingEvent || !existingEvent.photos || existingEvent.photos.length === 0)) {
        setFeedback({ type: 'error', text: 'Please upload a photo for the event report.' });
        return;
      }
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
    data.append('venueValue', actualVenueValue);

    if (location) {
      data.append('latitude', location.lat);
      data.append('longitude', location.lng);
      if (location.timestamp) {
        data.append('locationTimestamp', location.timestamp);
      }
    }


    if (formData.tag) {
      data.append('tag', formData.tag);
      if (formData.tag === 'other event') {
        data.append('customTag', formData.customTag);
      }
    }

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
      
      setFeedback({ 
        type: 'success', 
        text: status === 'SUBMITTED' ? 'Report submitted successfully!' : 'Draft saved. It will be automatically deleted after 24 hours.' 
      });
      setTimeout(() => {
        onRefresh();
        handleClose();
      }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to save report. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={handleClose}></div>
      <div className={`relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isClosing ? 'animate-fade-out-down' : 'animate-fade-in-up'}`}>
        <div className="bg-primary px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl text-on-primary tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Attendance Tracker
            </h3>
            <p className="text-on-primary/80 text-sm">Report an event for {brcName}</p>
          </div>
          <button onClick={handleClose} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-primary transition-colors">
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
            <fieldset disabled={isReadOnly} className="space-y-6">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              locationStatus === 'captured' ? 'bg-green-50 border-green-200' :
              locationStatus === 'locating' ? 'bg-amber-50 border-amber-200' :
              'bg-surface-container-low border-outline/20'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  locationStatus === 'captured' ? 'bg-green-100 text-green-600' :
                  locationStatus === 'locating' ? 'bg-amber-100 text-amber-600' :
                  'bg-surface-container-high text-secondary'
                }`}>
                  <span className={`material-symbols-outlined ${locationStatus === 'locating' ? 'animate-spin' : ''}`}>
                    {locationStatus === 'captured' ? 'my_location' : 
                     locationStatus === 'locating' ? 'sync' : 'location_disabled'}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-on-surface">GPS Location Tracker</p>
                  <p className="text-xs font-medium text-secondary">
                    {locationStatus === 'captured' ? (
                      <>
                        Captured: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        {location.timestamp && (
                          <span className="block text-[10px] mt-0.5 opacity-80 font-mono">
                            GPS Timestamp: {new Date(!isNaN(Number(location.timestamp)) ? Number(location.timestamp) : location.timestamp).toLocaleString()}
                          </span>
                        )}
                      </>
                    ) : locationStatus === 'locating' ? 'Acquiring GPS coordinates...' : 'Location could not be captured'}
                  </p>
                </div>
              </div>
              {locationStatus === 'error' && !isReadOnly && (
                <button 
                  type="button"
                  onClick={() => {
                    setLocationStatus('locating');
                    navigator.geolocation.getCurrentPosition(
                      (pos) => { 
                        setLocation({ 
                          lat: pos.coords.latitude, 
                          lng: pos.coords.longitude,
                          timestamp: pos.timestamp
                        }); 
                        setLocationStatus('captured'); 
                      },
                      () => setLocationStatus('error'),
                      { enableHighAccuracy: true, timeout: 10000 }
                    );
                  }}
                  className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-secondary mb-1">Event Tag</label>
                  <select
                    name="tag"
                    value={formData.tag}
                    onChange={handleChange}
                    className="w-full bg-surface-container-high border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
                  >
                    <option value="">Select a tag...</option>
                    <option value="students program">Students Program</option>
                    <option value="training for teachers">Training for Teachers</option>
                    <option value="hub visit">Hub Visit</option>
                    <option value="other field visit">Other Field Visit</option>
                    <option value="arrangement/data collection">Arrangement / Data Collection</option>
                    <option value="meeting/discussion">Meeting / Discussion</option>
                    <option value="other event">Other Event</option>
                  </select>
                </div>

                {formData.tag === 'other event' && (
                  <div className="md:col-span-2 animate-fade-in-up">
                    <label className="block text-sm font-bold text-secondary mb-1">Custom Tag</label>
                    <input 
                      type="text" 
                      name="customTag"
                      value={formData.customTag}
                      onChange={handleChange}
                      placeholder="Specify event type"
                      className="w-full bg-surface-container-high border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
                    />
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
                <input required name="date" value={formData.date} onChange={handleChange} type="date" max={new Date().toISOString().split('T')[0]} className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
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
              <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-secondary mb-1">Upload Photo (Max 1)</label>
                  <input 
                    type="file" 
                    multiple={false}
                    accept="image/*" 
                    onChange={handlePhotoChange}
                    className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary/20"
                  />
                  {photos.length > 0 && <p className="text-xs text-primary mt-2">{photos.length} photo selected.</p>}
                  {existingEvent && existingEvent.photos && existingEvent.photos.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-secondary mb-2">Previously Uploaded Photos:</p>
                      <div className="flex gap-2 flex-wrap">
                        {existingEvent.photos.map((photo, idx) => (
                          <div key={idx} className="w-16 h-16 rounded-lg bg-surface-container-high overflow-hidden border border-outline/20">
                            <img src={`${import.meta.env.VITE_API_URL || '/api'}${photo}`} alt="Uploaded" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
            </fieldset>
          </form>
        </div>

        <div className="bg-surface-container-low px-8 py-5 flex justify-end gap-4 shrink-0 border-t border-outline/10">
          {isReadOnly ? (
            <button type="button" onClick={handleClose} className="px-8 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90 transition-all">
              Close
            </button>
          ) : (
            <>
              <button type="button" onClick={(e) => handleSubmit(e, 'DRAFT')} disabled={loading} className="px-6 py-2 rounded-xl text-primary border border-primary hover:bg-primary/5 transition-colors font-bold disabled:opacity-50">
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button 
                type="button"
                onClick={(e) => handleSubmit(e, 'SUBMITTED')} 
                disabled={
                  loading || 
                  locationStatus !== 'captured' || 
                  !formData.name || 
                  !formData.date || 
                  !formData.description || 
                  !formData.tag || 
                  (formData.tag === 'other event' && !formData.customTag) ||
                  (photos.length === 0 && (!existingEvent || !existingEvent.photos || existingEvent.photos.length === 0))
                } 
                className="px-8 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Submit Report'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
