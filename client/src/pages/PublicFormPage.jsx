import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import FormRenderer from '../components/forms/FormRenderer';

export default function PublicFormPage() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get(`/forms/${id}`)
      .then(res => {
        if (!res.data.published) {
          setError('This form is no longer accepting responses.');
        } else {
          setForm(res.data);
        }
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setError('Form not found.');
        } else {
          setError('Failed to load form. Please try again later.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (answers) => {
    setIsSubmitting(true);
    try {
      await api.post(`/forms/${id}/responses`, { answers });
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-t-8 border-error">
          <span className="material-symbols-outlined text-5xl text-error mb-4">error</span>
          <h1 className="text-2xl font-bold font-hanken mb-2">Oops!</h1>
          <p className="text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-t-8 border-primary animate-fade-in-up">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h1 className="text-3xl font-bold font-hanken mb-3">Response Recorded</h1>
          <p className="text-secondary mb-8">Thank you for submitting your responses. Your data has been securely saved.</p>
          <button onClick={() => setSubmitted(false)} className="text-primary font-bold hover:underline">
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-no-repeat bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/background-pattern.png')" }}
      />
      <div className="p-4 md:p-8">
        <FormRenderer form={form} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
