import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Eye, Lock, Database, Globe, Mail, Phone } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function PrivacyPolicy() {
  const sections = [
    {
      title: "Information We Collect",
      icon: Database,
      content: [
        {
          subtitle: "Personal Information",
          items: [
            "Name, email address, and contact information",
            "Government-issued identification for account verification",
            "Financial information including income and net worth",
            "Trading experience and investment objectives"
          ]
        },
        {
          subtitle: "Account Information",
          items: [
            "Brokerage account credentials and trading data",
            "Transaction history and portfolio holdings",
            "Banking information for funding and withdrawals",
            "API keys and authentication tokens (encrypted)"
          ]
        },
        {
          subtitle: "Usage Data",
          items: [
            "Device information and IP addresses",
            "Browser type and operating system",
            "Pages visited and features used",
            "Time spent on the platform"
          ]
        }
      ]
    },
    {
      title: "How We Use Your Information",
      icon: Eye,
      content: [
        {
          subtitle: "Platform Services",
          items: [
            "Execute trading strategies and manage portfolios",
            "Provide real-time market data and analytics",
            "Process transactions and maintain account records",
            "Offer customer support and technical assistance"
          ]
        },
        {
          subtitle: "Security and Compliance",
          items: [
            "Verify your identity and prevent fraud",
            "Comply with financial regulations and reporting requirements",
            "Monitor for suspicious activities and unauthorized access",
            "Maintain audit trails for regulatory purposes"
          ]
        },
        {
          subtitle: "Platform Improvement",
          items: [
            "Analyze usage patterns to improve our services",
            "Develop new features and trading strategies",
            "Personalize your trading experience",
            "Send important updates and notifications"
          ]
        }
      ]
    },
    {
      title: "Information Sharing",
      icon: Globe,
      content: [
        {
          subtitle: "We Do Not Sell Your Data",
          items: [
            "We never sell, rent, or trade your personal information",
            "Your trading data remains confidential and secure",
            "We do not share information with marketing companies",
            "Your privacy is our top priority"
          ]
        },
        {
          subtitle: "Limited Sharing",
          items: [
            "With brokerage partners to execute your trades",
            "With regulatory authorities when legally required",
            "With service providers under strict confidentiality agreements",
            "In case of merger or acquisition (with notice to users)"
          ]
        }
      ]
    },
    {
      title: "Data Security",
      icon: Lock,
      content: [
        {
          subtitle: "Encryption and Protection",
          items: [
            "256-bit SSL encryption for all data transmission",
            "AES-256 encryption for data storage",
            "Multi-factor authentication for account access",
            "Regular security audits and penetration testing"
          ]
        },
        {
          subtitle: "Access Controls",
          items: [
            "Role-based access controls for our employees",
            "Regular access reviews and permission updates",
            "Secure development practices and code reviews",
            "24/7 security monitoring and incident response"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="relative z-50 flex items-center justify-between p-6 lg:px-12 border-b border-gray-800"
      >
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="brokernomex" className="h-10 w-auto" />
            <span className="text-xl font-bold text-white">BrokerNomex</span>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">Privacy Policy</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Your privacy and data security are fundamental to everything we do at brokernomex.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Last updated: January 15, 2025
          </p>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <Card className="p-8 bg-blue-500/10 border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">Our Commitment to Your Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              At brokernomex, we understand that your financial data is among your most sensitive information. 
              This Privacy Policy explains how we collect, use, protect, and share your information when you 
              use our trading platform. We are committed to maintaining the highest standards of data protection 
              and transparency in all our practices.
            </p>
          </Card>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  </div>
                  
                  <div className="space-y-6">
                    {section.content.map((subsection, subIndex) => (
                      <div key={subIndex}>
                        <h3 className="text-lg font-semibold text-blue-400 mb-3">
                          {subsection.subtitle}
                        </h3>
                        <ul className="space-y-2">
                          {subsection.items.map((item, itemIndex) => (
                            <motion.li
                              key={itemIndex}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 + index * 0.1 + subIndex * 0.05 + itemIndex * 0.02 }}
                              className="flex items-start gap-3 text-gray-300"
                            >
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                              <span>{item}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <Card className="p-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">Contact Us About Privacy</h2>
            <p className="text-gray-300 mb-6">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Email</p>
                  <p className="text-gray-400">privacy@brokernomex.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Phone</p>
                  <p className="text-gray-400">1-800-BROKER-X</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12 pt-8 border-t border-gray-800"
        >
          <p className="text-gray-400">
            This Privacy Policy is effective as of January 15, 2025 and will remain in effect except with respect to any changes in its provisions in the future.
          </p>
        </motion.div>
      </div>
    </div>
  );
}