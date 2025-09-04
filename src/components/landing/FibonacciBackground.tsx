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

interface ECGPulse {
  id: string;
  startX: number;
  startY: number;
  direction: 'horizontal' | 'vertical' | 'diagonal';
  delay: number;
  duration: number;
  amplitude: number;
}
export function FibonacciBackground() {
  const [pulsePoints, setPulsePoints] = useState<PulsePoint[]>([]);
  const [ecgPulses, setEcgPulses] = useState<ECGPulse[]>([]);

  // Generate Fibonacci sequence
  const generateFibonacci = (n: number): number[] => {
    const fib = [1, 1];
    for (let i = 2; i < n; i++) {
      fib[i] = fib[i - 1] + fib[i - 2];
    }
    return fib;
  };

  // Generate ECG pulse path data
  const generateECGPath = (startX: number, startY: number, direction: string, amplitude: number): string => {
    const segments = [];
    let currentX = startX;
    let currentY = startY;
    
    // ECG pattern: flat, small up, flat, big spike up, big spike down, small up, flat
    const ecgPattern = [
      { dx: 20, dy: 0 },      // flat
      { dx: 5, dy: -amplitude * 0.3 },   // small up
      { dx: 10, dy: 0 },      // flat
      { dx: 3, dy: -amplitude },          // big spike up
      { dx: 6, dy: amplitude * 2 },       // big spike down
      { dx: 3, dy: -amplitude * 0.7 },    // recovery up
      { dx: 5, dy: amplitude * 0.2 },     // small down
      { dx: 30, dy: 0 },      // flat
    ];
    
    segments.push(`M ${currentX} ${currentY}`);
    
    // Repeat pattern multiple times across the screen
    const repetitions = direction === 'horizontal' ? 15 : direction === 'vertical' ? 10 : 8;
    
    for (let rep = 0; rep < repetitions; rep++) {
      for (const segment of ecgPattern) {
        if (direction === 'horizontal') {
          currentX += segment.dx;
          currentY += segment.dy;
        } else if (direction === 'vertical') {
          currentX += segment.dy;
          currentY += segment.dx;
        } else { // diagonal
          currentX += segment.dx * 0.7;
          currentY += segment.dx * 0.7 + segment.dy;
        }
        segments.push(`L ${currentX} ${currentY}`);
      }
    }
    
    return segments.join(' ');
  };
  useEffect(() => {
    const fibonacci = generateFibonacci(20);
    const points: PulsePoint[] = [];

    // Reduce pulse points for better performance
    const maxPulsePoints = window.innerWidth < 768 ? 8 : 15; // Fewer on mobile
    for (let i = 0; i < maxPulsePoints; i++) {
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
        delay: (fibValue % 8) * 1.5 + Math.random() * 4, // Slower delays
        duration: 6 + (fibValue % 5) + Math.random() * 6, // Longer durations
        fibIndex: i,
        opacity: 0.3 + (Math.random() * 0.4),
      });
    }

    // Reduce mini pulses significantly
    const maxMiniPulses = window.innerWidth < 768 ? 3 : 6;
    for (let i = 0; i < maxMiniPulses; i++) {
      points.push({
        id: `mini-pulse-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 15 + Math.random() * 25,
        delay: Math.random() * 20, // Much longer delays
        duration: 4 + Math.random() * 4, // Slower animations
        fibIndex: i,
        opacity: 0.2 + Math.random() * 0.3,
      });
    }

    setPulsePoints(points);

    // Generate ECG pulse lines
    const ecgLines: ECGPulse[] = [];
    
    // Reduce ECG lines for performance
    const maxECGLines = window.innerWidth < 768 ? 2 : 4;
    for (let i = 0; i < maxECGLines; i++) {
      const directions: ('horizontal' | 'vertical' | 'diagonal')[] = ['horizontal', 'vertical', 'diagonal'];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      
      ecgLines.push({
        id: `ecg-${i}`,
        startX: Math.random() * 100,
        startY: Math.random() * 100,
        direction,
        delay: Math.random() * 30, // Much longer delays
        duration: 15 + Math.random() * 20, // Slower animations
        amplitude: 20 + Math.random() * 40,
      });
    }
    
    setEcgPulses(ecgLines);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20" />
      
      {/* ECG/EKG Pulse Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#6366f1" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="ecgGradientReverse" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#6366f1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
          </linearGradient>
          <filter id="ecgGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {ecgPulses.map((pulse, index) => {
          const pathData = generateECGPath(pulse.startX, pulse.startY, pulse.direction, pulse.amplitude);
          
          return (
            <motion.path
              key={pulse.id}
              d={pathData}
              stroke={index % 2 === 0 ? "url(#ecgGradient)" : "url(#ecgGradientReverse)"}
              strokeWidth="0.3"
              fill="none"
              filter="url(#ecgGlow)"
              initial={{ 
                pathLength: 0, 
                opacity: 0,
                strokeDasharray: "2 4"
              }}
              animate={{ 
                pathLength: [0, 1, 0],
                opacity: [0, 0.8, 0.4, 0.8, 0],
                strokeDashoffset: [0, -20, -40],
              }}
              transition={{
                duration: pulse.duration,
                repeat: Infinity,
                delay: pulse.delay,
                ease: "easeInOut",
                times: [0, 0.3, 0.6, 0.8, 1]
              }}
            />
          );
        })}
      </svg>

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

      {/* ECG/EKG Pulse Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ecgPulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="20%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
            <stop offset="80%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ecgPulseGradientVertical" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="20%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
            <stop offset="80%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
          <filter id="ecgGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {ecgPulses.map((pulse, index) => {
          const viewBoxWidth = 100;
          const viewBoxHeight = 100;
          const pathData = generateECGPath(
            pulse.startX, 
            pulse.startY, 
            pulse.direction, 
            pulse.amplitude / 10 // Scale for viewBox
          );
          
          return (
            <motion.path
              key={pulse.id}
              d={pathData}
              stroke={pulse.direction === 'vertical' ? "url(#ecgPulseGradientVertical)" : "url(#ecgPulseGradient)"}
              strokeWidth="0.2"
              fill="none"
              filter="url(#ecgGlow)"
              initial={{ 
                pathLength: 0, 
                opacity: 0,
              }}
              animate={{ 
                pathLength: [0, 1, 0],
                opacity: [0, 0.9, 0.6, 0.9, 0],
                strokeWidth: [0.05, 0.2, 0.15, 0.2, 0.05], // Thinner lines
              }}
              transition={{
                duration: pulse.duration,
                repeat: Infinity,
                delay: pulse.delay,
                ease: "easeInOut",
                times: [0, 0.3, 0.6, 0.8, 1]
              }}
            />
          );
        })}
        
        {/* Reduce additional ECG bursts */}
        {[...Array(window.innerWidth < 768 ? 1 : 3)].map((_, i) => {
          const startX = Math.random() * 100;
          const startY = Math.random() * 100;
          const amplitude = 15 + Math.random() * 25;
          
          return (
            <motion.path
              key={`ecg-burst-${i}`}
              d={generateECGPath(startX, startY, 'horizontal', amplitude / 10)}
              stroke="url(#ecgPulseGradient)"
              strokeWidth="0.1" // Thinner for better performance
              fill="none"
              filter="url(#ecgGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1],
                opacity: [0, 0.7, 0],
                strokeWidth: [0.1, 0.25, 0.1],
              }}
              transition={{
                duration: 6 + Math.random() * 8, // Slower animations
                repeat: Infinity,
                delay: i * 5 + Math.random() * 10, // Longer delays
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
          opacity: [0.02, 0.05, 0.02], // Reduced opacity
        }}
        transition={{
          duration: 12, // Slower pulse
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
      {[...Array(window.innerWidth < 768 ? 2 : 4)].map((_, i) => { // Fewer on mobile
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
              duration: 20 + (fibValue % 8), // Much slower
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 4, // Longer delays between elements
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