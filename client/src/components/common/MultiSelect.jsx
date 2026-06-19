import React, { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ options, selected, onChange, placeholder = "Select options...", showSelectAll, selectAllLabel = "Select All" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeOption = (e, value) => {
    e.stopPropagation();
    onChange(selected.filter(item => item !== value));
  };

  const handleSelectAll = () => {
    if (selected.length === options.length && options.length > 0) {
      onChange([]);
    } else {
      onChange(options.map(opt => opt.value));
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="min-h-[42px] w-full border rounded px-3 py-2 bg-white flex flex-wrap gap-2 items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected.length === 0 ? (
          <span className="text-slate-500 text-sm">{placeholder}</span>
        ) : (
          selected.map(val => {
            const opt = options.find(o => o.value === val);
            return (
              <span key={val} className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                {opt ? opt.label : val}
                <button 
                  type="button" 
                  onClick={(e) => removeOption(e, val)}
                  className="text-blue-600 hover:text-blue-900 font-bold ml-1"
                >
                  &times;
                </button>
              </span>
            );
          })
        )}
        <div className="ml-auto text-slate-400">
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">No options available</div>
          ) : (
            <>
              {showSelectAll && (
                <label className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 font-medium">
                  <input 
                    type="checkbox" 
                    className="mr-3 rounded text-blue-600 focus:ring-blue-500"
                    checked={selected.length === options.length && options.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="text-slate-800">{selectAllLabel}</span>
                </label>
              )}
              {options.map(opt => (
                <label 
                  key={opt.value} 
                  className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                >
                  <input 
                    type="checkbox" 
                    className="mr-3 rounded text-blue-600 focus:ring-blue-500"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggleOption(opt.value)}
                  />
                  <span className="text-slate-700">{opt.label}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
