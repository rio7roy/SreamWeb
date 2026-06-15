import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

export default function UserRemovalModal({ type, entityName, onClose }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Fetch users of this type
    api.get(`/admin/users/${type}`)
      .then(res => setUsers(res.data))
      .catch(err => setFeedback({ type: 'error', text: 'Failed to load existing users.' }));
  }, [type]);

  const filteredUsers = search.trim()
    ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
    : users;

  const handleRemove = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const entityId = type === 'labs' ? selectedUser.code : selectedUser.id;
      await api.delete(`/admin/users/${type}/${entityId}`);
      setFeedback({ type: 'success', text: `${entityName} successfully removed (soft-deleted).` });
      
      // Remove from local list
      setUsers(users.filter(u => (type === 'labs' ? u.code : u.id) !== entityId));
      setSelectedUser(null);
      setShowConfirm(false);
      
      // Auto close after success
      setTimeout(onClose, 2000);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Removal failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col min-h-[500px] max-h-[85vh]">
        
        <div className="bg-error px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl text-white tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Remove {entityName}
            </h3>
            <p className="text-white/80 text-sm">Search for an existing record to archive it.</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 flex-grow flex flex-col relative overflow-y-auto">
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
                  placeholder={`Search for a ${entityName} by name...`}
                  className="w-full bg-surface-container border border-outline/20 rounded-xl pl-12 pr-4 py-3 focus:border-error outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* List */}
              <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-secondary py-10">No records found.</p>
                ) : (
                  filteredUsers.map(u => {
                    const uniqueId = type === 'labs' ? u.code : u.id;
                    return (
                    <button
                      key={uniqueId}
                      onClick={() => setSelectedUser(u)}
                      className="w-full text-left p-4 rounded-xl border border-outline/10 hover:border-error/30 hover:bg-error/5 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-bold text-on-surface">{u.name}</p>
                        <p className="text-xs text-secondary mt-1">{u.district} {u.location ? `| ${u.location}` : ''}</p>
                      </div>
                      <span className="material-symbols-outlined text-error opacity-0 group-hover:opacity-100 transition-opacity">
                        delete
                      </span>
                    </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Selected Detail Card */
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mb-6 text-error">
                <span className="material-symbols-outlined text-4xl">
                  {type === 'experts' ? 'school' : type === 'admins' ? 'admin_panel_settings' : 'account_balance'}
                </span>
              </div>
              
              <h4 className="text-2xl font-bold text-on-surface mb-2 text-center">{selectedUser.name}</h4>
              <p className="text-secondary mb-8 text-center">{selectedUser.district} {selectedUser.location ? `| ${selectedUser.location}` : ''}</p>

              <div className="w-full bg-surface-container-low rounded-xl p-4 mb-8 text-sm">
                <p className="text-secondary mb-1">Registered: {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                {type === 'experts' && selectedUser.attendanceCount !== undefined && (
                  <p className="text-secondary mb-1 font-bold text-primary">Attendance: {selectedUser.attendanceCount} days</p>
                )}
                {selectedUser.email && <p className="text-secondary">Email: {selectedUser.email}</p>}
                {selectedUser.phone && <p className="text-secondary">Phone: {selectedUser.phone}</p>}
                {selectedUser.assignedBrcs && (
                  <p className="text-secondary mt-2">Assigned BRCs: {selectedUser.assignedBrcs.map(b => b.code).join(', ')}</p>
                )}
              </div>

              {!showConfirm ? (
                <div className="flex gap-4 w-full">
                  <button onClick={() => setSelectedUser(null)} className="flex-1 py-3 rounded-xl border border-outline/20 font-bold hover:bg-surface-container transition-colors">
                    Back
                  </button>
                  <button onClick={() => setShowConfirm(true)} className="flex-1 py-3 rounded-xl bg-error text-white font-bold hover:opacity-90 shadow-md transition-all">
                    Remove Entity
                  </button>
                </div>
              ) : (
                <div className="w-full bg-error/10 border border-error/30 rounded-xl p-6 animate-fade-in">
                  <h5 className="font-bold text-error mb-2 text-center">Are you absolutely sure?</h5>
                  <p className="text-sm text-error/80 text-center mb-6">
                    This will archive the record and remove their access immediately.
                  </p>
                  <div className="flex gap-4">
                    <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-xl bg-white border border-outline/20 font-bold hover:bg-surface-container transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleRemove} disabled={loading} className="flex-1 py-2 rounded-xl bg-error text-white font-bold hover:opacity-90 shadow-md transition-all">
                      {loading ? 'Processing...' : 'Yes, Remove'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
