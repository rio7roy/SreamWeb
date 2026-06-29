import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function StockMonitoring() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', district: '', brc: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [brcs, setBrcs] = useState([]);
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    api.get('/brcs').then(res => {
      setBrcs(res.data);
      const uniqueDistricts = [...new Set(res.data.map(b => b.district))].filter(Boolean);
      setDistricts(uniqueDistricts);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [filters, sortConfig]);

  const fetchStocks = async () => {
    // No restriction on district or brc anymore

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100000'); // Fetch enough stocks so changes aren't paginated out
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.district) params.append('district', filters.district);
      if (filters.brc) params.append('brc', filters.brc);
      
      const response = await api.get(`/stocks?${params.toString()}`);
      if (response.data?.success) {
        let fetchedData = response.data.data.stocks || [];
        
        fetchedData = fetchedData.filter(stock => {
          const original = Number(stock.newQty ?? stock.quantity ?? 0);
          const current = stock.availableQty !== undefined ? Number(stock.availableQty) : original;
          
          // Consider "newly added" if created within the last 24 hours
          const isRecentlyAdded = (new Date() - new Date(stock.createdAt)) < 24 * 60 * 60 * 1000;
          
          return (
            isRecentlyAdded ||
            Number(stock.damagedQty || 0) > 0 || 
            Number(stock.usedQty || 0) > 0 || 
            Number(stock.consumedQty || 0) > 0 ||
            (stock.status && stock.status !== 'ACTIVE') ||
            current !== original
          );
        });

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
        <h2 className="text-xl font-semibold">Hub Stocks Monitoring</h2>
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
            value={filters.district}
            onChange={(e) => setFilters({ ...filters, district: e.target.value, brc: '' })}
          >
            <option value="">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            className="border rounded px-3 py-1 text-sm bg-white max-w-[200px]"
            value={filters.brc}
            onChange={(e) => {
              const selectedBrcCode = e.target.value;
              if (selectedBrcCode) {
                const brcObj = brcs.find(b => b.code === selectedBrcCode);
                setFilters({ ...filters, brc: selectedBrcCode, district: brcObj ? brcObj.district : filters.district });
              } else {
                setFilters({ ...filters, brc: '' });
              }
            }}
          >
            <option value="">All BRCs</option>
            {brcs
              .filter(b => !filters.district || b.district === filters.district)
              .map(b => <option key={b.code} value={b.code}>{b.location}/{b.name}</option>)}
          </select>
          <select 
            className="border rounded px-3 py-1 text-sm bg-white"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="AVAILABLE">Available</option>
            <option value="DAMAGED">Damaged</option>
            <option value="USED">Used</option>
            <option value="CONSUMED">Consumed</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['itemName', 'category', 'uniqueId', 'availableQty', 'damagedQty', 'usedQty', 'consumedQty', 'district', 'brc', 'status'].map((col) => (
                  <th 
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  >
                    {col === 'brc' ? 'BRC / School Name' : col.replace(/([A-Z])/g, ' $1').trim()}
                    {sortConfig.key === col && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="10" className="text-center py-8 text-slate-500">Loading stocks...</td></tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-500 font-medium">
                    No stock found matching filters.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{stock.itemName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.uniqueId || stock.serialNumber || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <span className="font-medium text-slate-900">{stock.availableQty !== undefined ? stock.availableQty : (stock.newQty ?? stock.quantity)}</span>
                      <span className="text-slate-400 text-xs ml-1">/ {stock.newQty ?? stock.quantity ?? 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{stock.damagedQty || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{stock.usedQty || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">{stock.consumedQty || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.district || 'NA'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {(() => {
                        if (!stock.brc) return 'NA';
                        const found = brcs.find(b => b.code === stock.brc);
                        return found ? `${found.location}/${found.name}` : stock.brc;
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        stock.status === 'ACTIVE' || stock.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                        stock.status === 'DAMAGED' || stock.status === 'DEFECTIVE' ? 'bg-red-100 text-red-800' :
                        stock.status === 'USED' ? 'bg-blue-100 text-blue-800' :
                        stock.status === 'CONSUMED' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-800'
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
