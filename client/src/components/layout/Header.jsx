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
          <img src="/logo-2.png" alt="STREAM Ecosystem" className="h-10 w-auto" />
        </Link>


      </div>
    </header>
  );
}
