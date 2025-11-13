import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Key, Shield, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface CoinbaseAdvancedModalProps {
  onClose: () => void;
  onConnect: () => void;
}

export function CoinbaseAdvancedModal({ onClose, onConnect }: CoinbaseAdvancedModalProps) {
  const [accountName, setAccountName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateCDPKey = (key: string): boolean => {
    return key.startsWith('organizations/') && key.includes('/apiKeys/');
  };

  const validatePrivateKey = (key: string): boolean => {
    return key.includes('BEGIN EC PRIVATE KEY') && key.includes('END EC PRIVATE KEY');
  };

  const handleConnect = async () => {
    if (!accountName || !apiKey || !privateKey) {
      setErrorMessage('All fields are required');
      setConnectionStatus('error');
      return;
    }

    if (!validateCDPKey(apiKey)) {
      setErrorMessage('Invalid CDP API key format. Should be: organizations/{org_id}/apiKeys/{key_id}');
      setConnectionStatus('error');
      return;
    }

    if (!validatePrivateKey(privateKey)) {
      setErrorMessage('Invalid private key format. Should be a PEM-formatted EC private key');
      setConnectionStatus('error');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('testing');
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/coinbase-advanced/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          private_key: privateKey,
          account_name: accountName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Connection failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Coinbase Advanced] Connection successful:', data);

      setConnectionStatus('success');
      setTimeout(() => {
        onConnect();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('[Coinbase Advanced] Connection error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Connect Coinbase Advanced Trade
              </h2>
              <p className="text-gray-400">Use CDP API keys for professional trading</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-400 mb-2">What are CDP API Keys?</h4>
                  <p className="text-sm text-blue-300 mb-3">
                    Cloud Developer Platform (CDP) keys provide secure access to Coinbase Advanced Trade API.
                    These keys enable professional trading features including real-time WebSocket data feeds.
                  </p>
                  <a
                    href="https://portal.cdp.coinbase.com/projects"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Get your CDP API keys
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
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
                placeholder="My Coinbase Trading Account"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CDP API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="organizations/{org_id}/apiKeys/{key_id}"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Format: organizations/YOUR_ORG_ID/apiKeys/YOUR_KEY_ID
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Private Key (PEM Format)
              </label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs"
                placeholder="-----BEGIN EC PRIVATE KEY-----&#10;YOUR PRIVATE KEY HERE&#10;-----END EC PRIVATE KEY-----"
                rows={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                Paste your complete EC private key including BEGIN and END markers
              </p>
            </div>

            {connectionStatus === 'error' && errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-400 mb-1">Connection Failed</h4>
                    <p className="text-sm text-red-300">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {connectionStatus === 'success' && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-400 mb-1">Connected Successfully!</h4>
                    <p className="text-sm text-green-300">
                      Your Coinbase Advanced Trade account is now connected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-400 mb-2">Security Notice</h4>
                  <ul className="text-sm text-yellow-300 space-y-1">
                    <li>• Your keys are encrypted and stored securely</li>
                    <li>• Never share your private key with anyone</li>
                    <li>• You can revoke access anytime from the Accounts page</li>
                    <li>• Keys are only used for trading operations you authorize</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1"
                disabled={isConnecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!accountName || !apiKey || !privateKey || isConnecting}
                isLoading={isConnecting}
                className="flex-1"
              >
                {connectionStatus === 'testing' ? 'Testing Connection...' :
                 connectionStatus === 'success' ? 'Connected!' :
                 'Connect Account'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
