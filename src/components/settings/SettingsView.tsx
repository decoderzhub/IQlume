import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Palette,
  LogOut,
  Save,
  CreditCard,
  Globe,
  Smartphone,
  Mail,
  Settings as SettingsIcon,
  Clock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { MarketDataDebugPanel } from '../debug/MarketDataDebugPanel';
import { COMMON_TIMEZONES, getBrowserTimezone, isValidTimezone } from '../../lib/timezone';

export function SettingsView() {
  const { user, setUser, isDeveloperMode, getEffectiveSubscriptionTier } = useStore();
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    tradeExecutions: true,
    strategyUpdates: false,
    marketNews: true,
  });
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [saving, setSaving] = useState(false);

  // Load user's timezone from profile
  useEffect(() => {
    const loadUserTimezone = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.timezone) {
        setTimezone(data.timezone);
      } else {
        // Try to detect user's browser timezone
        const browserTz = getBrowserTimezone();
        if (isValidTimezone(browserTz)) {
          setTimezone(browserTz);
        }
      }
    };

    loadUserTimezone();
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      // Validate timezone
      if (!isValidTimezone(timezone)) {
        alert('Invalid timezone selected');
        return;
      }

      // Update user profile with timezone
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          timezone,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const subscriptionTiers = {
    starter: { name: 'Starter', color: 'text-green-400', price: 'Free (30-day trial)' },
    pro: { name: 'Pro', color: 'text-purple-400', price: '$49/month' },
    elite: { name: 'Elite', color: 'text-yellow-400', price: '$149/month' },
  };

  const effectiveTier = getEffectiveSubscriptionTier();
  const actualTier = subscriptionTiers[user?.subscription_tier || 'starter'];
  const displayTier = subscriptionTiers[effectiveTier];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Manage your account preferences and configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Profile */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">User Profile</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Subscription Tier</label>
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${displayTier.color}`}>{displayTier.name}</span>
                    {isDeveloperMode && effectiveTier !== (user?.subscription_tier || 'starter') && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                        Developer Override
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {isDeveloperMode && effectiveTier !== (user?.subscription_tier || 'starter') 
                      ? `Actual: ${actualTier.name} (${actualTier.price})` 
                      : displayTier.price
                    }
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Member Since</label>
              <input
                type="text"
                value={user?.created_at ? formatDate(user.created_at) : 'N/A'}
                disabled
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Account Status</label>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user?.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-sm text-gray-300">
                  {user?.is_verified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
          </div>
          
          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {key === 'emailAlerts' && <Mail className="w-4 h-4 text-gray-400" />}
                  {key === 'pushNotifications' && <Smartphone className="w-4 h-4 text-gray-400" />}
                  {key === 'tradeExecutions' && <SettingsIcon className="w-4 h-4 text-gray-400" />}
                  {key === 'strategyUpdates' && <Bell className="w-4 h-4 text-gray-400" />}
                  {key === 'marketNews' && <Globe className="w-4 h-4 text-gray-400" />}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {key === 'emailAlerts' && 'Email Alerts'}
                      {key === 'pushNotifications' && 'Push Notifications'}
                      {key === 'tradeExecutions' && 'Trade Executions'}
                      {key === 'strategyUpdates' && 'Strategy Updates'}
                      {key === 'marketNews' && 'Market News'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {key === 'emailAlerts' && 'Receive important updates via email'}
                      {key === 'pushNotifications' && 'Browser push notifications'}
                      {key === 'tradeExecutions' && 'Notifications when trades execute'}
                      {key === 'strategyUpdates' && 'Updates about your strategies'}
                      {key === 'marketNews' && 'Market news and analysis'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* Preferences */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Preferences</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="dark">Dark Mode</option>
                <option value="light">Light Mode (Coming Soon)</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Español (Coming Soon)</option>
                <option value="fr">Français (Coming Soon)</option>
                <option value="de">Deutsch (Coming Soon)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Time Zone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.timezone} value={tz.timezone}>
                    {tz.displayName} ({tz.offset})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Critical for accurate market hours and trade timing. US markets operate on Eastern Time.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {isDeveloperMode && (
        <MarketDataDebugPanel />
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t border-gray-800">
        <Button onClick={handleSaveSettings} disabled={saving} className="flex-1 sm:flex-none">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          onClick={handleSignOut}
          className="text-red-400 border-red-500/20 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </motion.div>
  );
}