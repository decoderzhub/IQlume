import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Star } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface PricingSectionProps {
  onGetStarted: () => void;
}

const pricingTiers = [
  {
    name: 'Starter',
    price: 'Free',
    period: '/month',
    description: 'Get started with 30-day free trial',
    features: [
      'Limited bots for activation',
      'DCA and Smart Rebalance strategies',
      '30-day free trial',
      'Email support',
      'Mobile app access'
    ],
    popular: false,
    color: 'from-green-500 to-emerald-500',
    isFree: true
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For active traders',
    features: [
      'Wheel, Covered Calls, Cash-Secured Puts',
      'Basic grid trading (spot grid)',
      'Priority support',
      'Basic analytics',
      'Risk management tools'
    ],
    popular: true,
    color: 'from-purple-500 to-purple-600',
    isFree: false
  },
  {
    name: 'Elite',
    price: '$149',
    period: '/month',
    description: 'For professionals & institutions',
    features: [
      'All grids (spot/futures/infinity)',
      'Advanced options strategies',
      'Advanced analytics & backtesting',
      'Priority support',
      'API access'
    ],
    popular: false,
    color: 'from-yellow-500 to-orange-500',
    isFree: false
  }
];

export function PricingSection({ onGetStarted }: PricingSectionProps) {
  return (
    <section id="pricing" className="relative z-10 px-6 lg:px-12 py-20 bg-gray-900/40 backdrop-blur-sm">
      <Helmet>
        <meta name="description" content="Choose your BrokerNomex trading plan: Starter ($29/month), Pro ($99/month), or Performance ($299/month). 14-day free trial, no credit card required." />
        <meta property="og:title" content="Trading Platform Pricing - BrokerNomex" />
        <meta property="og:description" content="Flexible pricing plans for traders of all levels. Start free for 14 days, then choose the plan that fits your goals." />
        <meta name="keywords" content="trading platform pricing, trading subscription, algorithmic trading cost, trading automation pricing" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "BrokerNomex Trading Platform",
            "description": "AI-powered trading automation platform",
            "offers": [
              {
                "@type": "Offer",
                "name": "Starter Plan",
                "price": "29",
                "priceCurrency": "USD",
                "billingIncrement": "P1M",
                "description": "Perfect for beginners with up to $10K portfolio value"
              },
              {
                "@type": "Offer",
                "name": "Pro Plan", 
                "price": "99",
                "priceCurrency": "USD",
                "billingIncrement": "P1M",
                "description": "For serious traders with up to $100K portfolio value"
              },
              {
                "@type": "Offer",
                "name": "Performance Plan",
                "price": "299", 
                "priceCurrency": "USD",
                "billingIncrement": "P1M",
                "description": "For professionals with unlimited portfolio value"
              }
            ]
          })}
        </script>
      </Helmet>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Choose Your Trading Plan
          </h2>
          <p className="text-xl text-white max-w-3xl mx-auto">
            Start free for 14 days, then choose the plan that fits your trading goals
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <Card className={`p-8 h-full text-center transition-all duration-300 ${
                tier.popular 
                  ? 'bg-purple-500/20 border-purple-500/50 shadow-2xl shadow-purple-500/20' 
                  : 'bg-gray-800/80 border-gray-600 hover:border-blue-500/50'
              } backdrop-blur-xl`}>
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-white mb-6">{tier.description}</p>
                
                <div className="mb-8">
                  {tier.isFree ? (
                    <div>
                      <span className="text-4xl lg:text-5xl font-bold text-green-400">Free</span>
                      <div className="text-sm text-gray-400 mt-2">30-day trial</div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-4xl lg:text-5xl font-bold text-white">{tier.price}</span>
                      <span className="text-gray-400">{tier.period}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={onGetStarted}
                  className={`w-full ${
                    tier.isFree
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                      : tier.popular 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {tier.isFree ? 'Start Free Trial' : 'Get Started'}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}