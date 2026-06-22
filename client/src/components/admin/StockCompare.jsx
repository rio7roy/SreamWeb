import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentMonthIndex = new Date().getMonth();

export default function StockCompare() {
  const [filters, setFilters] = useState({
    district: '',
    brc: '',
    months: [MONTHS[currentMonthIndex]]
  });
  
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [brcs, setBrcs] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  useEffect(() => {
    api.get('/brcs').then(res => {
      setBrcs(res.data);
      const uniqueDistricts = [...new Set(res.data.map(b => b.district))].filter(Boolean);
      setDistricts(uniqueDistricts);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (filters.brc && filters.months.length > 0) {
      fetchComparisonData();
    } else {
      setStocks([]);
    }
  }, [filters.brc, filters.months]);

  const fetchComparisonData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.district) params.append('district', filters.district);
      if (filters.brc) params.append('brc', filters.brc);
      if (filters.months.length > 0) params.append('months', filters.months.join(','));

      const response = await api.get(`/stocks/compare?${params.toString()}`);
      if (response.data?.success) {
        setStocks(response.data.data.stocks || []);
      }
    } catch (error) {
      console.error("Failed to fetch comparison data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthToggle = (m) => {
    setFilters(prev => {
      const newMonths = prev.months.includes(m)
        ? prev.months.filter(x => x !== m)
        : [...prev.months, m];
      return { ...prev, months: newMonths };
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
      <h2 className="text-xl font-semibold mb-4">Compare Stock Consumption</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
          <select 
            className="w-full border rounded px-3 py-2 text-sm bg-white"
            value={filters.district}
            onChange={(e) => setFilters({...filters, district: e.target.value, brc: ''})}
          >
            <option value="">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">BRC</label>
          <select 
            className="w-full border rounded px-3 py-2 text-sm bg-white"
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
            <option value="" disabled>Select BRC</option>
            {brcs
              .filter(b => !filters.district || b.district === filters.district)
              .map(b => <option key={b.code} value={b.code}>{b.location}/{b.name}</option>)}
          </select>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">Months</label>
          <button 
            type="button"
            className="w-full border rounded px-3 py-2 text-sm bg-white text-left flex justify-between items-center"
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
          >
            <span className="truncate">
              {filters.months.length === 0 ? 'Select Months' : filters.months.join(', ')}
            </span>
            <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </button>
          
          {showMonthDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-60 overflow-auto">
              {MONTHS.map((m, idx) => (
                <label 
                  key={m} 
                  className={`flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer ${idx > currentMonthIndex ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input 
                    type="checkbox" 
                    className="mr-2"
                    checked={filters.months.includes(m)}
                    disabled={idx > currentMonthIndex}
                    onChange={() => handleMonthToggle(m)}
                  />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Category</th>
                {filters.months.map(m => (
                  <th key={m} className="px-6 py-3 text-left text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border-l border-blue-100">
                    {m} (Available Qty)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {!filters.brc ? (
                <tr><td colSpan={2 + filters.months.length} className="text-center py-8 text-slate-500">Please select a BRC to compare data.</td></tr>
              ) : filters.months.length === 0 ? (
                <tr><td colSpan={2 + filters.months.length} className="text-center py-8 text-slate-500">Please select at least one month.</td></tr>
              ) : loading && stocks.length === 0 ? (
                <tr><td colSpan={2 + filters.months.length} className="text-center py-8 text-slate-500">Loading comparison data...</td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan={2 + filters.months.length} className="text-center py-8 text-slate-500">No stock found for this BRC.</td></tr>
              ) : (
                stocks.map(stock => (
                  <tr key={stock.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 max-w-[200px] truncate" title={stock.itemName}>{stock.itemName}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-[150px] truncate" title={stock.category}>{stock.category}</td>
                    {filters.months.map(m => {
                      const qty = stock.history && stock.history[m] !== undefined ? stock.history[m] : 'N/A';
                      return (
                        <td key={m} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700 border-l border-slate-100">
                          {qty}
                        </td>
                      );
                    })}
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
