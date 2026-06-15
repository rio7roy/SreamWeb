import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';

export default function BroadcastLogsTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTarget, setFilterTarget] = useState('ALL_TYPES');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/messages');
      if (res.data) {
        setMessages(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (filterTarget !== 'ALL_TYPES') {
        const matchesTarget = msg.to.some(target => {
          if (filterTarget === 'ALL' && target === 'ALL') return true;
          if (filterTarget === 'DISTRICT' && target.startsWith('DISTRICT:')) return true;
          if (filterTarget === 'BRC' && target.startsWith('BRC:')) return true;
          return false;
        });
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
          onClick={fetchMessages}
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
          <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Target Type</label>
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="w-full px-4 py-3 bg-surface-container-low border border-outline/20 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
          >
            <option value="ALL_TYPES">All Broadcasts</option>
            <option value="ALL">Global (ALL)</option>
            <option value="DISTRICT">District Level</option>
            <option value="BRC">BRC Level</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-outline/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
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
                        {msg.to.map((t, idx) => (
                          <span key={idx} className="px-2 py-1 bg-primary-container text-on-primary-container text-[10px] font-bold rounded uppercase tracking-wider whitespace-nowrap">
                            {t}
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
