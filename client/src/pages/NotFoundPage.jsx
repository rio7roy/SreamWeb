import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-margin-mobile">
      <div className="text-center animate-fade-in-up">
        <div className="w-24 h-24 bg-primary-container/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: '48px', fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48" }}
          >
            explore_off
          </span>
        </div>
        <h1
          className="text-6xl md:text-8xl font-black text-on-surface/10 mb-4"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          404
        </h1>
        <h2
          className="text-2xl font-bold text-on-surface mb-3"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          Page Not Found
        </h2>
        <p className="text-secondary mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container font-bold px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-primary-container/20 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-xl">home</span>
          Back to Portal
        </Link>
      </div>
    </div>
  );
}
