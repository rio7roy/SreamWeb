import React, { useState, useEffect } from 'react';
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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get(`/events?brcCode=${brcCode}`);
        // Only show events that are SUBMITTED and don't already have a PDF report
        const submittedEvents = res.data.filter(e => !e.reportPdf);
        setEvents(submittedEvents);
      } catch (err) {
        console.error("Failed to fetch events", err);
        setFeedback({ type: 'error', text: 'Failed to load events.' });
      } finally {
        setFetching(false);
      }
    };
    fetchEvents();
  }, [brcCode]);

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
    if (!selectedEventId) {
      setFeedback({ type: 'error', text: 'Please select an event.' });
      return;
    }
    if (!pdfFile) {
      setFeedback({ type: 'error', text: 'Please select a PDF file to upload.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const data = new FormData();
    data.append('reportPdf', pdfFile);

    try {
      await api.post(`/events/${selectedEventId}/report`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFeedback({ type: 'success', text: 'PDF Report uploaded successfully!' });
      setTimeout(() => {
        onRefresh();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to upload PDF", err);
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to upload PDF report.' });
      setLoading(false);
    }
  };

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
              Attach a detailed PDF report to a submitted event
            </p>
          </div>
          <button onClick={handleClose} className="w-10 h-10 bg-white border border-outline/20 rounded-full flex items-center justify-center text-secondary hover:text-error hover:border-error/30 hover:bg-error/5 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1">
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
          ) : events.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-outline/20 rounded-xl">
              <span className="material-symbols-outlined text-secondary text-4xl mb-2">event_busy</span>
              <p className="text-secondary font-medium">No submitted events found without a PDF report.</p>
              <p className="text-xs text-secondary mt-1">Submit a new event attendance first.</p>
            </div>
          ) : (
            <form id="pdf-form" className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-bold text-secondary mb-2">Select Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline/20 rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
                >
                  <option value="">-- Choose an Event --</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>
                      {new Date(e.date || e.createdAt).toLocaleDateString()} - {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-2">Upload PDF File</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary/20"
                />
                {pdfFile && <p className="text-xs text-primary mt-2 font-bold">{pdfFile.name}</p>}
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
            disabled={loading || events.length === 0 || !selectedEventId || !pdfFile}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-sm">cloud_upload</span>
            )}
            Upload Report
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
