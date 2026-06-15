import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function NotificationBar() {
  const [messages, setMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Fetch messages for the current user
    api.get('/users/me/messages')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setMessages(res.data);
        }
      })
      .catch(console.error);
  }, []);

  // Auto-cycle through multiple messages
  useEffect(() => {
    if (messages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 5000); // switch every 5 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;

  const currentMsg = messages[currentIndex];

  return (
    <div className="bg-primary text-on-primary px-4 py-3 flex items-center justify-between text-sm shadow-md animate-fade-in relative z-50 overflow-hidden">
      <div className="flex items-center gap-3 w-full max-w-6xl mx-auto">
        <span className="material-symbols-outlined text-lg animate-pulse shrink-0">campaign</span>
        
        <div className="flex-1 min-w-0 pr-4">
          <p className="font-bold truncate">
            {currentMsg.content}
          </p>
          <span className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5 block">
            {new Date(currentMsg.createdAt).toLocaleString()}
          </span>
        </div>

        {messages.length > 1 && (
          <div className="shrink-0 text-xs font-bold bg-black/20 px-2 py-1 rounded-full">
            {currentIndex + 1} / {messages.length}
          </div>
        )}

        <button 
          onClick={() => setMessages(messages.filter((_, i) => i !== currentIndex))}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/20 transition-colors ml-2"
          title="Dismiss"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
