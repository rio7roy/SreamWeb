import React, { useState } from 'react';

export default function Footer() {
  const [showContact, setShowContact] = useState(false);

  return (
    <footer className="bg-white border-t border-black/[0.03] py-8">
      <div className="max-w-max-width mx-auto flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop w-full gap-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface">
          © 2026 STREAM Ecosystem
        </span>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 relative">
          <button
            onClick={() => setShowContact(!showContact)}
            className="text-[11px] font-bold hover:text-primary transition-all uppercase tracking-widest text-on-surface flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">call</span>
            Contact
          </button>
          
          {showContact && (
            <div className="absolute bottom-full mb-2 right-0 bg-white border border-outline/10 shadow-xl rounded-xl p-4 w-64 animate-fade-in-up z-50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 border-b border-outline/10 pb-2">Admin Contacts</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container/30 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-sm">support_agent</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Primary Admin</p>
                    <p className="text-sm font-bold text-on-surface">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined text-sm">support_agent</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Secondary Admin</p>
                    <p className="text-sm font-bold text-on-surface">+1 (555) 987-6543</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
