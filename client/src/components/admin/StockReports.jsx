import React, { useState } from 'react';
import api from '../../lib/api';

export default function StockReports() {
  const [filters, setFilters] = useState({
    district: '',
    brc: '',
    status: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);

  const handleDownload = async (format) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      params.append('format', format);

      // Download CSV
      const response = await api.get(`/api/stocks/reports/download?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
      <h2 className="text-xl font-semibold mb-4">Stock Reports</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
          <input 
            type="text" 
            placeholder="e.g. North District"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.district}
            onChange={(e) => setFilters({...filters, district: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">BRC</label>
          <input 
            type="text" 
            placeholder="e.g. Block A"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.brc}
            onChange={(e) => setFilters({...filters, brc: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select 
            className="w-full border rounded px-3 py-2 text-sm bg-white"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DEFECTIVE">Defective</option>
            <option value="IN_REPAIR">In Repair</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <input 
            type="text" 
            placeholder="e.g. Equipment"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => handleDownload('csv')}
          disabled={loading}
          className="bg-brand-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-brand-700 disabled:opacity-50 flex items-center"
        >
          {loading ? 'Processing...' : 'Filter-Download (CSV)'}
        </button>
        <button 
          onClick={() => handleDownload('pdf')}
          disabled={loading}
          className="bg-slate-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-slate-700 disabled:opacity-50 flex items-center"
        >
          {loading ? 'Processing...' : 'Download PDF'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-4">
        * Note: "Download PDF" currently downloads the raw JSON response as the PDF generator is not fully integrated yet.
      </p>
    </div>
  );
}
