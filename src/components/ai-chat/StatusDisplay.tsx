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
      className={`bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showLottie && (
            <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 p-1 flex items-center justify-center">
  <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
    <DotLottieReact
      src="https://lottie.host/c7b4a9cf-d010-486b-994d-3871d0d5f1a6/BhyLNPUHaQ.lottie"
      loop
      autoplay
      className="w-32 h-32 scale-10" // This will make it fill the container
    />
  </div>
</div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {onClose && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}