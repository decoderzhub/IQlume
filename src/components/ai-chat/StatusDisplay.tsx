import React from 'react';
import { motion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { X } from 'lucide-react';

interface StatusDisplayProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  showLottie?: boolean;
  lottieUrl?: string;
  className?: string;
}

export function StatusDisplay({ 
  title, 
  subtitle, 
  onClose, 
  showLottie = true,
  lottieUrl = "https://lottie.host/c7b4a9cf-d010-486b-994d-3871d0d5f1a6/BhyLNPUHaQ.lottie",
  className = ""
}: StatusDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-3 sm:p-6 shadow-2xl ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          {showLottie && (
            <div className="w-8 h-8 sm:w-16 sm:h-16 overflow-hidden rounded-md sm:rounded-lg bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 p-0.5 flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full overflow-hidden bg-gray-900 rounded-sm sm:rounded-md flex items-center justify-center">
                <DotLottieReact
                  src="https://lottie.host/c7b4a9cf-d010-486b-994d-3871d0d5f1a6/BhyLNPUHaQ.lottie"
                  loop
                  className="w-8 h-8 sm:w-16 sm:h-16 scale-110"
                />
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-xs sm:text-base font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        
        {onClose && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}