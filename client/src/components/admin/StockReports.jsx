import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function StockReports() {
  const [filters, setFilters] = useState({
    district: '',
    brc: '',
    status: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  useEffect(() => {
    fetchReportData();
  }, [filters, sortConfig]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      if (filters.district) params.append('district', filters.district);
      if (filters.brc) params.append('brc', filters.brc);

      const response = await api.get(`/stocks?${params.toString()}&limit=1000`); // fetch up to 1000 for report view
      if (response.data?.success) {
        let fetchedData = response.data.data.stocks || [];
        if (sortConfig.key) {
          fetchedData.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
        setStocks(fetchedData);
      }
    } catch (err) {
      console.error('Failed to fetch report data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDownload = async (format) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      params.append('format', format);
      if (filters.district) params.append('district', filters.district);
      if (filters.brc) params.append('brc', filters.brc);

      const response = await api.get(`/stocks/reports/download?${params.toString()}`, {
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

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => handleDownload('csv')}
          disabled={loading}
          className="bg-primary text-on-primary px-4 py-2 rounded font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center"
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

      <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {['itemName', 'category', 'serialNumber', 'quantity', 'brc', 'status'].map((col) => (
                  <th 
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 bg-slate-50"
                  >
                    {col.replace(/([A-Z])/g, ' $1').trim()}
                    {sortConfig.key === col && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading && stocks.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Loading report data...</td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">No stock found matching filters.</td></tr>
              ) : (
                stocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{stock.itemName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.serialNumber || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.brc || stock.district}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        stock.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        stock.status === 'DEFECTIVE' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {stock.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4">
        * Note: "Download PDF" currently downloads the raw JSON response as the PDF generator is not fully integrated yet.
      </p>
    </div>
  );
}
