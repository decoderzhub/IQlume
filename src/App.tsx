import React, { useEffect } from 'react';
import { HomePage } from './components/landing/HomePage';
import { LoginForm } from './components/auth/LoginForm';
import { MainApp } from './components/MainApp';
import { useStore } from './store/useStore';
import { auth } from './lib/supabase';

function App() {
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

export default App;