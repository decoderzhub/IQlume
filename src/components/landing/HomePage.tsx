import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
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
import { Footer } from './Footer';

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
      <Helmet>
        <title>BrokerNomex - AI-Powered Trading Automation Platform | Advanced Trading Strategies</title>
        <meta name="description" content="Transform your trading with BrokerNomex's AI-powered automation platform. Create sophisticated trading strategies, manage risk, and trade like a professional. Start your free 14-day trial today." />
        <meta name="keywords" content="trading automation, AI trading, trading strategies, algorithmic trading, options trading, crypto trading, covered calls, iron condor, grid bot, DCA, portfolio management" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://brokernomex.com/" />
        <meta property="og:title" content="BrokerNomex - AI-Powered Trading Automation Platform" />
        <meta property="og:description" content="Transform your trading with AI-powered automation. Create sophisticated strategies, manage risk, and trade like a professional. Free 14-day trial." />
        <meta property="og:image" content="https://brokernomex.com/logo-large.png" />
        <meta property="og:site_name" content="BrokerNomex" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://brokernomex.com/" />
        <meta property="twitter:title" content="BrokerNomex - AI-Powered Trading Automation Platform" />
        <meta property="twitter:description" content="Transform your trading with AI-powered automation. Create sophisticated strategies, manage risk, and trade like a professional." />
        <meta property="twitter:image" content="https://brokernomex.com/logo-large.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="BrokerNomex" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://brokernomex.com/" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "BrokerNomex",
            "description": "AI-powered trading automation platform for sophisticated trading strategies",
            "url": "https://brokernomex.com",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "29",
              "priceCurrency": "USD",
              "priceValidUntil": "2025-12-31",
              "availability": "https://schema.org/InStock"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "1247"
            },
            "publisher": {
              "@type": "Organization",
              "name": "BrokerNomex",
              "logo": {
                "@type": "ImageObject",
                "url": "https://brokernomex.com/logo.png"
              }
            }
          })}
        </script>
      </Helmet>
      
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
        <Footer />
      </div>
    </div>
  );
}