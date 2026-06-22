import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';

export default function BroadcastLogsTab() {
  const [messages, setMessages] = useState([]);
  const [allBrcs, setAllBrcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTarget, setFilterTarget] = useState('ALL_TARGETS');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [msgRes, brcRes] = await Promise.all([
        api.get('/admin/messages'),
        api.get('/brcs').catch(() => ({ data: [] }))
      ]);
      if (msgRes.data) {
        const sentMessages = msgRes.data.filter(msg => {
          const toArray = Array.isArray(msg.to) ? msg.to : (msg.to ? [msg.to] : []);
          return !toArray.includes('ADMIN');
        });
        setMessages(sentMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
      if (brcRes.data) {
        setAllBrcs(brcRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (targetCode) => {
    let cleanCode = targetCode;
    if (targetCode.startsWith('BRC:')) {
      cleanCode = targetCode.split(':')[1];
    }
    const brc = allBrcs.find(b => b.code === cleanCode);
    return brc ? brc.location + '/' + brc.name : targetCode;
  };

  const uniqueTargets = useMemo(() => {
    const targets = new Set();
    messages.forEach(msg => {
      if (Array.isArray(msg.to)) {
        msg.to.forEach(t => targets.add(t));
      }
    });
    return Array.from(targets).sort();
  }, [messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (filterTarget !== 'ALL_TARGETS') {
        if (!msg.to || !Array.isArray(msg.to)) return false;
        
        const targetQuery = filterTarget.toLowerCase();
        const matchesTarget = msg.to.some(t => t.toLowerCase().includes(targetQuery));
        if (!matchesTarget) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesContent = msg.content?.toLowerCase().includes(query);
        const matchesSender = msg.from?.toLowerCase().includes(query);
        if (!matchesContent && !matchesSender) return false;
      }

      return true;
    });
  }, [messages, filterTarget, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl text-on-surface tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Broadcast Logs
          </h2>
          <p className="text-secondary text-sm">View and filter historical notification broadcasts.</p>
        </div>

        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline/10 hover:bg-surface-container rounded-xl text-on-surface text-sm font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-outline/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="flex-1">
          <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Search Content</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages or senders..."
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline/20 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>
        <div className="w-full md:w-64 shrink-0">
          <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Target Audience</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">my_location</span>
            <input
              list="target-options"
              value={filterTarget === 'ALL_TARGETS' ? '' : filterTarget}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') setFilterTarget('ALL_TARGETS');
                else setFilterTarget(val);
              }}
              placeholder="All Broadcasts"
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline/20 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
            />
            <datalist id="target-options">
              {uniqueTargets.map(t => (
                <option key={t} value={t}>{getDisplayName(t)}</option>
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-outline/10 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[600px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-low text-secondary text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Date / Time</th>
                <th className="px-6 py-4 whitespace-nowrap">Sender</th>
                <th className="px-6 py-4">Message Content</th>
                <th className="px-6 py-4 whitespace-nowrap">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-secondary">
                    <span className="material-symbols-outlined animate-spin text-4xl mb-2">progress_activity</span>
                    <p>Loading messages...</p>
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-secondary">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">campaign</span>
                    <p>No broadcast logs found matching the criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredMessages.map(msg => (
                  <tr key={msg.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-secondary font-medium">
                      {new Date(msg.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-on-surface">
                      {msg.from}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-on-surface font-medium max-w-xl">{msg.content}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(msg.to) ? msg.to : []).map((t, idx) => (
                          <span key={idx} className="px-2 py-1 bg-primary-container text-on-primary-container text-[10px] font-bold rounded uppercase tracking-wider whitespace-nowrap">
                            {getDisplayName(t)}
                          </span>
                        ))}
                      </div>
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
