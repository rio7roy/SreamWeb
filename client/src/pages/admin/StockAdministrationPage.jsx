import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Activity, Settings, FileText, AlertTriangle, Bell, MessageSquare } from 'lucide-react';
import StockMonitoring from '../../components/admin/StockMonitoring';
import StockForms from '../../components/admin/StockForms';
import StockReports from '../../components/admin/StockReports';
import StockCompare from '../../components/admin/StockCompare';
import api from '../../lib/api';

export default function StockAdministrationPage() {
  const [activeTab, setActiveTab] = useState('monitoring'); // monitoring, management, reports, compare
  const [alerts, setAlerts] = useState([]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [unreadOutStockCount, setUnreadOutStockCount] = useState(0);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/admin/messages');
      if (res.data) {
        // Filter messages for System Alerts directed to ADMIN and only stock alerts
        const systemAlerts = res.data.filter(m => 
          m.to && m.to.includes('ADMIN') &&
          (m.type === 'LOW_STOCK_ALERT' || m.type === 'OUT_OF_STOCK_ALERT' || m.type === 'STOCK_REMARK')
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAlerts(systemAlerts.slice(0, 10)); // Keep latest 10
        
        const outOfStockUnread = systemAlerts.filter(m => m.type === 'OUT_OF_STOCK_ALERT' && !m.read);
        if (outOfStockUnread.length > 0) {
          setUnreadOutStockCount(outOfStockUnread.length);
          setShowPopupModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/admin/messages/${id}/read`);
      setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a));
      
      const updatedUnread = alerts.filter(m => m.type === 'OUT_OF_STOCK_ALERT' && !m.read && m.id !== id).length;
      if (updatedUnread === 0) setShowPopupModal(false);
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleDeleteMessage = async (id) => {
    try {
      await api.delete(`/admin/messages/${id}`);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  return (
    <>
      {/* POPUP MODAL FOR OUT OF STOCK */}
      {showPopupModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Out of Stock Alert!</h2>
            <p className="text-slate-600 mb-6">
              You have <strong className="text-red-600">{unreadOutStockCount}</strong> unread notifications indicating items are completely out of stock.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setShowPopupModal(false)}
                className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Dismiss
              </button>
              <button 
                onClick={() => {
                  setShowPopupModal(false);
                  setShowNotifications(true);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                View Alerts
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 relative transition-colors shadow-sm"
          >
            <Bell className="w-6 h-6 text-slate-600" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-[450px] bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">System Alerts</h3>
                {unreadAlertsCount > 0 && (
                  <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{unreadAlertsCount} unread</span>
                )}
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    No active stock alerts.
                  </div>
                ) : (
                  <div className="divide-y divide-white/50 bg-white">
                    {alerts.map(alert => {
                      const isOutOfStock = alert.type === 'OUT_OF_STOCK_ALERT';
                      const isRemark = alert.type === 'STOCK_REMARK';
                      const bgColor = isOutOfStock ? 'bg-red-600' : isRemark ? 'bg-blue-50' : 'bg-red-50';
                      const textColor = isOutOfStock ? 'text-white' : isRemark ? 'text-blue-900' : 'text-red-800';
                      const iconColor = isOutOfStock ? 'text-white' : isRemark ? 'text-blue-500' : 'text-red-500';
                      const opacity = alert.read ? 'opacity-70' : 'opacity-100';
                      const Icon = isRemark ? MessageSquare : AlertTriangle;
                      
                      return (
                        <div key={alert.id} className={`p-4 ${bgColor} transition-colors border-b border-red-200/50 ${opacity}`}>
                          <div className="flex gap-3 items-start justify-between">
                            <div className="flex gap-3 items-start">
                              <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
                              <div>
                                <p className={`font-medium text-sm ${textColor} whitespace-pre-wrap leading-relaxed`}>{alert.content}</p>
                                <p className={`text-xs mt-1 ${isOutOfStock ? 'text-red-100' : 'text-red-600/70'}`}>{new Date(alert.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0 items-end">
                              <button 
                                onClick={() => handleDeleteMessage(alert.id)}
                                className={`p-1 hover:bg-black/10 rounded-full transition-colors ${textColor}`}
                                title="Delete message"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                              
                              <div className="flex gap-2 mt-2">
                                {!alert.read && (
                                  <button 
                                    onClick={() => handleMarkAsRead(alert.id)}
                                    className={`px-2 py-1 bg-black/10 hover:bg-black/20 rounded text-[10px] font-bold uppercase transition-colors ${textColor}`}
                                  >
                                    Read
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    setShowNotifications(false);
                                    setActiveTab('management');
                                  }}
                                  className={`px-2 py-1 bg-white shadow-sm border border-red-200 text-red-700 hover:bg-slate-50 rounded text-[10px] font-bold uppercase transition-colors`}
                                >
                                  Manage
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
        <button
          className={`pb-3 px-6 font-medium text-sm flex items-center gap-2 ${activeTab === 'compare' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('compare')}
        >
          <Layers className="w-4 h-4" /> Compare
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[75vh]">
        {activeTab === 'monitoring' && (
          <div className="space-y-4">
            <StockMonitoring />
          </div>
        )}
        
        {activeTab === 'management' && (
          <StockForms onActionComplete={fetchAlerts} />
        )}

        {activeTab === 'reports' && (
          <StockReports />
        )}

        {activeTab === 'compare' && (
          <StockCompare />
        )}
      </div>
    </div>
    </>
  );
}
