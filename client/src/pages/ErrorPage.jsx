import { useRouteError, useNavigate } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-low p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h1 className="text-3xl font-black text-on-surface mb-2">Oops!</h1>
        <p className="text-secondary mb-6">Sorry, an unexpected error has occurred.</p>
        
        {error && (
          <div className="bg-surface-container p-4 rounded-lg mb-6 text-left overflow-auto max-h-48 text-xs text-error font-mono">
            {error.statusText || error.message}
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          className="w-full bg-primary text-on-primary font-bold py-3 px-6 rounded-xl hover:-translate-y-1 hover:shadow-lg transition-all"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
