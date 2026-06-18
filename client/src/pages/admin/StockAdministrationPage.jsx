import React, { useState, useEffect } from 'react';
import { Layers, Activity, Settings, FileText, AlertTriangle, Bell } from 'lucide-react';
import StockMonitoring from '../../components/admin/StockMonitoring';
import StockForms from '../../components/admin/StockForms';
import StockReports from '../../components/admin/StockReports';
import api from '../../lib/api';

export default function StockAdministrationPage() {
  const [activeTab, setActiveTab] = useState('monitoring'); // monitoring, management, reports
  const [monitoringView, setMonitoringView] = useState('brc'); // district, brc
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/admin/messages');
      if (res.data) {
        // Filter messages for System Alerts directed to ADMIN
        const systemAlerts = res.data.filter(m => 
          m.from === 'System Alerts' && 
          m.to && m.to.includes('ADMIN')
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAlerts(systemAlerts.slice(0, 5)); // Keep latest 5
      }
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Layers className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Stock Administration</h1>
            <p className="text-slate-500">Comprehensive overview and management of all hub stocks.</p>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shrink-0">
          <div className="flex items-center gap-2 mb-2 text-orange-800 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            <h3>Recent System Alerts</h3>
          </div>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="flex gap-3 text-sm bg-white p-3 rounded-lg border border-orange-100 shadow-sm items-center justify-between">
                <div className="flex gap-3 items-center">
                  <Bell className="w-4 h-4 text-orange-500 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">{alert.content}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('management')}
                  className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors whitespace-nowrap"
                >
                  Manage Stock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex border-b border-slate-200">
        <button
          className={`pb-3 px-6 font-medium text-sm flex items-center gap-2 ${activeTab === 'monitoring' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('monitoring')}
        >
          <Activity className="w-4 h-4" /> Monitoring
        </button>
        <button
          className={`pb-3 px-6 font-medium text-sm flex items-center gap-2 ${activeTab === 'management' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('management')}
        >
          <Settings className="w-4 h-4" /> Management
        </button>
        <button
          className={`pb-3 px-6 font-medium text-sm flex items-center gap-2 ${activeTab === 'reports' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText className="w-4 h-4" /> Reports
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[75vh]">
        {activeTab === 'monitoring' && (
          <div className="space-y-4">
            <div className="flex gap-4 mb-4 border-b border-slate-100 pb-4">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${monitoringView === 'district' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                onClick={() => setMonitoringView('district')}
              >
                District Wise
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${monitoringView === 'brc' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                onClick={() => setMonitoringView('brc')}
              >
                BRC Wise
              </button>
            </div>
            <StockMonitoring viewType={monitoringView} />
          </div>
        )}
        
        {activeTab === 'management' && (
          <StockForms onActionComplete={fetchAlerts} />
        )}

        {activeTab === 'reports' && (
          <StockReports />
        )}
      </div>
    </div>
  );
}
