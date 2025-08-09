import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { TradingStrategy, User } from '../../../types';

interface StrategyCreationData {
  name: string;
  type: TradingStrategy['type'];
  description: string;
  risk_level: TradingStrategy['risk_level'];
  min_capital: number;
  configuration: Record<string, any>;
  reasoning: string;
}

export function useStrategyCreation(user: User | null, strategies: TradingStrategy[], setStrategies: (strategies: TradingStrategy[]) => void) {
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [pendingStrategy, setPendingStrategy] = useState<StrategyCreationData | null>(null);
  const [showCreatingStatus, setShowCreatingStatus] = useState(false);
  const [creationStatusText, setCreationStatusText] = useState('');

  const checkForStrategyCreation = (userMessage: string, aiResponse: string): StrategyCreationData | null => {
    const userLower = userMessage.toLowerCase();
    
    console.log('🔍 Checking for strategy creation...');
    console.log('User message:', userMessage);
    console.log('AI response preview:', aiResponse.substring(0, 200) + '...');
    
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
    
    console.log('Has creation intent:', hasCreationIntent);
    console.log('Has strategy keyword:', hasStrategyKeyword);
    
    if (!hasCreationIntent || !hasStrategyKeyword) {
      console.log('❌ No strategy creation detected');
      return null;
    }
    
    console.log('✅ Strategy creation detected!');
    
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
    
    console.log('Extracted strategy details:', {
      strategyType,
      riskLevel,
      minCapital,
      symbol
    });
    
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

  const handleCreateStrategy = async (strategy: Omit<TradingStrategy, 'id'>) => {
    if (!user) {
      console.error('No user found');
      alert('You must be logged in to create strategies');
      return;
    }

    // Show creation status
    setShowCreatingStatus(true);
    setCreationStatusText('Creating your trading strategy...');
    
    try {
      console.log('Creating AI-generated strategy:', strategy);
      
      // Update status
      setCreationStatusText('Saving to database...');
      
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
        setShowCreatingStatus(false);
        alert(`Failed to save strategy: ${error.message}`);
        return;
      }

      console.log('Strategy saved successfully:', data);
      
      // Update status
      setCreationStatusText('Strategy created successfully!');
      
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
      
      // Show success status briefly
      setTimeout(() => {
        setShowCreatingStatus(false);
      }, 2000);
      
      return newStrategy;
      
    } catch (error) {
      console.error('Error creating strategy:', error);
      setShowCreatingStatus(false);
      alert('An unexpected error occurred while saving the strategy. Please try again.');
    }
  };

  return {
    showStrategyModal,
    setShowStrategyModal,
    pendingStrategy,
    setPendingStrategy,
    showCreatingStatus,
    creationStatusText,
    checkForStrategyCreation,
    handleCreateStrategy,
  };
}