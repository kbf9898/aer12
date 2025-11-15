import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SupportAuthProvider } from './contexts/SupportAuthContext';
import LandingPage from './components/LandingPage';
import SignupPage from './components/SignupPage';
import UpgradePage from './components/UpgradePage';
import SubscriptionGuard from './components/SubscriptionGuard';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import DebugAuth from './components/DebugAuth';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import BillingPage from './components/BillingPage';
import LoadingBar from './components/LoadingBar';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <>
        <LoadingBar isLoading={loading} />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1E2A78] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-xs text-gray-400 mt-2">Setting up your system</p>
        </div>
      </div>
      </>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SubscriptionGuard>
      {children}
    </SubscriptionGuard>
  );
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/debug" element={<DebugAuth />} />
          
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          
          {/* All dedicated portal/wallet routes removed as their components were not imported */}
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            {/* Keeping BillingPage as it was imported */}
            <Route path="billing" element={<BillingPage />} /> 
            
            {/* Keeping inline elements */}
            <Route path="qr" element={<div className="p-8 text-center text-gray-500">QR Codes page coming soon...</div>} />
            <Route path="settings" element={<div className="p-8 text-center text-gray-500">Settings page coming soon...</div>} />
            
            {/* All other dashboard child routes removed as their components were not imported */}
          </Route>
          
          <Route path="/app" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch-all route for paths that now lead to nowhere (optional, but good practice) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;