import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setProfile(user);
      setLoading(false);
    } else {
      setError('User not logged in');
      setLoading(false);
    }
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg dark:bg-zinc-950 transition-colors duration-300">
      <div className="w-full max-w-xl p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
          <svg xmlns='http://www.w3.org/2000/svg' className='w-10 h-10 text-brand-blue' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5.121 17.804A9 9 0 1112 21a8.963 8.963 0 01-6.879-3.196z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-[#1B2559] dark:text-white">{profile.name}</h2>
        <p className="text-brand-lavender uppercase font-medium mb-4 tracking-widest">{profile.role}</p>
        <div className="mb-2 text-brand-blue dark:text-brand-blue"><strong>Email:</strong> {profile.email}</div>
        {/* Add more profile fields as needed */}
      </div>
    </div>
  );
};

export default Profile;
