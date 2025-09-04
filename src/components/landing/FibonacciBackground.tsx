import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PulsePoint {
  id: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  fibIndex: number;
  opacity: number;
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
    const fibonacci = generateFibonacci(20);
    const points: PulsePoint[] = [];

    // Create random pulse points across the entire viewport
    for (let i = 0; i < 25; i++) {
      const fibValue = fibonacci[i % fibonacci.length];
      
      // Use Fibonacci ratios for more natural positioning
      const goldenRatio = 1.618;
      const baseX = (fibValue * goldenRatio) % 100;
      const baseY = (fibValue * 0.618) % 100;
      
      // Add some randomness while keeping Fibonacci influence
      const randomOffsetX = (Math.random() - 0.5) * 30;
      const randomOffsetY = (Math.random() - 0.5) * 30;
      
      points.push({
        id: `pulse-${i}`,
        x: Math.max(5, Math.min(95, baseX + randomOffsetX)),
        y: Math.max(5, Math.min(95, baseY + randomOffsetY)),
        size: Math.min(fibValue * 3, 80) + Math.random() * 20,
        delay: (fibValue % 8) * 0.5 + Math.random() * 2,
        duration: 3 + (fibValue % 5) + Math.random() * 3,
        fibIndex: i,
        opacity: 0.3 + (Math.random() * 0.4),
      });
    }

    // Add more frequent smaller pulses
    for (let i = 0; i < 15; i++) {
      points.push({
        id: `mini-pulse-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 15 + Math.random() * 25,
        delay: Math.random() * 10,
        duration: 2 + Math.random() * 2,
        fibIndex: i,
        opacity: 0.2 + Math.random() * 0.3,
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
        <svg className="w-full h-full opacity-5" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="spiralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          
          {/* Multiple Fibonacci spirals */}
          <motion.path
            d="M 500 500 Q 600 400 700 500 Q 600 700 400 600 Q 200 300 500 200 Q 900 100 800 600 Q 100 900 300 400"
            stroke="url(#spiralGradient)"
            strokeWidth="1"
            fill="none"
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          <motion.path
            d="M 200 200 Q 300 100 400 200 Q 300 400 100 300 Q -100 0 200 -100 Q 600 -200 500 300 Q -200 600 0 100"
            stroke="url(#spiralGradient)"
            strokeWidth="1"
            fill="none"
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 5,
            }}
          />
        </svg>
      </div>

      {/* Random pulse points with heartbeat effect */}
      {pulsePoints.map((point) => (
        <motion.div
          key={point.id}
          initial={{
            scale: 0,
            opacity: 0,
          }}
          animate={{
            scale: [0, 1, 1.4, 1, 1.2, 1, 0.8, 1, 0],
            opacity: [0, point.opacity, point.opacity * 1.2, point.opacity, point.opacity * 0.8, point.opacity, point.opacity * 0.6, point.opacity, 0],
          }}
          transition={{
            duration: point.duration,
            delay: point.delay,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.1, 0.15, 0.25, 0.3, 0.5, 0.7, 0.85, 1],
          }}
          className="absolute"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            width: point.size,
            height: point.size,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Outer glow with heartbeat */}
          <motion.div
            animate={{
              scale: [1, 1.6, 1, 1.3, 1],
              opacity: [0.4, 0.8, 0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: point.fibIndex * 0.1,
            }}
            className="w-full h-full rounded-full bg-gradient-to-br from-blue-500/30 via-purple-500/25 to-pink-500/20"
            style={{
              boxShadow: `0 0 ${point.size}px rgba(59, 130, 246, 0.3), 0 0 ${point.size * 2}px rgba(139, 92, 246, 0.15)`,
            }}
          />
          
          {/* Inner core with stronger heartbeat */}
          <motion.div
            animate={{
              scale: [0.6, 1.2, 0.6, 1, 0.6],
              opacity: [0.8, 1, 0.8, 0.9, 0.8],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: point.fibIndex * 0.05,
            }}
            className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-400/50 via-purple-400/40 to-pink-400/30"
          />
          
          {/* Center dot */}
          <motion.div
            animate={{
              scale: [0.3, 0.8, 0.3, 0.6, 0.3],
              opacity: [1, 0.7, 1, 0.8, 1],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: point.fibIndex * 0.03,
            }}
            className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-300/70 via-purple-300/60 to-pink-300/50"
          />
        </motion.div>
      ))}

      {/* Streaming connection lines between pulses */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Random connecting lines that pulse */}
        {[...Array(12)].map((_, i) => {
          const fibonacci = generateFibonacci(15);
          const x1 = (fibonacci[i] % 80) + 10;
          const y1 = (fibonacci[i + 1] % 80) + 10;
          const x2 = (fibonacci[i + 2] % 80) + 10;
          const y2 = (fibonacci[i + 3] % 80) + 10;
          
          return (
            <motion.line
              key={`connection-${i}`}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="url(#connectionGradient)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 4 + (fibonacci[i] % 3),
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeInOut"
              }}
            />
          );
        })}
      </svg>

      {/* Fibonacci grid overlay with pulse */}
      <motion.div 
        className="absolute inset-0 opacity-3"
        animate={{
          opacity: [0.03, 0.08, 0.03],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '89px 55px', // Fibonacci numbers for grid spacing
        }} />
      </motion.div>

      {/* Large ambient pulses */}
      {[...Array(6)].map((_, i) => {
        const fibonacci = generateFibonacci(12);
        const fibValue = fibonacci[i + 4];
        return (
          <motion.div
            key={`ambient-${i}`}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.3, 0.1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 12 + (fibValue % 5),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 2,
            }}
            className="absolute rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/8 to-pink-500/6 blur-xl"
            style={{
              left: `${(fibValue % 70) + 15}%`,
              top: `${(fibValue % 60) + 20}%`,
              width: Math.min(fibValue * 8, 300),
              height: Math.min(fibValue * 8, 300),
            }}
          />
        );
      })}
    </div>
  );
}