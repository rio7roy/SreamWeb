import { useEffect, useCallback } from 'react';

export default function Modal({ isOpen, onClose, children, className = '' }) {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div
        className={`modal-content w-full max-w-lg bg-white border border-black/[0.05] rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-black/10 relative ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
