import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`/auth/reset-password/${token}`, { password: formData.password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired reset token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container/50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-[24px] shadow-sm border border-black/[0.04] overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-primary tracking-tight mb-2">RESET PASSWORD</h1>
            <p className="text-on-surface/60 text-sm">Enter your new password below to securely access your account.</p>
          </div>

          {success ? (
            <div className="bg-success-container/30 border border-success/20 rounded-xl p-6 text-center animate-fade-in">
              <span className="material-symbols-outlined text-4xl text-success mb-2">check_circle</span>
              <h3 className="text-lg font-bold text-on-surface mb-2">Password Reset Successfully</h3>
              <p className="text-on-surface/70 text-sm">You can now log in with your new password. Redirecting to portal...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="password"
                name="password"
                label="New Password"
                type="password"
                icon="lock"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <Input
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                icon="lock_reset"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />

              {error && (
                <div className="bg-error-container/30 border border-error/20 rounded-xl px-4 py-3 animate-fade-in">
                  <p className="text-error text-sm font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    {error}
                  </p>
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Reset Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
