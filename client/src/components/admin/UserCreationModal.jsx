import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

export default function UserCreationModal({ type, entityName, onClose }) {
  const [formData, setFormData] = useState({});
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);

  // Auto-suggest BRC state
  const [brcSearch, setBrcSearch] = useState('');
  const [showBrcSuggestions, setShowBrcSuggestions] = useState(false);
  const brcWrapperRef = useRef(null);

  const [brcs, setBrcs] = useState([]);
  const districts = Array.from(new Set(brcs.map(b => b.district).filter(Boolean))).sort();

  useEffect(() => {
    api.get('/brcs')
      .then(res => setBrcs(res.data))
      .catch(console.error);

    if (type === 'labs') {
      api.get('/admin/users/experts')
        .then(res => setExperts(res.data))
        .catch(console.error);
    }
  }, [type]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (brcWrapperRef.current && !brcWrapperRef.current.contains(event.target)) {
        setShowBrcSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExpertSelect = (expertId) => {
    const expert = experts.find(e => e.id === expertId);
    setFormData(prev => ({
      ...prev,
      expertId,
      district: expert?.district || prev.district
    }));
  };

  const addBrcToExpert = (brc) => {
    const currentBrcs = formData.assignedBrcs || [];
    if (!currentBrcs.find(b => b.code === brc.code)) {
      setFormData({ ...formData, assignedBrcs: [...currentBrcs, brc] });
    }
    setBrcSearch('');
    setShowBrcSuggestions(false);
  };

  const removeBrcFromExpert = (code) => {
    setFormData({
      ...formData,
      assignedBrcs: formData.assignedBrcs.filter(b => b.code !== code)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      setFeedback({ type: 'error', text: 'Passwords do not match!' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.post(`/admin/users/${type}`, formData);
      
      if (type === 'experts' || type === 'admins') {
        setFeedback({ type: 'success', text: `Success! An invitation email has been sent to the user.` });
        setTimeout(onClose, 2000);
      } else {
        setFeedback({ type: 'success', text: `${entityName} successfully registered!` });
        setTimeout(onClose, 1500);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed. Try again.';
      setFeedback({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filteredBrcs = brcSearch.trim()
    ? brcs.filter(b => b.name.toLowerCase().includes(brcSearch.toLowerCase()) || b.code.toLowerCase().includes(brcSearch.toLowerCase())).slice(0, 5)
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]">
        <div className="bg-primary px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl text-on-primary tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              Register {entityName}
            </h3>
            <p className="text-on-primary/80 text-sm">Fill in the details below to create a new record.</p>
          </div>
          <button onClick={onClose} className="text-on-primary/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-grow">
          {feedback && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
              feedback.type === 'error' ? 'bg-error/10 text-error' : 'bg-green-100 text-green-700'
            }`}>
              <span className="material-symbols-outlined text-lg">
                {feedback.type === 'error' ? 'error' : 'check_circle'}
              </span>
              {feedback.text}
            </div>
          )}

          {generatedLink ? (
            <div className="flex flex-col items-center justify-center py-8 animate-fade-in-up text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Registration Successful!</h4>
              <p className="text-secondary mb-6">Share this unique onboarding link with the user so they can complete their setup:</p>
              
              <div className="flex w-full bg-surface-container border border-outline/20 rounded-xl overflow-hidden">
                <input 
                  type="text" 
                  readOnly 
                  value={generatedLink} 
                  className="flex-1 bg-transparent px-4 py-3 outline-none text-sm font-medium text-on-surface truncate"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    setFeedback({ type: 'success', text: 'Copied to clipboard!' });
                  }}
                  className="px-6 py-3 bg-primary/10 text-primary font-bold hover:bg-primary hover:text-white transition-colors border-l border-outline/20 flex items-center gap-2 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copy Link
                </button>
              </div>
            </div>
          ) : (
            <form id="create-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* COMMON: STREAM Hub, iLab, Creative Corner */}
              {(type === 'labs' || type === 'ilabs' || type === 'creative_corners') && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-1">Name of {type === 'labs' ? 'Hub' : 'School'}</label>
                    <input required name="name" onChange={handleChange} type="text" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
                  </div>
                  
                  {type === 'labs' && (
                    <div className="mt-4">
                      <label className="block text-sm font-bold text-secondary mb-1">STREAM Expert in Charge</label>
                      <select required name="expertId" onChange={(e) => handleExpertSelect(e.target.value)} className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none">
                        <option value="">Select an Expert...</option>
                        {experts.map(ex => <option key={ex.id} value={ex.id}>{ex.name} ({ex.district})</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1">District</label>
                      <select required name="district" value={formData.district || ''} onChange={handleChange} className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none">
                        <option value="">Select District</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1">Location</label>
                      <input required name="location" onChange={handleChange} type="text" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-outline/10">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1">Password</label>
                      <input required name="password" onChange={handleChange} type="password" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1">Confirm Password</label>
                      <input required name="confirmPassword" onChange={handleChange} type="password" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
                    </div>
                  </div>
                </>
              )}

              {/* STREAM EXPERT / SYSTEM ADMIN */}
              {(type === 'experts' || type === 'admins') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1">Full Name</label>
                      <input required name="name" onChange={handleChange} type="text" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-secondary mb-1">Email Address</label>
                      <input required name="email" onChange={handleChange} type="email" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 focus:border-primary outline-none" />
                    </div>
                  </div>
                  

                  <div className="bg-primary-container/20 p-4 rounded-xl flex items-start gap-3 mt-4">
                    <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                    <p className="text-sm text-secondary">
                      When you click Register, a unique onboarding link will be generated. The {type === 'experts' ? 'expert' : 'administrator'} will use this link to complete their profile and activate their account.
                    </p>
                  </div>

                </>
              )}

            </form>
          )}
        </div>

        <div className="bg-surface-container-low px-8 py-5 flex justify-end gap-4 shrink-0 border-t border-outline/10">
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-secondary hover:bg-surface-container transition-colors font-bold">
            {generatedLink ? 'Done' : 'Cancel'}
          </button>
          {!generatedLink && (
            <button form="create-form" type="submit" disabled={loading} className="px-8 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? 'Processing...' : 'Register'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
