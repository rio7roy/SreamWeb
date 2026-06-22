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
  const [assignMode, setAssignMode] = useState('SPECIFIC');
  const [assignDistrict, setAssignDistrict] = useState('');
  const [assignBrcs, setAssignBrcs] = useState([]);
  
  const uniqueDistricts = [...new Set(brcs.map(b => b.district))].filter(Boolean);
  
  // Filter state
  const [brcFilter, setBrcFilter] = useState('');
  const [expertFilter, setExpertFilter] = useState('');

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

  const copyLink = (formId) => {
    const link = `${window.location.origin}/f/${formId}`;
    navigator.clipboard.writeText(link);
    alert('Form link copied to clipboard!');
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

  const handleDeleteForm = async (form) => {
    if (window.confirm(`Are you sure you want to delete "${form.title}"? This cannot be undone.`)) {
      try {
        await api.delete(`/forms/${form.id}`);
        fetchData();
      } catch (err) {
        console.error('Failed to delete form', err);
      }
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      const currentAssigned = selectedFormToAssign.assignedTo || [];
      let codesToAdd = [];
      
      if (assignMode === 'ALL') {
        codesToAdd = brcs.map(b => b.code);
      } else if (assignMode === 'DISTRICT') {
        codesToAdd = brcs.filter(b => b.district === assignDistrict).map(b => b.code);
      } else {
        codesToAdd = assignBrcs;
      }
      
      const newAssignedTo = [...new Set([...currentAssigned, ...codesToAdd])];
      
      await api.put(`/forms/${selectedFormToAssign.id}`, { assignedTo: newAssignedTo });
      
      setShowAssignModal(false);
      setAssignBrcs([]);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (view === 'builder') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-surface overflow-y-auto animate-fade-in">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <FormBuilder initialData={currentForm} onSave={handleSaveForm} onCancel={() => setView('list')} isTemplate={isTemplate} />
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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 mt-12 gap-4">
          <h3 className="text-xl font-bold flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-primary">description</span>
            Active Forms
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select 
              value={expertFilter} 
              onChange={(e) => setExpertFilter(e.target.value)}
              className="bg-white border border-outline/20 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary shadow-sm min-w-[200px]"
            >
              <option value="">All Experts</option>
              {experts.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select 
              value={brcFilter} 
              onChange={(e) => setBrcFilter(e.target.value)}
              className="bg-white border border-outline/20 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary shadow-sm min-w-[200px]"
            >
              <option value="">All BRCs</option>
              {brcs.map(b => <option key={b.code} value={b.code}>{b.location}/{b.name}</option>)}
            </select>
          </div>
        </div>
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
              {forms.filter(f => {
                const matchesBrc = !brcFilter || (f.assignedTo && f.assignedTo.includes(brcFilter));
                const matchesExpert = !expertFilter || f.createdBy === expertFilter;
                return matchesBrc && matchesExpert;
              }).map(form => {
                const author = form.createdBy === 'unknown' ? 'Admin' : (experts.find(e => e.id === form.createdBy)?.name || form.createdBy);
                return (
                  <tr key={form.id} className="hover:bg-surface-container-low/50">
                    <td className="p-4 font-bold">{form.title}</td>
                    <td className="p-4 text-sm text-secondary">{author}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => togglePublish(form)} 
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.published ? 'bg-green-500' : 'bg-surface-container-highest'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.published ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-xs font-bold ${form.published ? 'text-green-700' : 'text-secondary'}`}>
                          {form.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      {form.published && (
                        <>
                          <button onClick={() => window.open(`/f/${form.id}`, '_blank')} className="p-2 text-primary hover:bg-primary/10 rounded-full" title="Open Form">
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                          </button>
                          <button onClick={() => copyLink(form.id)} className="p-2 text-primary hover:bg-primary/10 rounded-full" title="Copy Link">
                            <span className="material-symbols-outlined text-sm">link</span>
                          </button>
                        </>
                      )}
                      <button onClick={() => handleViewAnalytics(form)} className="p-2 text-primary hover:bg-primary/10 rounded-full" title="Analytics">
                        <span className="material-symbols-outlined text-sm">analytics</span>
                      </button>
                      <button onClick={() => { setSelectedFormToAssign(form); setShowAssignModal(true); }} className="p-2 text-secondary hover:bg-surface-container rounded-full" title="Assign to BRC">
                        <span className="material-symbols-outlined text-sm">domain_add</span>
                      </button>
                      <button onClick={() => handleDeleteForm(form)} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Delete Form">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {forms.filter(f => !brcFilter || (f.assignedTo && f.assignedTo.includes(brcFilter))).length === 0 && (
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
              <p className="text-secondary mb-6 text-sm">Select target BRCs for "{selectedFormToAssign?.title}".</p>
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="radio" checked={assignMode === 'SPECIFIC'} onChange={() => setAssignMode('SPECIFIC')} className="accent-primary" />
                    Specific
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="radio" checked={assignMode === 'DISTRICT'} onChange={() => setAssignMode('DISTRICT')} className="accent-primary" />
                    By District
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="radio" checked={assignMode === 'ALL'} onChange={() => setAssignMode('ALL')} className="accent-primary" />
                    All BRCs
                  </label>
                </div>

                {assignMode === 'SPECIFIC' && (
                  <div className="max-h-48 overflow-y-auto border border-outline/20 rounded-xl p-3 space-y-2">
                    {brcs.map(b => (
                      <label key={b.code} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-surface-container-low p-2 rounded-lg">
                        <input 
                          type="checkbox" 
                          className="accent-primary"
                          checked={assignBrcs.includes(b.code)}
                          onChange={(e) => {
                            if (e.target.checked) setAssignBrcs([...assignBrcs, b.code]);
                            else setAssignBrcs(assignBrcs.filter(code => code !== b.code));
                          }}
                        />
                        {b.location}/{b.name} ({b.code})
                      </label>
                    ))}
                    {brcs.length === 0 && <p className="text-sm text-secondary italic">No BRCs available.</p>}
                  </div>
                )}

                {assignMode === 'DISTRICT' && (
                  <select 
                    required 
                    value={assignDistrict}
                    onChange={(e) => setAssignDistrict(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  >
                    <option value="">Select a District...</option>
                    {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}

                {assignMode === 'ALL' && (
                  <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-bold border border-green-200">
                    This form will be assigned to all {brcs.length} registered BRCs.
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowAssignModal(false)} className="px-6 py-2 rounded-xl text-secondary hover:bg-surface-container font-bold">Cancel</button>
                  <button type="submit" disabled={assignMode === 'SPECIFIC' && assignBrcs.length === 0} className="px-6 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:opacity-90 disabled:opacity-50">Assign</button>
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
