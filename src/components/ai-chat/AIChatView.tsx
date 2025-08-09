import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Brain, Menu, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { AIChatSidebar } from './AIChatSidebar';
import { StrategyCreationModal } from './StrategyCreationModal';
import { StatusDisplay } from './StatusDisplay';
import { useChatSessions } from './hooks/useChatSessions';
import { useStrategyCreation } from './hooks/useStrategyCreation';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { TradingStrategy } from '../../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
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
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const { user, strategies, setStrategies } = useStore();
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-1-20250805');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showActions, setShowActions] = useState(true);

  const {
    chatSessions,
    currentSessionId,
    totalTokensUsed,
    sessionTokensUsed,
    lastResponseTokens,
    lastResponseModel,
    messages,
    setMessages,
    setTotalTokensUsed,
    setSessionTokensUsed,
    setLastResponseTokens,
    setLastResponseModel,
    generateChatTitle,
    createNewChat,
    switchToSession,
    deleteSession,
    setChatSessions,
  } = useChatSessions(user);

  const {
    showStrategyModal,
    setShowStrategyModal,
    pendingStrategy,
    setPendingStrategy,
    showCreatingStatus,
    creationStatusText,
    checkForStrategyCreation,
    handleCreateStrategy,
  } = useStrategyCreation(user, strategies, setStrategies);

  const handleChatAreaClick = () => {
    setShowSuggestions(false);
    setShowActions(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const stopResponse = () => {
    setIsLoading(false);
    // Remove any typing messages
    setMessages(prev => prev.map(msg => 
      msg.isTyping ? { ...msg, isTyping: false, content: msg.content + '\n\n*Response stopped by user*' } : msg
    ));
  };

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

    // Check if this is the first user message in the session (excluding welcome message)
    const isFirstUserMessage = messages.filter(msg => msg.role === 'user').length === 0;

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
        setTotalTokensUsed(prev => prev + result.usage.total_tokens);
        setSessionTokensUsed(prev => prev + result.usage.total_tokens);
      }
      if (result.model) {
        setLastResponseModel(result.model);
      }
      
      // Update session title if this is the first user message
      if (isFirstUserMessage && currentSessionId) {
        const newTitle = generateChatTitle(message.trim());
        
        try {
          const { error: titleError } = await supabase
            .from('chat_sessions')
            .update({ title: newTitle })
            .eq('id', currentSessionId)
            .eq('user_id', user?.id);

          if (!titleError) {
            // Update local state
            setChatSessions(prev => prev.map(session => 
              session.id === currentSessionId 
                ? { ...session, title: newTitle }
                : session
            ));
          }
        } catch (error) {
          console.error('Error updating session title:', error);
        }
      }

      // Check if the AI response suggests creating a strategy
      const shouldCreateStrategy = checkForStrategyCreation(message.trim(), result.message);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages(prev => [...prev, aiMessage]);

      // If strategy creation is detected, show the modal after typing completes
      if (shouldCreateStrategy) {
        setTimeout(() => {
          setPendingStrategy(shouldCreateStrategy);
          setShowStrategyModal(true);
        }, result.message.length * 4 + 1000); // Wait for typing to complete + 1 second
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please check your internet connection and try again. If the problem persists, the Anthropic API might be temporarily unavailable.",
        timestamp: new Date(),
        isTyping: false,
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

  const handleTypingComplete = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isTyping: false } : msg
    ));
  };

  const handleStrategyCreated = async (strategy: Omit<TradingStrategy, 'id'>) => {
    const newStrategy = await handleCreateStrategy(strategy);
    
    if (newStrategy) {
      // Add confirmation message to chat
      const confirmationMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Strategy Created Successfully!**\n\nYour "${strategy.name}" strategy has been saved to your database and added to your Strategies page. You can now configure and activate it from the Strategies section.`,
        timestamp: new Date(),
        isTyping: false,
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
    }
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
        <ChatHeader
          rightSidebarOpen={rightSidebarOpen}
          setRightSidebarOpen={setRightSidebarOpen}
        />

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col min-h-0">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            onTypingComplete={handleTypingComplete}
            messagesEndRef={messagesEndRef}
          />

          {/* Input Form */}
          <ChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onStopResponse={stopResponse}
            suggestedQuestions={suggestedQuestions}
            actionablePrompts={actionablePrompts}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            showActions={showActions}
            setShowActions={setShowActions}
            onSuggestedQuestion={handleSuggestedQuestion}
          />
        </Card>
      </div>

      {/* Strategy Creation Status */}
      <AnimatePresence>
        {showCreatingStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <StatusDisplay
              title={creationStatusText}
              subtitle={creationStatusText.includes('successfully') ? 'Check your Strategies page' : 'Please wait...'}
              showLottie={!creationStatusText.includes('successfully')}
              lottieUrl="https://lottie.host/c7b4a9cf-d010-486b-994d-3871d0d5f1a6/BhyLNPUHaQ.lottie"
              className="min-w-80"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Sidebar */}
      <AIChatSidebar
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        suggestedQuestions={suggestedQuestions}
        handleSuggestedQuestion={handleSuggestedQuestion}
        totalTokensUsed={totalTokensUsed}
        sessionTokensUsed={sessionTokensUsed}
        lastResponseModel={lastResponseModel}
        chatSessions={chatSessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewChat}
        onSwitchSession={switchToSession}
        onDeleteSession={deleteSession}
        actionablePrompts={actionablePrompts}
        aiGeneratedStrategies={strategies}
      />

      {/* Strategy Creation Modal */}
      {showStrategyModal && pendingStrategy && (
        <StrategyCreationModal
          onClose={() => {
            setShowStrategyModal(false);
            setPendingStrategy(null);
          }}
          onStrategyCreated={handleStrategyCreated}
          className="w-72 sm:min-w-80"
          strategyData={pendingStrategy}
        />
      )}
    </motion.div>
  );
}