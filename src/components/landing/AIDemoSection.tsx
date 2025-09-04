import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, TrendingUp, Brain, Play, Pause } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface DemoMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

const demoQuestions = [
  "What's the best strategy for a beginner with $10,000?",
  "How do covered calls work and what are the risks?",
  "Should I use a grid bot or DCA for crypto?",
  "Create a conservative strategy for AAPL with $25K",
  "What's the difference between iron condor and straddle?",
];

const TypingText: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 20); // Faster typing for demo

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return (
    <span>
      {displayedText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-current ml-0.5"
        />
      )}
    </span>
  );
};

export function AIDemoSection() {
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm BroNomics AI, your intelligent trading assistant. I can help you create strategies, analyze markets, and guide you through trading decisions. Try asking me a question!",
      timestamp: new Date(),
      isTyping: false,
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: DemoMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Use the existing backend API for demo
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/anthropic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // For demo purposes, we'll use a demo token or make it work without auth
        },
        body: JSON.stringify({
          message: message.trim(),
          history: messages.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          model: 'claude-3-5-sonnet-20241022',
        }),
      });

      let aiResponse = '';
      
      if (response.ok) {
        const result = await response.json();
        aiResponse = result.message;
      } else {
        // Fallback demo response if API is not available
        aiResponse = getDemoResponse(message.trim());
      }
      
      const aiMessage: DemoMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error in demo chat:', error);
      
      // Fallback demo response
      const aiMessage: DemoMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getDemoResponse(message.trim()),
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getDemoResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('beginner') || message.includes('10000') || message.includes('10k')) {
      return "For a beginner with $10,000, I'd recommend starting with a **covered calls strategy** on a stable stock like AAPL or MSFT. This is a conservative income-generating strategy where you:\n\n• Own 100 shares of stock ($8,000-9,000)\n• Sell call options above current price\n• Collect premium income (~1-3% monthly)\n• Keep dividends from the stock\n\n**Risk Level:** Low to Medium\n**Expected Return:** 8-15% annually\n**Capital Required:** $8,000-10,000\n\nWould you like me to create this strategy for you?";
    }
    
    if (message.includes('covered call')) {
      return "**Covered calls** are an excellent income strategy! Here's how they work:\n\n**The Strategy:**\n• You own 100 shares of a stock\n• Sell call options above the current price\n• Collect premium income immediately\n• If stock stays below strike, keep premium + stock\n• If stock goes above strike, sell at profit + keep premium\n\n**Pros:**\n• Generate monthly income\n• Reduce cost basis of stock\n• Lower risk than buying stock alone\n\n**Risks:**\n• Cap upside potential\n• Still lose if stock drops significantly\n\n**Best for:** Conservative investors seeking income";
    }
    
    if (message.includes('grid') || message.includes('dca')) {
      return "Great question! **Grid bots** and **DCA** serve different purposes:\n\n**Grid Bot:**\n• Best for sideways/ranging markets\n• Profits from volatility\n• Requires setting price ranges\n• More active trading\n\n**DCA (Dollar Cost Averaging):**\n• Best for long-term trending markets\n• Reduces timing risk\n• Simple set-and-forget\n• Smooths out volatility\n\n**For crypto, I'd recommend:**\n• **Grid bot** if you expect BTC/ETH to trade in a range\n• **DCA** if you believe in long-term growth\n\nWhat's your market outlook and time horizon?";
    }
    
    if (message.includes('create') && message.includes('aapl')) {
      return "I'll create a conservative AAPL covered calls strategy for you!\n\n**Strategy Configuration:**\n• **Symbol:** AAPL\n• **Capital:** $25,000\n• **Position:** 100 shares (~$19,000) + cash reserve\n• **Strike Delta:** 0.30 (30% out-of-the-money)\n• **Expiration:** 30-45 days\n• **Profit Target:** 50% of premium\n• **Risk Level:** Low\n\n**Expected Performance:**\n• Monthly income: $200-500\n• Annual return: 8-12%\n• Win rate: ~80%\n\n**Risk Management:**\n• Stop loss at 200% of premium\n• Roll options when threatened\n• Maintain cash buffer\n\nWould you like me to save this strategy to your account?";
    }
    
    return "That's a great question about trading! I can help you understand different strategies, create custom trading bots, analyze market conditions, and guide you through risk management. \n\nSome things I can help with:\n• **Strategy Creation** - Build custom trading strategies\n• **Risk Analysis** - Evaluate and manage trading risks\n• **Market Insights** - Analyze current market conditions\n• **Education** - Learn about different trading approaches\n\nWhat specific aspect of trading would you like to explore?";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleTypingComplete = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isTyping: false } : msg
    ));
  };

  const startDemo = () => {
    setIsPlaying(true);
    // Auto-send a demo question after a short delay
    setTimeout(() => {
      sendMessage("What's the best strategy for a beginner with $10,000?");
    }, 1000);
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm BroNomics AI, your intelligent trading assistant. I can help you create strategies, analyze markets, and guide you through trading decisions. Try asking me a question!",
        timestamp: new Date(),
        isTyping: false,
      }
    ]);
    setInputMessage('');
  };

  return (
    <section id="ai-demo" className="relative z-10 px-6 lg:px-12 py-20 bg-gray-900/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium mb-8">
            <Brain className="w-4 h-4" />
            Live AI Demo
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Experience BroNomics AI
          </h2>
          <p className="text-xl text-white max-w-3xl mx-auto mb-8">
            See how our AI assistant can help you create trading strategies, analyze risks, and make informed decisions. 
            This is a live demo using our actual AI backend.
          </p>
          
          <div className="flex justify-center gap-4">
            <Button
              onClick={startDemo}
              disabled={isPlaying}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Demo
            </Button>
            <Button
              onClick={resetDemo}
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              <Pause className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Demo Stats */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <Card className="p-8 bg-gray-800/80 backdrop-blur-xl border-gray-600">
              <h3 className="text-2xl font-bold text-white mb-6">AI Capabilities</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Strategy Creation</h4>
                    <p className="text-gray-300 text-sm">AI analyzes your goals and creates custom strategies</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Risk Analysis</h4>
                    <p className="text-gray-300 text-sm">Real-time risk assessment and management</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Market Insights</h4>
                    <p className="text-gray-300 text-sm">Advanced market analysis and recommendations</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Demo Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center bg-gray-800/80 backdrop-blur-xl border-gray-600">
                <div className="text-2xl font-bold text-blue-400">25+</div>
                <div className="text-sm text-gray-300">Strategy Types</div>
              </Card>
              <Card className="p-4 text-center bg-gray-800/80 backdrop-blur-xl border-gray-600">
                <div className="text-2xl font-bold text-green-400">95%</div>
                <div className="text-sm text-gray-300">Accuracy Rate</div>
              </Card>
              <Card className="p-4 text-center bg-gray-800/80 backdrop-blur-xl border-gray-600">
                <div className="text-2xl font-bold text-purple-400">24/7</div>
                <div className="text-sm text-gray-300">AI Available</div>
              </Card>
            </div>
          </motion.div>

          {/* Interactive Chat Demo */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gray-900/90 backdrop-blur-xl border-gray-700 overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-white font-medium">BroNomics AI Chat</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Demo</span>
                </div>
              </div>

              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                        <div
                          className={`p-3 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-gray-700 text-white ml-auto'
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.role === 'assistant' && message.isTyping ? (
                              <TypingText 
                                text={message.content}
                                onComplete={() => handleTypingComplete(message.id)}
                              />
                            ) : (
                              message.content
                            )}
                          </div>
                        </div>
                        <p className={`text-xs text-gray-400 mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {message.timestamp.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="bg-gray-700 rounded-2xl p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/30">
                <div className="flex flex-wrap gap-2 mb-4">
                  {demoQuestions.slice(0, 3).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(question)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-all duration-200 border border-gray-600/50 hover:border-gray-500 disabled:opacity-50"
                    >
                      {question.length > 40 ? `${question.substring(0, 40)}...` : question}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me about trading strategies..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}