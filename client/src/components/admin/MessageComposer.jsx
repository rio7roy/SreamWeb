import React, { useState, useMemo, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../lib/api';

export default function MessageComposer() {
  const [toAddresses, setToAddresses] = useState([]);
  const [toSearch, setToSearch] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [messageBody, setMessageBody] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [brcs, setBrcs] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    api.get('/brcs')
      .then(res => setBrcs(res.data))
      .catch(console.error);
  }, []);

  // Generate all possible address options
  const addressOptions = useMemo(() => {
    const options = [{ type: 'global', label: 'All', value: 'ALL' }];
    
    // Districts
    const districts = new Set(brcs.map(b => b.district).filter(Boolean));
    Array.from(districts).forEach(d => {
      options.push({ type: 'district', label: `All BRCs in ${d}`, value: `DISTRICT:${d}` });
    });

    // BRCs
    brcs.forEach(b => {
      options.push({ type: 'brc', label: `${b.location}/{b.name} (${b.code})`, value: `BRC:${b.code}` });
    });

    return options;
  }, [brcs]);

  const filteredOptions = useMemo(() => {
    if (!toSearch.trim()) return addressOptions;
    const searchLower = toSearch.toLowerCase();
    return addressOptions.filter(opt => opt.label.toLowerCase().includes(searchLower));
  }, [toSearch, addressOptions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [toSearch, filteredOptions.length]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredOptions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[selectedIndex]);
      } else if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (option) => {
    if (!toAddresses.find(a => a.value === option.value)) {
      setToAddresses([...toAddresses, option]);
    }
    setToSearch('');
    setShowSuggestions(false);
  };

  const removeAddress = (val) => {
    setToAddresses(toAddresses.filter(a => a.value !== val));
  };

  const handleSend = async () => {
    if (toAddresses.length === 0 || !messageBody) {
      setFeedback({ type: 'error', text: 'Please fill in both fields.' });
      return;
    }
    setIsSending(true);
    setFeedback(null);
    try {
      await api.post('/admin/messages', {
        to: toAddresses.map(a => a.value),
        content: messageBody,
        scheduledFor: scheduleDate || null
      });
      setFeedback({ type: 'success', text: scheduleDate ? 'Message scheduled successfully!' : 'Message broadcasted successfully!' });
      setMessageBody('');
      setToAddresses([]);
      setScheduleDate('');
      setShowScheduleInput(false);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to send message.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="bg-white border border-on-surface/10 rounded-xl shadow-sm flex flex-col">
      <div className="p-6 border-b border-on-surface/5 flex items-center gap-3 bg-surface-container-low/50 rounded-t-xl">
        <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
        <h3 className="text-xl tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          Broadcast Message to BRCs
        </h3>
      </div>
      <div className="p-6 md:p-8 space-y-6">
        
        {/* To Address Field */}
        <div className="relative" ref={wrapperRef}>
          <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">To Address</label>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {toAddresses.map((addr) => (
              <span key={addr.value} className="bg-primary-container text-on-primary-container text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">
                  {addr.type === 'global' ? 'public' : addr.type === 'district' ? 'map' : 'school'}
                </span>
                {addr.label}
                <button type="button" onClick={() => removeAddress(addr.value)} className="hover:text-error ml-1">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-sm">
              send_to_mobile
            </span>
            <input
              type="text"
              value={toSearch}
              onChange={(e) => {
                setToSearch(e.target.value);
                setShowSuggestions(true);
                setFeedback(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search 'All', a district, or a BRC to add..."
              className="w-full bg-surface-container border border-outline/20 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all"
              style={{ fontFamily: "'Julius Sans One', sans-serif" }}
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && filteredOptions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-outline/20 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-fade-in">
              {filteredOptions.map((opt, i) => (
                <button
                  key={i}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-3 transition-colors border-b border-on-surface/5 last:border-b-0 flex items-center gap-3 ${
                    selectedIndex === i ? 'bg-primary-container/20 border-l-4 border-l-primary' : 'hover:bg-primary-container/10 border-l-4 border-l-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-primary/70 text-sm">
                    {opt.type === 'global' ? 'public' : opt.type === 'district' ? 'map' : 'school'}
                  </span>
                  <span className="text-sm font-medium text-on-surface">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Body */}
        <div>
          <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Message Content</label>
          <textarea
            value={messageBody}
            onChange={(e) => {
              setMessageBody(e.target.value);
              setFeedback(null);
            }}
            placeholder="Type your official broadcast message here..."
            className="w-full bg-surface-container border border-outline/20 rounded-xl p-4 focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all resize-none min-h-[120px]"
            style={{ fontFamily: "'Julius Sans One', sans-serif" }}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {feedback && (
              <span className={`text-sm font-bold ${feedback.type === 'error' ? 'text-error' : 'text-green-600'} animate-fade-in`}>
                {feedback.text}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 relative">
              {showScheduleInput && (
                <div className="animate-fade-in absolute right-full mr-2 z-50">
                  <DatePicker
                    selected={scheduleDate}
                    onChange={(date) => setScheduleDate(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    timeCaption="time"
                    dateFormat="MMMM d, yyyy h:mm aa"
                    placeholderText="Select Date & Time"
                    minDate={new Date()}
                    className="bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-sm focus:border-primary outline-none shadow-md w-56"
                    isClearable
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowScheduleInput(!showScheduleInput);
                  if (showScheduleInput) setScheduleDate(''); // clear if hiding
                }}
                className={`p-3 rounded-xl border transition-all ${
                  showScheduleInput || scheduleDate ? 'bg-primary-container text-primary border-primary/30' : 'bg-surface-container text-secondary border-outline/20 hover:text-primary hover:border-primary/30'
                }`}
                title="Schedule Message"
              >
                <span className="material-symbols-outlined text-sm">schedule</span>
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={isSending}
              className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isSending ? 'Processing...' : scheduleDate ? 'Schedule' : 'Send'}</span>
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
