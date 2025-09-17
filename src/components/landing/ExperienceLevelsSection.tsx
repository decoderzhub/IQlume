import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';

const experienceLevels = [
  {
    level: 'Retail Traders',
    icon: '🌱',
    title: 'Self-Serve Automation',
    description: 'Product-led growth with guided onboarding and 14-day free trial.',
    features: ['14-day free trial', 'Guided onboarding', 'Self-serve activation', 'DCA & rebalancing'],
    color: 'from-green-500 to-emerald-500'
  },
  {
    level: 'Active Traders',
    icon: '📈',
    title: 'Pro Strategies',
    description: 'Wheel, covered calls, and grid trading for serious automation.',
    features: ['Options income strategies', 'Grid trading bots', 'Multi-account support', 'Advanced analytics'],
    color: 'from-blue-500 to-purple-500'
  },
  {
    level: 'RIAs & Institutions',
    icon: '🏆',
    title: 'Enterprise Solutions',
    description: 'Sales-assisted onboarding with white-label and multi-account automation.',
    features: ['All strategies + custom', 'API access', 'White-glove support', 'Revenue sharing'],
    color: 'from-purple-500 to-pink-500'
  }
];

export function ExperienceLevelsSection() {
  return (
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
          {experienceLevels.map((level, index) => (
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
                <p className="text-white mb-6">{level.description}</p>
                <div className="space-y-3">
                  {level.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}