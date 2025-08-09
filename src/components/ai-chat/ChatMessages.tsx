import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from './ChatMessage';
import { StatusDisplay } from './StatusDisplay';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onTypingComplete: (messageId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatMessages({ messages, isLoading, onTypingComplete, messagesEndRef }: ChatMessagesProps) {
  return (
    <div 
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar"
    >
      <AnimatePresence>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onTypingComplete={() => onTypingComplete(message.id)}
          />
        ))}
      </AnimatePresence>

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 justify-start"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <StatusDisplay
            title="BroNomics AI is thinking..."
            subtitle="Analyzing your request and generating response"
            showLottie={true}
            className="max-w-md"
          />
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}