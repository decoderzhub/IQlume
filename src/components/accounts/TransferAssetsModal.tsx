import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRightLeft, AlertCircle, Info, ExternalLink, Shield, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BrokerageAccount } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface TransferAssetsModalProps {
  onClose: () => void;
  brokerageAccounts: BrokerageAccount[];
}

export function TransferAssetsModal({ onClose, brokerageAccounts }: TransferAssetsModalProps) {
  const [sourceAccount, setSourceAccount] = useState<string>('');
  const [destinationAccount, setDestinationAccount] = useState<string>('');
  const [transferType, setTransferType] = useState<'full' | 'partial'>('full');
  const [step, setStep] = useState<'select' | 'info' | 'instructions'>('select');

  const sourceAccountData = brokerageAccounts.find(acc => acc.id === sourceAccount);
  const destinationAccountData = brokerageAccounts.find(acc => acc.id === destinationAccount);

  const handleNext = () => {
    if (step === 'select') {
      setStep('info');
    } else if (step === 'info') {
      setStep('instructions');
    }
  };

  const handleBack = () => {
    if (step === 'instructions') {
      setStep('info');
    } else if (step === 'info') {
      setStep('select');
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Select Accounts for Transfer</h3>
              <p className="text-gray-400 mb-6">
                Choose the source account (where assets will be transferred from) and the destination account 
                (where assets will be transferred to).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  From Account (Source)
                </label>
                <div className="space-y-2">
                  {brokerageAccounts.map((account) => (
                    <motion.div
                      key={account.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSourceAccount(account.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        sourceAccount === account.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{account.account_name}</p>
                          <p className="text-sm text-gray-400 capitalize">
                            {account.brokerage} • {account.account_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">{formatCurrency(account.balance)}</p>
                          <div className={`w-2 h-2 rounded-full ${account.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  To Account (Destination)
                </label>
                <div className="space-y-2">
                  {brokerageAccounts
                    .filter(acc => acc.id !== sourceAccount)
                    .map((account) => (
                    <motion.div
                      key={account.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setDestinationAccount(account.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        destinationAccount === account.id
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{account.account_name}</p>
                          <p className="text-sm text-gray-400 capitalize">
                            {account.brokerage} • {account.account_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">{formatCurrency(account.balance)}</p>
                          <div className={`w-2 h-2 rounded-full ${account.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Transfer Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setTransferType('full')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    transferType === 'full'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-white mb-2">Full Account Transfer</h4>
                  <p className="text-sm text-gray-400">Transfer all assets and close the source account</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setTransferType('partial')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    transferType === 'partial'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-white mb-2">Partial Transfer</h4>
                  <p className="text-sm text-gray-400">Transfer specific assets while keeping the source account open</p>
                </motion.div>
              </div>
            </div>
          </div>
        );

      case 'info':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Transfer Information</h3>
              <p className="text-gray-400 mb-6">
                Review the transfer details and understand how the ACAT process works.
              </p>
            </div>

            {/* Transfer Summary */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Transfer Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-2">From Account</p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="font-medium text-white">{sourceAccountData?.account_name}</p>
                    <p className="text-sm text-gray-400 capitalize">
                      {sourceAccountData?.brokerage} • {sourceAccountData?.account_type}
                    </p>
                    <p className="text-sm text-red-400 mt-1">
                      Balance: {formatCurrency(sourceAccountData?.balance || 0)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">To Account</p>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="font-medium text-white">{destinationAccountData?.account_name}</p>
                    <p className="text-sm text-gray-400 capitalize">
                      {destinationAccountData?.brokerage} • {destinationAccountData?.account_type}
                    </p>
                    <p className="text-sm text-green-400 mt-1">
                      Balance: {formatCurrency(destinationAccountData?.balance || 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">Transfer Type: 
                  <span className="text-white ml-2 capitalize">{transferType} Account Transfer</span>
                </p>
              </div>
            </div>

            {/* ACAT Process Explanation */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-400 mb-3">How ACAT Transfers Work</h4>
                  <div className="space-y-3 text-sm text-blue-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                      <p>The <strong>receiving brokerage</strong> ({destinationAccountData?.brokerage}) initiates the transfer request</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                      <p>Both brokerages communicate through the ACAT system to verify and process the transfer</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                      <p>Assets are moved electronically from {sourceAccountData?.brokerage} to {destinationAccountData?.brokerage}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                      <p>The process typically takes 5-7 business days to complete</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Expected Timeline
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold mx-auto mb-2">1</div>
                  <p className="text-yellow-400 font-medium">Initiation</p>
                  <p className="text-gray-400">1-2 business days</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">2</div>
                  <p className="text-blue-400 font-medium">Processing</p>
                  <p className="text-gray-400">3-5 business days</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">3</div>
                  <p className="text-green-400 font-medium">Completion</p>
                  <p className="text-gray-400">Assets available</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'instructions':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Transfer Instructions</h3>
              <p className="text-gray-400 mb-6">
                Follow these steps to initiate the ACAT transfer with your destination brokerage.
              </p>
            </div>

            {/* Account Information to Provide */}
            <div className="bg-gray-800/30 rounded-lg p-6">
              <h4 className="font-medium text-white mb-4">Information to Provide to {destinationAccountData?.brokerage}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-400 mb-3">Source Account Details</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Brokerage:</span>
                      <span className="text-white capitalize">{sourceAccountData?.brokerage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Name:</span>
                      <span className="text-white">{sourceAccountData?.account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Type:</span>
                      <span className="text-white capitalize">{sourceAccountData?.account_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Number:</span>
                      <span className="text-white">{sourceAccountData?.account_number || '****1234'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h5 className="font-medium text-green-400 mb-3">Transfer Details</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Transfer Type:</span>
                      <span className="text-white capitalize">{transferType} Transfer</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estimated Value:</span>
                      <span className="text-white">{formatCurrency(sourceAccountData?.balance || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Processing Time:</span>
                      <span className="text-white">5-7 business days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
              <h4 className="font-medium text-blue-400 mb-4">Next Steps</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="text-white font-medium">Log into your {destinationAccountData?.brokerage} account</p>
                    <p className="text-sm text-blue-300 mt-1">Access your destination brokerage's website or mobile app</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="text-white font-medium">Find the "Transfer Assets" or "ACAT Transfer" option</p>
                    <p className="text-sm text-blue-300 mt-1">Usually found in Account Settings, Funding, or Transfer sections</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="text-white font-medium">Provide the source account information</p>
                    <p className="text-sm text-blue-300 mt-1">Use the account details shown above</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                  <div>
                    <p className="text-white font-medium">Submit the transfer request</p>
                    <p className="text-sm text-blue-300 mt-1">Review all details carefully before submitting</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</div>
                  <div>
                    <p className="text-white font-medium">Monitor the transfer progress</p>
                    <p className="text-sm text-blue-300 mt-1">Both brokerages will provide status updates</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-400 mb-2">Important Notes</h4>
                  <ul className="text-sm text-yellow-300 space-y-1">
                    <li>• Some brokerages may charge transfer fees (typically $50-$100)</li>
                    <li>• Fractional shares may be liquidated during the transfer</li>
                    <li>• Options positions may not be transferable between all brokerages</li>
                    <li>• You cannot trade the assets being transferred during the process</li>
                    <li>• Contact both brokerages if you encounter any issues</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
              <h2 className="text-2xl font-bold text-white mb-2">Transfer Assets Between Brokerages</h2>
              <p className="text-gray-400">Use ACAT to move your investments between brokerage accounts</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {['select', 'info', 'instructions'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === stepName 
                      ? 'bg-blue-600 text-white' 
                      : index < ['select', 'info', 'instructions'].indexOf(step)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 2 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      index < ['select', 'info', 'instructions'].indexOf(step)
                        ? 'bg-green-600'
                        : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Important Disclaimer */}
          <div className="mt-8 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-300 mb-2">Important Disclaimer</h4>
                <p className="text-sm text-gray-400">
                  Brokernomex does not directly execute asset transfers. We provide information to help you 
                  initiate ACAT transfers through your destination brokerage. The actual transfer is handled 
                  by the brokerage firms through the official ACAT system. Always verify transfer details 
                  with your brokerages before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            {step !== 'select' && (
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
            )}
            
            <div className="flex-1" />
            
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            
            {step !== 'instructions' && (
              <Button 
                onClick={handleNext}
                disabled={step === 'select' && (!sourceAccount || !destinationAccount)}
              >
                {step === 'select' ? 'Continue' : 'View Instructions'}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}