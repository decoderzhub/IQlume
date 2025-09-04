import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';

interface NavigationProps {
  onGetStarted: () => void;
}

export function Navigation({ onGetStarted }: NavigationProps) {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="relative z-50 flex items-center justify-between p-6 lg:px-12"
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-3"
      >
        <img src="/logo.png" alt="brokernomex" className="h-12 w-auto" />
        <span className="text-2xl font-bold text-white">BrokerNomex</span>
      </motion.div>
      
      <div className="flex items-center gap-6">
        <motion.a
          whileHover={{ scale: 1.05 }}
          href="#ai-demo"
          className="hidden md:block text-purple-700 hover:text-white transition-colors"
        >
          AI Demo
        </motion.a>
        <motion.a
          whileHover={{ scale: 1.05 }}
          href="#pricing"
          className="hidden md:block text-purple-700 hover:text-white transition-colors"
        >
          Pricing
        </motion.a>
        <Button onClick={onGetStarted} size="sm">
          Get Started
        </Button>
      </div>
    </motion.nav>
  );
}