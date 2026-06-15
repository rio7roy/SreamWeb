import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

export default function UserManageModal({ type, entityName, onClose, initialUserId = null }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Specific data for Experts
  const [allBrcs, setAllBrcs] = useState([]);
  const [expertEvents, setExpertEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    // Fetch users of this type
    api.get(`/admin/users/${type}`)
      .then(res => {
        setUsers(res.data);
        if (initialUserId) {
          const u = res.data.find(x => x.id === initialUserId);
          if (u) setSelectedUser(u);
        }
      })
      .catch(err => setFeedback({ type: 'error', text: 'Failed to load existing users.' }));
      
    if (type === 'experts') {
      api.get('/brcs')
        .then(res => setAllBrcs(res.data))
        .catch(console.error);
    }
  }, [type]);

  // When a specific expert is selected, load their events
  useEffect(() => {
    if (selectedUser && type === 'experts') {
      setEventsLoading(true);
      api.get(`/events?expertId=${selectedUser.id}`)
        .then(res => setExpertEvents(res.data || []))
        .catch(console.error)
        .finally(() => setEventsLoading(false));
    }
  }, [selectedUser, type]);

  const filteredUsers = search.trim()
    ? users.filter(u => (u.name || u.email || '').toLowerCase().includes(search.toLowerCase()))
    : users;

  const handleUpdateBrcs = async (newBrcsList) => {
    try {
      setFeedback(null);
      await api.put(`/admin/users/experts/${selectedUser.id}/brcs`, { brcs: newBrcsList });
      // Update local state
      setSelectedUser({ ...selectedUser, brcs: newBrcsList });
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, brcs: newBrcsList } : u));
      setFeedback({ type: 'success', text: 'BRCs updated successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update BRCs.' });
    }
  };

  const handleToggleBrc = (brcCode) => {
    const currentBrcs = selectedUser.brcs || [];
    let newBrcs;
    if (currentBrcs.includes(brcCode)) {
      newBrcs = currentBrcs.filter(b => b !== brcCode);
    } else {
      newBrcs = [...currentBrcs, brcCode];
    }
    handleUpdateBrcs(newBrcs);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col min-h-[500px] max-h-[90vh]">
        
        <div className="bg-blue-600 px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl text-white tracking-wide flex items-center gap-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {selectedUser ? (
                <>
                  <button onClick={() => setSelectedUser(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors mr-2 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  </button>
                  Manage {entityName}: {selectedUser.name || selectedUser.email}
                </>
              ) : (
                `Manage ${entityName}`
              )}
            </h3>
            <p className="text-white/80 text-sm">
              {selectedUser ? 'View details, assign Hubs, and track attendance.' : 'Select a user to view their dashboard.'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 flex-grow flex flex-col relative overflow-y-auto bg-surface-container-low">
          {feedback && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 ${
              feedback.type === 'error' ? 'bg-error/10 text-error' : 'bg-green-100 text-green-700'
            }`}>
              <span className="material-symbols-outlined text-lg">
                {feedback.type === 'error' ? 'error' : 'check_circle'}
              </span>
              {feedback.text}
            </div>
          )}

          {!selectedUser ? (
            <>
              {/* Search Bar */}
              <div className="relative mb-6 shrink-0">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search for a ${entityName} by name or email...`}
                  className="w-full bg-white border border-outline/20 rounded-xl pl-12 pr-4 py-3 focus:border-blue-600 outline-none transition-all shadow-sm"
                  autoFocus
                />
              </div>

              {/* List */}
              <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-secondary py-10">No records found.</p>
                ) : (
                  filteredUsers.map(u => {
                    const uniqueId = type === 'labs' ? u.code : u.id;
                    return (
                      <button
                        key={uniqueId}
                        onClick={() => setSelectedUser(u)}
                        className="w-full text-left p-4 rounded-xl border border-outline/10 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-between group bg-white shadow-sm"
                      >
                        <div>
                          <h4 className="font-bold text-on-surface group-hover:text-blue-700">{u.name || 'Unnamed'}</h4>
                          <p className="text-sm text-secondary">{u.email}</p>
                        </div>
                        <span className="material-symbols-outlined text-outline group-hover:text-blue-500">
                          chevron_right
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-6">
              {type !== 'experts' ? (
                <div className="text-center py-12 text-secondary">
                  <span className="material-symbols-outlined text-5xl opacity-50 mb-4 block">construction</span>
                  <p>Detailed management is currently only fully supported for STREAM Experts.</p>
                </div>
              ) : (
                <>
                  {/* Profile Info */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline/10">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">person</span>
                      Profile Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-secondary font-bold uppercase">Name</p>
                        <p className="font-semibold text-on-surface text-lg">{selectedUser.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary font-bold uppercase">Email</p>
                        <p className="font-semibold text-on-surface text-lg">{selectedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary font-bold uppercase">District</p>
                        <p className="font-semibold text-on-surface text-lg">{selectedUser.district || 'All Districts'}</p>
                      </div>
                    </div>
                  </div>

                  {/* BRC Assignment */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline/10">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">assignment_ind</span>
                      Assigned STREAM Hubs
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {allBrcs.filter(b => b.district === selectedUser.district || !selectedUser.district).map(brc => {
                        const isAssigned = (selectedUser.brcs || []).includes(brc.code);
                        return (
                          <button
                            key={brc.code}
                            onClick={() => handleToggleBrc(brc.code)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border transition-colors ${
                              isAssigned 
                                ? 'bg-primary-container text-on-primary-container border-primary/30 hover:bg-error/10 hover:border-error/30 hover:text-error' 
                                : 'bg-surface border-outline/20 text-secondary hover:bg-surface-container'
                            }`}
                          >
                            {isAssigned && <span className="material-symbols-outlined text-[14px]">check</span>}
                            {brc.name}
                          </button>
                        );
                      })}
                    </div>
                    {(selectedUser.brcs || []).length === 0 && (
                      <p className="text-sm text-amber-600 mt-2 font-medium">This expert has no hubs assigned.</p>
                    )}
                  </div>

                  {/* Attendance Log */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline/10 flex flex-col flex-grow min-h-[300px]">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">event_available</span>
                      Attendance & Submissions
                    </h4>
                    
                    {eventsLoading ? (
                      <div className="flex justify-center py-8">
                        <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
                      </div>
                    ) : expertEvents.length === 0 ? (
                      <div className="text-center py-8 text-secondary">
                        <p>No events submitted yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="border-b border-outline/10 text-secondary uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Event Name</th>
                              <th className="px-4 py-3">Hub Code</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline/5">
                            {expertEvents.map(e => (
                              <tr key={e.id} className="hover:bg-surface-container-low transition-colors">
                                <td className="px-4 py-3 font-medium">{new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 max-w-[200px] truncate" title={e.name}>{e.name || 'Untitled'}</td>
                                <td className="px-4 py-3 font-mono text-xs">{e.brcCode}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    e.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {e.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
