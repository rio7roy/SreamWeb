export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    outline: 'w-full border-2 border-primary-container text-primary font-bold text-base py-4 rounded-xl hover:bg-primary-container/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${variants[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Signing in...
        </>
      ) : (
        children
      )}
    </button>
  );
}
