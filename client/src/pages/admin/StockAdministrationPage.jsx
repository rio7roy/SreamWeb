import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import StockMonitoring from '../../components/admin/StockMonitoring';
import StockForms from '../../components/admin/StockForms';
import StockReports from '../../components/admin/StockReports';

export default function StockAdministrationPage() {
  const [activeTab, setActiveTab] = useState('monitoring'); // monitoring, operations, reports
  const [monitoringView, setMonitoringView] = useState('district'); // district, brc

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
      </div>
    </div>
  );
}
