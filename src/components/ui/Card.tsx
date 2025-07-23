import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  hoverable?: boolean;
}

export function Card({ className, children, hoverable = false }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hoverable ? { y: -2, transition: { duration: 0.2 } } : {}}
      className={cn(
        'bg-gray-900/50 backdrop-blur-lg border border-gray-800 rounded-xl p-6 shadow-xl',
        className
      )}
    >
      {children}
    </motion.div>
  );
}