import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FibonacciBackground } from './FibonacciBackground';
import { Navigation } from './Navigation';
import { HeroSection } from './HeroSection';
import { StatsSection } from './StatsSection';
import { FeaturesSection } from './FeaturesSection';
import { AIDemoSection } from './AIDemoSection';
import { ExperienceLevelsSection } from './ExperienceLevelsSection';
import { TestimonialsSection } from './TestimonialsSection';
import { PricingSection } from './PricingSection';
import { CTASection } from './CTASection';

interface HomePageProps {
  onGetStarted: () => void;
}

export function HomePage({ onGetStarted }: HomePageProps) {
  const { scrollY } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Ensure page starts at top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Parallax transforms
  const heroY = useTransform(scrollY, [0, 500], [0, -150]);
  const featuresY = useTransform(scrollY, [200, 800], [0, -100]);
  const statsY = useTransform(scrollY, [400, 1000], [0, -50]);

  // Mouse tracking for interactive elements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fibonacci Heartbeat Background */}
      <FibonacciBackground />

      <div className="relative z-10">
        <Navigation onGetStarted={onGetStarted} />
      
        <motion.div style={{ y: heroY }}>
          <HeroSection onGetStarted={onGetStarted} />
        </motion.div>
      
        <motion.div style={{ y: statsY }}>
          <StatsSection />
        </motion.div>
      
        <motion.div style={{ y: featuresY }}>
          <FeaturesSection />
        </motion.div>
      
        <AIDemoSection />
        <ExperienceLevelsSection />
        <TestimonialsSection />
        <PricingSection onGetStarted={onGetStarted} />
        <CTASection onGetStarted={onGetStarted} />
      </div>
    </div>
  );
}