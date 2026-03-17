import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import api from '../lib/api';
import { User, Mail, Shield, ShieldCheck, BadgeCheck, Settings, Bell, Lock, LogOut } from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      setProfile(user);
      
      try {
        const response = await api.get('/bookings');
        const activeBookings = response.data.bookings.filter(b => b.status !== 'cancelled').length;
        setBookingsCount(activeBookings);
      } catch (err) {
        console.error('Error fetching bookings count:', err);
        // Fallback to 0 if fetch fails, don't block profile view
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center h-full text-red-500">
      {error}
    </div>
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#1B2559] dark:text-white mb-2">My Profile</h1>
          <p className="text-brand-lavender font-medium">Manage your personal information and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Overview */}
          <div className="lg:col-span-1 space-y-8">
            <div className="card flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                  <User className="w-12 h-12" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white dark:border-zinc-900 rounded-full flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-[#1B2559] dark:text-white mb-1">{profile.name}</h2>
              <p className="text-brand-lavender text-sm font-semibold uppercase tracking-wider mb-6">{profile.role}</p>
              
              <div className="w-full flex justify-center gap-4 py-4 border-y border-gray-50 dark:border-white/5 mb-6">
                <div className="text-center">
                  <p className="text-lg font-bold text-[#1B2559] dark:text-white">Active</p>
                  <p className="text-[10px] text-brand-lavender uppercase font-bold">Status</p>
                </div>
                <div className="w-px h-10 bg-gray-100 dark:bg-white/5"></div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#1B2559] dark:text-white">{bookingsCount}</p>
                  <p className="text-[10px] text-brand-lavender uppercase font-bold">Bookings</p>
                </div>
              </div>

              <button onClick={logout} className="btn btn-secondary w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:text-red-400">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-[#1B2559] dark:text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-blue" />
                Account Security
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-brand-lavender" />
                    <span className="text-sm font-medium text-[#1B2559] dark:text-white">Two-Factor Auth</span>
                  </div>
                  <div className="w-8 h-4 bg-gray-200 dark:bg-zinc-700 rounded-full relative">
                    <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <button className="text-sm text-brand-blue font-bold hover:underline">Change Password</button>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Info & Settings */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card">
              <h3 className="text-lg font-bold text-[#1B2559] dark:text-white mb-8">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-extrabold text-brand-lavender uppercase tracking-widest block mb-2 px-1">Full Name</label>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-bg dark:bg-zinc-950 border border-gray-100 dark:border-white/5">
                    <User className="w-4 h-4 text-brand-blue" />
                    <span className="text-sm font-bold text-[#1B2559] dark:text-white">{profile.name}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-brand-lavender uppercase tracking-widest block mb-2 px-1">Email Address</label>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-bg dark:bg-zinc-950 border border-gray-100 dark:border-white/5">
                    <Mail className="w-4 h-4 text-brand-blue" />
                    <span className="text-sm font-bold text-[#1B2559] dark:text-white">{profile.email}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-brand-lavender uppercase tracking-widest block mb-2 px-1">Role / Designation</label>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-bg dark:bg-zinc-950 border border-gray-100 dark:border-white/5">
                    <ShieldCheck className="w-4 h-4 text-brand-blue" />
                    <span className="text-sm font-bold text-[#1B2559] dark:text-white capitalize">{profile.role}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-brand-lavender uppercase tracking-widest block mb-2 px-1">User ID</label>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-bg dark:bg-zinc-950 border border-gray-100 dark:border-white/5">
                    <span className="text-[10px] font-mono font-bold text-[#1B2559] dark:text-white opacity-60">#{profile.id.substring(0, 12)}...</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-50 dark:border-white/5 flex justify-end">
                <button className="btn btn-primary">Edit Profile</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="card">
                <h3 className="text-lg font-bold text-[#1B2559] dark:text-white mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-blue" />
                  Notifications
                </h3>
                <p className="text-sm text-brand-lavender mb-6">Manage how you receive alerts and updates.</p>
                <button className="btn btn-secondary w-full justify-center">Preferences</button>
              </div>
              <div className="card">
                <h3 className="text-lg font-bold text-[#1B2559] dark:text-white mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-blue" />
                  Preferences
                </h3>
                <p className="text-sm text-brand-lavender mb-6">Customize your workspace experience.</p>
                <button className="btn btn-secondary w-full justify-center">Theme & Display</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
