import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChatInputProps {
  inputMessage: string; // external value (we'll sync to it)
  setInputMessage: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStopResponse: () => void;
  suggestedQuestions: string[];
  actionablePrompts: string[];
  onSuggestedQuestion: (question: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  showActions: boolean;
  setShowActions: (show: boolean) => void;
}

export function ChatInput(props: ChatInputProps) {
  const {
    inputMessage, setInputMessage, onSubmit, isLoading, onStopResponse,
    suggestedQuestions, actionablePrompts, onSuggestedQuestion,
    showSuggestions, setShowSuggestions, showActions, setShowActions
  } = props;

  // Local state for typing - decouple from parent
  const [localValue, setLocalValue] = useState(inputMessage);
  const [isTyping, setIsTyping] = useState(false);
  
  // Keep local value in sync when parent changes
  useEffect(() => {
    setLocalValue(inputMessage);
  }, [inputMessage]);
  
  // Flush local value to parent when needed
  const flushToParent = () => {
    if (localValue !== inputMessage) {
      setInputMessage(localValue);
    }
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Imperative auto-resize: no state, no timers, no rAF
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    const lineHeight = 24;
    const maxLines = 5;
    const minH = lineHeight * 1;
    const maxH = lineHeight * maxLines;

    el.style.height = '0px';                 // reset so scrollHeight is accurate
    const h = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height = `${h}px`;
  };

  useEffect(() => { autoResize(); }, []);     // initial
  useEffect(() => { autoResize(); }, [localValue]); // on local value change

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && localValue.trim()) {
        flushToParent();
        onSubmit(e as any);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && localValue.trim()) {
      flushToParent();
      onSubmit(e);
    }
  };

  // Memoize slices to avoid work
  const topQuestions = useMemo(() => suggestedQuestions.slice(0, 3), [suggestedQuestions]);
  const topActions = useMemo(() => actionablePrompts.slice(0, 2), [actionablePrompts]);

  return (
    <div className="border-t border-gray-800">
      {/* Suggested Questions */}
      <div className="px-4 sm:px-6 pt-4">
        <button onClick={() => setShowSuggestions(!showSuggestions)} className="flex items-center justify-between w-full mb-2 group">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
              Suggested Questions
            </h3>
          </div>
          {showSuggestions ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showSuggestions && !isTyping && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="flex flex-wrap gap-2 mb-4">
                {topQuestions.map((q, i) => (
                  <button key={i} onClick={() => onSuggestedQuestion(q)}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-xs sm:text-sm text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600">
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Actions */}
      <div className="px-4 sm:px-6">
        <button onClick={() => setShowActions(!showActions)} className="flex items-center justify-between w-full mb-2 group">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 rounded flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
              AI Strategy Actions
            </h3>
          </div>
          {showActions ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showActions && !isTyping && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="flex flex-wrap gap-2 mb-4">
                {topActions.map((p, i) => (
                  <button key={i} onClick={() => onSuggestedQuestion(p)}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-purple-900/20 to-violet-900/20 hover:from-purple-800/30 hover:to-violet-800/30 rounded-lg text-xs sm:text-sm text-purple-200 hover:text-purple-100 transition-all duration-200 border border-purple-500/20 hover:border-purple-400/40">
                    {p.length > 50 ? `${p.substring(0, 50)}...` : p}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex gap-3 sm:gap-4 items-stretch">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                autoResize();
              }}
              onFocus={() => setIsTyping(true)}
              onBlur={() => {
                setIsTyping(false);
                flushToParent();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about trading strategies... (Shift+Enter for new line)"
              disabled={isLoading}
              rows={1}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none overflow-y-auto text-sm sm:text-base leading-6 custom-scrollbar"
              style={{ minHeight: 40, maxHeight: 120 }}
            />
          </div>

          <Button
            type="submit"
            disabled={!localValue.trim() || isLoading}
            variant="primary"
            onClick={isLoading ? (e) => { e.preventDefault(); onStopResponse(); } : undefined}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center flex-shrink-0 min-w-[48px] sm:min-w-[64px] shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            style={{ height: 40, minHeight: 40, maxHeight: 120 }} // fixed; no layout reads
          >
            {isLoading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-white rounded-sm" />
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
