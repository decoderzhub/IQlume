import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, X, Lightbulb, Coins, MessageSquare, Plus, Clock, Trash2, Sparkles, Zap, TrendingUp, Shield, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TradingStrategy } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
}

interface AIChatSidebarProps {
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  suggestedQuestions: string[];
  handleSuggestedQuestion: (question: string) => void;
  totalTokensUsed: number;
  sessionTokensUsed: number;
  lastResponseModel: string | null;
  chatSessions: ChatSession[];
  currentSessionId: string;
  onNewChat: () => void;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  actionablePrompts: string[];
  aiGeneratedStrategies: TradingStrategy[];
}

const anthropicModels = [
  {
    id: 'claude-opus-4-1-20250805',
    name: 'claude-opus-4-1-20250805',
    label: 'claude-opus-4-1-20250805',
    description: 'Powerful, large model for complex challenges',
    badge: 'latest',
    recommended: true,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'claude-sonnet-4-20250514',
    label: 'claude-sonnet-4-20250514',
    description: 'Smart, efficient model for everyday use',
    badge: 'latest',
    recommended: false,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'claude-3-5-haiku-20241022',
    label: 'claude-3-5-haiku-20241022',
    description: 'Fastest model for daily tasks',
    badge: 'latest',
    recommended: false,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'claude-opus-4-20250514',
    label: 'claude-opus-4-20250514',
    description: 'Powerful model for complex tasks',
    badge: null,
    recommended: false,
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'claude-3-7-sonnet-20250219',
    label: 'claude-3-7-sonnet-20250219',
    description: 'Advanced sonnet model',
    badge: null,
    recommended: false,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'claude-3-5-sonnet-20241022',
    label: 'claude-3-5-sonnet-20241022',
    description: 'Intelligent model for complex tasks',
    badge: null,
    recommended: false,
  },
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'claude-3-5-sonnet-20240620',
    label: 'claude-3-5-sonnet-20240620',
    description: 'Previous sonnet model version',
    badge: null,
    recommended: false,
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'claude-3-haiku-20240307',
    label: 'claude-3-haiku-20240307',
    description: 'Fast model for simple tasks',
    badge: null,
    recommended: false,
  },
];

