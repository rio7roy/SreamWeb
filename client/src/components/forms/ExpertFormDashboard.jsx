import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';
import FormBuilder from './FormBuilder';
import FormAnalytics from './FormAnalytics';

export default function ExpertFormDashboard({ onClose }) {
  const [view, setView] = useState('list'); // 'list', 'builder', 'analytics'
  const [templates, setTemplates] = useState([]);
  const [forms, setForms] = useState([]);
  const [currentForm, setCurrentForm] = useState(null);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = () => {
    api.get('/forms/templates').then(res => setTemplates(res.data)).catch(console.error);
    api.get('/forms').then(res => setForms(res.data)).catch(console.error);
  };

  const handleCreateForm = (template = null) => {
    setCurrentForm(template ? { ...template, id: undefined, title: `Copy of ${template.title}` } : { title: 'New Form', description: '', fields: [] });
    setView('builder');
  };

  const handleSaveForm = async (formData) => {
    try {
      if (formData.id) {
        await api.put(`/forms/${formData.id}`, formData);
      } else {
        await api.post('/forms', formData);
      }
      setView('list');
    } catch (err) {
      console.error('Failed to save form', err);
    }
  };

  const handleViewAnalytics = async (form) => {
    try {
      const res = await api.get(`/forms/${form.id}/responses`);
      setResponses(res.data);
      setCurrentForm(form);
      setView('analytics');
    } catch (err) {
      console.error(err);
    }
  };

  const togglePublish = async (form) => {
    try {
      await api.put(`/forms/${form.id}`, { published: !form.published });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const copyLink = (formId) => {
    const link = `${window.location.origin}/f/${formId}`;
    navigator.clipboard.writeText(link);
    alert('Form link copied to clipboard!');
  };

  if (view === 'builder') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-surface overflow-y-auto">
        <div className="p-4 md:p-8">
          <FormBuilder initialData={currentForm} onSave={handleSaveForm} onCancel={() => setView('list')} />
        </div>
      </div>,
      document.body
    );
  }

  if (view === 'analytics') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-surface overflow-y-auto">
        <div className="p-4 md:p-8">
          <FormAnalytics form={currentForm} responses={responses} onBack={() => setView('list')} />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative bg-surface rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-primary px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl text-on-primary tracking-wide font-hanken font-bold">
              Observation Forms
            </h3>
            <p className="text-on-primary/80 text-sm">Build, share, and analyze observation data.</p>
          </div>
          <button onClick={onClose} className="text-on-primary/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-grow bg-surface-container-lowest">
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold font-hanken">My Forms</h2>
            <button onClick={() => handleCreateForm()} className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90">
              + Blank Form
            </button>
          </div>

          <div className="mb-12">
            <h3 className="text-lg font-bold mb-4 text-secondary">Start from a Template</h3>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {templates.map(tpl => (
                <button 
                  key={tpl.id} 
                  onClick={() => handleCreateForm(tpl)}
                  className="min-w-[200px] w-48 text-left bg-white rounded-2xl p-4 border border-outline/10 shadow-sm hover:border-primary/50 transition-all flex flex-col items-center group"
                >
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">add</span>
                  </div>
                  <h4 className="font-bold text-sm text-center line-clamp-2">{tpl.title}</h4>
                </button>
              ))}
              {templates.length === 0 && <p className="text-secondary text-sm italic">No templates available.</p>}
            </div>
          </div>

          <h3 className="text-lg font-bold mb-4 text-secondary">Active Forms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map(form => (
              <div key={form.id} className="bg-white rounded-2xl p-6 border border-outline/10 shadow-sm flex flex-col h-56">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg truncate pr-2">{form.title}</h4>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button 
                      onClick={() => togglePublish(form)} 
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.published ? 'bg-green-500' : 'bg-surface-container-highest'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.published ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${form.published ? 'text-green-700' : 'text-secondary'}`}>
                      {form.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-secondary line-clamp-2 mb-auto">{form.description || 'No description'}</p>
                
                <div className="mt-4 flex flex-col gap-2">
                  {form.published && (
                    <div className="flex gap-2">
                      <button onClick={() => window.open(`/f/${form.id}`, '_blank')} className="flex-1 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        Open Form
                      </button>
                      <button onClick={() => copyLink(form.id)} className="flex-1 py-2 bg-primary/10 text-primary font-bold rounded-lg text-sm hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">link</span>
                        Copy Link
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setCurrentForm(form); setView('builder'); }} className="flex-1 py-2 border border-outline/20 rounded-lg text-sm font-bold text-secondary hover:bg-surface-container transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      Edit
                    </button>
                    <button onClick={() => handleViewAnalytics(form)} className="flex-1 py-2 border border-outline/20 rounded-lg text-sm font-bold text-secondary hover:bg-surface-container transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">analytics</span>
                      Data
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {forms.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-outline/10 rounded-2xl">
                <span className="material-symbols-outlined text-4xl text-secondary/50 mb-2">description</span>
                <p className="text-secondary font-medium">You haven't created or been assigned any forms yet.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
