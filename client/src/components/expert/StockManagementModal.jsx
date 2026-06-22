import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';
import { useAuth } from '../../features/auth/AuthContext';

const STATUSES = ['All Status', 'ACTIVE', 'CONSUMED', 'USED', 'DAMAGED'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Predefined colors for major categories, fallback generated later
const CATEGORY_COLORS = {
  'Electronics': { accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: 'electrical_services' },
  'Electronic components': { accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: 'memory' },
  'Electronic modules': { accent: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: 'developer_board' },
  'Art Supplies': { accent: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', icon: 'palette' },
  'Art and craft supplies': { accent: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', icon: 'brush' },
  'Craft': { accent: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', icon: 'content_cut' },
  'Science': { accent: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: 'biotech' },
  'Tools': { accent: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: 'home_repair_service' },
  'Hand tools': { accent: '#475569', bg: '#f1f5f9', border: '#cbd5e1', icon: 'handyman' },
  'Media': { accent: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', icon: 'perm_media' },
  'Sensor modules': { accent: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', icon: 'sensors' },
  'Lab appratus': { accent: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: 'science' },
};

const STATUS_CONFIG = {
  'ACTIVE':   { label: 'Active',   color: '#16a34a', bg: '#f0fdf4' },
  'CONSUMED': { label: 'Consumed', color: '#ea580c', bg: '#fff7ed' },
  'USED':     { label: 'Used',     color: '#2563eb', bg: '#eff6ff' },
  'DAMAGED':  { label: 'Damaged',  color: '#dc2626', bg: '#fef2f2' },
};

const LOW_STOCK_THRESHOLD = 3;

// Helper: build the correct absolute URL for a stock image
const resolveImgUrl = (img) => {
  if (!img || img === '') return null;
  // Already an absolute URL
  if (img.startsWith('http')) return img;
  // Strip leading /api prefix — images are served at /api/uploads/...
  const apiBase = import.meta.env.VITE_API_URL || '/api';
  // If the img path starts with /api/, replace that prefix with the actual API base
  if (img.startsWith('/api/')) {
    return `${apiBase}${img.slice(4)}`; // /api/uploads/x.jpg → {base}/uploads/x.jpg
  }
  // If it starts with /uploads/ or just a filename
  if (img.startsWith('/uploads/') || img.startsWith('uploads/')) {
    return `${apiBase}/${img.replace(/^\//, '')}`;
  }
  // Fallback: prepend apiBase
  return `${apiBase}/${img}`;
};

export default function StockManagementModal({ brcCode, brcName, onClose, inline = false, isViewOnly = false }) {
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStock, setEditingStock] = useState(null);
  const [alertSending, setAlertSending] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    uniqueId: '', itemName: '', category: '', newQty: '', availableQty: 0,
    usedQty: 0, damagedQty: 0, consumedQty: 0, remarks: '', section: '', label: '', imgFile: null
  });

  const handleClose = () => { setIsClosing(true); setTimeout(onClose, 300); };
  const showFeedback = (type, text) => { setFeedback({ type, text }); setTimeout(() => setFeedback(null), 3000); };

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('brc', brcCode);
      params.append('limit', '1000');
      const response = await api.get(`/stocks?${params.toString()}`);
      if (response.data?.success) {
        setStocks(response.data.data.stocks || []);
      }
    } catch (err) {
      console.error('Failed to fetch stocks', err);
      showFeedback('error', 'Failed to load stock inventory.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStocks(); }, [brcCode]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(stocks.map(s => s.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    let result = [...stocks];
    if (selectedCategory !== 'All') result = result.filter(s => s.category === selectedCategory);
    if (selectedStatus === 'ACTIVE') {
      result = result.filter(s => (s.availableQty ?? s.newQty ?? s.quantity ?? 0) > 0);
    } else if (selectedStatus === 'CONSUMED') {
      result = result.filter(s => (s.consumedQty || 0) > 0);
    } else if (selectedStatus === 'USED') {
      result = result.filter(s => (s.usedQty || 0) > 0);
    } else if (selectedStatus === 'DAMAGED') {
      result = result.filter(s => (s.damagedQty || 0) > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        (s.itemName || '').toLowerCase().includes(q) ||
        (s.uniqueId || '').toLowerCase().includes(q) ||
        (s.spaceCode || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [stocks, selectedCategory, selectedStatus, searchQuery]);

  const sendRemarkMessage = async (stock, newRemark) => {
    if (!newRemark || newRemark.trim() === '') return;
    try {
      const content = `📦 Item: ${stock.itemName} (${stock.category})\n📍 Location: ${brcName}, ${stock.district || 'NA'}\n💬 Remark: "${newRemark.trim()}"`;
      await api.post('/messages', {
        type: 'STOCK_REMARK',
        title: `📝 New Remark: ${stock.itemName}`,
        content: content,
        to: ['ADMIN'],
        message: content,
        brc: brcCode,
        priority: 'NORMAL',
      });
    } catch (e) {
      console.error('Failed to send remark message', e);
    }
  };

  const categoryCounts = useMemo(() => {
    const c = {};
    stocks.forEach(s => { const cat = s.category || 'Other'; c[cat] = (c[cat] || 0) + 1; });
    return c;
  }, [stocks]);

  const updateStockField = async (id, updates) => {
    if (!updates.month) {
      updates.month = MONTHS[new Date().getMonth()];
    }

    try {
      const response = await api.put(`/stocks/${id}`, updates);
      if (response.data?.success) {
        setStocks(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        showFeedback('success', 'Stock updated.');
      }
    } catch (err) {
      console.error(err);
      showFeedback('error', err.response?.data?.message || err.message || 'Failed to update stock.');
    }
    setEditingStock(null);
  };

  const handleQuantityUpdate = (stock, field, value) => {
    let val = parseInt(value) || 0;
    const maxVal = stock.newQty || stock.quantity || 0;

    if (val === (stock[field] || 0)) return;

    const updates = { [field]: val };

    if (['usedQty', 'damagedQty', 'consumedQty'].includes(field)) {
       const used = field === 'usedQty' ? val : (stock.usedQty || 0);
       const damaged = field === 'damagedQty' ? val : (stock.damagedQty || 0);
       const consumed = field === 'consumedQty' ? val : (stock.consumedQty || 0);
       
       let newAvailable = maxVal - used - damaged - consumed;
       if (newAvailable < 0) newAvailable = 0;
       
       updates.availableQty = newAvailable;
    } else if (field === 'availableQty') {
       if (val > maxVal) val = maxVal;
       updates.availableQty = val;
    }

    updateStockField(stock.id, updates);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newItemForm.itemName || !newItemForm.uniqueId) return showFeedback('error', 'Item Name and Unique ID are required');
    if (!newItemForm.imgFile) return showFeedback('error', 'Please upload a photo of the equipment');
    
    const finalCategory = newItemForm.category === 'Other' ? (newItemForm.customCategory || 'Other') : newItemForm.category;
    if (!finalCategory) return showFeedback('error', 'Please select or enter a category');

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('uniqueId', newItemForm.uniqueId);
      formData.append('itemName', newItemForm.itemName);
      formData.append('category', finalCategory);
      formData.append('section', newItemForm.section);
      formData.append('label', newItemForm.label);
      formData.append('newQty', newItemForm.newQty);
      formData.append('availableQty', newItemForm.availableQty);
      formData.append('usedQty', newItemForm.usedQty);
      formData.append('damagedQty', newItemForm.damagedQty);
      formData.append('consumedQty', newItemForm.consumedQty);
      formData.append('remarks', newItemForm.remarks);
      formData.append('brc', brcCode);
      formData.append('district', 'NA');
      formData.append('img', newItemForm.imgFile);

      const response = await api.post('/stocks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.success) {
        const addedStock = response.data.data.stock;
        setStocks(prev => [addedStock, ...prev]);
        
        await api.post('/messages', {
          type: 'NEW_ITEM_ALERT',
          title: `✨ New Item Added: ${addedStock.itemName}`,
          message: `Expert manually added "${addedStock.itemName}" (${addedStock.uniqueId}) with quantity ${addedStock.newQty} at ${brcName}.`,
          brc: brcCode,
          priority: 'NORMAL',
        });

        showFeedback('success', 'New item added successfully!');
        setIsAddingItem(false);
        setNewItemForm({ uniqueId: '', itemName: '', category: '', customCategory: '', newQty: '', availableQty: 0, usedQty: 0, damagedQty: 0, consumedQty: 0, remarks: '', section: '', label: '', imgFile: null });
      }
    } catch (err) {
      showFeedback('error', 'Failed to add new item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this newly added item?')) return;
    try {
      const response = await api.delete(`/stocks/${id}`);
      if (response.data?.success) {
        setStocks(prev => prev.filter(s => s.id !== id));
        showFeedback('success', 'Item deleted successfully.');
      }
    } catch (err) {
      showFeedback('error', 'Failed to delete item.');
    }
  };

  const sendLowStockAlert = async (stock) => {
    setAlertSending(stock.id);
    const available = Number(stock.availableQty || 0);
    const original = Number(stock.newQty || stock.quantity || 0);
    const isOutOfStock = available === 0 && original > 0;
    const alertContent = isOutOfStock
      ? `🚨 OUT OF STOCK: "${stock.itemName}" (${stock.uniqueId}) at ${brcName}. Available: 0 / Original: ${original}`
      : `⚠️ Low Stock: "${stock.itemName}" (${stock.uniqueId}) at ${brcName}. Available: ${available} / Original: ${original}`;
    try {
      await api.post('/messages', {
        type: isOutOfStock ? 'OUT_OF_STOCK_ALERT' : 'LOW_STOCK_ALERT',
        title: isOutOfStock ? `🚨 Out of Stock: ${stock.itemName}` : `⚠️ Low Stock: ${stock.itemName}`,
        content: alertContent,
        to: ['ADMIN'],
        message: alertContent,
        brc: brcCode,
        priority: isOutOfStock ? 'CRITICAL' : 'HIGH',
      });
      showFeedback('success', `Alert sent to admin for "${stock.itemName}"`);
    } catch { showFeedback('success', `Alert sent for "${stock.itemName}"`); }
    setAlertSending(null);
  };

  const handleDownloadCsv = async () => {
    try {
      const response = await api.get(`/stocks/reports/download?format=csv&brc=${brcCode}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Stock_Report_${brcCode}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { console.error('Failed to download CSV', e); }
  };

  const getCatStyle = (cat) => CATEGORY_COLORS[cat] || { accent: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', icon: 'inventory_2' };
  const getStatusStyle = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.ACTIVE;

  // Grid template for all columns: #, UniqueID, IMG, Item, Category, NewQty, Available, Used, Damaged, Consumed, Remarks, Section, Label, Actions
  const gridCols = `30px minmax(65px, 0.8fr) 35px minmax(120px, 1.5fr) minmax(70px, 1fr) minmax(40px, 0.6fr) minmax(40px, 0.6fr) minmax(40px, 0.6fr) minmax(40px, 0.6fr) minmax(40px, 0.6fr) minmax(100px, 1.2fr) minmax(60px, 1fr) minmax(60px, 1fr)${isViewOnly ? '' : ' 60px'}`;

  const content = (
    <div className={`relative bg-white w-full overflow-hidden flex flex-col ${inline ? 'h-[75vh] border border-slate-200 rounded-2xl shadow-sm' : `max-w-[1500px] rounded-2xl shadow-2xl h-[94vh] ${isClosing ? 'animate-fade-out-down' : 'animate-fade-in-up'}`}`}>

        {/* ─── Header ─── */}
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} className="px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">inventory_2</span>
            </div>
            <div>
              <h3 className="text-xl text-white tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Stock Management</h3>
              <p className="text-white/70 text-[11px]">{brcName} — STREAM Ecosystem Hub Items Check List</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadCsv} className="h-9 px-3 bg-white/15 backdrop-blur-sm rounded-lg flex items-center gap-1.5 text-white text-xs hover:bg-white/25 transition-colors">
              <span className="material-symbols-outlined text-base">download</span>Export CSV
            </button>
            {!inline && (
              <button onClick={handleClose} className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-amber-600 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Filter Bar ─── */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-3 items-center shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-gray-400 text-base">category</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 outline-none focus:border-amber-400 shadow-sm cursor-pointer min-w-[150px]">
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat === 'All' ? `All Categories (${stocks.length})` : `${cat} (${categoryCounts[cat] || 0})`}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-gray-400 text-base">filter_list</span>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 outline-none focus:border-amber-400 shadow-sm cursor-pointer min-w-[140px]">
              {STATUSES.map(s => (
                <option key={s} value={s}>{s === 'All Status' ? 'All Status' : STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-grow max-w-[220px]">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
            <input type="text" placeholder="Search name, ID, code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-400 shadow-sm" />
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 shadow-sm flex items-center gap-1.5 cursor-default" title="Current Inventory Month">
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              {MONTHS[new Date().getMonth()]}
            </div>
          </div>
          {!isViewOnly && (
            <button onClick={() => setIsAddingItem(true)} className="w-9 h-9 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors shadow-sm" title="Add New Item">
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
          )}
          <span className="ml-auto text-[10px] text-gray-400 font-medium">
            {filteredStocks.length} of {stocks.length} items
          </span>
        </div>

        {/* ─── Feedback Toast ─── */}
        {feedback && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
            <div className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xl ${feedback.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
              <span className="material-symbols-outlined text-sm">{feedback.type === 'error' ? 'error' : 'check_circle'}</span>
              {feedback.text}
            </div>
          </div>
        )}

        {/* ─── Add Item Overlay Modal ─── */}
        {isAddingItem && (
          <div className="absolute inset-0 z-[55] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleAddItem} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-fade-in-up">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">add_box</span>
                  Add New Equipment
                </h3>
                <button type="button" onClick={() => setIsAddingItem(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-6 grid grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto">
                <div className="col-span-3 lg:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Unique ID *</label>
                  <input required type="text" value={newItemForm.uniqueId} onChange={e => setNewItemForm({...newItemForm, uniqueId: e.target.value})} className="w-full text-xs p-2 border rounded-lg focus:border-amber-400 outline-none" />
                </div>
                <div className="col-span-3 lg:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Item Name *</label>
                  <input required type="text" value={newItemForm.itemName} onChange={e => setNewItemForm({...newItemForm, itemName: e.target.value})} className="w-full text-xs p-2 border rounded-lg focus:border-amber-400 outline-none" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category *</label>
                  <select required value={newItemForm.category} onChange={e => setNewItemForm({...newItemForm, category: e.target.value})} className="w-full text-xs p-2 border rounded-lg focus:border-amber-400 outline-none bg-white">
                    <option value="" disabled>Select Category...</option>
                    <option value="Other">Add New (Custom)</option>
                    {uniqueCategories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {newItemForm.category === 'Other' && (
                    <input required type="text" placeholder="Type custom category..." value={newItemForm.customCategory || ''} onChange={e => setNewItemForm({...newItemForm, customCategory: e.target.value})} className="w-full text-xs p-2 border rounded-lg focus:border-amber-400 outline-none mt-2" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Section *</label>
                  <input required type="text" value={newItemForm.section} onChange={e => setNewItemForm({...newItemForm, section: e.target.value})} className="w-full text-xs p-2 border rounded-lg focus:border-amber-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Label *</label>
                  <input required type="text" value={newItemForm.label} onChange={e => setNewItemForm({...newItemForm, label: e.target.value})} className="w-full text-xs p-2 border rounded-lg focus:border-amber-400 outline-none" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Equipment Photo *</label>
                  <input required type="file" accept="image/*" onChange={e => setNewItemForm({...newItemForm, imgFile: e.target.files[0]})} className="w-full text-xs p-1.5 border rounded-lg focus:border-amber-400 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">New Quantity *</label>
                  <input required type="number" min="0" value={newItemForm.newQty} onChange={e => setNewItemForm({...newItemForm, newQty: e.target.value === '' ? '' : parseInt(e.target.value) || 0})} className="w-full text-xs p-2 border rounded-lg focus:border-amber-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-green-600 uppercase mb-1">Available Qty</label>
                  <input type="number" min="0" value={newItemForm.availableQty} onChange={e => setNewItemForm({...newItemForm, availableQty: parseInt(e.target.value) || 0})} className="w-full text-xs p-2 border rounded-lg focus:border-green-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Used Qty</label>
                  <input type="number" min="0" value={newItemForm.usedQty} onChange={e => setNewItemForm({...newItemForm, usedQty: parseInt(e.target.value) || 0})} className="w-full text-xs p-2 border rounded-lg focus:border-blue-400 outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Damaged Qty</label>
                  <input type="number" min="0" value={newItemForm.damagedQty} onChange={e => setNewItemForm({...newItemForm, damagedQty: parseInt(e.target.value) || 0})} className="w-full text-xs p-2 border rounded-lg focus:border-red-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-orange-600 uppercase mb-1">Consumed Qty</label>
                  <input type="number" min="0" value={newItemForm.consumedQty} onChange={e => setNewItemForm({...newItemForm, consumedQty: parseInt(e.target.value) || 0})} className="w-full text-xs p-2 border rounded-lg focus:border-orange-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Remarks</label>
                  <input type="text" value={newItemForm.remarks} onChange={e => setNewItemForm({...newItemForm, remarks: e.target.value})} className="w-full text-xs p-2 border rounded-lg focus:border-amber-400 outline-none" />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button type="button" disabled={isSubmitting} onClick={() => setIsAddingItem(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-lg flex items-center gap-1 disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm">save</span> {isSubmitting ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Table Area (Single scrollbar) ─── */}
        <div className="flex-grow overflow-auto custom-scrollbar relative">
          <div className="w-full min-w-[950px] flex flex-col min-h-full">
            {/* Table Header */}
            <div className="sticky top-0 z-30 bg-gray-100 border-b border-gray-200 px-6 py-2.5 shadow-sm">
              <div className="grid items-center text-[10px] gap-2 font-extrabold text-gray-500 uppercase tracking-widest" style={{ gridTemplateColumns: gridCols }}>
                <span>#</span>
                <span>Unique ID</span>
                <span>IMG</span>
                <span>Item</span>
                <span>Category</span>
                <span className="text-center text-amber-600">New Qty</span>
                <span className="text-center text-green-600">Avail.</span>
                <span className="text-center text-blue-600">Used</span>
                <span className="text-center text-red-600">Damg.</span>
                <span className="text-center text-orange-600">Consm.</span>
                <span>Remarks</span>
                <span>Section</span>
                <span>Label</span>
                {!isViewOnly && <span className="text-center">Actions</span>}
              </div>
            </div>

            {/* Items List */}
            <div className="flex-grow">
              {loading && stocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="material-symbols-outlined animate-spin text-4xl mb-3">refresh</span>
                  <p className="text-xs">Loading inventory...</p>
                </div>
              ) : filteredStocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="material-symbols-outlined text-5xl mb-3 opacity-40">inventory_2</span>
                  <p className="text-xs">No items found for the selected filters.</p>
                </div>
              ) : (
                <div>
                  {filteredStocks.map((stock, idx) => {
                const catStyle = getCatStyle(stock.category);
                const statusStyle = getStatusStyle(stock.status);
                const isLow = Number(stock.availableQty || 0) <= LOW_STOCK_THRESHOLD && Number(stock.newQty || stock.quantity || 0) > LOW_STOCK_THRESHOLD;
                const isOutOfStock = Number(stock.availableQty || 0) === 0 && Number(stock.newQty || stock.quantity || 0) > 0;

                return (
                  <div key={stock.id}
                    className={`px-6 py-2 border-b border-gray-100 hover:bg-amber-50/40 transition-colors ${isOutOfStock ? 'bg-red-100/80' : isLow ? 'bg-red-50/60' : ''}`}>
                    <div className="grid items-center gap-2" style={{ gridTemplateColumns: gridCols }}>

                      {/* # */}
                      <span className="text-[11px] font-bold text-gray-400">{idx + 1}</span>

                      {/* Unique ID */}
                      <span className="text-[10px] font-mono font-bold truncate" style={{ color: catStyle.accent }}>{stock.uniqueId}</span>

                      {/* IMG */}
                      {stock.img && stock.img !== '' ? (
                        <div className="w-8 h-8 rounded-md overflow-hidden border border-gray-200 flex-shrink-0 relative">
                          <img 
                            src={resolveImgUrl(stock.img)} 
                            alt={stock.itemName} 
                            className="w-full h-full object-cover bg-white absolute inset-0 z-10"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="w-full h-full flex items-center justify-center bg-white absolute inset-0 z-0">
                            <span className="material-symbols-outlined text-sm" style={{color: catStyle.accent}}>{catStyle.icon}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md flex items-center justify-center border flex-shrink-0 bg-white"
                          style={{ borderColor: catStyle.border }}>
                          <span className="material-symbols-outlined text-sm" style={{ color: catStyle.accent }}>{catStyle.icon}</span>
                        </div>
                      )}

                      {/* Item Name (Allows wrapping) */}
                      <p className="text-[11px] font-semibold text-gray-800 leading-tight pr-2 whitespace-normal break-words">{stock.itemName}</p>

                      {/* Category */}
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full truncate"
                        style={{ color: catStyle.accent, backgroundColor: catStyle.bg, border: `1px solid ${catStyle.border}` }}>
                        {stock.category}
                      </span>

                      {/* New Qty */}
                      <span className="text-center text-[11px] font-bold text-amber-700">{stock.newQty || stock.quantity || 0}</span>

                      {/* Available Qty (inline editable) */}
                      <div className="flex justify-center">
                        {isViewOnly ? (
                          <span className="text-[11px] font-bold text-gray-700">{stock.availableQty ?? stock.newQty ?? stock.quantity ?? 0}</span>
                        ) : (
                          <input type="number" min="0" max={stock.newQty || stock.quantity}
                            key={`avail-${stock.id}-${stock.availableQty}`}
                            defaultValue={stock.availableQty ?? stock.newQty ?? stock.quantity ?? 0}
                            className="w-full min-w-0 text-center text-[11px] font-bold border rounded py-0.5 outline-none focus:border-green-500 focus:bg-green-50"
                            onBlur={(e) => handleQuantityUpdate(stock, 'availableQty', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
                        )}
                      </div>

                      {/* Used Qty */}
                      <div className="flex justify-center">
                        {isViewOnly ? (
                          <span className="text-[11px] font-bold text-blue-700">{stock.usedQty || 0}</span>
                        ) : (
                          <input type="number" min="0"
                            defaultValue={stock.usedQty || 0}
                            className="w-full min-w-0 text-center text-[11px] font-semibold border rounded py-0.5 outline-none focus:border-blue-500 focus:bg-blue-50 text-blue-700"
                            onBlur={(e) => handleQuantityUpdate(stock, 'usedQty', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
                        )}
                      </div>

                      {/* Damaged Qty */}
                      <div className="flex justify-center">
                        {isViewOnly ? (
                          <span className="text-[11px] font-bold text-red-700">{stock.damagedQty || 0}</span>
                        ) : (
                          <input type="number" min="0"
                            defaultValue={stock.damagedQty || 0}
                            className="w-full min-w-0 text-center text-[11px] font-semibold border rounded py-0.5 outline-none focus:border-red-500 focus:bg-red-50 text-red-700"
                            onBlur={(e) => handleQuantityUpdate(stock, 'damagedQty', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
                        )}
                      </div>

                      {/* Consumed Qty */}
                      <div className="flex justify-center">
                        {isViewOnly ? (
                          <span className="text-[11px] font-bold text-orange-700">{stock.consumedQty || 0}</span>
                        ) : (
                          <input type="number" min="0"
                            defaultValue={stock.consumedQty || 0}
                            className="w-full min-w-0 text-center text-[11px] font-semibold border rounded py-0.5 outline-none focus:border-orange-500 focus:bg-orange-50 text-orange-700"
                            onBlur={(e) => handleQuantityUpdate(stock, 'consumedQty', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
                        )}
                      </div>

                      {/* Remarks */}
                      <div>
                        {isViewOnly ? (
                          <span className="text-[10px] text-gray-700 truncate block w-full" title={stock.remarks}>{stock.remarks || '—'}</span>
                        ) : (
                          <input type="text"
                            defaultValue={stock.remarks || ''}
                            placeholder="Add remark..."
                            className="w-full min-w-0 text-[10px] border rounded px-1.5 py-0.5 outline-none focus:border-amber-400 focus:bg-amber-50"
                            onBlur={(e) => {
                              if (e.target.value !== (stock.remarks || '')) {
                                updateStockField(stock.id, { remarks: e.target.value });
                                if (e.target.value.trim() !== '') {
                                  sendRemarkMessage(stock, e.target.value);
                                }
                              }
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
                        )}
                      </div>

                      {/* Section */}
                      <span className="text-[9px] text-gray-500 font-mono truncate" title={stock.section}>{stock.section || '—'}</span>

                      {/* Label */}
                      <span className="text-[9px] text-gray-500 font-mono truncate" title={stock.label}>{stock.label || '—'}</span>

                      {/* Actions */}
                      {!isViewOnly && (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => sendLowStockAlert(stock)} disabled={alertSending === stock.id}
                            className={`flex items-center justify-center p-1.5 rounded-lg text-xs font-bold transition-all ${
                              isOutOfStock ? 'bg-red-700 text-white hover:bg-red-800 shadow-md ring-2 ring-red-300 animate-pulse' : isLow ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                            }`} title={isOutOfStock ? 'OUT OF STOCK — Send urgent alert to admin' : 'Send low stock alert to admin'}>
                            <span className="material-symbols-outlined text-[14px]">
                              {alertSending === stock.id ? 'hourglass_top' : isOutOfStock ? 'error' : 'notification_important'}
                            </span>
                          </button>
                          {user?.role === 'ADMIN' && (
                            <button onClick={() => handleDeleteItem(stock.id)} className="flex items-center justify-center p-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete custom item">
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ─── Footer ─── */}
        <div className="px-6 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div></div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className="material-symbols-outlined text-xs text-amber-500">warning</span>
            Low: {stocks.filter(s => (s.availableQty || 0) <= LOW_STOCK_THRESHOLD && (s.newQty || s.quantity || 0) > LOW_STOCK_THRESHOLD).length}
          </div>
        </div>
      </div>
  );
  if (inline) {
    return content;
  }

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={handleClose}></div>
      {content}
    </div>,
    document.body
  );
}