export function AIChatSidebar({ 
  rightSidebarOpen,
  setRightSidebarOpen,
  selectedModel, 
  setSelectedModel,
  suggestedQuestions,
  handleSuggestedQuestion,
  totalTokensUsed,
  sessionTokensUsed,
  lastResponseModel,
  chatSessions,
  currentSessionId,
  onNewChat,
  onSwitchSession,
  onDeleteSession,
  actionablePrompts,
  aiGeneratedStrategies,
}: AIChatSidebarProps) {
  const [showModels, setShowModels] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const [showAIStrategies, setShowAIStrategies] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 0.8
      }
    },
    closed: {
      x: "100%",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 0.8
      }
    }
  };

  const overlayVariants = {
    open: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    closed: {
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getRiskColor = (level: TradingStrategy['risk_level']) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {rightSidebarOpen && (
          <motion.div
            variants={overlayVariants}
            initial="open"
            animate="open"
            exit="closed"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setRightSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar - always visible but can be collapsed */}
      <motion.aside
        animate={{
          width: rightSidebarOpen ? 320 : 0,
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 40
          }
        }}
        className="hidden lg:flex fixed right-0 top-20 h-[calc(100vh-80px)] bg-gray-900/95 backdrop-blur-xl border-l border-gray-800 z-30 flex-col overflow-hidden"
      >
        <AnimatePresence>
          {rightSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {/* New Chat Button */}
              <Button
                onClick={onNewChat}
                className="w-full flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>

              {/* Token Usage */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-white">Token Usage</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Session Total:</span>
                    <span className="font-medium text-white">
                      {sessionTokensUsed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">All Time:</span>
                    <span className="font-bold text-yellow-400">
                      {totalTokensUsed.toLocaleString()}
                    </span>
                  </div>
                  {lastResponseModel && (
                    <div className="pt-2 border-t border-gray-700">
                      <span className="text-xs text-gray-500">Model: {lastResponseModel}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Suggested Questions - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white">Suggested Questions</h3>
                  </div>
                  {showSuggestions ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2">
                        {suggestedQuestions.map((question, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleSuggestedQuestion(question)}
                            className="w-full p-3 text-left bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all border border-gray-700/50 hover:border-gray-600"
                          >
                            {question}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* AI Strategy Actions - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold text-white">AI Strategy Actions</h3>
                  </div>
                  {showActions ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2">
                        {actionablePrompts.map((prompt, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleSuggestedQuestion(prompt)}
                            className="w-full p-3 text-left bg-gradient-to-r from-purple-900/20 to-violet-900/20 hover:from-purple-800/30 hover:to-violet-800/30 rounded-lg text-sm text-purple-200 hover:text-purple-100 transition-all border border-purple-500/20 hover:border-purple-400/40"
                          >
                            {prompt.length > 60 ? `${prompt.substring(0, 60)}...` : prompt}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* AI Generated Strategies - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowAIStrategies(!showAIStrategies)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-white">AI Strategies</h3>
                  </div>
                  {showAIStrategies ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {showAIStrategies && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {aiGeneratedStrategies.length === 0 ? (
                          <div className="text-center py-4 text-gray-400">
                            <Brain className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm">No AI strategies yet</p>
                            <p className="text-xs">Ask me to create one!</p>
                          </div>
                        ) : (
                          aiGeneratedStrategies.map((strategy) => (
                            <motion.div
                              key={strategy.id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className="p-3 rounded-lg border border-gray-700 bg-gray-800/30 hover:border-gray-600 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-white text-sm truncate">{strategy.name}</h4>
                                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{strategy.description}</p>
                                </div>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${strategy.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(strategy.risk_level)}`}>
                                  {strategy.risk_level}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatCurrency(strategy.min_capital)}
                                </span>
                              </div>
                              
                              {strategy.performance && (
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Return:</span>
                                    <span className={strategy.performance.total_return >= 0 ? 'text-green-400' : 'text-red-400'}>
                                      {(strategy.performance.total_return * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* AI Model Selection - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowModels(!showModels)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">AI Model</h3>
                  </div>
                  {showModels ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {showModels && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2">
                        {anthropicModels.map((model) => (
                          <motion.div
                            key={model.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setSelectedModel(model.name)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedModel === model.name
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  selectedModel === model.name ? 'bg-blue-500' : 'bg-gray-500'
                                }`} />
                                <span className="font-medium text-white text-sm">{model.label}</span>
                              </div>
                              <div className="flex gap-1">
                                {model.badge && (
                                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                                    {model.badge}
                                  </span>
                                )}
                                {model.recommended && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                                    recommended
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">{model.description}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Chat History - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white">Chat History</h3>
                  </div>
                  {showHistory ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {chatSessions.map((session) => (
                          <motion.div
                            key={session.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              currentSessionId === session.id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1" onClick={() => onSwitchSession(session.id)}>
                              <span className="font-medium text-white text-sm truncate flex-1">
                                {session.title}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-400 ml-2">
                                <Clock className="w-3 h-3" />
                                {formatTime(session.timestamp)}
                              </div>
                            </div>
                            <div className="flex items-center justify-between" onClick={() => onSwitchSession(session.id)}>
                              <span className="text-xs text-gray-400">
                                {session.messages.length} messages
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(session.timestamp)}
                              </span>
                            </div>
                            {chatSessions.length > 1 && (
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Are you sure you want to delete this conversation?')) {
                                      onDeleteSession(session.id);
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                  title="Delete conversation"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {rightSidebarOpen && (
          <motion.aside
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed right-0 top-0 h-full w-80 bg-gray-900/98 backdrop-blur-xl border-l border-gray-800 z-50 lg:hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-blue-400" />
                <span className="text-white font-semibold">AI Assistant</span>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRightSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Same content as desktop but in mobile layout */}
              {/* New Chat Button */}
              <Button
                onClick={() => {
                  onNewChat();
                  setRightSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>

              {/* Token Usage */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-white">Token Usage</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Session Total:</span>
                    <span className="font-medium text-white">
                      {sessionTokensUsed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">All Time:</span>
                    <span className="font-bold text-yellow-400">
                      {totalTokensUsed.toLocaleString()}
                    </span>
                  </div>
                  {lastResponseModel && (
                    <div className="pt-2 border-t border-gray-700">
                      <span className="text-xs text-gray-500">Model: {lastResponseModel}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* AI Model Selection - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowModels(!showModels)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">AI Model</h3>
                  </div>
                  {showModels ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {showModels && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2">
                        {anthropicModels.map((model) => (
                          <motion.div
                            key={model.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setSelectedModel(model.name)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedModel === model.name
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  selectedModel === model.name ? 'bg-blue-500' : 'bg-gray-500'
                                }`} />
                                <span className="font-medium text-white text-sm">{model.label}</span>
                              </div>
                              <div className="flex gap-1">
                                {model.badge && (
                                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                                    {model.badge}
                                  </span>
                                )}
                                {model.recommended && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                                    recommended
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">{model.description}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Chat History - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white">Chat History</h3>
                  </div>
                  {showHistory ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {chatSessions.map((session) => (
                          <motion.div
                            key={session.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              currentSessionId === session.id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1" onClick={() => {
                              onSwitchSession(session.id);
                              setRightSidebarOpen(false);
                            }}>
                              <span className="font-medium text-white text-sm truncate flex-1">
                                {session.title}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-400 ml-2">
                                <Clock className="w-3 h-3" />
                                {formatTime(session.timestamp)}
                              </div>
                            </div>
                            <div className="flex items-center justify-between" onClick={() => {
                              onSwitchSession(session.id);
                              setRightSidebarOpen(false);
                            }}>
                              <span className="text-xs text-gray-400">
                                {session.messages.length} messages
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(session.timestamp)}
                              </span>
                            </div>
                            {chatSessions.length > 1 && (
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Are you sure you want to delete this conversation?')) {
                                      onDeleteSession(session.id);
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                  title="Delete conversation"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}