import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import MultiSelect from '../common/MultiSelect';

export default function StockForms({ onActionComplete }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'bulkUpload', 'bulkUpdate'
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    itemName: '', category: '', serialNumber: '', quantity: 1, district: [], brc: []
  });
  
  const [file, setFile] = useState(null);
  const [updateForm, setUpdateForm] = useState({ itemName: '', brc: '', status: '', category: '' });

  const [brcs, setBrcs] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [uniqueItemNames, setUniqueItemNames] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);

  useEffect(() => {
    api.get('/brcs').then(res => {
      if (Array.isArray(res.data)) {
        setBrcs(res.data);
        const dists = [...new Set(res.data.map(b => b.district))].filter(Boolean);
        setDistricts(dists);
      }
    }).catch(console.error);
    
    api.get('/stocks').then(res => {
      if (res.data?.data?.stocks) {
        const itemNames = [...new Set(res.data.data.stocks.map(s => s.itemName))].filter(Boolean);
        setUniqueItemNames(itemNames);
        const categories = [...new Set(res.data.data.stocks.map(s => s.category))].filter(Boolean);
        setUniqueCategories(categories);
      }
    }).catch(console.error);
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dists = Array.isArray(createForm.district) ? createForm.district : (createForm.district ? [createForm.district] : []);
      const brcsList = Array.isArray(createForm.brc) ? createForm.brc : (createForm.brc ? [createForm.brc] : []);
      
      const targets = [];
      if (dists.length === 0 && brcsList.length === 0) {
        targets.push({ district: '', brc: '' });
      } else {
        dists.forEach(d => targets.push({ district: d, brc: '' }));
        brcsList.forEach(b => targets.push({ district: '', brc: b }));
      }

      await Promise.all(targets.map(t => 
        api.post('/stocks', { ...createForm, district: t.district, brc: t.brc })
      ));

      showMessage('Stock item(s) created successfully!');
      setCreateForm({ itemName: '', category: '', serialNumber: '', quantity: 1, district: [], brc: [] });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to create stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!file) return showMessage('Please select a file to upload', 'error');

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      await api.post('/stocks/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showMessage('Bulk upload completed successfully!');
      setFile(null);
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to upload bulk stocks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    if (!updateForm.status && !updateForm.category) {
      return showMessage('Please select a field to update', 'error');
    }

    setLoading(true);
    try {
      const res = await api.put('/stocks/bulk-update', updateForm);
      showMessage(res.data.message || 'Bulk update successful');
      setUpdateForm({ itemName: '', brc: '', status: '', category: '' });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to perform bulk update', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
      
      {/* Internal Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button 
          className={`pb-2 px-4 font-medium text-sm ${activeTab === 'create' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('create')}
        >
          Create Stock
        </button>
        <button 
          className={`pb-2 px-4 font-medium text-sm ${activeTab === 'bulkUpload' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('bulkUpload')}
        >
          Bulk Upload
        </button>
        <button 
          className={`pb-2 px-4 font-medium text-sm ${activeTab === 'bulkUpdate' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('bulkUpdate')}
        >
          Bulk Update
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.text}
        </div>
      )}

      {/* CREATE TAB */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
              <input required type="text" className="w-full border rounded px-3 py-2" 
                value={createForm.itemName} onChange={e => setCreateForm({...createForm, itemName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select required className="w-full border rounded px-3 py-2 bg-white" 
                value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})}>
                <option value="">-- Select Category --</option>
                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                {/* Fallback for adding new categories manually could be handled here or elsewhere, sticking to simple select for now */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unique No</label>
              <input type="text" className="w-full border rounded px-3 py-2" 
                value={createForm.serialNumber} onChange={e => setCreateForm({...createForm, serialNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input required type="number" min="1" className="w-full border rounded px-3 py-2" 
                value={createForm.quantity} onChange={e => setCreateForm({...createForm, quantity: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">District (Multiple)</label>
              <MultiSelect 
                options={districts.map(d => ({ value: d, label: d }))}
                selected={createForm.district}
                onChange={(newSelected) => setCreateForm({...createForm, district: newSelected})}
                placeholder="-- Select Districts --"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">BRC (Multiple)</label>
              <MultiSelect 
                options={brcs.map(b => ({ value: b.code, label: b.name }))}
                selected={createForm.brc}
                onChange={(newSelected) => setCreateForm({...createForm, brc: newSelected})}
                placeholder="-- Select BRCs --"
              />
            </div>
          </div>
          <button disabled={loading} type="submit" className="bg-primary text-on-primary px-4 py-2 rounded font-bold hover:opacity-90 disabled:opacity-50 transition-all">
            {loading ? 'Creating...' : 'Create Stock'}
          </button>
        </form>
      )}

      {/* BULK UPLOAD TAB */}
      {activeTab === 'bulkUpload' && (
        <form onSubmit={handleBulkUpload} className="space-y-4 max-w-lg">
          <p className="text-sm text-slate-600">
            Upload an Excel (.xlsx) or CSV file containing stock data. Alternatively, if you have a PDF, you can try uploading it here.
          </p>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full"
            />
          </div>
          <button disabled={loading} type="submit" className="bg-primary text-on-primary px-4 py-2 rounded font-bold hover:opacity-90 disabled:opacity-50 transition-all">
            {loading ? 'Uploading...' : 'Process Upload'}
          </button>
        </form>
      )}

      {/* BULK UPDATE TAB */}
      {activeTab === 'bulkUpdate' && (
        <form onSubmit={handleBulkUpdate} className="space-y-4 max-w-lg">
          <p className="text-sm text-slate-600">
            Update properties for specific items across all hubs, or restrict to a single hub.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Item Name (Optional)</label>
              <select className="w-full border rounded px-3 py-2 bg-white" 
                value={updateForm.itemName} onChange={e => setUpdateForm({...updateForm, itemName: e.target.value})}>
                <option value="">-- All Items --</option>
                {uniqueItemNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target BRC Hub (Optional)</label>
              <select className="w-full border rounded px-3 py-2 bg-white" 
                value={updateForm.brc} onChange={e => setUpdateForm({...updateForm, brc: e.target.value})}>
                <option value="">-- All Hubs --</option>
                {brcs.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Change All Status To</label>
              <select className="w-full border rounded px-3 py-2 bg-white" 
                value={updateForm.status} onChange={e => setUpdateForm({...updateForm, status: e.target.value})}>
                <option value="">-- Do Not Change --</option>
                <option value="ACTIVE">Active</option>
                <option value="DEFECTIVE">Defective</option>
                <option value="IN_REPAIR">In Repair</option>
              </select>
            </div>
          </div>
          <button disabled={loading} type="submit" className="bg-primary text-on-primary px-4 py-2 rounded font-bold hover:opacity-90 disabled:opacity-50 transition-all">
            {loading ? 'Updating...' : 'Update Selected Hubs'}
          </button>
        </form>
      )}
    </div>
  );
}
