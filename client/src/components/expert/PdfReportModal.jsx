import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

export default function PdfReportModal({ brcCode, onClose, onRefresh }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // New states for search and new event creation
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const dropdownRef = useRef(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get(`/events?brcCode=${brcCode}`);
        // Only show events that don't already have a PDF report
        const availableEvents = res.data.filter(e => !e.reportPdf);
        setEvents(availableEvents);
      } catch (err) {
        console.error("Failed to fetch events", err);
        setFeedback({ type: 'error', text: 'Failed to load events.' });
      } finally {
        setFetching(false);
      }
    };
    fetchEvents();
  }, [brcCode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setFeedback({ type: 'error', text: 'Please select a valid PDF file.' });
        setPdfFile(null);
        e.target.value = ''; // Reset input
        return;
      }
      setPdfFile(file);
      setFeedback(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'existing' && !selectedEventId) {
      setFeedback({ type: 'error', text: 'Please select an event.' });
      return;
    }
    if (mode === 'new' && !newEventName.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a name for the new event.' });
      return;
    }
    if (!pdfFile) {
      setFeedback({ type: 'error', text: 'Please select a PDF file to upload.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      let targetEventId = selectedEventId;

      // If creating a new event, create it first
      if (mode === 'new') {
        const eventRes = await api.post('/events', {
          brcCode,
          name: newEventName,
          date: newEventDate,
          status: 'SUBMITTED'
        });
        targetEventId = eventRes.data.data.id;
      }

      // Upload the PDF report
      const data = new FormData();
      data.append('reportPdf', pdfFile);

      await api.post(`/events/${targetEventId}/report`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setFeedback({ type: 'success', text: 'PDF Report uploaded successfully!' });
      setTimeout(() => {
        onRefresh();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to process request", err);
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to upload PDF report.' });
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const modalContent = (
    <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosing ? 'animate-fade-out-down' : 'animate-fade-in-up'}`}>
        {/* Header */}
        <div className="bg-surface-container-low px-8 py-6 border-b border-outline/10 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">upload_file</span>
              Upload PDF Report
            </h2>
            <p className="text-sm text-secondary mt-1 font-medium tracking-wide">
              Attach a detailed PDF report to an event
            </p>
          </div>
          <button onClick={handleClose} className="w-10 h-10 bg-white border border-outline/20 rounded-full flex items-center justify-center text-secondary hover:text-error hover:border-error/30 hover:bg-error/5 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {feedback && (
            <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-3 ${
              feedback.type === 'error' ? 'bg-error/10 text-error border border-error/20' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <span className="material-symbols-outlined">
                {feedback.type === 'error' ? 'error' : 'check_circle'}
              </span>
              {feedback.text}
            </div>
          )}

          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
            </div>
          ) : (
            <form id="pdf-form" className="space-y-6" onSubmit={handleSubmit}>
              
              {/* Mode Selection */}
              <div className="flex p-1 bg-surface-container-low rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('existing')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'existing' ? 'bg-white shadow-sm text-primary' : 'text-secondary hover:bg-white/50'}`}
                >
                  Search Existing Event
                </button>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'new' ? 'bg-white shadow-sm text-primary' : 'text-secondary hover:bg-white/50'}`}
                >
                  Create New Event
                </button>
              </div>

              {/* Dynamic Form Content */}
              {mode === 'existing' ? (
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-sm font-bold text-secondary mb-2">Search Event</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input
                      type="text"
                      placeholder="Type to search events..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                        setSelectedEventId('');
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full bg-surface-container-high border border-outline/20 rounded-xl pl-10 pr-4 py-3 text-on-surface focus:border-primary outline-none"
                    />
                  </div>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-outline/20 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredEvents.length === 0 ? (
                        <div className="p-4 text-center text-sm text-secondary">No matching events found.</div>
                      ) : (
                        filteredEvents.map(e => (
                          <div
                            key={e.id}
                            onClick={() => {
                              setSelectedEventId(e.id);
                              setSearchTerm(e.name);
                              setIsDropdownOpen(false);
                            }}
                            className={`p-3 hover:bg-primary/5 cursor-pointer border-b border-outline/5 last:border-0 ${selectedEventId === e.id ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface'}`}
                          >
                            <div className="text-sm">{e.name}</div>
                            <div className="text-xs text-secondary mt-1">{new Date(e.date || e.createdAt).toLocaleDateString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2">New Event Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Science Fair 2026"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className="w-full bg-surface-container-high border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2">Event Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full bg-surface-container-high border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-secondary mb-2">Upload PDF File</label>
                <div className="border-2 border-dashed border-outline/30 rounded-xl p-4 bg-surface-container-lowest text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary/20 cursor-pointer"
                  />
                  {pdfFile && <p className="text-xs text-primary mt-3 font-bold bg-primary/5 py-2 rounded-lg">{pdfFile.name}</p>}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low px-8 py-5 border-t border-outline/10 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-bold text-secondary hover:bg-white border border-transparent hover:border-outline/20 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (mode === 'existing' && !selectedEventId) || (mode === 'new' && !newEventName) || !pdfFile}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-sm">cloud_upload</span>
            )}
            {mode === 'new' ? 'Create & Upload' : 'Upload Report'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
