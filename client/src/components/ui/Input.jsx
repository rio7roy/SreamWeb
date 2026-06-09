import { useState } from 'react';

export default function Input({
  label,
  type = 'text',
  icon,
  placeholder,
  value,
  onChange,
  error,
  id,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="block font-bold text-on-surface/80 uppercase tracking-widest px-1 text-xs"
          style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`form-input ${error ? 'ring-2 ring-error/50 border-error/30' : ''}`}
          {...props}
        />
        {icon && (
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/40 text-lg">
            {icon}
          </span>
        )}
        {isPassword && (
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/40 hover:text-on-surface transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-lg">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p className="text-error text-xs font-medium px-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
