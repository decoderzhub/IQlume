import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, AlertTriangle, Scale, Shield, DollarSign, Users, Gavel } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function TermsOfService() {
  const sections = [
    {
      title: "Acceptance of Terms",
      icon: FileText,
      content: [
        {
          subtitle: "Agreement to Terms",
          items: [
            "By accessing or using brokernomex, you agree to be bound by these Terms of Service",
            "If you do not agree to these terms, you may not use our platform",
            "We may update these terms from time to time with notice to users",
            "Continued use after changes constitutes acceptance of new terms"
          ]
        },
        {
          subtitle: "Eligibility",
          items: [
            "You must be at least 18 years old to use our services",
            "You must be legally authorized to trade securities in your jurisdiction",
            "You must provide accurate and complete information during registration",
            "You are responsible for maintaining the security of your account"
          ]
        }
      ]
    },
    {
      title: "Trading Risks and Disclaimers",
      icon: AlertTriangle,
      content: [
        {
          subtitle: "Investment Risks",
          items: [
            "All trading involves substantial risk of loss and may not be suitable for all investors",
            "Past performance does not guarantee future results",
            "You may lose some or all of your invested capital",
            "Leveraged trading can amplify both gains and losses"
          ]
        },
        {
          subtitle: "No Investment Advice",
          items: [
            "brokernomex does not provide investment advice or recommendations",
            "Our platform provides tools and information for your own decision-making",
            "You are solely responsible for your trading decisions",
            "Consult with a qualified financial advisor before making investment decisions"
          ]
        },
        {
          subtitle: "AI and Automated Trading",
          items: [
            "AI-generated strategies are for informational purposes only",
            "Automated trading systems may malfunction or produce unexpected results",
            "You remain responsible for monitoring and controlling your automated strategies",
            "We do not guarantee the performance of any trading strategy or algorithm"
          ]
        }
      ]
    },
    {
      title: "Platform Usage",
      icon: Users,
      content: [
        {
          subtitle: "Acceptable Use",
          items: [
            "Use the platform only for lawful trading and investment purposes",
            "Do not attempt to manipulate markets or engage in fraudulent activities",
            "Respect the intellectual property rights of brokernomex and third parties",
            "Do not interfere with the platform's security or functionality"
          ]
        },
        {
          subtitle: "Account Security",
          items: [
            "You are responsible for maintaining the confidentiality of your login credentials",
            "Notify us immediately of any unauthorized access to your account",
            "Use strong passwords and enable two-factor authentication when available",
            "Do not share your account access with others"
          ]
        },
        {
          subtitle: "Prohibited Activities",
          items: [
            "Market manipulation, insider trading, or other illegal activities",
            "Attempting to reverse engineer or hack our platform",
            "Creating multiple accounts to circumvent platform limits",
            "Using the platform for money laundering or terrorist financing"
          ]
        }
      ]
    },
    {
      title: "Financial Terms",
      icon: DollarSign,
      content: [
        {
          subtitle: "Fees and Charges",
          items: [
            "Subscription fees are charged monthly or annually as selected",
            "Trading fees may apply based on your brokerage and strategy",
            "All fees are clearly disclosed before you incur them",
            "Refunds are provided according to our refund policy"
          ]
        },
        {
          subtitle: "Third-Party Costs",
          items: [
            "Brokerage commissions and fees are separate from our platform fees",
            "Market data fees may apply for certain premium data feeds",
            "Currency conversion fees may apply for international transactions",
            "You are responsible for all taxes related to your trading activities"
          ]
        }
      ]
    },
    {
      title: "Limitation of Liability",
      icon: Scale,
      content: [
        {
          subtitle: "Platform Availability",
          items: [
            "We strive for 99.9% uptime but cannot guarantee uninterrupted service",
            "Scheduled maintenance may temporarily limit platform access",
            "We are not liable for losses due to platform downtime or technical issues",
            "Emergency maintenance may be performed without advance notice"
          ]
        },
        {
          subtitle: "Trading Losses",
          items: [
            "We are not liable for trading losses resulting from your investment decisions",
            "Automated strategies may not perform as expected due to market conditions",
            "Technical failures or data delays may impact trading performance",
            "You acknowledge and accept all risks associated with trading"
          ]
        },
        {
          subtitle: "Maximum Liability",
          items: [
            "Our total liability is limited to the fees you paid in the 12 months prior to the claim",
            "We are not liable for indirect, consequential, or punitive damages",
            "Some jurisdictions may not allow these limitations",
            "This limitation applies to the fullest extent permitted by law"
          ]
        }
      ]
    },
    {
      title: "Termination and Suspension",
      icon: Gavel,
      content: [
        {
          subtitle: "Account Termination",
          items: [
            "You may terminate your account at any time through your account settings",
            "We may suspend or terminate accounts for violations of these terms",
            "We may terminate accounts for suspicious or illegal activities",
            "Upon termination, you remain liable for any outstanding fees or obligations"
          ]
        },
        {
          subtitle: "Data Retention",
          items: [
            "We retain your data for regulatory compliance periods after account closure",
            "You may request deletion of personal data subject to legal requirements",
            "Trading records may be retained for up to 7 years as required by law",
            "We will securely delete data when no longer required"
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
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">Terms of Service</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Please read these terms carefully before using the brokernomex trading platform.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Last updated: January 15, 2025
          </p>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <Card className="p-8 bg-red-500/10 border-red-500/20">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-red-400 mb-4">Important Risk Disclosure</h2>
                <p className="text-red-300 leading-relaxed mb-4">
                  <strong>Trading securities, options, futures, and cryptocurrencies involves substantial risk of loss 
                  and may not be suitable for all investors.</strong> You should carefully consider your financial situation, 
                  investment experience, and risk tolerance before using our platform.
                </p>
                <p className="text-red-300 leading-relaxed">
                  The use of automated trading strategies and AI-generated recommendations does not guarantee profits 
                  and may result in significant losses. You are solely responsible for all trading decisions made 
                  through our platform.
                </p>
              </div>
            </div>
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
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Card className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  </div>
                  
                  <div className="space-y-6">
                    {section.content.map((subsection, subIndex) => (
                      <div key={subIndex}>
                        <h3 className="text-lg font-semibold text-purple-400 mb-3">
                          {subsection.subtitle}
                        </h3>
                        <ul className="space-y-2">
                          {subsection.items.map((item, itemIndex) => (
                            <motion.li
                              key={itemIndex}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.6 + index * 0.1 + subIndex * 0.05 + itemIndex * 0.02 }}
                              className="flex items-start gap-3 text-gray-300"
                            >
                              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
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

        {/* Governing Law */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-12"
        >
          <Card className="p-8 bg-gray-800/30">
            <h2 className="text-2xl font-bold text-white mb-4">Governing Law and Jurisdiction</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              These Terms of Service are governed by and construed in accordance with the laws of the State of Delaware, 
              United States, without regard to its conflict of law provisions. Any disputes arising from these terms 
              or your use of the platform will be resolved through binding arbitration in accordance with the rules 
              of the American Arbitration Association.
            </p>
            <p className="text-gray-300 leading-relaxed">
              If any provision of these terms is found to be unenforceable, the remaining provisions will remain 
              in full force and effect. Our failure to enforce any right or provision of these terms will not 
              constitute a waiver of such right or provision.
            </p>
          </Card>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-12"
        >
          <Card className="p-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">Questions About These Terms?</h2>
            <p className="text-gray-300 mb-6">
              If you have any questions about these Terms of Service, please contact our legal team:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Legal Department</p>
                  <p className="text-gray-400">legal@brokernomex.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Compliance</p>
                  <p className="text-gray-400">compliance@brokernomex.com</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-12 pt-8 border-t border-gray-800"
        >
          <p className="text-gray-400">
            These Terms of Service are effective as of January 15, 2025. By using brokernomex, you acknowledge that you have read, understood, and agree to be bound by these terms.
          </p>
        </motion.div>
      </div>
    </div>
  );
}