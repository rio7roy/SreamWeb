import React, { useState } from 'react';

const FIELD_TYPES = [
  { id: 'short_text', label: 'Short Text', icon: 'short_text' },
  { id: 'long_text', label: 'Paragraph', icon: 'notes' },
  { id: 'multiple_choice', label: 'Multiple Choice', icon: 'radio_button_checked' },
  { id: 'checkboxes', label: 'Checkboxes', icon: 'check_box' },
];

export default function FormBuilder({ initialData, onSave, onCancel, isSaving, isTemplate }) {
  const [form, setForm] = useState(initialData || {
    title: 'Untitled Form',
    description: '',
    fields: [],
    editMode: 'FULL_EDIT'
  });

  const isHeadlineEditOnly = !isTemplate && form.editMode === 'HEADLINE_EDIT';

  const addField = (type) => {
    setForm(prev => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          id: Math.random().toString(36).substr(2, 9),
          type,
          label: 'Untitled Question',
          required: false,
          options: (type === 'multiple_choice' || type === 'checkboxes') ? ['Option 1'] : []
        }
      ]
    }));
  };

  const updateField = (id, updates) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const removeField = (id) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id)
    }));
  };

  const updateOption = (fieldId, optionIndex, value) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === fieldId) {
          const newOptions = [...f.options];
          newOptions[optionIndex] = value;
          return { ...f, options: newOptions };
        }
        return f;
      })
    }));
  };

  const addOption = (fieldId) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === fieldId) {
          return { ...f, options: [...f.options, `Option ${f.options.length + 1}`] };
        }
        return f;
      })
    }));
  };

  const removeOption = (fieldId, optionIndex) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === fieldId) {
          const newOptions = f.options.filter((_, i) => i !== optionIndex);
          return { ...f, options: newOptions };
        }
        return f;
      })
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isTemplate && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline/10 mb-6">
          <h3 className="text-lg font-bold text-secondary mb-2">Template Settings</h3>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-secondary">Expert Editing Permission</label>
            <select 
              value={form.editMode || 'FULL_EDIT'} 
              onChange={e => setForm({...form, editMode: e.target.value})}
              className="bg-surface-container-low px-4 py-3 rounded-lg outline-none font-bold focus:bg-surface-container"
            >
              <option value="FULL_EDIT">Full Edit (Experts can add/remove questions)</option>
              <option value="HEADLINE_EDIT">Headline Edit Only (Questions are locked)</option>
            </select>
            <p className="text-xs text-secondary/70 mt-1">
              {form.editMode === 'HEADLINE_EDIT' 
                ? "Experts will only be able to change the form title and description." 
                : "Experts will have full control to modify this template."}
            </p>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="bg-white rounded-2xl border-t-8 border-t-primary p-6 shadow-sm">
        <input 
          type="text" 
          value={form.title} 
          onChange={e => setForm({...form, title: e.target.value})}
          className="text-4xl font-bold w-full outline-none mb-4 focus:border-b-2 focus:border-primary pb-1"
          placeholder="Form Title"
        />
        <textarea 
          value={form.description} 
          onChange={e => setForm({...form, description: e.target.value})}
          className="w-full outline-none text-secondary resize-none focus:border-b-2 focus:border-primary pb-1"
          placeholder="Form description"
          rows={2}
        />
      </div>

      {/* Fields */}
      {form.fields.map((field, index) => (
        <div key={field.id} className={`bg-white rounded-2xl p-6 shadow-sm border border-outline/10 transition-all group ${isHeadlineEditOnly ? 'opacity-80' : 'focus-within:border-primary/50 focus-within:shadow-md'}`}>
          <div className="flex gap-4 mb-4 items-start">
            <input 
              type="text" 
              value={field.label}
              readOnly={isHeadlineEditOnly}
              onChange={e => updateField(field.id, { label: e.target.value })}
              className={`flex-1 bg-surface-container-low px-4 py-3 rounded-lg outline-none font-medium text-lg ${isHeadlineEditOnly ? 'cursor-default' : 'focus:bg-surface-container'}`}
              placeholder="Question"
            />
            <select 
              value={field.type}
              disabled={isHeadlineEditOnly}
              onChange={e => {
                const newType = e.target.value;
                const needsOptions = newType === 'multiple_choice' || newType === 'checkboxes';
                updateField(field.id, { 
                  type: newType,
                  options: needsOptions && (!field.options || field.options.length === 0) ? ['Option 1'] : field.options 
                });
              }}
              className={`bg-surface-container-low px-4 py-3 rounded-lg outline-none font-bold ${isHeadlineEditOnly ? 'appearance-none cursor-default opacity-70' : ''}`}
            >
              {FIELD_TYPES.map(ft => (
                <option key={ft.id} value={ft.id}>{ft.label}</option>
              ))}
            </select>
          </div>

          <div className="pl-2">
            {field.type === 'short_text' && (
              <div className="border-b border-outline/30 pb-2 text-secondary w-1/2">Short answer text</div>
            )}
            {field.type === 'long_text' && (
              <div className="border-b border-outline/30 pb-2 text-secondary w-full">Long answer text</div>
            )}
            {(field.type === 'multiple_choice' || field.type === 'checkboxes') && (
              <div className="space-y-3">
                {field.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3 group/opt">
                    <span className="material-symbols-outlined text-secondary/50">
                      {field.type === 'multiple_choice' ? 'radio_button_unchecked' : 'check_box_outline_blank'}
                    </span>
                    <input 
                      type="text" 
                      value={opt}
                      readOnly={isHeadlineEditOnly}
                      onChange={e => updateOption(field.id, i, e.target.value)}
                      className={`flex-1 outline-none border-b ${isHeadlineEditOnly ? 'border-transparent cursor-default' : 'border-transparent focus:border-outline/30 hover:border-outline/20'}`}
                    />
                    {!isHeadlineEditOnly && (
                      <button 
                        onClick={() => removeOption(field.id, i)}
                        className="opacity-0 group-hover/opt:opacity-100 p-1 hover:bg-surface-container rounded transition-all text-secondary"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                ))}
                {!isHeadlineEditOnly && (
                  <div className="flex items-center gap-3">
                     <span className="material-symbols-outlined text-secondary/30">
                        {field.type === 'multiple_choice' ? 'radio_button_unchecked' : 'check_box_outline_blank'}
                      </span>
                      <button onClick={() => addOption(field.id)} className="text-secondary hover:text-primary border-b border-transparent font-medium">
                        Add option
                      </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isHeadlineEditOnly && (
            <div className="mt-6 pt-4 border-t border-outline/10 flex justify-end items-center gap-4 opacity-50 group-focus-within:opacity-100 transition-opacity">
              <button onClick={() => removeField(field.id)} className="p-2 hover:bg-surface-container rounded-full text-secondary hover:text-error transition-colors">
                <span className="material-symbols-outlined">delete</span>
              </button>
              <div className="w-px h-6 bg-outline/20"></div>
              <label className="flex items-center gap-2 text-sm font-bold text-secondary cursor-pointer">
                Required
                <input 
                  type="checkbox" 
                  checked={field.required}
                  onChange={e => updateField(field.id, { required: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
              </label>
            </div>
          )}
        </div>
      ))}

      {/* Floating Add Menu */}
      {!isHeadlineEditOnly && (
        <div className="flex justify-center mt-6">
          <div className="bg-white rounded-full shadow-lg border border-outline/10 p-2 flex gap-2">
            {FIELD_TYPES.map(ft => (
              <button 
                key={ft.id}
                onClick={() => addField(ft.id)}
                className="p-3 hover:bg-surface-container-low rounded-full transition-colors group flex relative"
                title={`Add ${ft.label}`}
              >
                <span className="material-symbols-outlined text-secondary group-hover:text-primary">{ft.icon}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-surface-container-low p-6 rounded-2xl">
        <button onClick={onCancel} className="px-6 py-2 rounded-xl text-secondary hover:bg-surface-container font-bold">
          Cancel
        </button>
        <button 
          onClick={() => onSave(form)} 
          disabled={isSaving}
          className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Form'}
        </button>
      </div>

    </div>
  );
}
