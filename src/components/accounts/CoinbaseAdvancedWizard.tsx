import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Key,
  Shield,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  ZoomIn,
  HelpCircle,
  Zap
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { CoinbaseAdvancedModal } from './CoinbaseAdvancedModal';

interface CoinbaseAdvancedWizardProps {
  onClose: () => void;
  onConnect: () => void;
}

const TOTAL_STEPS = 7;

export function CoinbaseAdvancedWizard({ onClose, onConnect }: CoinbaseAdvancedWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [accountName, setAccountName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);

  const validateCDPKey = (key: string): boolean => {
    return key.startsWith('organizations/') && key.includes('/apiKeys/');
  };

  const validatePrivateKey = (key: string): boolean => {
    return key.includes('BEGIN EC PRIVATE KEY') && key.includes('END EC PRIVATE KEY');
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
      }, 2000);

    } catch (error) {
      console.error('[Coinbase Advanced] Connection error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
      case 2:
      case 3:
      case 4:
        return true;
      case 5:
        return accountName.trim() !== '';
      case 6:
        return validateCDPKey(apiKey) && validatePrivateKey(privateKey);
      case 7:
        return connectionStatus === 'success';
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1Welcome onQuickSetup={() => setShowQuickSetup(true)} />;
      case 2:
        return <Step2Requirements />;
      case 3:
        return <Step3NavigateToCDP onImageClick={setExpandedImage} />;
      case 4:
        return <Step4CreateAPIKey onImageClick={setExpandedImage} />;
      case 5:
        return (
          <Step5AccountName
            accountName={accountName}
            setAccountName={setAccountName}
          />
        );
      case 6:
        return (
          <Step6EnterCredentials
            apiKey={apiKey}
            setApiKey={setApiKey}
            privateKey={privateKey}
            setPrivateKey={setPrivateKey}
            showPrivateKey={showPrivateKey}
            setShowPrivateKey={setShowPrivateKey}
            validateCDPKey={validateCDPKey}
            validatePrivateKey={validatePrivateKey}
            copiedField={copiedField}
            handleCopy={handleCopy}
            onImageClick={setExpandedImage}
          />
        );
      case 7:
        return (
          <Step7Connect
            accountName={accountName}
            apiKey={apiKey}
            connectionStatus={connectionStatus}
            errorMessage={errorMessage}
            isConnecting={isConnecting}
            handleConnect={handleConnect}
          />
        );
      default:
        return null;
    }
  };

  if (showQuickSetup) {
    return <CoinbaseAdvancedModal onClose={onClose} onConnect={onConnect} />;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Connect Coinbase Advanced Trade
                </h2>
                <p className="text-gray-400">Step {currentStep} of {TOTAL_STEPS}</p>
              </div>
              <Button variant="ghost" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                          step < currentStep
                            ? 'bg-green-500 text-white'
                            : step === currentStep
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {step < currentStep ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          step
                        )}
                      </div>
                    </div>
                    {step < TOTAL_STEPS && (
                      <div
                        className={`flex-1 h-1 mx-2 transition-all ${
                          step < currentStep ? 'bg-green-500' : 'bg-gray-700'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="min-h-[400px]"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  if (currentStep === 1) {
                    onClose();
                  } else {
                    setCurrentStep(currentStep - 1);
                  }
                }}
                disabled={isConnecting}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {currentStep === 1 ? 'Cancel' : 'Previous'}
              </Button>

              {currentStep < TOTAL_STEPS && (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceedToNextStep()}
                  className="flex-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            src={expandedImage}
            alt="Expanded view"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <Button
            variant="ghost"
            className="absolute top-4 right-4"
            onClick={() => setExpandedImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      )}
    </>
  );
}

interface Step1Props {
  onQuickSetup: () => void;
}

function Step1Welcome({ onQuickSetup }: Step1Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-2xl font-bold text-white mb-3">
          Welcome to Coinbase Advanced Trade Setup
        </h3>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          We'll guide you step-by-step through connecting your Coinbase Advanced Trade account.
          This takes about 5 minutes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
          <Shield className="w-8 h-8 text-blue-400 mb-3" />
          <h4 className="font-semibold text-white mb-2">Secure Connection</h4>
          <p className="text-sm text-gray-400">
            Your API keys are encrypted and stored securely. You maintain full control of your funds.
          </p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
          <Key className="w-8 h-8 text-green-400 mb-3" />
          <h4 className="font-semibold text-white mb-2">Professional Trading</h4>
          <p className="text-sm text-gray-400">
            Access advanced features like grid trading, real-time WebSocket data, and lower fees.
          </p>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-400 mb-1">Before You Start</h4>
            <p className="text-sm text-yellow-300">
              You'll need a Coinbase account with Advanced Trade enabled. Don't have one?{' '}
              <a
                href="https://www.coinbase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-200"
              >
                Create an account first
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center pt-4">
        <button
          onClick={onQuickSetup}
          className="text-sm text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Already have your CDP keys? Switch to Quick Setup
        </button>
      </div>
    </div>
  );
}

function Step2Requirements() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">What You'll Need</h3>
        <p className="text-gray-400">
          Make sure you have the following ready before proceeding:
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">1</span>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Active Coinbase Account</h4>
            <p className="text-sm text-gray-400">
              You need a verified Coinbase account with identity verification (KYC) completed.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">2</span>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Advanced Trade Access</h4>
            <p className="text-sm text-gray-400">
              Ensure Coinbase Advanced Trade is enabled in your account settings. This is typically automatic for all accounts.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">3</span>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">5 Minutes of Time</h4>
            <p className="text-sm text-gray-400">
              The setup process involves creating API keys on Coinbase's Cloud Developer Platform and copying them here.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-400 mb-2">What are CDP API Keys?</h4>
            <p className="text-sm text-blue-300 mb-2">
              Cloud Developer Platform (CDP) keys are secure credentials that allow brokernomex to execute trades on your behalf.
            </p>
            <p className="text-sm text-blue-300">
              Unlike passwords, these keys can only perform specific actions (trading) and can be revoked anytime without changing your Coinbase password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step3Props {
  onImageClick: (src: string) => void;
}

function Step3NavigateToCDP({ onImageClick }: Step3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Navigate to CDP Portal</h3>
        <p className="text-gray-400">
          Follow these steps to access the Coinbase Cloud Developer Platform:
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">1</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-2">Open CDP Portal</h4>
            <p className="text-sm text-gray-400 mb-3">
              Click the button below to open the Coinbase Cloud Developer Platform in a new tab:
            </p>
            <a
              href="https://portal.cdp.coinbase.com/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Open CDP Portal
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">2</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-2">Sign In to Coinbase</h4>
            <p className="text-sm text-gray-400">
              If prompted, sign in with your Coinbase credentials. Use the same account you want to connect to brokernomex.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">3</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-2">Create or Select a Project</h4>
            <p className="text-sm text-gray-400 mb-3">
              You'll see your projects list. Either create a new project or select an existing one where you want to create the API key.
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-400">
              💡 <strong>Tip:</strong> We recommend creating a project named "brokernomex" to keep things organized.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Keep this window open!</strong> You'll need to come back here to paste your API keys in the next steps.
        </p>
      </div>
    </div>
  );
}

function Step4CreateAPIKey({ onImageClick }: Step3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Create API Key</h3>
        <p className="text-gray-400">
          Now let's create your CDP API key with the correct permissions:
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">1</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-2">Navigate to API Keys</h4>
            <p className="text-sm text-gray-400 mb-3">
              In your CDP project, find and click on the <strong className="text-white">"API Keys"</strong> section in the left sidebar.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">2</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-2">Click "Create API Key"</h4>
            <p className="text-sm text-gray-400">
              Look for a button labeled "Create API Key" or "+ New API Key" and click it.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">3</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-2">Set Permissions</h4>
            <p className="text-sm text-gray-400 mb-3">
              You'll be asked to select permissions. Enable the following:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-white font-medium">View</span>
                <span className="text-gray-400">- Read account and market data</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-white font-medium">Trade</span>
                <span className="text-gray-400">- Execute buy/sell orders</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-800/50 border border-gray-700 rounded text-sm">
                <X className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 font-medium">Transfer</span>
                <span className="text-gray-500">- Leave this disabled</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">4</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-2">Download Key File</h4>
            <p className="text-sm text-gray-400 mb-3">
              After creating the key, Coinbase will show you the key details and offer to download a JSON file. <strong className="text-white">Download this file immediately</strong> - you'll need it in the next step.
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-300">
                  <strong>Important:</strong> The private key is only shown once. If you lose it, you'll need to create a new API key.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          ✅ Once you've downloaded the JSON file, click "Next" to continue to the credentials entry step.
        </p>
      </div>
    </div>
  );
}

interface Step5Props {
  accountName: string;
  setAccountName: (name: string) => void;
}

function Step5AccountName({ accountName, setAccountName }: Step5Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Name Your Account</h3>
        <p className="text-gray-400">
          Give your Coinbase Advanced Trade connection a friendly name to help you identify it later:
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Account Nickname
        </label>
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          placeholder="My Coinbase Trading Account"
          autoFocus
        />
        <p className="mt-2 text-sm text-gray-500">
          This is just for your reference - you can change it later
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3">Suggested Names:</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            'Main Trading Account',
            'Coinbase Pro',
            'Crypto Portfolio',
            'Advanced Trading',
            'Grid Trading Account',
            'Primary Coinbase'
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setAccountName(suggestion)}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-sm transition-colors text-left"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Step6Props {
  apiKey: string;
  setApiKey: (key: string) => void;
  privateKey: string;
  setPrivateKey: (key: string) => void;
  showPrivateKey: boolean;
  setShowPrivateKey: (show: boolean) => void;
  validateCDPKey: (key: string) => boolean;
  validatePrivateKey: (key: string) => boolean;
  copiedField: string | null;
  handleCopy: (text: string, field: string) => void;
  onImageClick: (src: string) => void;
}

function Step6EnterCredentials({
  apiKey,
  setApiKey,
  privateKey,
  setPrivateKey,
  showPrivateKey,
  setShowPrivateKey,
  validateCDPKey,
  validatePrivateKey,
  copiedField,
  handleCopy,
  onImageClick
}: Step6Props) {
  const apiKeyValid = apiKey && validateCDPKey(apiKey);
  const privateKeyValid = privateKey && validatePrivateKey(privateKey);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Enter Your Credentials</h3>
        <p className="text-gray-400">
          Open the JSON file you downloaded and copy the values into the fields below:
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-400 mb-2">How to Find Your Credentials</h4>
            <p className="text-sm text-blue-300 mb-2">
              The JSON file contains two important fields:
            </p>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• <code className="bg-blue-900/30 px-1 rounded">name</code> - This is your CDP API Key</li>
              <li>• <code className="bg-blue-900/30 px-1 rounded">privateKey</code> - This is your Private Key</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          CDP API Key
          {apiKeyValid && <CheckCircle className="inline w-4 h-4 text-green-400 ml-2" />}
        </label>
        <div className="relative">
          <Key className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={`w-full pl-11 pr-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
              apiKey && !apiKeyValid ? 'border-red-500' : apiKeyValid ? 'border-green-500' : 'border-gray-700'
            }`}
            placeholder="organizations/{org_id}/apiKeys/{key_id}"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Format: organizations/YOUR_ORG_ID/apiKeys/YOUR_KEY_ID
        </p>
        {apiKey && !apiKeyValid && (
          <p className="mt-1 text-xs text-red-400">
            Invalid format. Should start with "organizations/" and contain "/apiKeys/"
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Private Key (PEM Format)
            {privateKeyValid && <CheckCircle className="inline w-4 h-4 text-green-400 ml-2" />}
          </label>
          <button
            onClick={() => setShowPrivateKey(!showPrivateKey)}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            {showPrivateKey ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show
              </>
            )}
          </button>
        </div>
        <textarea
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs ${
            showPrivateKey ? '' : 'text-security-disc'
          } ${
            privateKey && !privateKeyValid ? 'border-red-500' : privateKeyValid ? 'border-green-500' : 'border-gray-700'
          }`}
          placeholder="-----BEGIN EC PRIVATE KEY-----&#10;YOUR PRIVATE KEY HERE&#10;-----END EC PRIVATE KEY-----"
          rows={8}
          style={!showPrivateKey ? { WebkitTextSecurity: 'disc' } as any : {}}
        />
        <p className="mt-1 text-xs text-gray-500">
          Paste your complete EC private key including BEGIN and END markers
        </p>
        {privateKey && !privateKeyValid && (
          <p className="mt-1 text-xs text-red-400">
            Invalid format. Should contain "BEGIN EC PRIVATE KEY" and "END EC PRIVATE KEY"
          </p>
        )}
      </div>

      {apiKeyValid && privateKeyValid && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-400 mb-1">Credentials Look Good!</h4>
              <p className="text-sm text-green-300">
                Your API key and private key are in the correct format. Click "Next" to test the connection.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-400 mb-2">Security Reminder</h4>
            <ul className="text-sm text-yellow-300 space-y-1">
              <li>• Never share your private key with anyone</li>
              <li>• Your keys are encrypted before storage</li>
              <li>• You can revoke access anytime from the Accounts page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step7Props {
  accountName: string;
  apiKey: string;
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  errorMessage: string;
  isConnecting: boolean;
  handleConnect: () => void;
}

function Step7Connect({
  accountName,
  apiKey,
  connectionStatus,
  errorMessage,
  isConnecting,
  handleConnect
}: Step7Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Review & Connect</h3>
        <p className="text-gray-400">
          Review your connection details and click "Connect Account" to complete the setup:
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-400">Account Name</label>
          <p className="text-white font-medium">{accountName}</p>
        </div>

        <div>
          <label className="text-sm text-gray-400">CDP API Key</label>
          <p className="text-white font-mono text-sm">
            {apiKey.substring(0, 30)}...{apiKey.substring(apiKey.length - 10)}
          </p>
        </div>

        <div>
          <label className="text-sm text-gray-400">Private Key</label>
          <p className="text-white font-mono text-sm">••••••••••••••••••••</p>
        </div>
      </div>

      {connectionStatus === 'idle' && (
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          isLoading={isConnecting}
          className="w-full py-4 text-lg"
        >
          <Key className="w-5 h-5 mr-2" />
          Connect Account
        </Button>
      )}

      {connectionStatus === 'testing' && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <div>
              <h4 className="font-medium text-blue-400 mb-1">Testing Connection...</h4>
              <p className="text-sm text-blue-300">
                Verifying your credentials with Coinbase Advanced Trade API
              </p>
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
                Your Coinbase Advanced Trade account is now connected. You can start creating trading strategies!
              </p>
            </div>
          </div>
        </div>
      )}

      {connectionStatus === 'error' && errorMessage && (
        <>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-400 mb-1">Connection Failed</h4>
                <p className="text-sm text-red-300">{errorMessage}</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            isLoading={isConnecting}
            className="w-full py-4 text-lg"
          >
            <Key className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        </>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-400 mb-2">Common Issues</h4>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Make sure your API key has View and Trade permissions enabled</li>
              <li>• Verify the private key was copied completely (including BEGIN/END lines)</li>
              <li>• Check that your Coinbase account is verified and active</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
