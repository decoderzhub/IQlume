import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStopResponse: () => void;
}

export function ChatInput({ 
  inputMessage, 
  setInputMessage, 
  onSubmit, 
  isLoading, 
  onStopResponse 
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
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
    }
  }, [inputMessage]);

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

  return (
    <div className="border-t border-gray-800 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="flex gap-3 sm:gap-4 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about trading strategies... (Shift+Enter for new line)"
            disabled={isLoading}
            rows={1}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 text-sm sm:text-base leading-6"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>
        <Button
          type="submit"
          disabled={!inputMessage.trim() && !isLoading}
          className="px-4 sm:px-6 py-2 sm:py-3 flex-shrink-0"
          onClick={isLoading ? (e) => { e.preventDefault(); onStopResponse(); } : undefined}
        >
          {isLoading ? (
            <div className="w-4 h-4 bg-red-500 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded"></div>
            </div>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
      <p className="text-xs text-gray-300 mt-2 sm:mt-3 text-center font-medium">
        Claude responses are generated and may not always be accurate. Always do your own research.
      </p>
    </div>
  );
}