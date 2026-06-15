import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function NotificationBar() {
  const [messages, setMessages] = useState([]);

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

  if (messages.length === 0) return null;

  // Combine all messages into a single string separated by bullets
  const combinedMessage = messages.map(m => m.content).join(' ✦ ');

  return (
    <div className="bg-error text-white px-2 py-2 flex items-center shadow-md animate-fade-in relative z-50 overflow-hidden shrink-0">
      <span className="material-symbols-outlined text-lg animate-pulse shrink-0 px-3 border-r border-white/20 z-10 bg-error relative">campaign</span>
      
      <div className="flex-1 overflow-hidden relative h-6 flex items-center">
        <div className="animate-marquee font-bold tracking-wide text-sm px-4">
          {combinedMessage}
        </div>
      </div>

    </div>
  );
}
