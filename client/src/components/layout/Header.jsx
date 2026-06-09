import { Link } from 'react-router-dom';

export default function Header({ transparent = false }) {
  return (
    <header className={`fixed top-0 left-0 w-full z-40 ${transparent ? 'bg-[#fdfbf7]/70 backdrop-blur-xl' : 'bg-[#fdfbf7]'} border-b border-black/[0.03]`}>
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-5 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
            <span
              className="material-symbols-outlined text-on-primary-container text-xl"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24" }}
            >
              hub
            </span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="logo-text-stream font-bold text-lg uppercase tracking-tight text-on-surface">
              STREAM
            </span>
            <span className="logo-text-ecosystem font-medium text-[10px] uppercase text-secondary">
              ecosystem
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
