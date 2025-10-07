import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from './components/landing/HomePage';
import { LoginForm } from './components/auth/LoginForm';
import { MainApp } from './components/MainApp';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';
import { useStore } from './store/useStore';
import { auth } from './lib/supabase';

function OAuthCallbackHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setActiveView } = useStore();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const message = params.get('message');

    if (status === 'success') {
      // Show success message
      if (message) {
        alert(decodeURIComponent(message));
      }
      // Navigate to accounts view in the main app
      setActiveView('accounts');
      navigate('/', { replace: true });
    } else if (status === 'error') {
      // Show error message
      if (message) {
        alert(`Error: ${decodeURIComponent(message)}`);
      }
      navigate('/', { replace: true });
    }
  }, [location, navigate, setActiveView]);

  // Show loading while processing
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Processing OAuth callback...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, setUser, setLoading, loading } = useStore();
  const [showLogin, setShowLogin] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);

        console.log('=== Supabase Configuration Check ===');
        console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
        console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
        console.log('Anon Key (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20));

        const { user, error } = await auth.getCurrentUser();

        if (error) {
          console.error('Auth check error:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
        }

        if (user) {
          console.log('User authenticated:', user.email);
          setUser({
            id: user.id,
            email: user.email!,
            subscription_tier: 'starter',
            created_at: user.created_at,
            is_verified: user.email_confirmed_at !== null,
          });
        } else {
          console.log('No authenticated user');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    checkAuth();
  }, [setUser, setLoading]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !showLogin) {
    return <HomePage onGetStarted={() => setShowLogin(true)} />;
  }

  if (!isAuthenticated) {
    return <LoginForm onBack={() => setShowLogin(false)} />;
  }

  return <MainApp />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/accounts" element={<OAuthCallbackHandler />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;