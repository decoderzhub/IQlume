import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStopResponse: () => void;
  suggestedQuestions: string[];
  actionablePrompts: string[];
  onSuggestedQuestion: (question: string) => void;
}

export function ChatInput({ 
  inputMessage, 
  setInputMessage, 
  onSubmit, 
  isLoading, 
  onStopResponse,
  suggestedQuestions,
  actionablePrompts,
  onSuggestedQuestion
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized auto-resize textarea with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Debounce the resize operation
    resizeTimeoutRef.current = setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Use requestAnimationFrame for smooth performance
      requestAnimationFrame(() => {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate the number of lines
        const lineHeight = 24; // Approximate line height in pixels
        const maxLines = 5;
        const minHeight = lineHeight * 1; // 1 line minimum
        const maxHeight = lineHeight * maxLines;
        
        // Set height based on content, but cap at max lines
        const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
      });
    }, 10); // 10ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [inputMessage]);

  // Optimized suggestion hiding - only run when input changes from empty to non-empty or vice versa
  useEffect(() => {
    const textarea = textareaRef.current;
    const hasInput = inputMessage.trim().length > 0;
    
    if (hasInput && (showSuggestions || showActions)) {
      setShowSuggestions(false);
      setShowActions(false);
    } else if (!hasInput && (!showSuggestions || !showActions)) {
      setShowSuggestions(true);
      setShowActions(true);
    }
  }, [inputMessage.trim().length > 0]); // Only run when empty/non-empty state changes

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && inputMessage.trim()) {
        onSubmit(e as any);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && inputMessage.trim()) {
      onSubmit(e);
    }
  };

  // Optimized input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };
  return (
    <div className="border-t border-gray-800">
      {/* Suggested Questions - Above Input */}
      <div className="px-4 sm:px-6 pt-4">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center justify-between w-full mb-2 group"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
              Suggested Questions
            </h3>
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
              <div className="flex flex-wrap gap-2 mb-4">
                {suggestedQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSuggestedQuestion(question);
                      setShowSuggestions(false);
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
      
      {/* AI Actions - Above Input */}
      <div className="px-4 sm:px-6">
        <button
          onClick={() => setShowActions(!showActions)}
          className="flex items-center justify-between w-full mb-2 group"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 rounded flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
              AI Strategy Actions
            </h3>
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
              <div className="flex flex-wrap gap-2 mb-4">
                {actionablePrompts.slice(0, 2).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSuggestedQuestion(prompt);
                      setShowActions(false);
                    }}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-purple-900/20 to-violet-900/20 hover:from-purple-800/30 hover:to-violet-800/30 rounded-lg text-xs sm:text-sm text-purple-200 hover:text-purple-100 transition-all duration-200 border border-purple-500/20 hover:border-purple-400/40"
                  >
                    {prompt.length > 50 ? `${prompt.substring(0, 50)}...` : prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Form */}
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex gap-3 sm:gap-4 items-stretch">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about trading strategies... (Shift+Enter for new line)"
              disabled={isLoading}
              rows={1}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none overflow-y-auto text-sm sm:text-base leading-6 custom-scrollbar"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <Button
            type="submit"
            disabled={!inputMessage.trim() && !isLoading}
            variant="primary"
            onClick={isLoading ? (e) => { e.preventDefault(); onStopResponse(); } : undefined}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center flex-shrink-0 min-w-[48px] sm:min-w-[64px] shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            style={{
              height: textareaRef.current?.style.height || '40px',
              minHeight: '40px',
              maxHeight: '120px'
            }}
          >
            {isLoading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-white rounded-sm"></div>
              </div>
            ) : (
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>
        </form>
        
        <p className="hidden sm:block text-xs text-gray-300 mt-2 sm:mt-3 text-center font-medium">
          Claude responses are generated and may not always be accurate. Always do your own research.
        </p>
      </div>
    </div>
  );
}