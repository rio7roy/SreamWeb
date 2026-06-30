import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentMonthIndex = new Date().getMonth();

export default function StockReports() {
  const [filters, setFilters] = useState({
    district: '',
    brc: '',
    status: '',
    category: '',
    month: MONTHS[currentMonthIndex]
  });
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [brcs, setBrcs] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (label, currentState) => {
    setExpandedGroups(prev => ({
      ...prev,
      [label]: !currentState
    }));
  };

  const CATEGORIES = [
    "Adhesive and tapes", "Art and craft supplies", "Audio and Visual equipment",
    "Audio and Visual tools", "Batteries and accessaries", "Cables and Connectors",
    "Chem", "Cleaning Supplies", "Cutting and shaping tools", "Development Boards",
    "Digital fabrication", "Electronic components", "Electronic modules",
    "Essentials", "Fasteners", "Hand tools", "LED bulb kit", "Lab apparatus",
    "Laboratory instrument", "Motors and wheels", "Plumbing Kit",
    "Prototyping materials", "Safety items", "Sensor modules", "Sewing kit",
    "Soldering kit", "Tools"
  ];

  useEffect(() => {
    api.get('/brcs').then(res => {
      setBrcs(res.data);
      const uniqueDistricts = [...new Set(res.data.map(b => b.district))].filter(Boolean);
      setDistricts(uniqueDistricts);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [filters, sortConfig]);

  const fetchReportData = async () => {
    // No restriction on brc anymore
    setLoading(true);
    try {
      // filters object already contains district, brc, status, category, month
      // Clean up empty filters before sending
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const params = new URLSearchParams(cleanFilters);

      const response = await api.get(`/stocks?${params.toString()}&limit=100000`); // fetch up to 100000 for report view
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

  const groupedStocks = React.useMemo(() => {
    const groups = {};
    
    // First, pre-populate the groups in the exact order of the BRCs list
    // Only include BRCs for the selected district, or all if no district is selected
    const relevantBrcs = brcs.filter(b => !filters.district || b.district === filters.district);
    
    // If a specific BRC is selected, only show that one
    let targetBrcs = relevantBrcs;
    if (filters.brc) {
      const [bCode, bDist] = filters.brc.split('|');
      targetBrcs = relevantBrcs.filter(b => b.code === bCode && b.district === bDist);
    }
    
    targetBrcs.forEach((b, idx) => {
      const key = `${b.district} ➔ ${b.location} / ${b.name}`;
      groups[key] = {
        items: [],
        orderIndex: idx // This guarantees dropdown order
      };
    });

    // Then, add the stock items to their respective groups
    if (stocks && stocks.length > 0) {
      stocks.forEach(stock => {
        const b = brcs.find(x => x.code === stock.brc && x.district === stock.district);
        const brcLabel = b ? `${b.location} / ${b.name}` : (stock.brc || 'Unknown BRC');
        const key = `${stock.district || 'Unknown District'} ➔ ${brcLabel}`;
        
        if (!groups[key]) {
          groups[key] = {
            items: [],
            orderIndex: 999999
          };
        }
        groups[key].items.push(stock);
      });
    }

    return Object.keys(groups)
      .sort((a, b) => groups[a].orderIndex - groups[b].orderIndex)
      .map(key => ({
        label: key,
        items: groups[key].items
      }));
  }, [stocks, brcs]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDownload = async (format) => {
    // No restriction on brc anymore
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const params = new URLSearchParams(cleanFilters);
      params.append('format', format);

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
      
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
            value={filters.brc ? `${filters.brc}|${filters.district}` : ''}
            onChange={(e) => {
              const selectedValue = e.target.value;
              if (selectedValue) {
                const [selectedBrcCode, selectedDistrict] = selectedValue.split('|');
                setFilters({ ...filters, brc: selectedBrcCode, district: selectedDistrict || filters.district });
              } else {
                setFilters({ ...filters, brc: '' });
              }
            }}
          >
            <option value="">All BRCs</option>
            {brcs
              .filter(b => !filters.district || b.district === filters.district)
              .map((b, idx) => <option key={`${b.code}-${b.district}-${idx}`} value={`${b.code}|${b.district}`}>{b.location}/{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
          <select 
            className="w-full border rounded px-3 py-2 text-sm bg-white"
            value={filters.month}
            onChange={(e) => setFilters({...filters, month: e.target.value})}
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={m} disabled={idx > currentMonthIndex}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select 
            className="w-full border rounded px-3 py-2 text-sm bg-white"
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select 
            className="w-full border rounded px-3 py-2 text-sm bg-white"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="USED">Used</option>
            <option value="DAMAGED">Damaged</option>
            <option value="CONSUMED">Consumed</option>
          </select>
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
        <div className="overflow-x-auto max-h-[600px]">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                {['itemName', 'category', 'status', 'uniqueId', 'newQty', 'availableQty', 'district', 'brc', 'remarks'].map((col) => (
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
              {filters.month && MONTHS.indexOf(filters.month) < 5 ? (
                <tr><td colSpan="9" className="text-center py-8 text-red-500 font-medium">Stock not entered for this month.</td></tr>
              ) : loading && stocks.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-8 text-slate-500">Loading report data...</td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-8 text-slate-500">No stock found matching filters.</td></tr>
              ) : (
                groupedStocks.map((group) => {
                  // Default to collapsed unless only one group is shown or explicitly expanded
                  const defaultExpanded = groupedStocks.length === 1;
                  const isExpanded = expandedGroups[group.label] !== undefined 
                    ? expandedGroups[group.label] 
                    : defaultExpanded;

                  return (
                  <React.Fragment key={group.label}>
                    <tr>
                      <td 
                        colSpan="9" 
                        onClick={() => toggleGroup(group.label, isExpanded)}
                        className="bg-slate-200/60 hover:bg-slate-200/80 cursor-pointer font-semibold text-slate-800 py-3 px-6 text-sm border-y border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span>📍 {group.label} <span className="text-xs font-normal text-slate-500 ml-2">({group.items.length} items)</span></span>
                          <svg className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && group.items.length === 0 && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="9" className="px-6 py-4 text-center text-sm text-slate-400 italic">No stock data assigned to this BRC.</td>
                      </tr>
                    )}
                    {isExpanded && group.items.map((stock) => (
                      <tr key={stock.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 max-w-[200px] truncate" title={stock.itemName}>{stock.itemName}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 max-w-[150px] truncate" title={stock.category}>{stock.category}</td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.uniqueId || stock.serialNumber || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.newQty ?? stock.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{stock.availableQty !== undefined ? stock.availableQty : (stock.newQty ?? stock.quantity)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.district || 'NA'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{stock.brc || 'NA'}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate" title={stock.remarks}>{stock.remarks || '-'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                )})
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
