import React from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Target, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';

const stats = [
  { label: 'Active Users', value: '50K+', icon: Users },
  { label: 'Assets Under Management', value: '$2.1B', icon: DollarSign },
  { label: 'Strategies Available', value: '25+', icon: Target },
  { label: 'Average Annual Return', value: '18.5%', icon: TrendingUp }
];

export function StatsSection() {
  return (
    <motion.section
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
          <p className="text-xl text-white max-w-3xl mx-auto">
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
                <Card className="p-8 bg-gray-800/80 backdrop-blur-xl border-gray-600">
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
  );
}