import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import Resources from './Resources';
import Bookings from './Bookings';
import Overview from './Overview';
import AdminResources from './admin/AdminResources';
import AuditLogs from './admin/AuditLogs';
import BookingForm from '../components/booking/BookingForm';
import MainLayout from '../components/layout/MainLayout';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedResource, setSelectedResource] = useState(null);

  // Sync activeTab with location state if navigated from sidebar
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const isAdmin = user?.role === 'admin';

  const handleBookingSuccess = () => {
    setSelectedResource(null);
    setActiveTab('bookings');
  };

  return (
    <MainLayout activeTabOverride={activeTab}>
      <main className="w-full">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'resources' && (
          <Resources onBook={(resource) => setSelectedResource(resource)} />
        )}
        {activeTab === 'bookings' && <Bookings />}
        {activeTab === 'manage-resources' && isAdmin && <AdminResources />}
        {activeTab === 'audit-logs' && isAdmin && <AuditLogs />}
      </main>

      {/* Booking Modal */}
      {selectedResource && (
        <BookingForm 
          resource={selectedResource} 
          onClose={() => setSelectedResource(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </MainLayout>
  );
};

export default Dashboard;
