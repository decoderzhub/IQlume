import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface EnvironmentSwitchModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  targetEnvironment: 'paper' | 'live';
}

export function EnvironmentSwitchModal({
  isOpen,
  onConfirm,
  onCancel,
  targetEnvironment
}: EnvironmentSwitchModalProps) {
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
