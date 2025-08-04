import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, Building, AlertCircle } from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BankAccount } from '../../types';
import { supportedBanks, createPlaidLinkToken, exchangePlaidPublicToken } from '../../lib/plaid';
import { useStore } from '../../store/useStore';

interface ConnectBankModalProps {
  onClose: () => void;
  onConnect: (account: Omit<BankAccount, 'id'>) => void;
}

export function ConnectBankModal({ onClose, onConnect }: ConnectBankModalProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { user } = useStore();

  useEffect(() => {
    const fetchLinkToken = async () => {
      if (user?.id) {
        try {
          const token = await createPlaidLinkToken(user.id);
          setLinkToken(token);
        } catch (error) {
          console.error('Failed to create Plaid link token:', error);
        }
      }
    };

    fetchLinkToken();
  }, [user?.id]);

  const onSuccess = useCallback((public_token: string, metadata: any) => {
    const exchangeToken = async () => {
      try {
        const response = await exchangePlaidPublicToken(public_token, metadata);
        
        // Create bank account from Plaid metadata
        const bankAccount: Omit<BankAccount, 'id'> = {
          user_id: user?.id || '1',
          bank_name: metadata.institution?.name || 'Unknown Bank',
          account_name: `${metadata.institution?.name} ${metadata.accounts[0]?.subtype || 'Account'}`,
          account_type: metadata.accounts[0]?.subtype === 'savings' ? 'savings' : 'checking',
          account_number_masked: `****${metadata.accounts[0]?.mask || '0000'}`,
          routing_number: '021000021', // This would come from Plaid in production
          balance: Math.random() * 50000 + 1000, // This would come from account balance API
          is_verified: false, // Would be verified via micro-deposits
          plaid_account_id: metadata.accounts[0]?.id || 'plaid_account_id',
          plaid_access_token: response.access_token,
          last_sync: new Date().toISOString(),
        };

        onConnect(bankAccount);
      } catch (error) {
        console.error('Failed to exchange public token:', error);
      }
    };

    exchangeToken();
  }, [onConnect, user?.id]);

  const onExit = useCallback((err, metadata) => {
    console.log('Plaid Link Exit:', { err, metadata });
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Link Bank Account</h2>
              <p className="text-gray-400">Connect your bank account for funding and transfers</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Plaid Security Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-blue-400 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white mb-2">Secured by Plaid</h3>
                  <p className="text-sm text-gray-300 mb-3">
                    We use Plaid, a trusted financial technology company, to securely connect your bank account.
                  </p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Bank-level 256-bit SSL encryption</li>
                    <li>• Your login credentials are never stored</li>
                    <li>• Read-only access to account information</li>
                    <li>• Used by major companies like Venmo, Robinhood, and Coinbase</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Supported Banks Preview */}
            <div>
              <h3 className="font-medium text-white mb-4">Supported Banks</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {supportedBanks.slice(0, 10).map((bank) => (
                  <div key={bank.id} className="text-center p-3 bg-gray-800/30 rounded-lg">
                    <div className="text-2xl mb-1">{bank.logo}</div>
                    <p className="text-xs text-gray-400">{bank.name}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400 mt-3 text-center">
                + 12,000+ other financial institutions
              </p>
            </div>

            {/* What happens next */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">What happens next?</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <span>You'll be redirected to your bank's secure login page</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <span>Authorize brokernomex to access your account information</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <span>Authorize brokernomex to access your account information</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-400 mb-1">Important</h4>
                  <p className="text-sm text-yellow-300">
                    Only connect accounts you own. Linking unauthorized accounts may result in account suspension.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => open()}
                disabled={!ready || !linkToken}
                className="flex-1"
              >
                <Building className="w-4 h-4 mr-2" />
                {!linkToken ? 'Loading...' : 'Connect Bank Account'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}