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

  // Fetch messages on mount
  useEffect(() => {
    api.get('/users/me/messages')
      .then(res => {
        const msgs = res.data?.data;
        if (Array.isArray(msgs) && msgs.length > 0) {
          setAllMessages(msgs);
        }
      })
      .catch(console.error);
  }, []);

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
          {bellMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {bellMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Toast Popups for NEW Messages ── */}
      {activeToasts.length > 0 && createPortal(
        <div className="fixed top-16 right-4 z-[60] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          {activeToasts.map(toast => {
            // Determine target label
            let targetLabel = 'ALL';
            if (toast.to && Array.isArray(toast.to)) {
              const specificTargets = toast.to.filter(t => t !== 'ALL').map(t => t.split(':')[1]);
              if (specificTargets.length > 0) {
                targetLabel = specificTargets.join(', ');
              }
            }

            return (
              <div
                key={toast.id}
                onClick={() => handleToastClick(toast)}
                className="pointer-events-auto bg-white border border-primary/20 rounded-xl shadow-xl p-4 animate-fade-in-up flex items-start gap-3 cursor-pointer hover:bg-surface-container-low transition-colors"
                style={{
                  animation: 'slideInRight 0.4s ease-out',
                }}
              >
                <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">campaign</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">New Message <span className="text-secondary ml-1 lowercase font-medium">to {targetLabel}</span></p>
                  <p className="text-sm font-semibold text-on-surface leading-snug">{toast.content}</p>
                  <p className="text-[10px] text-secondary mt-1">
                    {new Date(toast.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={(e) => dismissToast(toast.id, e)}
                  className="shrink-0 w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {/* ── Bell Modal (all messages) ── */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-outline/10 flex flex-col max-h-[80vh] overflow-hidden">

            <div className="p-4 border-b border-outline/10 flex items-center justify-between bg-surface-container-low">
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

            <div className="overflow-y-auto p-4 flex flex-col gap-3 bg-surface text-on-surface">
              {bellMessages.length === 0 && (
                <div className="text-center p-8 text-secondary">
                  <span className="material-symbols-outlined text-4xl text-secondary/40 mb-3 block">notifications_off</span>
                  <p className="font-semibold">No notifications</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              )}
              {bellMessages.map(msg => (
                <div key={msg.id} className="p-4 bg-surface-container-low rounded-xl border border-outline/5 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="pl-2">
                      <p className="font-bold text-sm mb-2">{msg.content}</p>
                      <p className="text-[11px] text-secondary font-semibold tracking-wider uppercase">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDismissMessage(msg.id)}
                      className="shrink-0 w-8 h-8 rounded-lg bg-surface-container hover:bg-error/10 hover:text-error text-secondary transition-colors flex items-center justify-center"
                      title="Dismiss notification (won't reappear)"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
