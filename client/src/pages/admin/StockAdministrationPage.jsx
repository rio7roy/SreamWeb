import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import api from '../../lib/api';
import StockMonitoring from '../../components/admin/StockMonitoring';
import StockForms from '../../components/admin/StockForms';
import StockReports from '../../components/admin/StockReports';
import StockManagementModal from '../../components/expert/StockManagementModal';

export default function StockAdministrationPage() {
  const [activeTab, setActiveTab] = useState('monitoring'); // monitoring, operations, reports, manage_hub
  const [monitoringView, setMonitoringView] = useState('district'); // district, brc
  const [brcs, setBrcs] = useState([]);
  const [selectedBrcCode, setSelectedBrcCode] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);

  useEffect(() => {
    api.get('/brcs')
      .then(res => setBrcs(res.data))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-100 rounded-xl">
          <Layers className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Administration</h1>
          <p className="text-slate-500">Monitor and manage ecosystem stocks across Districts and BRCs.</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'monitoring' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Monitoring
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'operations' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Operations (Add/Update)
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'reports' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab('manage_hub')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'manage_hub' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Manage Hub Stock
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'monitoring' && (
          <div className="space-y-4">
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={monitoringView === 'district'} 
                  onChange={() => setMonitoringView('district')} 
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-slate-700">District Wise</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={monitoringView === 'brc'} 
                  onChange={() => setMonitoringView('brc')} 
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-slate-700">BRC Wise</span>
              </label>
            </div>
            
            {/* key prop forces remount when view type changes, re-fetching data with proper columns */}
            <StockMonitoring key={monitoringView} viewType={monitoringView} />
          </div>
        )}

        {activeTab === 'operations' && (
          <StockForms />
        )}

        {activeTab === 'reports' && (
          <StockReports />
        )}

        {activeTab === 'manage_hub' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl">
            <h3 className="font-bold text-slate-900 text-lg mb-2">Manage Individual Hub Stock</h3>
            <p className="text-sm text-slate-500 mb-6">Select a STREAM Hub to open its dedicated stock management view.</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-brand-600 text-sm">
                  biotech
                </span>
                <select
                  value={selectedBrcCode}
                  onChange={(e) => setSelectedBrcCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select BRC Hub...</option>
                  {brcs.map(brc => (
                    <option key={brc.code} value={brc.code}>
                      {brc.name} ({brc.code})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                  arrow_drop_down
                </span>
              </div>
              <button
                onClick={() => setShowStockModal(true)}
                disabled={!selectedBrcCode}
                className="shrink-0 px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Manage Stock
              </button>
            </div>
          </div>
        )}
      </div>

      {showStockModal && selectedBrcCode && (
        <StockManagementModal
          brcCode={selectedBrcCode}
          brcName={brcs.find(b => b.code === selectedBrcCode)?.name || selectedBrcCode}
          onClose={() => setShowStockModal(false)}
        />
      )}
    </div>
  );
}
