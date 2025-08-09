import React from 'react';
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
  return (
    <div className="border-t border-gray-800 p-6">
      <form onSubmit={onSubmit} className="flex gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me about trading strategies..."
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
        </div>
        <Button
          type="submit"
          disabled={!inputMessage.trim() && !isLoading}
          className="px-6"
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
      <p className="text-xs sm:text-sm text-gray-300 mt-3 text-center font-medium">
        Claude responses are generated and may not always be accurate. Always do your own research.
      </p>
    </div>
  );
}