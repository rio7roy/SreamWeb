import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

/**
 * NotificationBar — handles:
 *  1. Bell icon with badge + modal listing ALL messages for the expert (unchanged)
 *  2. Toast popup for NEW messages that auto-vanishes after 5 seconds
 *  3. Dismissed messages are persisted to localStorage and never reappear
 */
export default function NotificationBar({ selectedBrc, assignedBrcs = [], onSelectBrc }) {
  const [allMessages, setAllMessages] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Persisted dismissed IDs — scoped to the current context (global vs specific BRC)
  const storageKey = selectedBrc ? `dismissed_notifications_${selectedBrc.code}` : 'dismissed_notifications_global';
  
  const getTargetLabel = (msgTo) => {
    if (!msgTo || !Array.isArray(msgTo)) return 'ALL';
    
    const specificTargets = msgTo.filter(t => t !== 'ALL').map(t => {
      if (t.startsWith('BRC:')) {
        const code = t.split(':')[1];
        const brc = assignedBrcs.find(b => b.code === code);
        return brc ? brc.location + '/' + brc.name : code;
      }
      if (t.startsWith('DISTRICT:')) {
        return t.split(':')[1] + ' District';
      }
      return t;
    });

    if (specificTargets.length > 0) {
      return specificTargets.join(', ');
    }
    return 'ALL';
  };
  
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(selectedBrc ? `dismissed_notifications_${selectedBrc.code}` : 'dismissed_notifications_global');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Reload dismissed IDs when context changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setDismissedIds(stored ? JSON.parse(stored) : []);
    } catch {
      setDismissedIds([]);
    }
  }, [storageKey]);

  // Persisted read IDs
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem('read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // IDs the user has already "seen" as a toast (so we don't re-toast on re-render)
  const [seenToastIds, setSeenToastIds] = useState(() => {
    try {
      const stored = localStorage.getItem('seen_toast_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Currently visible toasts (auto-vanish after a few seconds)
  const [activeToasts, setActiveToasts] = useState([]);
  const toastTimers = useRef({});

  const fetchMessages = useCallback(() => {
    api.get('/users/me/messages')
      .then(res => {
        const msgs = res.data?.data;
        if (Array.isArray(msgs)) {
          setAllMessages(msgs);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch messages on mount and poll every 15 seconds
  useEffect(() => {
    fetchMessages();
    const intervalId = setInterval(fetchMessages, 15000);
    return () => clearInterval(intervalId);
  }, [fetchMessages]);



  // Filter messages relevant to this expert's assigned BRCs (or selected BRC)
  const relevantMessages = useMemo(() => {
    return allMessages.filter(msg => {
      if (!msg.to || !Array.isArray(msg.to)) return false;
      return msg.to.some(target => {
        if (target === 'ALL') return true;
        // If a specific BRC is selected, match it
        if (selectedBrc) {
          if (target === `DISTRICT:${selectedBrc.district}`) return true;
          if (target === `BRC:${selectedBrc.code}`) return true;
        }
        // Otherwise match any of the assigned BRCs
        return assignedBrcs.some(b => {
          if (target === `DISTRICT:${b.district}`) return true;
          if (target === `BRC:${b.code}`) return true;
          return false;
        });
      });
    });
  }, [allMessages, selectedBrc, assignedBrcs]);

  // Messages for the bell dropdown (all relevant, not dismissed)
  const bellMessages = useMemo(() => {
    return relevantMessages.filter(m => !dismissedIds.includes(m.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [relevantMessages, dismissedIds]);

  const unreadMessagesCount = useMemo(() => {
    return bellMessages.filter(m => !readIds.includes(m.id)).length;
  }, [bellMessages, readIds]);

  // Handle TOAST popups for completely NEW messages
  useEffect(() => {
    const newMsgs = relevantMessages.filter(m => 
      !seenToastIds.includes(m.id) && !dismissedIds.includes(m.id)
    );

    if (newMsgs.length === 0) return;

    // Mark these as seen for the toast
    setSeenToastIds(prev => {
      const updated = [...new Set([...prev, ...newMsgs.map(m => m.id)])];
      try { localStorage.setItem('seen_toast_ids', JSON.stringify(updated)); } catch {}
      return updated;
    });

    // Add to active toasts
    setActiveToasts(prev => [...prev, ...newMsgs]);

    // Set auto-vanish timers for each new toast
    newMsgs.forEach(msg => {
      toastTimers.current[msg.id] = setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== msg.id));
        delete toastTimers.current[msg.id];
      }, 5000);
    });
  }, [relevantMessages, seenToastIds, dismissedIds]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(toastTimers.current).forEach(clearTimeout);
    };
  }, []);

  const handleDismissMessage = useCallback((id) => {
    setDismissedIds(prev => {
      const updated = [...new Set([...prev, id])];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    // Also remove from active toasts if present
    setActiveToasts(prev => prev.filter(t => t.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, [storageKey]);

  const markAsRead = useCallback((id) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      localStorage.setItem('read_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const dismissToast = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setActiveToasts(prev => prev.filter(t => t.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const handleToastClick = (toast) => {
    // Determine the BRC code if explicitly targeted
    let targetBrcCode = null;
    if (toast.to && Array.isArray(toast.to)) {
      for (const target of toast.to) {
        if (target.startsWith('BRC:')) {
          targetBrcCode = target.split(':')[1];
          break;
        }
      }
    }

    if (targetBrcCode && onSelectBrc) {
      onSelectBrc(targetBrcCode);
    }
    
    setShowModal(true);
    dismissToast(toast.id);
  };

  return (
    <>
      {/* ── Bell Icon (fixed in the top-right area) ── */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowModal(true)}
          className="relative w-10 h-10 bg-white border border-on-surface/10 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:scale-105"
          title="View all notifications"
        >
          <span
            className="material-symbols-outlined text-xl text-on-surface"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}
          >
            notifications
          </span>
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadMessagesCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Toast Popups for NEW Messages ── */}
      {activeToasts.length > 0 && createPortal(
        <div className="fixed top-16 right-4 z-[60] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          {(() => {
            // Pick the latest message among active toasts
            const toast = [...activeToasts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            
            // Determine target label
            const targetLabel = getTargetLabel(toast.to);

            // Unread left (excluding this one we are showing, if we consider this one "toast-read" vs fully read)
            // The user wants "number of unread messages left".
            const unreadLeft = Math.max(0, unreadMessagesCount - 1);

            return (
              <div
                key={toast.id}
                onClick={() => handleToastClick(toast)}
                className="pointer-events-auto bg-white border border-primary/20 rounded-xl shadow-xl p-4 animate-fade-in-up flex items-start gap-3 cursor-pointer hover:bg-surface-container-low transition-colors"
                style={{ animation: 'slideInRight 0.4s ease-out' }}
              >
                <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">campaign</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                    New Message <span className="text-secondary ml-1 lowercase font-medium">to {targetLabel}</span>
                  </p>
                  <p className="text-sm font-semibold text-on-surface leading-snug">{toast.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-secondary">
                      {new Date(toast.createdAt).toLocaleString()}
                    </p>
                    {unreadLeft > 0 && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        +{unreadLeft} unread
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    activeToasts.forEach(t => dismissToast(t.id, e));
                  }}
                  className="shrink-0 w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            );
          })()}
        </div>,
        document.body
      )}

      {/* ── Bell Modal (all messages) ── */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-outline/10 flex flex-col max-h-[80vh] overflow-y-auto relative">

            <div className="p-4 border-b border-outline/10 flex items-center justify-between bg-surface-container-low sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">notifications</span>
                <h3 className="text-xl tracking-wide text-on-surface" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Broadcast Messages
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-on-surface/10 transition-colors text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 space-y-3 bg-surface text-on-surface">
              {bellMessages.length === 0 && (
                <div className="text-center p-8 text-secondary">
                  <span className="material-symbols-outlined text-4xl text-secondary/40 mb-3 block">notifications_off</span>
                  <p className="font-semibold">No notifications</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              )}
              {bellMessages.map(msg => {
                const isUnread = !readIds.includes(msg.id);
                
                // Determine target label
                const targetLabel = getTargetLabel(msg.to);

                return (
                  <div 
                    key={msg.id} 
                    onClick={() => {
                      if (isUnread) markAsRead(msg.id);
                      
                      let targetBrcCode = null;
                      if (msg.to && Array.isArray(msg.to)) {
                        for (const target of msg.to) {
                          if (target.startsWith('BRC:')) {
                            targetBrcCode = target.split(':')[1];
                            break;
                          }
                        }
                      }
                      
                      if (targetBrcCode && onSelectBrc) {
                        onSelectBrc(targetBrcCode);
                        setShowModal(false);
                      }
                    }}
                    className={`p-4 rounded-xl border relative overflow-hidden group cursor-pointer transition-colors ${
                      isUnread 
                        ? 'bg-surface-container-low border-primary/20 hover:border-primary/40' 
                        : 'bg-surface border-outline/5 hover:border-outline/10'
                    }`}
                  >
                    {isUnread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}

                    <div className="flex justify-between items-start gap-4">
                      <div className="pl-2 flex-1">
                        <p className={`text-xs font-bold text-primary uppercase tracking-wider mb-1`}>
                          To {targetLabel}
                        </p>
                        <p className={`text-sm mb-2 ${isUnread ? 'font-bold text-on-surface' : 'font-medium text-secondary'}`}>
                          {msg.content}
                        </p>
                        <div className="flex items-center gap-1">
                          <p className="text-[11px] text-secondary font-semibold tracking-wider uppercase">
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                          <span 
                            className={`material-symbols-outlined text-[16px] ml-1 ${isUnread ? 'text-secondary/50' : 'text-blue-500'}`}
                            title={isUnread ? "Unread" : "Read"}
                          >
                            done_all
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissMessage(msg.id);
                        }}
                        className="shrink-0 w-8 h-8 rounded-lg bg-surface-container hover:bg-error/10 hover:text-error text-secondary transition-colors flex items-center justify-center"
                        title="Dismiss notification (won't reappear)"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
