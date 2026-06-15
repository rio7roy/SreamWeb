import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function StockMonitoring({ viewType }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  useEffect(() => {
    fetchStocks();
  }, [filters, sortConfig, viewType]);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      
      const response = await api.get(`/api/stocks?${params.toString()}`);
      if (response.data?.success) {
        let fetchedData = response.data.data.stocks || [];
        
        // Sorting logic client-side for simplicity in demo
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
      console.error('Failed to fetch stocks', err);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {viewType === 'district' ? 'District Wise Monitoring' : 'BRC Wise Monitoring'}
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search Item or Serial..."
            className="border rounded px-3 py-1 text-sm"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select 
            className="border rounded px-3 py-1 text-sm bg-white"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DEFECTIVE">Defective</option>
            <option value="IN_REPAIR">In Repair</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['itemName', 'category', 'serialNumber', 'quantity', viewType, 'status'].map((col) => (
                  <th 
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    {col.replace(/([A-Z])/g, ' $1').trim()}
                    {sortConfig.key === col && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Loading stocks...</td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">No stock found matching filters.</td></tr>
              ) : (
                stocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{stock.itemName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.serialNumber || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{viewType === 'district' ? stock.district : stock.brc}</td>
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
    </div>
  );
}
