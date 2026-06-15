import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const PORTALS = [
  { role: 'ADMIN', label: 'Admin', icon: 'admin_panel_settings', defaultEmail: 'admin@stream.edu', defaultPassword: 'Admin@123' },
  { role: 'EXPERT', label: 'STREAM Expert', icon: 'school', defaultEmail: '', defaultPassword: '' },
  { role: 'STREAM_LAB', label: 'STREAM Hub', icon: 'biotech', defaultEmail: 'lab@stream.edu', defaultPassword: 'Demo@123' },
  { role: 'ILAB', label: 'iLab Corner', icon: 'computer', defaultEmail: 'ilab@stream.edu', defaultPassword: 'Demo@123' },
  { role: 'CREATIVE_CORNER', label: 'Creative Corner', icon: 'auto_awesome', defaultEmail: 'creative@stream.edu', defaultPassword: 'Demo@123' },
];

export default function PortalPage() {
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const portalGridRef = useRef(null);

  // Automatically logout if arriving at the portal page while authenticated
  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, logout]);

  const openLoginModal = (portal) => {
    setSelectedPortal(portal);
    setIdentifier(portal.defaultEmail || '');
    setPassword(portal.defaultPassword || '');
    setError('');
    setIsModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsModalOpen(false);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      const userData = await login(identifier, password);
      
      // Enforce portal-role restriction on login
      if (selectedPortal && userData.role !== selectedPortal.role) {
        logout();
        setError(`Access Denied: This credentials belong to a ${userData.role} account, which does not have access to the ${selectedPortal.label} portal.`);
        return;
      }

      // Route to role-specific dashboard
      const destination = userData.role === 'EXPERT' ? '/expert' : userData.role === 'ADMIN' ? '/admin' : '/dashboard';
      navigate(destination);
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7]">
      {/* Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: "url('/background-pattern.png')",
        }}
      />

      {/* Main Page Content */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-500 ${
          isModalOpen ? 'blur-[10px] scale-[0.98]' : ''
        }`}
      >
        <Header
          transparent
          onSignInClick={() => portalGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        />

        <main className="flex-grow pt-24 pb-12 px-margin-mobile md:px-margin-desktop max-w-max-width mx-auto flex flex-col items-center justify-center w-full min-h-screen">
          {/* Hero Section */}
          <section className="text-center mb-8 md:mb-12 animate-fade-in-up">
            <h1
              className="text-3xl md:text-4xl lg:text-5xl mb-4 text-on-surface tracking-tight font-black"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              Sign in to your portal
            </h1>
            <p className="text-base md:text-lg text-secondary max-w-2xl mx-auto font-normal leading-relaxed">
              Select your role to access the STREAM Ecosystem
            </p>
          </section>

          {/* Portal Grid */}
          <div ref={portalGridRef} className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 mb-8 md:mb-12" id="portal-selector">
            {PORTALS.map((portal, index) => (
              <button
                key={portal.role}
                className="login-card group rounded-2xl p-6 md:p-8 lg:p-6 xl:p-8 flex flex-col items-center text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 0.08}s` }}
                onClick={() => openLoginModal(portal)}
                id={`portal-${portal.role.toLowerCase()}`}
              >
                <div className="icon-container w-12 h-12 md:w-14 md:h-14 bg-surface-container-low flex items-center justify-center rounded-2xl mb-4 md:mb-6 transition-all duration-300">
                  <span
                    className="material-symbols-outlined text-4xl md:text-5xl text-on-surface font-bold"
                    style={{ fontVariationSettings: "'FILL' 0, 'wght' 700, 'GRAD' 0, 'opsz' 48" }}
                  >
                    {portal.icon}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl xl:text-2xl font-black text-on-surface">{portal.label}</h3>
              </button>
            ))}
          </div>
        </main>

        <Footer />
      </div>

      {/* Login Modal */}
      <Modal isOpen={isModalOpen} onClose={closeLoginModal}>
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl md:text-3xl text-on-surface tracking-tight font-bold uppercase"
            style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
          >
            {selectedPortal?.label} Login
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-surface-container rounded-full transition-all"
            onClick={closeLoginModal}
          >
            <span className="material-symbols-outlined text-xl text-on-surface/60">close</span>
          </button>
        </div>

        {/* Demo Credentials Info Box for testing */}
        {selectedPortal && (
          <div className="bg-primary-container/10 border border-primary-container/20 rounded-xl px-4 py-3 text-xs text-secondary flex flex-col gap-1.5 mb-6">
            <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">Demo Account Info</span>
            <div className="flex flex-col gap-1">
              <div>Email/Username: <code className="font-mono font-bold text-on-surface select-all">{selectedPortal.defaultEmail}</code></div>
              <div>Password: <code className="font-mono font-bold text-on-surface select-all">{selectedPortal.defaultPassword}</code></div>
            </div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          <Input
            id="login-identifier"
            label="Username / Email"
            type="text"
            icon="alternate_email"
            placeholder="Enter your unique ID"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoFocus
          />

          <Input
            id="login-password"
            label="Password"
            type="password"
            icon="lock_open"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="bg-error-container/30 border border-error/20 rounded-xl px-4 py-3 animate-fade-in">
              <p className="text-error text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <Button type="submit" loading={isLoading}>
              Sign In
              <span className="material-symbols-outlined text-xl">east</span>
            </Button>
            <button
              type="button"
              className="btn-ghost underline"
              onClick={closeLoginModal}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-black/[0.03] flex justify-center">
          <a
            href="#"
            className="text-xs font-bold uppercase tracking-widest text-secondary/50 hover:text-primary transition-colors hover:underline"
          >
            Forgot Password?
          </a>
        </div>
      </Modal>
    </div>
  );
}
