import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../lib/api';
import MultiSelect from '../common/MultiSelect';

const PREDEFINED_CATEGORIES = [
  'Adhesive and tapes',
  'Art and craft supplies',
  'Audio and Visual equipment',
  'Audio and Visual tools',
  'Batteries and accessories',
  'Cables and Connectors',
  'Chem',
  'Cleaning Supplies',
  'Cutting and shaping tools',
  'Development Boards',
  'Digital fabrication',
  'Electronic components',
  'Electronic modules',
  'Essentials',
  'Fasteners',
  'Hand tools',
  'Lab Apparatus',
  'Laboratory instrument',
  'LED bulb kit',
  'Motors and wheels',
  'Plumbing Kit',
  'Prototyping materials',
  'Safety items',
  'Sensor modules',
  'Sewing kit',
  'Soldering kit',
  'Tools'
];

const PREDEFINED_SECTIONS = [
  "Craft station", "Digital Fabrication", "Electronics Work station",
  "Essentials", "Media station", "Safety corner", "Science Lab Corner",
  "Tools Display Board"
];

const PREDEFINED_LABELS = [
  "3D printing", "Adhesive and Tape", "Aluminium", "Arduino Modules", 
  "Arduino Shield", "Battery", "Breadboard", "Cables and Connectors", 
  "Capacitor", "Clay", "Cleaning", "Consumables", "Cutting and shaping tools", 
  "DIY LED Bulb Accessaries", "Diode", "Display", "ESP", "Fasteners", 
  "Foams", "Hand tools", "Heat Sleeve", "Hook-up Wire", "IC", 
  "Jumper Cables", "LED", "Lab Glass apparatus", "Lab Plastic apparatus", 
  "Lab apparatus", "Laser", "MOSFET", "Measuring devices", "Media", 
  "Microscopy", "Motor essentials", "Optics", "Painting", "Plotter", 
  "Plumbing Items", "Potentiometers", "Power supply", "Raspberry Pi Pico & Shield", 
  "Resistors", "Rulers", "Safety", "Sensor modules", "Sewing", 
  "Sheet", "Soldering kit", "Sound", "Switchs", "Transistors", 
  "USB Cable A to B", "USB Cable Micro", "lab"
];

