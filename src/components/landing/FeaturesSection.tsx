import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Shield, Zap, BarChart3, Globe, Users } from 'lucide-react';
import { Card } from '../ui/Card';

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

export function FeaturesSection() {
  return (
    <motion.section
      id="features"
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
          <p className="text-xl text-white max-w-3xl mx-auto">
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
                <Card className="p-8 h-full bg-gray-800/80 backdrop-blur-xl border-gray-600 group">
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
  );
}