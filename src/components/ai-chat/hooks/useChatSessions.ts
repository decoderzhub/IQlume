import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { User } from '../../../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export function useChatSessions(user: User | null) {
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  const [sessionTokensUsed, setSessionTokensUsed] = useState(0);
  const [lastResponseTokens, setLastResponseTokens] = useState<TokenUsage | null>(null);
  const [lastResponseModel, setLastResponseModel] = useState<string | null>(null);

  const currentSession = chatSessions.find(session => session.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const setMessages = (updater: React.SetStateAction<ChatMessage[]>) => {
    setChatSessions(prev => prev.map(session => 
      session.id === currentSessionId 
        ? { ...session, messages: typeof updater === 'function' ? updater(session.messages) : updater }
        : session
    ));
  };

  // Generate a smart title from the user's first message
  const generateChatTitle = (firstMessage: string): string => {
    const message = firstMessage.toLowerCase();
    
    // Strategy-related titles
    if (message.includes('covered call')) return 'Covered Calls Discussion';
    if (message.includes('iron condor')) return 'Iron Condor Strategy';
    if (message.includes('straddle')) return 'Straddle Strategy';
    if (message.includes('wheel')) return 'Wheel Strategy';
    if (message.includes('grid') && message.includes('bot')) return 'Grid Bot Setup';
    if (message.includes('dca')) return 'DCA Strategy';
    if (message.includes('rebalance')) return 'Portfolio Rebalancing';
    
    // General topics
    if (message.includes('risk')) return 'Risk Management';
    if (message.includes('portfolio')) return 'Portfolio Discussion';
    if (message.includes('options')) return 'Options Trading';
    if (message.includes('crypto')) return 'Crypto Trading';
    if (message.includes('beginner')) return 'Beginner Trading Help';
    
    // Extract key words for generic title
    const words = firstMessage.split(' ').slice(0, 4);
    const title = words.join(' ');
    
    return title.length > 30 ? title.substring(0, 30) + '...' : title;
  };

  const createDefaultSession = async () => {
    if (!user) return;
    
    try {
      // Create default session in database
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          title: 'Trading Strategy Help',
        }])
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating default session:', sessionError);
        return;
      }

      // Create welcome message
      const welcomeContent = "Hello! I'm Brokernomex AI, your trading strategy assistant. I can help you understand different trading strategies, analyze market conditions, and guide you through creating automated trading bots. What would you like to know about trading strategies?";
      
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert([{
          session_id: session.id,
          role: 'assistant',
          content: welcomeContent,
        }]);

      if (messageError) {
        console.error('Error creating welcome message:', messageError);
      }

      // Set up local state
      const defaultSession: ChatSession = {
        id: session.id,
        title: session.title,
        timestamp: new Date(session.created_at),
        messages: [{
          id: 'welcome',
          role: 'assistant',
          content: welcomeContent,
          timestamp: new Date(),
          isTyping: false,
        }],
      };

      setChatSessions([defaultSession]);
      setCurrentSessionId(session.id);
    } catch (error) {
      console.error('Error creating default session:', error);
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    
    try {
      // Create new session in database
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          title: 'New Chat',
        }])
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating new session:', sessionError);
        return;
      }

      // Create welcome message
      const welcomeContent = "Hello! I'm Brokernomex AI, your trading strategy assistant. I can help you understand different trading strategies, analyze market conditions, and guide you through creating automated trading bots. What would you like to know about trading strategies?";
      
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert([{
          session_id: session.id,
          role: 'assistant',
          content: welcomeContent,
        }]);

      if (messageError) {
        console.error('Error creating welcome message:', messageError);
      }

      // Set up local state
      const newSession: ChatSession = {
        id: session.id,
        title: session.title,
        timestamp: new Date(session.created_at),
        messages: [{
          id: 'welcome',
          role: 'assistant',
          content: welcomeContent,
          timestamp: new Date(),
          isTyping: false,
        }],
      };
      
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(session.id);
      setSessionTokensUsed(0);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
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

  const deleteSession = async (sessionId: string) => {
    if (!user || chatSessions.length <= 1) return;
    
    try {
      // Delete from database (messages will be deleted automatically due to CASCADE)
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting session:', error);
        return;
      }

      // Update local state
      const updatedSessions = chatSessions.filter(session => session.id !== sessionId);
      setChatSessions(updatedSessions);
      
      // If we deleted the current session, switch to the first remaining session
      if (currentSessionId === sessionId && updatedSessions.length > 0) {
        setCurrentSessionId(updatedSessions[0].id);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  // Load chat history from database on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user) return;
      
      setIsLoadingHistory(true);
      try {
        // Load chat sessions
        const { data: sessions, error: sessionsError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (sessionsError) {
          console.error('Error loading chat sessions:', sessionsError);
          // Create default session if none exist
          await createDefaultSession();
          return;
        }

        if (!sessions || sessions.length === 0) {
          // Create default session if none exist
          await createDefaultSession();
          return;
        }

        // Load messages for each session
        const sessionsWithMessages: ChatSession[] = [];
        
        for (const session of sessions) {
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.error('Error loading messages for session:', session.id, messagesError);
            continue;
          }

          const chatMessages: ChatMessage[] = (messages || []).map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            isTyping: false,
          }));

          sessionsWithMessages.push({
            id: session.id,
            title: session.title,
            timestamp: new Date(session.updated_at),
            messages: chatMessages,
          });
        }

        setChatSessions(sessionsWithMessages);
        
        // Set current session to the most recent one
        if (sessionsWithMessages.length > 0) {
          setCurrentSessionId(sessionsWithMessages[0].id);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        await createDefaultSession();
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [user]);

  // Save messages to database when they change
  useEffect(() => {
    const saveMessage = async (message: ChatMessage) => {
      if (!user || !currentSessionId || message.id === 'welcome' || message.isTyping) return;
      
      try {
        console.log('💾 Saving message to database:', message.content.substring(0, 50) + '...');
        
        const { error } = await supabase
          .from('chat_messages')
          .insert([{
            session_id: currentSessionId,
            role: message.role,
            content: message.content,
            token_usage: message.role === 'assistant' && lastResponseTokens ? lastResponseTokens : null,
          }]);

        if (error) {
          console.error('Error saving message:', error);
        } else {
          console.log('✅ Message saved successfully');
          
          // Update session timestamp
          await supabase
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentSessionId);
        }
      } catch (error) {
        console.error('Error saving message:', error);
      }
    };

    // Save new messages (but not typing messages)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Save if it's a new message and not currently typing
      if (lastMessage && !lastMessage.isTyping && lastMessage.id !== 'welcome') {
        saveMessage(lastMessage);
      }
    }
  }, [messages, user, currentSessionId, lastResponseTokens]);

  return {
    currentSessionId,
    chatSessions,
    isLoadingHistory,
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
  };
}