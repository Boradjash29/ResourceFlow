import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SessionsList from '../components/auth/SessionsList';
import TwoFactorSetup from '../components/auth/TwoFactorSetup';
import { User, Mail, Shield, Smartphone, Lock, AlertCircle, Camera, Check, X, Trash2, Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const Profile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [is2FAConfirmOpen, setIs2FAConfirmOpen] = useState(false);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      setProfile(user);
      setEditData({ name: user.name, email: user.email });
      setLoading(false);
    } else {
      setError('User not logged in');
      setLoading(false);
    }
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile({ ...profile, avatar_url: data.user.avatar_url });
      toast?.success('Avatar updated!');
    } catch {
      toast?.error('Upload failed');
    }
  };

  const handleAvatarRemove = async () => {
    try {
      await api.delete('/users/avatar');
      setProfile({ ...profile, avatar_url: null });
      toast?.success('Avatar removed!');
    } catch {
      toast?.error('Failed to remove avatar');
    }
  };

  const handleUpdateProfile = async () => {
    setErrors({});
    const validation = profileSchema.safeParse(editData);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach(err => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const { data } = await api.put('/users/profile', editData);
      setProfile(data.user);
      setIsEditing(false);
      toast?.success('Profile updated!');
    } catch {
      toast?.error('Update failed');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return alert('New passwords do not match');
    }

    try {
      await api.put('/users/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      setShowPasswordModal(false);
      setPasswords({ current: '', new: '', confirm: '' });
      alert('Password changed successfully');
    } catch {
      alert('Failed to change password');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete('/users');
      logout();
      window.location.href = '/register';
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const handleConfirmDisable2FA = async () => {
    try {
      await api.post('/auth/2fa/disable');
      window.location.reload();
    } catch {
      toast.error('Failed to disable 2FA');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center p-20 text-danger font-bold bg-danger/5 rounded-[2rem] border border-danger/10">
      <AlertCircle className="w-6 h-6 mr-2" /> {error}
    </div>
  );

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-soft dark:shadow-none border border-gray-100 dark:border-white/5 overflow-hidden transition-colors">
          <div className="h-32 bg-brand-blue/5 dark:bg-brand-blue/10"></div>
          <div className="px-8 pb-8">
            <div className="relative -mt-16 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                <div className="w-32 h-32 rounded-[2rem] bg-white dark:bg-zinc-900 p-2 shadow-lg shrink-0">
                  <div className="w-full h-full rounded-[1.5rem] bg-brand-blue flex items-center justify-center text-white overflow-hidden relative">
                    {profile.avatar_url ? (
                      <img 
                        src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')}${profile.avatar_url}`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={48} />
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 pb-2">
                  <label className="btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 hover:scale-105 transition-transform">
                    <Camera size={14} /> Update Photo
                    <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                  </label>
                  {profile.avatar_url && (
                    <button 
                      onClick={handleAvatarRemove}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex-1 max-w-md">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <input 
                        className={`w-full text-2xl font-bold text-[#1B2559] dark:text-white bg-gray-50 dark:bg-zinc-800 border-b-2 ${errors.name ? 'border-red-500' : 'border-brand-blue'} focus:outline-none p-2 rounded-t-lg`}
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      />
                      {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <input 
                        className={`w-full text-sm text-brand-lavender dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 border-b-2 ${errors.email ? 'border-red-500' : 'border-brand-blue'} focus:outline-none p-2 rounded-t-lg`}
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      />
                      {errors.email && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.email}</p>}
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-3xl font-extrabold text-[#1B2559] dark:text-white tracking-tight">{profile.name}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-brand-lavender font-bold text-xs uppercase tracking-widest">
                        <Shield size={14} className="text-brand-blue" /> {profile.role}
                      </span>
                      <span className="flex items-center gap-1.5 text-brand-lavender font-bold text-xs uppercase tracking-widest">
                        <Mail size={14} className="text-brand-blue" /> {profile.email}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleUpdateProfile}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-success text-white text-sm font-bold shadow-lg shadow-success/20"
                    >
                      <Check size={16} /> Save
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-brand-lavender dark:text-zinc-400 text-sm font-bold"
                    >
                      <X size={16} /> Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="btn-primary px-6 py-2.5 rounded-xl text-sm font-bold"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security & Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-soft dark:shadow-none border border-gray-100 dark:border-white/5 transition-colors">
             <SessionsList />
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-soft dark:shadow-none border border-gray-100 dark:border-white/5 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1B2559] dark:text-white">Security Settings</h3>
              <Lock className="w-5 h-5 text-brand-blue/40" />
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      profile.two_factor_enabled ? 'bg-success/10 text-success' : 'bg-brand-blue/10 text-brand-blue'
                    }`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1B2559] dark:text-white">Two-Factor Authentication</p>
                      <p className={`text-xs font-bold uppercase tracking-wider ${
                        profile.two_factor_enabled ? 'text-success' : 'text-brand-lavender'
                      }`}>
                        {profile.two_factor_enabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  {profile.two_factor_enabled ? (
                    <button 
                      onClick={() => setIs2FAConfirmOpen(true)}
                      className="text-xs font-bold text-danger hover:underline"
                    >
                      Disable
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShow2FASetup(true)}
                      className="btn-primary px-4 py-2 rounded-xl text-xs font-bold shadow-md"
                    >
                      Setup 2FA
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-brand-lavender leading-relaxed">
                  Protect your account with an extra verification layer. When enabled, you'll need a code from your mobile device to log in.
                </p>
              </div>

              {show2FASetup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-md w-full relative shadow-2xl border border-white dark:border-white/10">
                    <button 
                      onClick={() => setShow2FASetup(false)}
                      className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-brand-lavender" />
                    </button>
                    <TwoFactorSetup onComplete={() => window.location.reload()} />
                  </div>
                </div>
              )}

              <div className="p-6 rounded-[2rem] bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1B2559] dark:text-white">Password</p>
                      <p className="text-xs font-medium text-brand-lavender">Update your security pass</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="text-sm font-bold text-brand-blue hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Delete Account Section */}
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <Trash2 className="w-5 h-5 text-danger" />
                  <h4 className="text-sm font-bold text-danger">Danger Zone</h4>
                </div>
                <div className="p-6 rounded-[2rem] bg-danger/5 border border-danger/10">
                  <p className="text-xs font-medium text-danger mb-4">
                    Deleting your account is permanent. All your data, bookings, and activity will be erased forever.
                  </p>
                  <button 
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="text-xs font-bold text-danger border border-danger/30 px-4 py-2 rounded-xl hover:bg-danger hover:text-white transition-all"
                  >
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-md w-full relative shadow-2xl border border-white dark:border-white/10">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-brand-lavender" />
              </button>
              <h3 className="text-xl font-bold text-[#1B2559] dark:text-white mb-6">Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brand-lavender uppercase mb-2">Current Password</label>
                  <input 
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-white/5 focus:border-brand-blue focus:outline-none dark:text-white"
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-lavender uppercase mb-2">New Password</label>
                  <input 
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-white/5 focus:border-brand-blue focus:outline-none dark:text-white"
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-lavender uppercase mb-2">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-white/5 focus:border-brand-blue focus:outline-none dark:text-white"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full btn-primary py-4 rounded-xl font-bold mt-4">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmationDialog 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Permanently Delete Account?"
        message="This action is irreversible. All your data, including active bookings and settings, will be purged immediately. Are you absolutely sure?"
        confirmLabel="Yes, Delete Everything"
        variant="danger"
      />

      <ConfirmationDialog 
        isOpen={is2FAConfirmOpen}
        onClose={() => setIs2FAConfirmOpen(false)}
        onConfirm={handleConfirmDisable2FA}
        title="Disable 2FA?"
        message="Disabling two-factor authentication will make your account less secure. We recommend keeping it enabled."
        confirmLabel="Disable Security"
        variant="warning"
      />
    </div>
  );
};

export default Profile;
