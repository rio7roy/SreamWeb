import { Link } from 'react-router-dom';

export default function Header({ transparent = false, onSignInClick }) {
  return (
    <header
      className={`fixed top-0 left-0 w-full z-40 border-b border-black/[0.03] transition-colors duration-300 ${
        transparent
          ? 'bg-[#fdfbf7]/90 backdrop-blur-md'
          : 'bg-[#fdfbf7]'
      }`}
    >
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-4 md:py-5 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/logo-2.png" alt="STREAM Logo" className="h-16 w-auto shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="text-xl font-bold tracking-tight text-slate-900 leading-none" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>STREAM</span>
            <span className="text-[11px] font-bold tracking-widest text-brand-600 uppercase mt-0.5">Ecosystem</span>
          </div>
        </Link>

      </div>
    </header>
  );
}
