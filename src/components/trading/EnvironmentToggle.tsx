import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface EnvironmentToggleProps {
  onEnvironmentChange?: (environment: 'paper' | 'live') => void;
  onShowModal: (targetEnvironment: 'paper' | 'live') => void;
}

export function EnvironmentToggle({ onEnvironmentChange, onShowModal }: EnvironmentToggleProps) {
  const [currentEnvironment, setCurrentEnvironment] = useState<'paper' | 'live'>('paper');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnvironmentPreference();
  }, []);

  const loadEnvironmentPreference = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('trading_environment_preferences')
        .select('current_environment')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data) {
        setCurrentEnvironment(data.current_environment);
      } else {
        await supabase
          .from('trading_environment_preferences')
          .insert({
            user_id: session.user.id,
            default_environment: 'paper',
            current_environment: 'paper',
          });
      }
    } catch (error) {
      console.error('Error loading environment preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClick = (environment: 'paper' | 'live') => {
    if (environment === currentEnvironment) return;
    onShowModal(environment);
  };

  useEffect(() => {
    const checkForEnvironmentChange = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
          .from('trading_environment_preferences')
          .select('current_environment')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (data && data.current_environment !== currentEnvironment) {
          setCurrentEnvironment(data.current_environment);
          if (onEnvironmentChange) {
            onEnvironmentChange(data.current_environment);
          }
        }
      } catch (error) {
        console.error('Error checking environment:', error);
      }
    };

    const interval = setInterval(checkForEnvironmentChange, 1000);
    return () => clearInterval(interval);
  }, [currentEnvironment, onEnvironmentChange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg">
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  const isLive = currentEnvironment === 'live';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 px-4 py-2 rounded-lg border ${
        isLive
          ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/50'
          : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50'
      }`}>
        <div className={`flex items-center gap-2 ${isLive ? 'text-red-400' : 'text-blue-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
          <span className="text-sm font-semibold">
            {isLive ? 'LIVE TRADING' : 'PAPER TRADING'}
          </span>
        </div>
      </div>

      <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
        <button
          onClick={() => handleToggleClick('paper')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            !isLive
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-gray-400 hover:bg-gray-700'
          }`}
        >
          Paper
        </button>
        <button
          onClick={() => handleToggleClick('live')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            isLive
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'text-gray-400 hover:bg-gray-700'
          }`}
        >
          Live
        </button>
      </div>
    </div>
  );
}
