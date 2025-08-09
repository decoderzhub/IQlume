import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Brain, Menu, Coins } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AIChatSidebar } from './AIChatSidebar';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

const suggestedQuestions = [
  "What's the best strategy for a beginner with $10,000?",
  "How do covered calls work and what are the risks?",
  "Should I use a grid bot or DCA for crypto?",
  "What's the difference between iron condor and straddle?",
  "How do I manage risk in options trading?",
  "What allocation should I use for a balanced portfolio?",
];

const actionablePrompts = [
  "Create a covered calls strategy for AAPL with $30K capital and conservative risk",
  "Build me a DCA bot for ETH with $100 weekly investments",
  "Design a smart rebalance portfolio with my current holdings",
  "Set up an iron condor strategy for SPY with 45 DTE",
  "Create a grid bot for BTC between $40K-$50K price range",
  "Build a wheel strategy for high dividend stocks with $25K",
  "Design a momentum strategy for tech stocks with stop losses",
  "Create a pairs trading strategy for correlated assets",
];
export function AIChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Brokernomex AI, your trading strategy assistant. I can help you understand different trading strategies, analyze market conditions, and guide you through creating automated trading bots. What would you like to know about trading strategies?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const { user } = useStore();
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet-20241022');
  const [lastResponseTokens, setLastResponseTokens] = useState<TokenUsage | null>(null);
  const [lastResponseModel, setLastResponseModel] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Prepare chat history for context (last 10 messages)
      const chatHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/anthropic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          history: chatHistory,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get Claude response: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      // Update token usage and model info
      if (result.usage) {
        setLastResponseTokens(result.usage);
      }
      if (result.model) {
        setLastResponseModel(result.model);
      }
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please check your internet connection and try again. If the problem persists, the Anthropic API might be temporarily unavailable.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex max-h-[calc(100vh-120px)]"
    >
      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{
          marginRight: rightSidebarOpen ? '320px' : '0',
        }}
      >
        {/* Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Brokernomex AI</h1>
              <p className="text-gray-400">Your intelligent trading strategy assistant</p>
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
        </Card>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[70%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-gray-800/50 text-gray-100 ml-auto'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                    <p className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.timestamp)}
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
                className="flex gap-4 justify-start"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800/50 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Token Usage Display */}
          {lastResponseTokens && (
            <div className="px-6 pb-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-sm font-medium text-white">Token Usage</h4>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-400">Input</p>
                    <p className="font-medium text-white">
                      {lastResponseTokens.input_tokens.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">Output</p>
                    <p className="font-medium text-white">
                      {lastResponseTokens.output_tokens.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">Total</p>
                    <p className="font-bold text-yellow-400">
                      {lastResponseTokens.total_tokens.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {lastResponseModel && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500">Model: {lastResponseModel}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="border-t border-gray-800 p-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
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
                disabled={!inputMessage.trim() || isLoading}
                className="px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Claude responses are generated and may not always be accurate. Always do your own research.
            </p>
          </div>
        </Card>
      </div>

      {/* Right Sidebar */}
      <AIChatSidebar
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        suggestedQuestions={suggestedQuestions}
        actionablePrompts={actionablePrompts}
        handleSuggestedQuestion={handleSuggestedQuestion}
      />
    </motion.div>
  );
}