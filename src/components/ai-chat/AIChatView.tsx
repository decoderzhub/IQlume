import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Brain, Menu, Coins } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AIChatSidebar } from './AIChatSidebar';
import { StrategyCreationModal } from './StrategyCreationModal';
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

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
}

// Custom markdown components for better styling
const MarkdownComponents = {
  h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4 text-white">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xl font-semibold mb-3 text-white">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-lg font-medium mb-2 text-white">{children}</h3>,
  p: ({ children }: any) => <p className="mb-3 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="ml-2">{children}</li>,
  code: ({ inline, children, ...props }: any) => 
    inline ? (
      <code className="bg-black/30 px-1.5 py-0.5 rounded text-sm font-mono text-blue-200" {...props}>
        {children}
      </code>
    ) : (
      <code className="block bg-black/50 p-3 rounded-lg text-sm font-mono overflow-x-auto mb-3" {...props}>
        {children}
      </code>
    ),
  pre: ({ children }: any) => <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-400 pl-4 italic mb-3 text-gray-200">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-3">
      <table className="min-w-full border border-gray-600 rounded-lg">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-gray-800">{children}</thead>,
  tbody: ({ children }: any) => <tbody>{children}</tbody>,
  tr: ({ children }: any) => <tr className="border-b border-gray-600">{children}</tr>,
  th: ({ children }: any) => <th className="px-3 py-2 text-left font-medium text-white">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2 text-gray-200">{children}</td>,
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-gray-200">{children}</em>,
  a: ({ children, href, ...props }: any) => (
    <a 
      href={href} 
      className="text-blue-400 hover:text-blue-300 underline" 
      target="_blank" 
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

// Typing animation component
const TypingText: React.FC<{ text: string; onComplete?: () => void; isMarkdown?: boolean }> = ({ 
  text, 
  onComplete, 
  isMarkdown = false 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 4); // Adjust speed here (lower = faster)

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  if (isMarkdown) {
    return (
      <div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={MarkdownComponents}
        >
          {displayedText}
        </ReactMarkdown>
        {currentIndex < text.length && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block w-0.5 h-4 bg-current ml-0.5"
          />
        )}
      </div>
    );
  }

  return (
    <span>
      {displayedText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-current ml-0.5"
        />
      )}
    </span>
  );
};

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
  const [currentSessionId, setCurrentSessionId] = useState('1');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Trading Strategy Help',
      timestamp: new Date(),
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: "Hello! I'm Brokernomex AI, your trading strategy assistant. I can help you understand different trading strategies, analyze market conditions, and guide you through creating automated trading bots. What would you like to know about trading strategies?",
          timestamp: new Date(),
          isTyping: false,
        },
      ],
    },
  ]);
  
  const currentSession = chatSessions.find(session => session.id === currentSessionId);
  const messages = currentSession?.messages || [];
  
  const setMessages = (updater: React.SetStateAction<ChatMessage[]>) => {
    setChatSessions(prev => prev.map(session => 
      session.id === currentSessionId 
        ? { ...session, messages: typeof updater === 'function' ? updater(session.messages) : updater }
        : session
    ));
  };
  
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  const [sessionTokensUsed, setSessionTokensUsed] = useState(0);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const { user, strategies, setStrategies } = useStore();
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-1-20250805');
  const [lastResponseTokens, setLastResponseTokens] = useState<TokenUsage | null>(null);
  const [lastResponseModel, setLastResponseModel] = useState<string | null>(null);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [pendingStrategy, setPendingStrategy] = useState<any>(null);

  const stopResponse = () => {
    setIsLoading(false);
    // Remove any typing messages
    setMessages(prev => prev.map(msg => 
      msg.isTyping ? { ...msg, isTyping: false, content: msg.content + '\n\n*Response stopped by user*' } : msg
    ));
  };

  const handleCreateStrategy = async (strategy: Omit<TradingStrategy, 'id'>) => {
    if (!user) {
      console.error('No user found');
      alert('You must be logged in to create strategies');
      return;
    }

    try {
      console.log('Creating AI-generated strategy:', strategy);
      
      // Insert strategy into Supabase database
      const { data, error } = await supabase
        .from('trading_strategies')
        .insert([
          {
            user_id: user.id,
            name: strategy.name,
            type: strategy.type,
            description: strategy.description,
            risk_level: strategy.risk_level,
            min_capital: strategy.min_capital,
            is_active: strategy.is_active,
            configuration: strategy.configuration,
            performance: strategy.performance || null,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving strategy:', error);
        alert(`Failed to save strategy: ${error.message}`);
        return;
      }

      console.log('Strategy saved successfully:', data);
      
      // Add the new strategy to local state with the returned ID
      const newStrategy: TradingStrategy = {
        id: data.id,
        name: data.name,
        type: data.type,
        description: data.description,
        risk_level: data.risk_level,
        min_capital: data.min_capital,
        is_active: data.is_active,
        configuration: data.configuration,
        performance: data.performance,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setStrategies([...strategies, newStrategy]);
      
      // Close modal
      setShowStrategyModal(false);
      setPendingStrategy(null);
      
      // Add confirmation message to chat
      const confirmationMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Strategy Created Successfully!**\n\nYour "${strategy.name}" strategy has been saved to your database and added to your Strategies page. You can now configure and activate it from the Strategies section.`,
        timestamp: new Date(),
        isTyping: false,
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      
      // Show success message
      alert('Strategy created and saved successfully! Check your Strategies page.');
      
    } catch (error) {
      console.error('Error creating strategy:', error);
      alert('An unexpected error occurred while saving the strategy. Please try again.');
    }
  };

  const createNewChat = () => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Chat',
      timestamp: new Date(),
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: "Hello! I'm Brokernomex AI, your trading strategy assistant. I can help you understand different trading strategies, analyze market conditions, and guide you through creating automated trading bots. What would you like to know about trading strategies?",
          timestamp: new Date(),
        },
      ],
    };
    
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setSessionTokensUsed(0);
  };

  const switchToSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Calculate session tokens
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      // This would be calculated from stored token usage per session
      setSessionTokensUsed(0); // Reset for now
    }
  };

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
        setTotalTokensUsed(prev => prev + result.usage.total_tokens);
        setSessionTokensUsed(prev => prev + result.usage.total_tokens);
      }
      if (result.model) {
        setLastResponseModel(result.model);
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

      // After a short delay, mark the message as no longer typing
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id ? { ...msg, isTyping: false } : msg
        ));
      }, result.message.length * 20 + 500); // Match typing speed + buffer
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

  const checkForStrategyCreation = (userMessage: string, aiResponse: string) => {
    const userLower = userMessage.toLowerCase();
    const aiLower = aiResponse.toLowerCase();
    
    // Strategy creation keywords
    const creationKeywords = [
      'create', 'build', 'set up', 'design', 'make', 'generate', 'develop'
    ];
    
    // Strategy type keywords
    const strategyKeywords = [
      'strategy', 'bot', 'covered call', 'iron condor', 'straddle', 'wheel',
      'grid', 'dca', 'rebalance', 'momentum', 'pairs trading'
    ];
    
    // Check if user message contains creation intent
    const hasCreationIntent = creationKeywords.some(keyword => userLower.includes(keyword));
    const hasStrategyKeyword = strategyKeywords.some(keyword => userLower.includes(keyword));
    
    if (!hasCreationIntent || !hasStrategyKeyword) {
      return null;
    }
    
    console.log('Strategy creation detected in user message:', userMessage);
    
    // Extract strategy details from user message and AI response
    let strategyType: TradingStrategy['type'] = 'covered_calls'; // default
    let riskLevel: TradingStrategy['risk_level'] = 'medium'; // default
    let minCapital = 10000; // default
    let symbol = 'AAPL'; // default
    
    // Detect strategy type
    if (userLower.includes('covered call')) strategyType = 'covered_calls';
    else if (userLower.includes('iron condor')) strategyType = 'iron_condor';
    else if (userLower.includes('straddle')) strategyType = 'straddle';
    else if (userLower.includes('wheel')) strategyType = 'wheel';
    else if (userLower.includes('grid')) strategyType = 'spot_grid';
    else if (userLower.includes('dca')) strategyType = 'dca';
    else if (userLower.includes('rebalance')) strategyType = 'smart_rebalance';
    
    // Detect risk level
    if (userLower.includes('conservative') || userLower.includes('low risk')) riskLevel = 'low';
    else if (userLower.includes('aggressive') || userLower.includes('high risk')) riskLevel = 'high';
    
    // Extract capital amount
    const capitalMatch = userMessage.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)[kK]?/);
    if (capitalMatch) {
      let amount = parseFloat(capitalMatch[1].replace(/,/g, ''));
      if (userMessage.toLowerCase().includes('k')) {
        amount *= 1000;
      }
      minCapital = amount;
    }
    
    // Extract symbol
    const symbolMatch = userMessage.match(/\b([A-Z]{2,5})\b/);
    if (symbolMatch) {
      symbol = symbolMatch[1];
    }
    
    // Generate strategy name
    const strategyName = `AI ${strategyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${symbol}`;
    
    return {
      name: strategyName,
      type: strategyType,
      description: `AI-generated ${strategyType.replace('_', ' ')} strategy for ${symbol} based on your requirements.`,
      risk_level: riskLevel,
      min_capital: minCapital,
      configuration: {
        symbol: symbol,
        // Add default configuration based on strategy type
        ...(strategyType === 'covered_calls' && {
          strike_delta: 0.30,
          dte_target: 30,
          profit_target: 0.5,
        }),
        ...(strategyType === 'iron_condor' && {
          wing_width: 10,
          dte_target: 45,
          profit_target: 0.25,
        }),
        ...(strategyType === 'spot_grid' && {
          price_range_lower: 0,
          price_range_upper: 0,
          number_of_grids: 25,
          grid_spacing_percent: 1.0,
        }),
        ...(strategyType === 'dca' && {
          investment_amount_per_interval: 100,
          frequency: 'daily',
          investment_target_percent: 20,
        }),
      },
      reasoning: `This strategy was created based on your request: "${userMessage}". The AI analyzed your requirements and configured the strategy with appropriate parameters for your risk level and capital amount.`,
    };
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
              <h1 className="text-2xl font-bold text-white">BrokerNomics Ai</h1>
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
          
          {/* Suggested Questions */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Suggested Questions</h3>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.slice(0, 3).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-2 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
          
          {/* AI Actions */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">AI Actions</h3>
            <div className="flex flex-wrap gap-2">
              {actionablePrompts.slice(0, 2).map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(prompt)}
                  className="px-3 py-2 bg-gradient-to-r from-blue-900/20 to-purple-900/20 hover:from-blue-800/30 hover:to-purple-800/30 rounded-lg text-sm text-blue-200 hover:text-blue-100 transition-all duration-200 border border-blue-500/20 hover:border-blue-400/40"
                >
                  {prompt.length > 50 ? `${prompt.substring(0, 50)}...` : prompt}
                </button>
              ))}
            </div>
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
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.role === 'assistant' && message.isTyping ? (
                          <TypingText 
                            text={message.content}
                            isMarkdown={true}
                            onComplete={() => {
                              setMessages(prev => prev.map(msg => 
                                msg.id === message.id ? { ...msg, isTyping: false } : msg
                              ));
                            }}
                          />
                        ) : (
                          message.role === 'assistant' ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={MarkdownComponents}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            message.content
                          )
                        )}
                      </p>
                    </div>
                    <p className={`text-sm text-gray-300 mt-2 font-medium ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
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
                onClick={isLoading ? stopResponse : undefined}
              >
                {isLoading ? (
                  <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-sm"></div>
                  </div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-sm text-gray-300 mt-3 text-center font-medium">
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
        handleSuggestedQuestion={handleSuggestedQuestion}
        totalTokensUsed={totalTokensUsed}
        sessionTokensUsed={sessionTokensUsed}
        lastResponseModel={lastResponseModel}
        chatSessions={chatSessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewChat}
        onSwitchSession={switchToSession}
      />

      {/* Strategy Creation Modal */}
      {showStrategyModal && pendingStrategy && (
        <StrategyCreationModal
          onClose={() => {
            setShowStrategyModal(false);
            setPendingStrategy(null);
          }}
          onCreateStrategy={handleCreateStrategy}
          strategyData={pendingStrategy}
        />
      )}
    </motion.div>
  );
}