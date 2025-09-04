import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PulsePoint {
  id: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  direction: 'horizontal' | 'vertical';
  fibIndex: number;
}

export function FibonacciBackground() {
  const [pulsePoints, setPulsePoints] = useState<PulsePoint[]>([]);

  // Generate Fibonacci sequence
  const generateFibonacci = (n: number): number[] => {
    const fib = [1, 1];
    for (let i = 2; i < n; i++) {
      fib[i] = fib[i - 1] + fib[i - 2];
    }
    return fib;
  };

  useEffect(() => {
    const fibonacci = generateFibonacci(15);
    const points: PulsePoint[] = [];

    // Create horizontal streaming points
    for (let i = 0; i < 8; i++) {
      const fibValue = fibonacci[i % fibonacci.length];
      points.push({
        id: `h-${i}`,
        x: -50, // Start off-screen left
        y: (fibValue % 7) * 14 + 10, // Use Fibonacci to determine Y position
        size: Math.min(fibValue * 2, 40), // Size based on Fibonacci value
        delay: i * 0.8,
        direction: 'horizontal',
        fibIndex: i,
      });
    }

    // Create vertical streaming points
    for (let i = 0; i < 6; i++) {
      const fibValue = fibonacci[i + 3];
      points.push({
        id: `v-${i}`,
        x: (fibValue % 9) * 11 + 15, // Use Fibonacci to determine X position
        y: -50, // Start off-screen top
        size: Math.min(fibValue * 1.5, 35),
        delay: i * 1.2 + 2,
        direction: 'vertical',
        fibIndex: i + 3,
      });
    }

    setPulsePoints(points);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20" />
      
      {/* Fibonacci spiral overlay */}
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-10" viewBox="0 0 1000 1000">
          <defs>
            <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M 500 500 Q 600 400 700 500 Q 600 700 400 600 Q 200 300 500 200 Q 900 100 800 600 Q 100 900 300 400"
            stroke="url(#spiralGradient)"
            strokeWidth="2"
            fill="none"
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Animated pulse points */}
      {pulsePoints.map((point) => (
        <motion.div
          key={point.id}
          initial={{
            x: point.direction === 'horizontal' ? point.x : point.x + '%',
            y: point.direction === 'vertical' ? point.y : point.y + '%',
            scale: 0,
            opacity: 0,
          }}
          animate={{
            x: point.direction === 'horizontal' ? '110vw' : point.x + '%',
            y: point.direction === 'vertical' ? '110vh' : point.y + '%',
            scale: [0, 1, 1.2, 1, 0.8, 1, 0],
            opacity: [0, 0.8, 1, 0.9, 0.7, 0.5, 0],
          }}
          transition={{
            duration: point.direction === 'horizontal' ? 12 : 15,
            delay: point.delay,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1],
          }}
          className="absolute"
          style={{
            width: point.size,
            height: point.size,
          }}
        >
          {/* Heartbeat pulse effect */}
          <motion.div
            animate={{
              scale: [1, 1.4, 1, 1.2, 1],
              opacity: [0.6, 1, 0.6, 0.8, 0.6],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: point.fibIndex * 0.1,
            }}
            className="w-full h-full rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/30 to-pink-500/20 shadow-2xl"
            style={{
              boxShadow: `0 0 ${point.size}px rgba(59, 130, 246, 0.4), 0 0 ${point.size * 2}px rgba(139, 92, 246, 0.2)`,
            }}
          />
          
          {/* Inner core with stronger pulse */}
          <motion.div
            animate={{
              scale: [0.5, 1, 0.5, 0.8, 0.5],
              opacity: [1, 0.8, 1, 0.9, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: point.fibIndex * 0.05,
            }}
            className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400/60 via-purple-400/50 to-pink-400/40"
          />
          
          {/* Fibonacci number display (subtle) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/20 text-xs font-bold">
              {generateFibonacci(15)[point.fibIndex]}
            </span>
          </div>
        </motion.div>
      ))}

      {/* Additional floating elements with Fibonacci positioning */}
      {[...Array(8)].map((_, i) => {
        const fibonacci = generateFibonacci(15);
        const fibValue = fibonacci[i];
        return (
          <motion.div
            key={`float-${i}`}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + (fibValue % 4),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
            className="absolute opacity-20"
            style={{
              left: `${(fibValue % 80) + 10}%`,
              top: `${(fibValue % 60) + 20}%`,
              width: Math.min(fibValue * 3, 60),
              height: Math.min(fibValue * 3, 60),
            }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/20 blur-sm" />
          </motion.div>
        );
      })}

      {/* Streaming lines with heartbeat effect */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        <defs>
          <linearGradient id="streamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="20%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#ec4899" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="verticalStreamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="20%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#ec4899" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Horizontal streaming lines */}
        {[...Array(5)].map((_, i) => {
          const fibonacci = generateFibonacci(10);
          const yPos = (fibonacci[i] % 80) + 10;
          return (
            <motion.line
              key={`h-line-${i}`}
              x1="-100"
              y1={`${yPos}%`}
              x2="100"
              y2={`${yPos}%`}
              stroke="url(#streamGradient)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 0],
                opacity: [0, 0.8, 0],
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: i * 1.5,
                ease: "easeInOut"
              }}
            />
          );
        })}
        
        {/* Vertical streaming lines */}
        {[...Array(4)].map((_, i) => {
          const fibonacci = generateFibonacci(10);
          const xPos = (fibonacci[i + 2] % 80) + 10;
          return (
            <motion.line
              key={`v-line-${i}`}
              x1={`${xPos}%`}
              y1="-100"
              x2={`${xPos}%`}
              y2="100"
              stroke="url(#verticalStreamGradient)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 0],
                opacity: [0, 0.8, 0],
                y: ['-100%', '100%']
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: i * 2 + 1,
                ease: "easeInOut"
              }}
            />
          );
        })}
      </svg>

      {/* Fibonacci grid overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '89px 55px', // Fibonacci numbers for grid spacing
        }} />
      </div>
    </div>
  );
}