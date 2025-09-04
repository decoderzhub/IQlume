import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Brain, 
  Users, 
  BarChart3, 
  Target, 
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle,
  Star,
  Globe,
  Lock,
  Smartphone,
  Monitor,
  DollarSign,
  Award,
  Activity,
  PieChart,
  TrendingDown,
  Bot
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AIDemoSection } from './AIDemoSection';

interface HomePageProps {
  onGetStarted: () => void;
}

export function HomePage({ onGetStarted }: HomePageProps) {
  const { scrollY } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
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

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Strategies',
      description: 'Let our advanced AI create and optimize trading strategies tailored to your risk tolerance and goals.',
      color: 'from-purple-500 to-pink-500',
      delay: 0.1
    },
    {
      icon: Shield,
      title: 'Risk Management',
      description: 'Built-in risk controls and position sizing to protect your capital while maximizing returns.',
      color: 'from-green-500 to-emerald-500',
      delay: 0.2
    },
    {
      icon: Zap,
      title: 'Automated Execution',
      description: 'Set it and forget it. Our bots execute trades 24/7 based on your predefined strategies.',
      color: 'from-blue-500 to-cyan-500',
      delay: 0.3
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Deep insights into your portfolio performance with institutional-grade analytics.',
      color: 'from-orange-500 to-red-500',
      delay: 0.4
    },
    {
      icon: Globe,
      title: 'Multi-Asset Trading',
      description: 'Trade stocks, options, crypto, and forex all from one unified platform.',
      color: 'from-indigo-500 to-purple-500',
      delay: 0.5
    },
    {
      icon: Users,
      title: 'For Every Level',
      description: 'From complete beginners to professional traders, our platform adapts to your experience.',
      color: 'from-teal-500 to-blue-500',
      delay: 0.6
    }
  ];

  const stats = [
    { label: 'Active Users', value: '50K+', icon: Users },
    { label: 'Assets Under Management', value: '$2.1B', icon: DollarSign },
    { label: 'Strategies Available', value: '25+', icon: Target },
    { label: 'Average Annual Return', value: '18.5%', icon: TrendingUp }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Beginner Trader',
      content: 'I went from knowing nothing about trading to running profitable strategies in just 2 weeks. The AI guidance is incredible.',
      avatar: '👩‍💼',
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      role: 'Day Trader',
      content: 'The automation freed up my time while actually improving my returns. The risk management is top-notch.',
      avatar: '👨‍💻',
      rating: 5
    },
    {
      name: 'Jennifer Kim',
      role: 'Portfolio Manager',
      content: 'Professional-grade tools with consumer-friendly interface. Perfect for managing multiple strategies.',
      avatar: '👩‍🔬',
      rating: 5
    }
  ];

  const pricingTiers = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for beginners',
      features: [
        'Up to $10K portfolio value',
        'Basic strategies (covered calls, CSP)',
        'Email support',
        '1 connected brokerage',
        'Mobile app access'
      ],
      popular: false,
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Pro',
      price: '$99',
      period: '/month',
      description: 'For serious traders',
      features: [
        'Up to $100K portfolio value',
        'Advanced strategies',
        'Priority support',
        '3 connected brokerages',
        'Backtesting & analytics',
        'API access'
      ],
      popular: true,
      color: 'from-purple-500 to-purple-600'
    },
    {
      name: 'Performance',
      price: '$299',
      period: '/month',
      description: 'For professionals',
      features: [
        'Unlimited portfolio value',
        'All strategies + custom',
        'White-glove support',
        'Unlimited brokerages',
        'AI optimization',
        'Social marketplace'
      ],
      popular: false,
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Navigation */}
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
            href="#features"
            className="hidden md:block text-gray-300 hover:text-white transition-colors"
          >
            Features
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.05 }}
            href="#pricing"
            className="hidden md:block text-gray-300 hover:text-white transition-colors"
          >
            Pricing
          </motion.a>
          <Button onClick={onGetStarted} size="sm">
            Get Started
          </Button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        style={{ y: heroY }}
        className="relative z-10 px-6 lg:px-12 pt-20 pb-32"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-8"
              >
                <Sparkles className="w-4 h-4" />
                AI-Powered Trading Platform
              </motion.div>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Trade Like a
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                >
                  Professional
                </motion.span>
              </h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-xl text-gray-300 mb-8 leading-relaxed"
              >
                Whether you're a complete beginner or seasoned trader, our AI-powered platform 
                makes sophisticated trading strategies accessible to everyone. Start with $100 
                or $100M - we scale with you.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  onClick={onGetStarted}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4"
                >
                  Start Trading Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-4 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex items-center gap-6 mt-8 text-sm text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>No minimum deposit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Free 14-day trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Cancel anytime</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Interactive Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative z-10"
              >
                <Card className="p-6 bg-gray-900/80 backdrop-blur-xl border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Portfolio Overview</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-green-400">Live</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-400">Total Value</p>
                      <motion.p
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-2xl font-bold text-white"
                      >
                        $125,420
                      </motion.p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Today's P&L</p>
                      <motion.p
                        animate={{ color: ['#10b981', '#059669', '#10b981'] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-2xl font-bold text-green-400"
                      >
                        +$2,840
                      </motion.p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { name: 'BTC Grid Bot', return: '+12.5%', status: 'active' },
                      { name: 'AAPL Covered Calls', return: '+8.2%', status: 'active' },
                      { name: 'ETH DCA Strategy', return: '+15.1%', status: 'active' }
                    ].map((strategy, index) => (
                      <motion.div
                        key={strategy.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-white text-sm">{strategy.name}</span>
                        </div>
                        <span className="text-green-400 text-sm font-medium">{strategy.return}</span>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
              
              {/* Floating Elements */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 5, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl z-20"
              >
                <Bot className="w-8 h-8 text-white" />
              </motion.div>
              
              <motion.div
                animate={{
                  y: [0, 15, 0],
                  rotate: [0, -5, 0]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-2xl z-20"
              >
                <TrendingUp className="w-6 h-6 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        style={{ y: statsY }}
        className="relative z-10 px-6 lg:px-12 py-20"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Trusted by Traders Worldwide
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join thousands of traders who have transformed their trading with our platform
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <Card className="p-8 bg-gray-900/60 backdrop-blur-xl border-gray-700/50">
                    <Icon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                      viewport={{ once: true }}
                      className="text-3xl lg:text-4xl font-bold text-white mb-2"
                    >
                      {stat.value}
                    </motion.div>
                    <p className="text-gray-400">{stat.label}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        id="features"
        style={{ y: featuresY }}
        className="relative z-10 px-6 lg:px-12 py-20 bg-gray-900/40 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              From AI-powered strategy creation to advanced risk management, 
              we provide all the tools you need to trade confidently
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: feature.delay }}
                  viewport={{ once: true }}
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                >
                  <Card className="p-8 h-full bg-gray-900/60 backdrop-blur-xl border-gray-700/50 group">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-2xl`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </motion.div>
                    
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-white leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* AI Demo Section */}
      <AIDemoSection />

      {/* Experience Levels Section */}
      <section className="relative z-10 px-6 lg:px-12 py-20 bg-gray-800/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Built for Every Trading Level
            </h2>
            <p className="text-xl text-white max-w-3xl mx-auto">
              Our platform adapts to your experience, providing the right tools and guidance at every stage
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                level: 'Beginner',
                icon: '🌱',
                title: 'Start Your Journey',
                description: 'Never traded before? No problem. Our AI guides you through every step.',
                features: ['Educational content', 'Paper trading', 'Risk-free learning', 'Simple strategies'],
                color: 'from-green-500 to-emerald-500'
              },
              {
                level: 'Intermediate',
                icon: '📈',
                title: 'Level Up Your Game',
                description: 'Ready to automate? Access advanced strategies and analytics.',
                features: ['Strategy automation', 'Portfolio analytics', 'Multi-asset trading', 'Risk management'],
                color: 'from-blue-500 to-purple-500'
              },
              {
                level: 'Professional',
                icon: '🏆',
                title: 'Institutional Tools',
                description: 'Professional-grade features for serious traders and institutions.',
                features: ['Custom strategies', 'API access', 'White-glove support', 'Unlimited scaling'],
                color: 'from-purple-500 to-pink-500'
              }
            ].map((level, index) => (
              <motion.div
                key={level.level}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="p-8 h-full bg-gray-800/80 backdrop-blur-xl border-gray-600 text-center">
                  <div className="text-6xl mb-6">{level.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-4">{level.title}</h3>
                  <p className="text-gray-300 mb-6">{level.description}</p>
                  <div className="space-y-3">
                    {level.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}