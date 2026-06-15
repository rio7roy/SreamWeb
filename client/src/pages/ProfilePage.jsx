import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import api from '../lib/api';
import { getCroppedImg } from '../utils/cropImage';
import { useAuth } from '../features/auth/AuthContext';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar ? `${import.meta.env.VITE_API_URL || '/api'}/uploads/${user.avatar}` : null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (user) {
      setAddress(user.address || '');
      setPhone(user.phone || '');
      setAvatarPreview(user.avatar ? `${import.meta.env.VITE_API_URL || '/api'}/uploads/${user.avatar}` : null);
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await api.put('/auth/profile', { address, phone });
      updateUser({ address, phone });
      setFeedback({ type: 'success', text: 'Profile details updated successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update profile details.' });
    } finally {
      setSaving(false);
    }
  };

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setCropModalOpen(true);
      // reset file input
      e.target.value = '';
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUploadCroppedImage = async () => {
    try {
      setUploadingPhoto(true);
      setCropModalOpen(false);

      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // Local preview immediately
      const objectUrl = URL.createObjectURL(croppedImageBlob);
      setAvatarPreview(objectUrl);

      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, 'avatar.webp');

      const res = await api.post('/uploads/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const serverUrl = res.data.data.file.url;
      const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
      setAvatarPreview(baseUrl + serverUrl);
      updateUser({ avatar: res.data.data.file.filename });
      setFeedback({ type: 'success', text: 'Profile photo updated!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'Failed to upload cropped photo.' });
      setAvatarPreview(user?.avatar ? `${import.meta.env.VITE_API_URL || '/api'}/uploads/${user.avatar}` : null);
    } finally {
      setUploadingPhoto(false);
      setImageSrc(null);
    }
  };

  const ROLE_LABELS = {
    ADMIN: 'Administrator',
    EXPERT: 'STREAM Expert',
    STREAM_LAB: 'STREAM Hub',
    ILAB_SCHOOL: 'iLab School',
    CREATIVE_CORNER: 'Creative Corner',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <div className="space-y-12 animate-fade-in-up">
        {/* Header Section */}
        <section className="border-b border-on-surface/10 pb-6 flex items-end justify-between">
          <div>
            <h2 className="text-4xl text-on-surface tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              My Profile
            </h2>
          </div>
        </section>

        {feedback && (
          <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-fade-in-up ${
            feedback.type === 'error' ? 'bg-error/10 text-error' : 'bg-green-100 text-green-700'
          }`}>
            <span className="material-symbols-outlined text-xl">
              {feedback.type === 'error' ? 'error' : 'check_circle'}
            </span>
            {feedback.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Photo & Details */}
          <div className="md:col-span-1 space-y-8">
            {/* Avatar Card */}
            <div className="bg-white border border-on-surface/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="relative group mb-6">
                <div className="w-40 h-40 rounded-full border-4 border-surface-container overflow-hidden shadow-xl bg-surface-container flex items-center justify-center relative">
                  <span className="text-6xl text-primary font-bold z-0">{user?.name?.charAt(0)?.toUpperCase()}</span>
                  {avatarPreview && (
                    <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover absolute inset-0 z-10 bg-surface-container" onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                  
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                      <span className="material-symbols-outlined animate-spin text-white text-3xl">refresh</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-4 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  title="Upload Photo"
                >
                  <span className="material-symbols-outlined text-xl">photo_camera</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={onFileChange}
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                />
              </div>

              <h3 className="text-2xl font-bold text-on-surface">{user?.name}</h3>
              <p className="text-secondary mb-2">{user?.email}</p>
              <span className="px-4 py-1.5 bg-primary-container text-on-primary-container rounded-full text-xs font-bold uppercase tracking-wider">
                {ROLE_LABELS[user?.role] || user?.role}
              </span>
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Personal Details Form */}
            <div className="bg-white border border-on-surface/10 rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">contact_page</span>
                Personal Details
              </h3>
              
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Username</label>
                    <input type="text" value={user?.username || ''} disabled className="w-full bg-surface-container-low border border-outline/10 rounded-xl px-5 py-4 text-on-surface/60 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Phone Number</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-surface border border-outline/20 rounded-xl px-5 py-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Residential Address</label>
                  <textarea 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                    rows="3"
                    className="w-full bg-surface border border-outline/20 rounded-xl px-5 py-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" 
                    placeholder="Enter your full address..."
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving} className="px-8 py-3 rounded-xl bg-on-surface text-surface font-bold shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2">
                    {saving ? (
                      <><span className="material-symbols-outlined animate-spin text-sm">refresh</span>Saving...</>
                    ) : (
                      <><span className="material-symbols-outlined text-sm">save</span>Save Details</>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropModalOpen && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[600px] max-h-full">
            <div className="p-6 border-b border-on-surface/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-on-surface">Crop Profile Photo</h3>
              <button 
                onClick={() => {
                  setCropModalOpen(false);
                  setImageSrc(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="relative flex-grow bg-surface-container-low">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-6 border-t border-on-surface/10 bg-surface-container-low flex items-center gap-4">
              <div className="flex-grow flex items-center gap-3 text-secondary">
                <span className="material-symbols-outlined text-sm">zoom_out</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="flex-grow h-1.5 bg-outline/20 rounded-full appearance-none outline-none focus:ring-2 focus:ring-primary/50 accent-primary"
                />
                <span className="material-symbols-outlined text-sm">zoom_in</span>
              </div>
              <button
                onClick={handleUploadCroppedImage}
                className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
