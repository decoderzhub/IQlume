import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatMessageProps {
  message: ChatMessage;
  onTypingComplete?: () => void;
}

// Custom markdown components for better styling
const MarkdownComponents = {
  h1: ({ children }: any) => <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-white">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base sm:text-xl font-semibold mb-2 sm:mb-3 text-white">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm sm:text-lg font-medium mb-2 text-white">{children}</h3>,
  p: ({ children }: any) => <p className="mb-2 sm:mb-3 leading-relaxed text-sm sm:text-base">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 sm:mb-3 space-y-1 text-sm sm:text-base">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 sm:mb-3 space-y-1 text-sm sm:text-base">{children}</ol>,
  li: ({ children }: any) => <li className="ml-2 text-sm sm:text-base">{children}</li>,
  code: ({ inline, children, ...props }: any) => 
    inline ? (
      <code className="bg-black/30 px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono text-blue-200" {...props}>
        {children}
      </code>
    ) : (
      <code className="block bg-black/50 p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-mono overflow-x-auto mb-2 sm:mb-3" {...props}>
        {children}
      </code>
    ),
  pre: ({ children }: any) => <pre className="bg-black/50 p-2 sm:p-3 rounded-lg overflow-x-auto mb-2 sm:mb-3 text-xs sm:text-sm">{children}</pre>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-400 pl-3 sm:pl-4 italic mb-2 sm:mb-3 text-gray-200 text-sm sm:text-base">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-2 sm:mb-3">
      <table className="min-w-full border border-gray-600 rounded-lg">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-gray-800">{children}</thead>,
  tbody: ({ children }: any) => <tbody>{children}</tbody>,
  tr: ({ children }: any) => <tr className="border-b border-gray-600">{children}</tr>,
  th: ({ children }: any) => <th className="px-2 sm:px-3 py-1 sm:py-2 text-left font-medium text-white text-xs sm:text-sm">{children}</th>,
  td: ({ children }: any) => <td className="px-2 sm:px-3 py-1 sm:py-2 text-gray-200 text-xs sm:text-sm">{children}</td>,
  strong: ({ children }: any) => <strong className="font-semibold text-white text-sm sm:text-base">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-gray-200 text-sm sm:text-base">{children}</em>,
  a: ({ children, href, ...props }: any) => (
    <a 
      href={href} 
      className="text-blue-400 hover:text-blue-300 underline text-sm sm:text-base" 
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
  const [displayedText, setDisplayedText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 4); // 4ms delay for smooth typing

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

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function ChatMessage({ message, onTypingComplete }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {message.role === 'assistant' && (
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-[85%] sm:max-w-[70%] ${message.role === 'user' ? 'order-first' : ''}`}>
        <div
          className={`p-4 rounded-2xl ${
            message.role === 'user'
              ? 'bg-gray-800/50 text-gray-100 ml-auto max-w-[90%] sm:max-w-full'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white max-w-[95%] sm:max-w-full'
          }`}
        >
          <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
            {message.role === 'assistant' && message.isTyping ? (
              <TypingText 
                text={message.content}
                isMarkdown={true}
                onComplete={onTypingComplete}
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
          </div>
        </div>
        <p className={`text-xs sm:text-sm text-gray-300 mt-2 font-medium ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>

      {message.role === 'user' && (
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
        </div>
      )}
    </motion.div>
  );
}