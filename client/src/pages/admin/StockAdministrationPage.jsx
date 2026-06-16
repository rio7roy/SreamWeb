import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import api from '../../lib/api';
import StockManagementModal from '../../components/expert/StockManagementModal';

export default function StockAdministrationPage() {
  const [brcs, setBrcs] = useState([]);
  const [selectedBrcCode, setSelectedBrcCode] = useState('');

  useEffect(() => {
    api.get('/brcs')
      .then(res => setBrcs(res.data))
      .catch(console.error);
  }, []);

  const selectedBrcName = brcs.find(b => b.code === selectedBrcCode)?.name || selectedBrcCode;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-100 rounded-xl">
            <Layers className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Stock Administration</h1>
            <p className="text-slate-500">Select a Hub to view and manage its stock items.</p>
          </div>
        </div>

        {/* BRC Selector */}
        <div className="relative w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-brand-600 text-sm">
            biotech
          </span>
          <select
            value={selectedBrcCode}
            onChange={(e) => setSelectedBrcCode(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all appearance-none cursor-pointer shadow-sm font-medium"
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
      </div>

      <div className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[75vh]">
        {selectedBrcCode ? (
          <StockManagementModal
            brcCode={selectedBrcCode}
            brcName={selectedBrcName}
            onClose={() => setSelectedBrcCode('')}
            inline={true}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[50vh]">
            <span className="material-symbols-outlined text-6xl mb-4 text-slate-200">
              inventory_2
            </span>
            <p className="text-lg font-medium text-slate-500">No Hub Selected</p>
            <p className="text-sm">Please select a BRC hub from the dropdown above to manage its stock.</p>
          </div>
        )}
      </div>
    </div>
  );
}
