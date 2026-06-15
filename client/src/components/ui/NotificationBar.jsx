import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function NotificationBar() {
  const [messages, setMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fadeKey, setFadeKey] = useState(0); // used to re-trigger fade animation

  useEffect(() => {
    api.get('/users/me/messages')
      .then(res => {
        const msgs = res.data?.data;
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs);
        }
      })
      .catch(console.error);
  }, []);

  // Cycle through messages every 10 seconds
  useEffect(() => {
    if (messages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
      setFadeKey(k => k + 1);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0 || !isVisible) return null;

  const currentMsg = messages[currentIndex];

  return (
    <>
      <div className="bg-error text-white px-4 py-2 flex items-center shadow-md relative z-40 shrink-0">
        
        {/* Clickable Area for Modal */}
        <div 
          onClick={() => setShowModal(true)}
          className="flex-1 flex items-center gap-3 cursor-pointer group"
          title="Click to view all notifications"
        >

          
          <div className="flex-1 min-w-0 pr-4">
            <p 
              key={fadeKey} // Forces re-render for fade-in animation
              className="font-bold truncate text-sm animate-fade-in"
            >
              {currentMsg.content}
            </p>
          </div>

          {messages.length > 1 && (
            <div className="shrink-0 text-xs font-bold bg-black/20 px-2 py-1 rounded-full group-hover:bg-black/30 transition-colors">
              {currentIndex + 1} / {messages.length}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/20 transition-colors ml-4 z-10"
          title="Dismiss completely"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Modal for all notifications */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-outline/10 flex flex-col max-h-[80vh] overflow-hidden">
            
            <div className="p-4 border-b border-outline/10 flex items-center justify-between bg-surface-container-low">
              <h3 className="text-xl tracking-wide text-on-surface" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Broadcast Messages
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-on-surface/10 transition-colors text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex flex-col gap-3 bg-surface text-on-surface">
              {messages.map((msg, idx) => (
                <div key={msg.id} className="p-4 bg-surface-container-low rounded-xl border border-outline/5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>
                  <p className="font-bold text-sm mb-2">{msg.content}</p>
                  <p className="text-[11px] text-secondary font-semibold tracking-wider uppercase">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
