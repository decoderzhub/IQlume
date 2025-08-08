import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, TrendingUp, Target, Info, Clock, Coins } from 'lucide-react';
import { Card } from '../ui/Card';

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface AIChatSidebarProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  lastResponseTokens: TokenUsage | null;
  lastResponseModel: string | null;
}

const anthropicModels = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    description: 'Most intelligent model for complex tasks',
    badge: 'latest',
    recommended: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    description: 'Fastest model for daily tasks',
    badge: 'latest',
    recommended: false,
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus',
    description: 'Powerful model for complex challenges',
    badge: null,
    recommended: false,
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'claude-3-sonnet-20240229',
    label: 'Claude 3 Sonnet',
    description: 'Smart, efficient model for everyday use',
    badge: null,
    recommended: false,
  },
];

const chatTips = [
  {
    icon: TrendingUp,
    title: 'Strategy Creation',
    tip: 'Ask me to "Create a covered calls strategy for AAPL with $30K capital" for specific configurations.',
  },
  {
    icon: Target,
    title: 'Risk Analysis',
    tip: 'Request risk assessments like "What are the risks of iron condor strategies in volatile markets?"',
  },
  {
    icon: Brain,
    title: 'Market Insights',
    tip: 'Get market analysis with "Analyze current market conditions for options trading".',
  },
  {
    icon: Zap,
    title: 'Quick Actions',
    tip: 'Use action prompts like "Build me a DCA bot for ETH" for immediate strategy creation.',
  },
];

export function AIChatSidebar({ 
  selectedModel, 
  setSelectedModel, 
  lastResponseTokens, 
  lastResponseModel 
}: AIChatSidebarProps) {
  return (
    <div className="w-80 flex-shrink-0 space-y-6">
      {/* Model Selection */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">AI Model</h3>
        </div>
        
        <div className="space-y-2">
          {anthropicModels.map((model) => (
            <motion.div
              key={model.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedModel(model.name)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedModel === model.name
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedModel === model.name ? 'bg-blue-500' : 'bg-gray-500'
                  }`} />
                  <span className="font-medium text-white text-sm">{model.label}</span>
                </div>
                <div className="flex gap-1">
                  {model.badge && (
                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                      {model.badge}
                    </span>
                  )}
                  {model.recommended && (
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                      recommended
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{model.description}</p>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Token Usage */}
      {lastResponseTokens && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-white">Token Usage</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Input Tokens:</span>
              <span className="text-sm font-medium text-white">
                {lastResponseTokens.input_tokens.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Output Tokens:</span>
              <span className="text-sm font-medium text-white">
                {lastResponseTokens.output_tokens.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-700">
              <span className="text-sm font-medium text-gray-300">Total:</span>
              <span className="text-sm font-bold text-yellow-400">
                {lastResponseTokens.total_tokens.toLocaleString()}
              </span>
            </div>
            {lastResponseModel && (
              <div className="pt-2 border-t border-gray-700">
                <span className="text-xs text-gray-500">Model: {lastResponseModel}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Chat Tips */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Chat Tips</h3>
        </div>
        
        <div className="space-y-4">
          {chatTips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div key={index} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">{tip.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{tip.tip}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Performance Tips */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-white">Performance</h3>
        </div>
        
        <div className="space-y-3 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Sonnet 3.5: Best for complex analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span>Haiku 3.5: Fastest responses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span>Opus 3: Most creative solutions</span>
          </div>
        </div>
      </Card>
    </div>
  );
}