import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';
import FormBuilder from './FormBuilder';
import FormAnalytics from './FormAnalytics';

export default function AdminFormDashboard({ onClose }) {
  const [view, setView] = useState('list'); // 'list', 'builder', 'analytics'
  const [templates, setTemplates] = useState([]);
  const [forms, setForms] = useState([]);
  const [experts, setExperts] = useState([]);
  const [brcs, setBrcs] = useState([]);
  const [currentForm, setCurrentForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [isTemplate, setIsTemplate] = useState(false);
  
  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFormToAssign, setSelectedFormToAssign] = useState(null);

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = () => {
    api.get('/forms/templates').then(res => setTemplates(res.data)).catch(console.error);
    api.get('/forms').then(res => setForms(res.data)).catch(console.error);
    api.get('/admin/users/experts').then(res => setExperts(res.data)).catch(console.error);
    api.get('/brcs').then(res => setBrcs(res.data)).catch(console.error);
  };

  const handleCreateTemplate = () => {
    setIsTemplate(true);
    setCurrentForm({ title: 'New Template', description: '', fields: [] });
    setView('builder');
  };

  const handleCreateForm = (template = null) => {
    setIsTemplate(false);
    setCurrentForm(template ? { ...template, id: undefined, title: `Copy of ${template.title}` } : { title: 'New Form', description: '', fields: [] });
    setView('builder');
  };

  const handleSaveForm = async (formData) => {
    try {
      if (isTemplate) {
        await api.post('/forms/templates', formData);
      } else {
        if (formData.id) {
          await api.put(`/forms/${formData.id}`, formData);
        } else {
          await api.post('/forms', formData);
        }
      }
      setView('list');
    } catch (err) {
      console.error('Failed to save', err);
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

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const brcCode = e.target.brcCode.value;
    try {
      const currentAssigned = selectedFormToAssign.assignedTo || [];
      if (!currentAssigned.includes(brcCode)) {
        await api.put(`/forms/${selectedFormToAssign.id}`, { assignedTo: [...currentAssigned, brcCode] });
      }
      setShowAssignModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (view === 'builder') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-surface overflow-y-auto animate-fade-in">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <FormBuilder initialData={currentForm} onSave={handleSaveForm} onCancel={() => setView('list')} />
        </div>
      </div>,
      document.body
    );
  }

  if (view === 'analytics') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-surface overflow-y-auto animate-fade-in">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <FormAnalytics form={currentForm} responses={responses} onBack={() => setView('list')} />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative bg-surface rounded-3xl w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-primary px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-bold font-hanken text-on-primary">Observation Forms Management</h2>
            <p className="text-on-primary/80 text-sm mt-1">Create templates, assign forms to BRCs, and view analytics.</p>
          </div>
          <button onClick={onClose} className="text-on-primary/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-surface-container-lowest px-8 py-4 border-b border-outline/10 flex justify-end gap-3 shrink-0">
          <button onClick={handleCreateTemplate} className="px-6 py-2.5 rounded-xl border border-primary text-primary font-bold hover:bg-primary/5 transition-colors">
            + New Template
          </button>
          <button onClick={() => handleCreateForm()} className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90 transition-opacity">
            + Blank Form
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-grow bg-surface-container-lowest">


      {/* Templates Section */}
      <section>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">auto_awesome_mosaic</span>
          Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white rounded-2xl p-6 border border-outline/10 shadow-sm hover:border-primary/30 transition-all flex flex-col h-48">
              <h4 className="font-bold text-lg mb-1 truncate">{tpl.title}</h4>
              <p className="text-sm text-secondary line-clamp-2 mb-4">{tpl.description || 'No description'}</p>
              <div className="mt-auto pt-4 border-t border-outline/10 flex justify-between items-center">
                <span className="text-xs font-bold text-secondary">{tpl.fields.length} questions</span>
                <button onClick={() => handleCreateForm(tpl)} className="text-primary text-sm font-bold hover:underline">
                  Use Template
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <p className="text-secondary italic text-sm">No templates created yet.</p>}
        </div>
      </section>

      {/* Active Forms Section */}
      <section>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 mt-12">
          <span className="material-symbols-outlined text-primary">description</span>
          Active Forms
        </h3>
        <div className="bg-white rounded-3xl border border-outline/10 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline/10 text-sm text-secondary">
                <th className="p-4 font-bold">Form Title</th>
                <th className="p-4 font-bold">Author</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/5">
              {forms.map(form => {
                const author = form.createdBy === 'unknown' ? 'Admin' : (experts.find(e => e.id === form.createdBy)?.name || form.createdBy);
                return (
                  <tr key={form.id} className="hover:bg-surface-container-low/50">
                    <td className="p-4 font-bold">{form.title}</td>
                    <td className="p-4 text-sm text-secondary">{author}</td>
                    <td className="p-4">
                      <button onClick={() => togglePublish(form)} className={`text-xs font-bold px-3 py-1 rounded-full ${form.published ? 'bg-green-100 text-green-700' : 'bg-surface-container text-secondary'}`}>
                        {form.published ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      <button onClick={() => handleViewAnalytics(form)} className="p-2 text-primary hover:bg-primary/10 rounded-full" title="Analytics">
                        <span className="material-symbols-outlined text-sm">analytics</span>
                      </button>
                      <button onClick={() => { setSelectedFormToAssign(form); setShowAssignModal(true); }} className="p-2 text-secondary hover:bg-surface-container rounded-full" title="Assign to BRC">
                        <span className="material-symbols-outlined text-sm">domain_add</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {forms.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-secondary italic">No active forms found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

        </div>
        
        {/* Assign Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold mb-2">Assign Form</h3>
              <p className="text-secondary mb-6 text-sm">Select a BRC to assign "{selectedFormToAssign?.title}" to.</p>
              <form onSubmit={handleAssignSubmit} className="space-y-6">
                <select name="brcCode" required className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 outline-none focus:border-primary">
                  <option value="">Select a BRC...</option>
                  {brcs.map(b => <option key={b.code} value={b.code}>{b.name} ({b.code})</option>)}
                </select>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAssignModal(false)} className="px-6 py-2 rounded-xl text-secondary hover:bg-surface-container font-bold">Cancel</button>
                  <button type="submit" className="px-6 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90">Assign</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
