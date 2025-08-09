import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, TrendingUp, Target, Lightbulb, ChevronDown, ChevronUp, X, Menu } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

interface AIChatSidebarProps {
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  suggestedQuestions: string[];
  actionablePrompts: string[];
  handleSuggestedQuestion: (question: string) => void;
}

const anthropicModels = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    description: 'Most intelligent model for complex tasks',
    badge: 'latest',
    recommended: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    description: 'Fastest model for daily tasks',
    badge: 'latest',
    recommended: false,
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus',
    description: 'Powerful model for complex challenges',
    badge: null,
    recommended: false,
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'claude-3-sonnet-20240229',
    label: 'Claude 3 Sonnet',
    description: 'Smart, efficient model for everyday use',
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
  actionablePrompts,
  handleSuggestedQuestion
}: AIChatSidebarProps) {
  const [showModels, setShowModels] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showActions, setShowActions] = useState(true);

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

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {rightSidebarOpen && (
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setRightSidebarOpen(true)}
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
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
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

              {/* Suggested Questions - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
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
                          <button
                            key={index}
                            onClick={() => handleSuggestedQuestion(question)}
                            className="w-full text-left p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* AI Actions - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">AI Actions</h3>
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
                          <button
                            key={index}
                            onClick={() => handleSuggestedQuestion(prompt)}
                            className="w-full text-left p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 hover:from-blue-800/30 hover:to-purple-800/30 rounded-lg text-sm text-blue-200 hover:text-blue-100 transition-all duration-200 border border-blue-500/20 hover:border-blue-400/40"
                          >
                            <div className="flex items-start gap-2">
                              <Zap className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                              <span>{prompt}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Brain className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-300">
                            <p className="font-medium mb-1">💡 Pro Tip:</p>
                            <p>These prompts can help the AI understand your intent to create specific strategies. The AI will guide you through the parameters and can suggest opening the strategy creation modal with pre-filled settings.</p>
                          </div>
                        </div>
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

              {/* Suggested Questions - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
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
                          <button
                            key={index}
                            onClick={() => {
                              handleSuggestedQuestion(question);
                              setRightSidebarOpen(false);
                            }}
                            className="w-full text-left p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* AI Actions - Accordion */}
              <Card className="p-4">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">AI Actions</h3>
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
                          <button
                            key={index}
                            onClick={() => {
                              handleSuggestedQuestion(prompt);
                              setRightSidebarOpen(false);
                            }}
                            className="w-full text-left p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 hover:from-blue-800/30 hover:to-purple-800/30 rounded-lg text-sm text-blue-200 hover:text-blue-100 transition-all duration-200 border border-blue-500/20 hover:border-blue-400/40"
                          >
                            <div className="flex items-start gap-2">
                              <Zap className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                              <span>{prompt}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Brain className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-300">
                            <p className="font-medium mb-1">💡 Pro Tip:</p>
                            <p>These prompts can help the AI understand your intent to create specific strategies. The AI will guide you through the parameters and can suggest opening the strategy creation modal with pre-filled settings.</p>
                          </div>
                        </div>
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