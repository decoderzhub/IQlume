import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink, Shield, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BrokerageAccount } from '../../types';
import { supportedBrokerages } from '../../lib/plaid';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { useEffect } from 'react';
import { CoinbaseAdvancedWizard } from './CoinbaseAdvancedWizard';

interface ConnectBrokerageModalProps {
  onClose: () => void;
  onConnect: (account: Omit<BrokerageAccount, 'id'>) => void;
}

export function ConnectBrokerageModal({ onClose, onConnect }: ConnectBrokerageModalProps) {
  const [selectedBrokerage, setSelectedBrokerage] = useState<string | null>(null);
  const [accountName, setAccountName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCoinbaseAdvancedModal, setShowCoinbaseAdvancedModal] = useState(false);
  const { user } = useStore();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const message = urlParams.get('message');

    if (status === 'error' && message) {
      console.error('[Alpaca OAuth] Callback error:', decodeURIComponent(message));
    } else if (status === 'success' && message) {
      console.log('[Alpaca OAuth] Callback success:', decodeURIComponent(message));
    }
  }, []);

  const handleConnect = async () => {
    if (!selectedBrokerage || !accountName) return;

    if (selectedBrokerage === 'coinbase_advanced') {
      setShowCoinbaseAdvancedModal(true);
      return;
    }

    setIsConnecting(true);

    try {
      if (selectedBrokerage === 'alpaca') {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('No valid session found. Please log in again.');
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const authUrl = `${apiUrl}/api/alpaca/oauth/authorize?account_name=${encodeURIComponent(accountName)}`;

        console.log('[Alpaca OAuth] Requesting OAuth URL from:', authUrl);

        const response = await fetch(authUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Alpaca OAuth] Failed to get OAuth URL:', response.status, errorText);
          throw new Error(`Failed to get OAuth URL: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[Alpaca OAuth] Received OAuth response:', {
          oauth_url: data.oauth_url,
          debug_info: data.debug_info
        });

        if (!data.oauth_url) {
          throw new Error('No OAuth URL received from server');
        }

        console.log('[Alpaca OAuth] Redirecting to Alpaca authorization page...');
        console.log('[Alpaca OAuth] Debug Info:', data.debug_info);

        window.location.href = data.oauth_url;
      } else if (selectedBrokerage === 'coinbase') {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('No valid session found. Please log in again.');
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const authUrl = `${apiUrl}/api/coinbase/oauth/authorize?account_name=${encodeURIComponent(accountName)}`;

        console.log('[Coinbase OAuth] Requesting OAuth URL from:', authUrl);

        const response = await fetch(authUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Coinbase OAuth] Failed to get OAuth URL:', response.status, errorText);
          throw new Error(`Failed to get OAuth URL: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[Coinbase OAuth] Received OAuth response:', {
          oauth_url: data.oauth_url,
          debug_info: data.debug_info
        });

        if (!data.oauth_url) {
          throw new Error('No OAuth URL received from server');
        }

        console.log('[Coinbase OAuth] Redirecting to Coinbase authorization page...');
        console.log('[Coinbase OAuth] Debug Info:', data.debug_info);

        window.location.href = data.oauth_url;
      } else {
        // For other brokerages, use the existing mock flow
        await new Promise(resolve => setTimeout(resolve, 2000));

        const brokerage = supportedBrokerages.find(b => b.id === selectedBrokerage);
        if (brokerage) {
          onConnect({
            user_id: user?.id || '1',
            brokerage: selectedBrokerage as any,
            account_name: accountName,
            account_type: brokerage.type as any,
            balance: Math.random() * 100000 + 10000,
            is_connected: true,
            last_sync: new Date().toISOString(),
            oauth_token: 'mock_oauth_token_' + Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('[Brokerage OAuth] Error connecting brokerage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const brokerageName = selectedBrokerage === 'alpaca' ? 'Alpaca' : selectedBrokerage === 'coinbase' ? 'Coinbase' : 'Brokerage';
      alert(`Failed to connect ${brokerageName} account:\n\n${errorMessage}\n\nPlease check:\n1. Your ${brokerageName} OAuth app is registered and approved\n2. The redirect URI in ${brokerageName} matches your server configuration\n3. Your API keys are correctly configured`);
      setIsConnecting(false);
    }
  };

  const selectedBrokerageData = supportedBrokerages.find(b => b.id === selectedBrokerage);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Brokerage Account</h2>
              <p className="text-gray-400">Link your trading accounts for automated strategies</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {!selectedBrokerage ? (
            <div>
              <h3 className="text-lg font-semibold text-white mb-6">Choose Your Brokerage</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {supportedBrokerages.map((brokerage) => {
                  const isAvailable = brokerage.id === 'alpaca' || brokerage.id === 'coinbase' || brokerage.id === 'coinbase_advanced';
                  return (
                    <motion.div
                      key={brokerage.id}
                      whileHover={isAvailable ? { scale: 1.02 } : {}}
                      whileTap={isAvailable ? { scale: 0.98 } : {}}
                      onClick={isAvailable ? () => setSelectedBrokerage(brokerage.id) : undefined}
                      className={`p-6 border rounded-lg transition-all relative ${
                        isAvailable
                          ? 'bg-gray-800/30 border-gray-700 cursor-pointer hover:border-blue-500'
                          : 'bg-gray-800/10 border-gray-800 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {!isAvailable && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                          Coming Soon
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-3xl mb-3">{brokerage.logo}</div>
                        <h4 className={`font-medium mb-2 ${
                          isAvailable ? 'text-white' : 'text-gray-500'
                        }`}>
                          {brokerage.name}
                        </h4>
                        <p className={`text-sm capitalize ${
                          isAvailable ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {brokerage.type}
                        </p>
                        {isAvailable && (
                          <div className="mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                            Available Now
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-2xl">{selectedBrokerageData?.logo}</div>
                <div>
                  <h3 className="font-semibold text-white">{selectedBrokerageData?.name}</h3>
                  <p className="text-sm text-gray-400">
                    You'll be redirected to {selectedBrokerageData?.name} to authorize the connection
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Nickname
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`My ${selectedBrokerageData?.name} Account`}
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-400 mb-2">Security Notice</h4>
                    <ul className="text-sm text-yellow-300 space-y-1">
                      <li>• Your credentials are never stored on our servers</li>
                      <li>• We use OAuth 2.0 for secure authentication</li>
                      <li>• You can revoke access at any time from your brokerage account settings</li>
                      <li>• All data is encrypted in transit and at rest</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield className="w-4 h-4" />
                <span>256-bit SSL encryption • SOC 2 Type II compliant</span>
              </div>

              {/* Alpaca OAuth Disclosure */}
              {selectedBrokerage === 'alpaca' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-400 mb-3">Authorize brokernomex</h4>
                      <p className="text-sm text-blue-300 leading-relaxed mb-4">
                        By allowing <strong>brokernomex</strong> to access your Alpaca account, you are granting{' '}
                        <strong>brokernomex</strong> access to your account information and authorization to place
                        transactions in your account at your direction.
                      </p>
                      <p className="text-sm text-blue-300 leading-relaxed mb-4">
                        Alpaca does not warrant or guarantee that <strong>brokernomex</strong> will work as
                        advertised or expected.
                      </p>
                      <p className="text-sm text-blue-300 leading-relaxed">
                        Before authorizing, learn more about{' '}
                        <a
                          href="https://brokernomex.com/about"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          brokernomex
                        </a>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Coinbase OAuth Disclosure */}
              {selectedBrokerage === 'coinbase' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-400 mb-3">Authorize brokernomex</h4>
                      <p className="text-sm text-blue-300 leading-relaxed mb-4">
                        By allowing <strong>brokernomex</strong> to access your Coinbase account, you are granting{' '}
                        <strong>brokernomex</strong> permission to view your cryptocurrency balances, read transaction
                        history, and execute buy/sell orders on your behalf.
                      </p>
                      <p className="text-sm text-blue-300 leading-relaxed mb-4">
                        Your funds remain secure in your Coinbase account. <strong>brokernomex</strong> can only
                        execute trades - we cannot withdraw funds or transfer cryptocurrencies to external wallets.
                      </p>
                      <p className="text-sm text-blue-300 leading-relaxed mb-4">
                        You can revoke <strong>brokernomex</strong>'s access at any time from your Coinbase settings.
                      </p>
                      <p className="text-sm text-blue-300 leading-relaxed">
                        Before authorizing, learn more about{' '}
                        <a
                          href="https://brokernomex.com/about"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          brokernomex
                        </a>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedBrokerage(null)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={!accountName || isConnecting}
                  isLoading={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? 'Connecting...' : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {showCoinbaseAdvancedModal && (
        <CoinbaseAdvancedWizard
          onClose={() => {
            setShowCoinbaseAdvancedModal(false);
            setSelectedBrokerage(null);
          }}
          onConnect={() => {
            setShowCoinbaseAdvancedModal(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}