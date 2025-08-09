import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ChatHeaderProps {
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  suggestedQuestions: string[];
  actionablePrompts: string[];
  onSuggestedQuestion: (question: string) => void;
}

export function ChatHeader({ 
  rightSidebarOpen, 
  setRightSidebarOpen, 
  suggestedQuestions, 
  actionablePrompts, 
  onSuggestedQuestion 
}: ChatHeaderProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">BroNomics Ai</h1>
            <p className="text-sm sm:text-base text-gray-400">Your intelligent trading strategy assistant</p>
          </div>
        </div>
        
        {/* Right sidebar toggle */}
        <Button
          variant="ghost"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="p-2"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Suggested Questions - Collapsible on Mobile */}
      <div className="mt-6">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center justify-between w-full mb-2 lg:cursor-default"
        >
          <h3 className="text-xs sm:text-sm font-medium text-gray-400">Suggested Questions</h3>
          <div className="lg:hidden">
            {showSuggestions ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>
        
        <AnimatePresence>
          {(showSuggestions || window.innerWidth >= 1024) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSuggestedQuestion(question);
                      setShowSuggestions(false); // Close on mobile after selection
                    }}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-xs sm:text-sm text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* AI Actions - Collapsible on Mobile */}
      <div className="mt-4">
        <button
          onClick={() => setShowActions(!showActions)}
          className="flex items-center justify-between w-full mb-2 lg:cursor-default"
        >
          <h3 className="text-xs sm:text-sm font-medium text-gray-400">AI Actions</h3>
          <div className="lg:hidden">
            {showActions ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>
        
        <AnimatePresence>
          {(showActions || window.innerWidth >= 1024) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2">
                {actionablePrompts.slice(0, 2).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSuggestedQuestion(prompt);
                      setShowActions(false); // Close on mobile after selection
                    }}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-blue-900/20 to-purple-900/20 hover:from-blue-800/30 hover:to-purple-800/30 rounded-lg text-xs sm:text-sm text-blue-200 hover:text-blue-100 transition-all duration-200 border border-blue-500/20 hover:border-blue-400/40"
                  >
                    {prompt.length > 50 ? `${prompt.substring(0, 50)}...` : prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}