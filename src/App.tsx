import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './components/landing/HomePage';
import { LoginForm } from './components/auth/LoginForm';
import { MainApp } from './components/MainApp';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';
import { useStore } from './store/useStore';
import { auth } from './lib/supabase';

function AppContent() {
  const { isAuthenticated, setUser, setLoading } = useStore();
  const [showLogin, setShowLogin] = React.useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const { user } = await auth.getCurrentUser();
      
      if (user) {
        setUser({
          id: user.id,
          email: user.email!,
          subscription_tier: 'starter', // This would come from your user profile
          created_at: user.created_at,
          is_verified: user.email_confirmed_at !== null,
        });
      }
      setLoading(false);
    };

    checkAuth();
  }, [setUser, setLoading]);

  if (!isAuthenticated && !showLogin) {
    return <HomePage onGetStarted={() => setShowLogin(true)} />;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <MainApp />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;