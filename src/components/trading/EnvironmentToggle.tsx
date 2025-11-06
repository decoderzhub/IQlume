import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EnvironmentToggleProps {
  onEnvironmentChange?: (environment: 'paper' | 'live') => void;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  targetEnvironment: 'paper' | 'live';
}

function ConfirmationModal({ isOpen, onConfirm, onCancel, targetEnvironment }: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isGoingLive = targetEnvironment === 'live';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6 my-auto relative z-[10000]">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-lg ${isGoingLive ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
            {isGoingLive ? (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            ) : (
              <CheckCircle className="w-6 h-6 text-blue-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Switch to {isGoingLive ? 'Live' : 'Paper'} Trading?
            </h3>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {isGoingLive ? (
            <>
              <p className="text-gray-300">
                You are about to switch to <strong className="text-red-400">LIVE TRADING</strong> mode.
              </p>
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <ul className="text-sm text-red-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>All trades will use <strong>real money</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>Orders will be executed on live markets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>Losses will affect your actual account balance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>Ensure you understand the risks before proceeding</span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-300">
                You are about to switch to <strong className="text-blue-400">PAPER TRADING</strong> mode.
              </p>
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <ul className="text-sm text-blue-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>All trades will use <strong>virtual money</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Orders will be simulated (not real)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>No real money is at risk</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Perfect for testing strategies</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold ${
              isGoingLive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isGoingLive ? 'Switch to Live' : 'Switch to Paper'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EnvironmentToggle({ onEnvironmentChange }: EnvironmentToggleProps) {
  const [currentEnvironment, setCurrentEnvironment] = useState<'paper' | 'live'>('paper');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [targetEnvironment, setTargetEnvironment] = useState<'paper' | 'live'>('paper');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

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

    setTargetEnvironment(environment);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('trading_environment_preferences')
        .upsert({
          user_id: session.user.id,
          current_environment: targetEnvironment,
          default_environment: targetEnvironment,
          show_confirmation_on_switch: true,
        });

      setCurrentEnvironment(targetEnvironment);
      setShowConfirmation(false);

      if (onEnvironmentChange) {
        onEnvironmentChange(targetEnvironment);
      }
    } catch (error) {
      console.error('Error updating environment:', error);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

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
    <>
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

      <ConfirmationModal
        isOpen={showConfirmation}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        targetEnvironment={targetEnvironment}
      />
    </>
  );
}
