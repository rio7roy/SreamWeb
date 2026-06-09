import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';

export default function ReportsPage() {
  const [brcs, setBrcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBrc, setSelectedBrc] = useState('');

  useEffect(() => {
    api.get('/brcs')
      .then(res => setBrcs(res.data || []))
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

  const handleDownloadExcel = () => {
    let url = '/api/events/export/excel';
    const params = new URLSearchParams();
    if (selectedDistrict) params.append('district', selectedDistrict);
    if (selectedBrc) params.append('brcCode', selectedBrc);
    
    if (params.toString()) {
      url += '?' + params.toString();
    }

    // Include auth token in download request via native fetch and object URL
    const token = localStorage.getItem('stream_token');
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to download');
      return res.blob();
    })
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'Event_Reports.xlsx';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <h1 className="text-3xl font-black text-on-surface tracking-tight mb-6" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        Reports
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Existing User Reports */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">group</span>
            User Reports
          </h2>
          <a
            href="/api/reports/users/excel"
            className="block bg-white border border-black/[0.04] rounded-2xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-xl flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-2xl">table_chart</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">User Report (Excel)</h3>
            <p className="text-secondary text-sm">Download a complete user list as an Excel spreadsheet.</p>
          </a>
          <a
            href="/api/reports/users/pdf"
            className="block bg-white border border-black/[0.04] rounded-2xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-red-100 text-red-700 rounded-xl flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">User Report (PDF)</h3>
            <p className="text-secondary text-sm">Download a formatted PDF report of all user data.</p>
          </a>
        </div>

        {/* Event Reports */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">event_note</span>
            Event Reports
          </h2>
          <div className="bg-white border border-black/[0.04] rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 bg-primary-container/20 text-primary rounded-xl flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-2xl">analytics</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Events & Sessions (Excel)</h3>
            <p className="text-secondary text-sm mb-6">Download a spreadsheet of all STREAM Hub events and submitted session logs.</p>
            
            <div className="space-y-4">
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
                    <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleDownloadExcel}
                className="w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-lg transition-all"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download Excel Sheet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
