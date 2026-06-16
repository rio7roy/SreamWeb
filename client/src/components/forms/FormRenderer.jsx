import React, { useState } from 'react';

export default function FormRenderer({ form, onSubmit, isSubmitting }) {
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (fieldId, value) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: null }));
    }
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    setAnswers(prev => {
      const current = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      } else {
        return { ...prev, [fieldId]: current.filter(o => o !== option) };
      }
    });
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    form.fields.forEach(field => {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.id] = 'This is a required question';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(answers);
    } else {
      // Scroll to first error
      const firstErrorId = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (!form) return null;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl border-t-8 border-t-primary p-8 shadow-sm">
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            {form.title}
          </h1>
          {form.description && (
            <p className="text-secondary whitespace-pre-wrap">{form.description}</p>
          )}
          <div className="mt-4 pt-4 border-t border-outline/10 text-sm text-error font-medium">
            * Indicates required question
          </div>
        </div>

        {/* Fields */}
        {form.fields.map(field => (
          <div 
            key={field.id} 
            id={`field-${field.id}`}
            className={`bg-white rounded-2xl p-8 shadow-sm border transition-all ${
              errors[field.id] ? 'border-error shadow-error/10' : 'border-outline/10 focus-within:border-primary/50'
            }`}
          >
            <label className="block text-lg font-bold mb-4">
              {field.label}
              {field.required && <span className="text-error ml-1">*</span>}
            </label>

            <div className="mt-2">
              {field.type === 'short_text' && (
                <input
                  type="text"
                  value={answers[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)}
                  className="w-full md:w-1/2 outline-none border-b border-outline/30 focus:border-primary pb-2 text-on-surface bg-transparent"
                  placeholder="Your answer"
                />
              )}

              {field.type === 'long_text' && (
                <textarea
                  value={answers[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)}
                  className="w-full outline-none border-b border-outline/30 focus:border-primary pb-2 text-on-surface bg-transparent resize-y min-h-[60px]"
                  placeholder="Your answer"
                  rows={3}
                />
              )}

              {field.type === 'multiple_choice' && (
                <div className="space-y-4">
                  {field.options.map(opt => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name={`field_${field.id}`}
                        value={opt}
                        checked={answers[field.id] === opt}
                        onChange={() => handleChange(field.id, opt)}
                        className="w-5 h-5 accent-primary"
                      />
                      <span className="text-on-surface group-hover:text-primary transition-colors">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'checkboxes' && (
                <div className="space-y-4">
                  {field.options.map(opt => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={(answers[field.id] || []).includes(opt)}
                        onChange={e => handleCheckboxChange(field.id, opt, e.target.checked)}
                        className="w-5 h-5 accent-primary rounded"
                      />
                      <span className="text-on-surface group-hover:text-primary transition-colors">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {errors[field.id] && (
              <div className="mt-4 flex items-center gap-2 text-error text-sm font-bold animate-fade-in">
                <span className="material-symbols-outlined text-base">error</span>
                {errors[field.id]}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-between items-center pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Form'}
            {!isSubmitting && <span className="material-symbols-outlined text-sm">send</span>}
          </button>
          <button
            type="button"
            onClick={() => setAnswers({})}
            className="text-secondary hover:text-error text-sm font-bold transition-colors"
          >
            Clear form
          </button>
        </div>
      </form>
    </div>
  );
}