export default function StockForms({ onActionComplete }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'bulkUpload', 'bulkUpdate'
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    itemName: '', category: '', uniqueId: '', quantity: 1, district: [], brc: [],
    section: '', label: '', imgFile: null
  });
  
  const [recentCreations, setRecentCreations] = useState([]);
  const [recentBulkUploads, setRecentBulkUploads] = useState([]);
  const [editingStock, setEditingStock] = useState(null);
  
  const [file, setFile] = useState(null);
  const [bulkUploadForm, setBulkUploadForm] = useState({ district: [], brc: [] });

  const [brcs, setBrcs] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [uniqueItemNames, setUniqueItemNames] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState(PREDEFINED_CATEGORIES);

  useEffect(() => {
    if (activeTab === 'create') {
      fetchRecentCreations();
    } else if (activeTab === 'bulkUpload') {
      fetchRecentBulkUploads();
    }
  }, [activeTab]);

  const fetchRecentCreations = async () => {
    try {
      const res = await api.get('/stocks?source=MANUAL&limit=10000');
      if (res.data?.data?.stocks) {
        setRecentCreations(res.data.data.stocks);
      }
    } catch (err) {
      console.error('Failed to fetch recent stocks:', err);
    }
  };

  const fetchRecentBulkUploads = async () => {
    try {
      const res = await api.get('/stocks?source=BULK&limit=10000');
      if (res.data?.data?.stocks) {
        setRecentBulkUploads(res.data.data.stocks);
      }
    } catch (err) {
      console.error('Failed to fetch recent bulk uploads:', err);
    }
  };

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
        const dbCategories = [...new Set(res.data.data.stocks.map(s => s.category))].filter(Boolean);
        setUniqueCategories(prev => [...new Set([...prev, ...dbCategories])].sort());
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
        const brcDistricts = brcsList.map(b => b.split('|')[1]);
        dists.forEach(d => {
          if (!brcDistricts.includes(d)) targets.push({ district: d, brc: '' });
        });
        brcsList.forEach(b => targets.push({ district: b.split('|')[1], brc: b.split('|')[0] }));
      }

      let imgUrl = '';
      if (createForm.imgFile) {
        const formData = new FormData();
        formData.append('img', createForm.imgFile);
        const uploadRes = await api.post('/stocks/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          imgUrl = uploadRes.data.url;
        }
      }

      const responses = await Promise.all(targets.map(t => 
        api.post('/stocks', { 
          ...createForm, 
          district: t.district, 
          brc: t.brc,
          newQty: createForm.quantity,
          availableQty: createForm.quantity,
          ...(imgUrl ? { img: imgUrl } : {})
        })
      ));
      
      const newStocks = responses.map(r => r.data.data.stock);
      setRecentCreations(prev => [...newStocks, ...prev]);

      showMessage('Stock item(s) created successfully!');
      setCreateForm({ itemName: '', category: '', uniqueId: '', quantity: 1, district: [], brc: [], section: '', label: '', imgFile: null });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to create stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const groupedCreations = useMemo(() => {
    const groups = {};
    recentCreations.forEach(stock => {
      const displayQty = stock.newQty ?? stock.quantity;
      const key = `${stock.itemName}-${stock.uniqueId}-${stock.category}`;
      if (!groups[key]) {
        groups[key] = {
          ...stock,
          ids: [stock.id],
          brcs: stock.brc ? [`${stock.brc}|${stock.district}`] : [],
          districts: stock.district ? [stock.district] : [],
          isNewItem: stock._isNew
        };
      } else {
        if (!groups[key].ids.includes(stock.id)) {
          groups[key].ids.push(stock.id);
        }
        if (stock.brc) {
          const bVal = `${stock.brc}|${stock.district}`;
          if (!groups[key].brcs.includes(bVal)) groups[key].brcs.push(bVal);
        }
        if (stock.district && !groups[key].districts.includes(stock.district)) {
          groups[key].districts.push(stock.district);
        }
      }
    });
    return Object.values(groups);
  }, [recentCreations]);

  const groupedBulkUploads = useMemo(() => {
    const groups = {};
    recentBulkUploads.forEach(stock => {
      const displayQty = stock.newQty ?? stock.quantity;
      const key = `${stock.itemName}-${stock.uniqueId}-${stock.category}`;
      if (!groups[key]) {
        groups[key] = {
          ...stock,
          ids: [stock.id],
          brcs: stock.brc ? [`${stock.brc}|${stock.district}`] : [],
          districts: stock.district ? [stock.district] : [],
          isNewItem: stock._isNew,
          isBulk: true
        };
      } else {
        if (!groups[key].ids.includes(stock.id)) {
          groups[key].ids.push(stock.id);
        }
        if (stock.brc) {
          const bVal = `${stock.brc}|${stock.district}`;
          if (!groups[key].brcs.includes(bVal)) groups[key].brcs.push(bVal);
        }
        if (stock.district && !groups[key].districts.includes(stock.district)) {
          groups[key].districts.push(stock.district);
        }
      }
    });
    return Object.values(groups);
  }, [recentBulkUploads]);

  const handleDeleteRecent = async (ids, isBulk = false) => {
    if (!window.confirm('Are you sure you want to delete this stock from all locations?')) return;
    try {
      await Promise.all(ids.map(id => api.delete(`/stocks/${id}`)));
      if (isBulk) {
        setRecentBulkUploads(prev => prev.filter(s => !ids.includes(s.id)));
      } else {
        setRecentCreations(prev => prev.filter(s => !ids.includes(s.id)));
      }
      showMessage('Stock deleted successfully');
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to delete stock', 'error');
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Delete old ones
      await Promise.all(editingStock.ids.map(id => api.delete(`/stocks/${id}`)));
      
      const dists = Array.isArray(editingStock.districts) ? editingStock.districts : (editingStock.districts ? [editingStock.districts] : []);
      const brcsList = Array.isArray(editingStock.brcs) ? editingStock.brcs : (editingStock.brcs ? [editingStock.brcs] : []);
      
      const targets = [];
      if (dists.length === 0 && brcsList.length === 0) {
        targets.push({ district: '', brc: '' });
      } else {
        const brcDistricts = brcsList.map(b => b.split('|')[1]);
        dists.forEach(d => {
          if (!brcDistricts.includes(d)) targets.push({ district: d, brc: '' });
        });
        brcsList.forEach(b => targets.push({ district: b.split('|')[1], brc: b.split('|')[0] }));
      }

      let imgUrl = editingStock.img || '';
      if (editingStock.imgFile) {
        const formData = new FormData();
        formData.append('img', editingStock.imgFile);
        const uploadRes = await api.post('/stocks/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          imgUrl = uploadRes.data.url;
        }
      }

      const responses = await Promise.all(targets.map(t => 
        api.post('/stocks', { 
          itemName: editingStock.itemName,
          category: editingStock.category,
          uniqueId: editingStock.uniqueId,
          quantity: editingStock.quantity,
          newQty: editingStock.quantity,
          availableQty: editingStock.quantity,
          section: editingStock.section,
          label: editingStock.label,
          district: t.district, 
          brc: t.brc,
          ...(imgUrl ? { img: imgUrl } : {})
        })
      ));
      
      const newStocks = responses.map(r => r.data.data.stock);
      
      if (editingStock.isBulk) {
        setRecentBulkUploads(prev => {
          const filtered = prev.filter(s => !editingStock.ids.includes(s.id));
          return [...newStocks, ...filtered];
        });
      } else {
        setRecentCreations(prev => {
          const filtered = prev.filter(s => !editingStock.ids.includes(s.id));
          return [...newStocks, ...filtered];
        });
      }
      setEditingStock(null);
      showMessage('Stock updated successfully');
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to update stock', 'error');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Item Name', 'Category', 'Unique Id', 'Quantity'];
    const sampleRows = [
      ['Sample Arduino Uno', 'Development Boards', 'UID-1001', '10'],
      ['Sample Resistors 10k', 'Electronic components', '', '100']
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Stock_Bulk_Upload_Template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!file) return showMessage('Please select a file to upload', 'error');

    if (!bulkUploadForm.district || bulkUploadForm.district.length === 0) {
      return showMessage('Please select at least one District', 'error');
    }
    if (!bulkUploadForm.brc || bulkUploadForm.brc.length === 0) {
      return showMessage('Please select at least one BRC', 'error');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('districts', JSON.stringify(bulkUploadForm.district));
    formData.append('brcs', JSON.stringify(bulkUploadForm.brc));

    setLoading(true);
    try {
      const response = await api.post('/stocks/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showMessage('Bulk upload completed successfully!');
      
      if (response.data?.data?.stocks) {
        setRecentBulkUploads(prev => [...response.data.data.stocks, ...prev]);
      }
      
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setBulkUploadForm({ district: [], brc: [] });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to upload bulk stocks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDistrictChange = (newDistricts, currentBrcs, updateFormState) => {
    const validBrcs = (currentBrcs || []).filter(brcVal => {
      const [code, district] = brcVal.split('|');
      // Only keep BRCs whose district is currently selected
      return newDistricts.includes(district);
    });
    updateFormState(newDistricts, validBrcs);
  };

  const handleBrcChange = (newBrcs, currentDistricts, updateFormState) => {
    const brcDistricts = [...new Set(newBrcs.map(brcVal => brcVal.split('|')[1]))].filter(Boolean);
    const mergedDistricts = [...new Set([...(currentDistricts || []), ...brcDistricts])];
    updateFormState(mergedDistricts, newBrcs);
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
                value={createForm.uniqueId} onChange={e => setCreateForm({...createForm, uniqueId: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input required type="number" min="1" className="w-full border rounded px-3 py-2" 
                value={createForm.quantity} onChange={e => setCreateForm({...createForm, quantity: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
              <select className="w-full border rounded px-3 py-2 bg-white" 
                value={createForm.section} onChange={e => setCreateForm({...createForm, section: e.target.value})}>
                <option value="">-- Select Section --</option>
                {PREDEFINED_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
              <select className="w-full border rounded px-3 py-2 bg-white" 
                value={createForm.label} onChange={e => setCreateForm({...createForm, label: e.target.value})}>
                <option value="">-- Select Label --</option>
                {PREDEFINED_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
              <input type="file" accept="image/*" className="w-full border rounded px-3 py-2" 
                onChange={e => setCreateForm({...createForm, imgFile: e.target.files[0]})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">District (Multiple)</label>
              <MultiSelect 
                options={districts.map(d => ({ value: d, label: d }))}
                selected={createForm.district}
                onChange={(newSelected) => handleDistrictChange(newSelected, createForm.brc, (d, b) => setCreateForm({...createForm, district: d, brc: b}))}
                placeholder="-- Select Districts --"
                showSelectAll={true}
                selectAllLabel="All Districts"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">BRC (Multiple)</label>
              <MultiSelect 
                options={(createForm.district?.length > 0 ? brcs.filter(b => createForm.district.includes(b.district)) : brcs).map(b => ({ value: `${b.code}|${b.district}`, label: `${b.location}/${b.name}` }))}
                selected={createForm.brc}
                onChange={(newSelected) => handleBrcChange(newSelected, createForm.district, (d, b) => setCreateForm({...createForm, district: d, brc: b}))}
                placeholder="-- Select BRCs --"
                showSelectAll={true}
                selectAllLabel="All BRCs"
              />
            </div>
          </div>
          <button disabled={loading} type="submit" className="bg-primary text-on-primary px-4 py-2 rounded font-bold hover:opacity-90 disabled:opacity-50 transition-all">
            {loading ? 'Creating...' : 'Create Stock'}
          </button>
        </form>
      )}

      {/* RECENTLY CREATED TABLE */}
      {activeTab === 'create' && recentCreations.length > 0 && (
        <div className="mt-10 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Recently Created Stocks</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Unique No</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">BRC / School Name</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedCreations.map(group => (
                  <tr key={group.ids.join(',')} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{group.itemName}</td>
                    <td className="px-4 py-3 text-slate-600">{group.uniqueId}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{group.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {group.brcs.length > 0 
                        ? group.brcs.map(b => { const found = brcs.find(x => `${x.code}|${x.district}` === b); return found ? `${found.location}/${found.name}` : b.split('|')[0]; }).join(', ') 
                        : group.districts.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{group.newQty ?? group.quantity}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                       <button onClick={() => setEditingStock(group)} className="text-blue-600 hover:text-blue-800 font-medium transition-colors">Edit</button>
                       <button onClick={() => handleDeleteRecent(group.ids)} className="text-red-600 hover:text-red-800 font-medium transition-colors">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingStock && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[100] p-4 pt-16 pb-16 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-xl text-slate-800">Edit Created Stock</h3>
              <button onClick={() => setEditingStock(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                 <input autoFocus={!editingStock.isBulk} type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500" 
                   value={editingStock.itemName} onChange={e => setEditingStock({...editingStock, itemName: e.target.value})} />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Unique No</label>
                 <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500" 
                   value={editingStock.uniqueId || ''} onChange={e => setEditingStock({...editingStock, uniqueId: e.target.value})} />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                 <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500" 
                   value={editingStock.quantity} onChange={e => setEditingStock({...editingStock, quantity: Number(e.target.value)})} />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                 <select className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500" 
                   value={editingStock.category} onChange={e => setEditingStock({...editingStock, category: e.target.value})}>
                   {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                 <select className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500" 
                   value={editingStock.section || ''} onChange={e => setEditingStock({...editingStock, section: e.target.value})}>
                   <option value="">-- Select Section --</option>
                   {PREDEFINED_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
               
               <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500" 
                    value={editingStock.label || ''} onChange={e => setEditingStock({...editingStock, label: e.target.value})}>
                    <option value="">-- Select Label --</option>
                    {PREDEFINED_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Update Photo (Optional)</label>
                  {editingStock.img && (
                    <div className="mb-2">
                      <img src={editingStock.img} alt="Current" className="h-16 w-16 object-cover rounded border" />
                    </div>
                  )}
                  <input type="file" accept="image/*" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500" 
                    onChange={e => setEditingStock({...editingStock, imgFile: e.target.files[0]})} />
                </div>
               
               <div className="col-span-2 sm:col-span-1">
                 <label className="block text-sm font-medium text-slate-700 mb-1">District (Multiple)</label>
                 <MultiSelect 
                   options={districts.map(d => ({ value: d, label: d }))}
                   selected={editingStock.districts}
                   onChange={(newSelected) => handleDistrictChange(newSelected, editingStock.brcs, (d, b) => setEditingStock({...editingStock, districts: d, brcs: b}))}
                   placeholder="-- Select Districts --"
                   showSelectAll={true}
                   selectAllLabel="All Districts"
                 />
               </div>
               <div className="col-span-2 sm:col-span-1">
                 <label className="block text-sm font-medium text-slate-700 mb-1">BRC (Multiple)</label>
                 <MultiSelect 
                   options={(editingStock.districts?.length > 0 ? brcs.filter(b => editingStock.districts.includes(b.district)) : brcs).map(b => ({ value: `${b.code}|${b.district}`, label: `${b.location}/${b.name}` }))}
                   selected={editingStock.brcs}
                   onChange={(newSelected) => handleBrcChange(newSelected, editingStock.districts, (d, b) => setEditingStock({...editingStock, districts: d, brcs: b}))}
                   placeholder="-- Select BRCs --"
                   showSelectAll={true}
                   selectAllLabel="All BRCs"
                 />
               </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-3">
               <button onClick={() => setEditingStock(null)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                 Cancel
               </button>
               <button onClick={handleSaveEdit} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors">
                 Save Changes
               </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK UPLOAD TAB */}
      {activeTab === 'bulkUpload' && (
        <form onSubmit={handleBulkUpload} className="space-y-4 max-w-lg">
          <p className="text-sm text-slate-600">
            Upload a CSV (.csv) file containing stock data. Please download and use the CSV template below.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">District (Multiple) *</label>
              <MultiSelect 
                options={districts.map(d => ({ value: d, label: d }))}
                selected={bulkUploadForm.district}
                onChange={(newSelected) => handleDistrictChange(newSelected, bulkUploadForm.brc, (d, b) => setBulkUploadForm({...bulkUploadForm, district: d, brc: b}))}
                placeholder="-- Select Districts --"
                showSelectAll={true}
                selectAllLabel="All Districts"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">BRC (Multiple) *</label>
              <MultiSelect 
                options={(bulkUploadForm.district?.length > 0 ? brcs.filter(b => bulkUploadForm.district.includes(b.district)) : brcs).map(b => ({ value: `${b.code}|${b.district}`, label: `${b.location}/${b.name}` }))}
                selected={bulkUploadForm.brc}
                onChange={(newSelected) => handleBrcChange(newSelected, bulkUploadForm.district, (d, b) => setBulkUploadForm({...bulkUploadForm, district: d, brc: b}))}
                placeholder="-- Select BRCs --"
                showSelectAll={true}
                selectAllLabel="All BRCs"
              />
            </div>
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full"
            />
          </div>
          <div className="flex gap-4">
            <button disabled={loading} type="submit" className="bg-primary text-on-primary px-4 py-2 rounded font-bold hover:opacity-90 disabled:opacity-50 transition-all">
              {loading ? 'Uploading...' : 'Process Upload'}
            </button>
            <button type="button" onClick={handleDownloadTemplate} className="bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded font-medium hover:bg-slate-200 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download CSV Template
            </button>
          </div>
        </form>
      )}

      {/* RECENTLY BULK UPLOADED TABLE */}
      {activeTab === 'bulkUpload' && recentBulkUploads.length > 0 && (
        <div className="mt-10 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Recently Uploaded Stocks</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Unique No</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">BRC / School Name</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedBulkUploads.map(group => (
                  <tr key={group.ids.join(',')} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{group.itemName}</td>
                    <td className="px-4 py-3 text-slate-600">{group.uniqueId}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{group.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {group.brcs.length > 0 
                        ? group.brcs.map(b => { const found = brcs.find(x => `${x.code}|${x.district}` === b); return found ? `${found.location}/${found.name}` : b.split('|')[0]; }).join(', ') 
                        : group.districts.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{group.newQty ?? group.quantity}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                       <button onClick={() => setEditingStock(group)} className="text-blue-600 hover:text-blue-800 font-medium transition-colors">Edit</button>
                       <button onClick={() => handleDeleteRecent(group.ids, true)} className="text-red-600 hover:text-red-800 font-medium transition-colors">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}
