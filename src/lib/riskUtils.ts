import { TradingStrategy } from '../types';

/**
 * Determines the risk level of a trading strategy based on its performance metrics
 * Uses a composite scoring system considering multiple risk factors
 */
export function determineRiskLevel(performance: TradingStrategy['performance']): 'low' | 'medium' | 'high' {
  if (!performance) return 'medium';

  let riskScore = 0;
  let factorsConsidered = 0;

  // Volatility scoring (0-3 points, higher volatility = higher risk)
  if (performance.volatility !== undefined) {
    if (performance.volatility < 0.15) riskScore += 0; // Low volatility
    else if (performance.volatility < 0.30) riskScore += 1.5; // Medium volatility
    else riskScore += 3; // High volatility
    factorsConsidered++;
  }

  // Standard Deviation scoring (0-3 points, higher std dev = higher risk)
  if (performance.standard_deviation !== undefined) {
    if (performance.standard_deviation < 0.10) riskScore += 0;
    else if (performance.standard_deviation < 0.25) riskScore += 1.5;
    else riskScore += 3;
    factorsConsidered++;
  }

  // Beta scoring (0-3 points, higher beta = higher systematic risk)
  if (performance.beta !== undefined) {
    if (performance.beta < 0.8) riskScore += 0; // Low market correlation
    else if (performance.beta < 1.2) riskScore += 1; // Market-like correlation
    else riskScore += 2.5; // High market correlation
    factorsConsidered++;
  }

  // Sharpe Ratio scoring (0-3 points, lower Sharpe = higher risk)
  if (performance.sharpe_ratio !== undefined) {
    if (performance.sharpe_ratio > 1.5) riskScore += 0; // Excellent risk-adjusted return
    else if (performance.sharpe_ratio > 0.8) riskScore += 1; // Good risk-adjusted return
    else if (performance.sharpe_ratio > 0.3) riskScore += 2; // Fair risk-adjusted return
    else riskScore += 3; // Poor risk-adjusted return
    factorsConsidered++;
  }

  // Value at Risk scoring (0-3 points, higher VaR = higher risk)
  if (performance.value_at_risk !== undefined) {
    const varPercent = Math.abs(performance.value_at_risk); // VaR is typically negative
    if (varPercent < 0.02) riskScore += 0; // Low potential loss
    else if (varPercent < 0.05) riskScore += 1.5; // Medium potential loss
    else riskScore += 3; // High potential loss
    factorsConsidered++;
  }

  // Max Drawdown scoring (0-2 points, higher drawdown = higher risk)
  if (performance.max_drawdown !== undefined) {
    const drawdownPercent = Math.abs(performance.max_drawdown);
    if (drawdownPercent < 0.05) riskScore += 0; // Low drawdown
    else if (drawdownPercent < 0.15) riskScore += 1; // Medium drawdown
    else riskScore += 2; // High drawdown
    factorsConsidered++;
  }

  // Alpha scoring (bonus/penalty, -1 to +1 points)
  if (performance.alpha !== undefined) {
    if (performance.alpha > 0.05) riskScore -= 0.5; // Positive alpha reduces risk score
    else if (performance.alpha < -0.05) riskScore += 0.5; // Negative alpha increases risk score
    factorsConsidered++;
  }

  // Calculate average risk score
  const averageRiskScore = factorsConsidered > 0 ? riskScore / factorsConsidered : 1.5;

  // Determine risk level based on average score
  if (averageRiskScore < 1.0) return 'low';
  else if (averageRiskScore < 2.0) return 'medium';
  else return 'high';
}

/**
 * Generates realistic risk metrics for backtesting simulation
 * Based on strategy type and market conditions
 */
export function generateRiskMetrics(
  strategyType: TradingStrategy['type'],
  totalReturn: number,
  maxDrawdown: number,
  winRate: number
): {
  volatility: number;
  standard_deviation: number;
  beta: number;
  alpha: number;
  sharpe_ratio: number;
  value_at_risk: number;
} {
  // Base metrics influenced by strategy type
  let baseVolatility = 0.15;
  let baseBeta = 1.0;
  let baseAlpha = 0.02;

  // Adjust base metrics by strategy type
  switch (strategyType) {
    case 'covered_calls':
    case 'wheel':
    case 'dca':
    case 'smart_rebalance':
      baseVolatility = 0.08 + Math.random() * 0.07; // 0.08-0.15
      baseBeta = 0.6 + Math.random() * 0.4; // 0.6-1.0
      baseAlpha = 0.01 + Math.random() * 0.03; // 0.01-0.04
      break;

    case 'iron_condor':
    case 'long_butterfly':
    case 'broken_wing_butterfly':
    case 'option_collar':
    case 'pairs_trading':
    case 'arbitrage':
      baseVolatility = 0.12 + Math.random() * 0.13; // 0.12-0.25
      baseBeta = 0.7 + Math.random() * 0.6; // 0.7-1.3
      baseAlpha = -0.01 + Math.random() * 0.04; // -0.01-0.03
      break;

    case 'long_call':
    case 'short_call':
    case 'long_straddle':
    case 'short_straddle':
    case 'scalping':
    case 'news_based_trading':
      baseVolatility = 0.25 + Math.random() * 0.25; // 0.25-0.50
      baseBeta = 1.2 + Math.random() * 0.8; // 1.2-2.0
      baseAlpha = -0.02 + Math.random() * 0.06; // -0.02-0.04
      break;

    default:
      baseVolatility = 0.15 + Math.random() * 0.15; // 0.15-0.30
      baseBeta = 0.8 + Math.random() * 0.8; // 0.8-1.6
      baseAlpha = 0.00 + Math.random() * 0.04; // 0.00-0.04
  }

  // Adjust metrics based on performance
  const returnAdjustment = totalReturn > 0.1 ? 0.9 : totalReturn < -0.05 ? 1.2 : 1.0;
  const drawdownAdjustment = Math.abs(maxDrawdown) > 0.15 ? 1.3 : Math.abs(maxDrawdown) < 0.05 ? 0.8 : 1.0;
  
  const volatility = baseVolatility * returnAdjustment * drawdownAdjustment;
  const standard_deviation = volatility * (0.8 + Math.random() * 0.4); // 80%-120% of volatility
  const beta = baseBeta * (0.9 + Math.random() * 0.2); // ±10% variation
  const alpha = baseAlpha * (0.5 + Math.random() * 1.0); // ±50% variation

  // Calculate Sharpe Ratio (risk-adjusted return)
  const riskFreeRate = 0.045; // 4.5% risk-free rate
  const excessReturn = totalReturn - riskFreeRate;
  const sharpe_ratio = standard_deviation > 0 ? excessReturn / standard_deviation : 0;

  // Calculate Value at Risk (95% confidence, 1-day)
  const value_at_risk = -(volatility * 1.645 + totalReturn / 252); // Negative value representing potential loss

  return {
    volatility: Math.round(volatility * 10000) / 10000, // 4 decimal places
    standard_deviation: Math.round(standard_deviation * 10000) / 10000,
    beta: Math.round(beta * 100) / 100, // 2 decimal places
    alpha: Math.round(alpha * 10000) / 10000,
    sharpe_ratio: Math.round(sharpe_ratio * 100) / 100,
    value_at_risk: Math.round(value_at_risk * 10000) / 10000,
  };
}

/**
 * Risk level thresholds for display purposes
 */
export const riskThresholds = {
  volatility: { low: 0.15, medium: 0.30 },
  sharpe_ratio: { excellent: 1.5, good: 0.8, fair: 0.3 },
  beta: { low: 0.8, high: 1.2 },
  value_at_risk: { low: 0.02, medium: 0.05 },
  max_drawdown: { low: 0.05, medium: 0.15 },
};

/**
 * Get risk level description based on metrics
 */
export function getRiskDescription(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low':
      return 'Income generation, hedged positions, limited loss potential';
    case 'medium':
      return 'Defined loss spreads, volatility-dependent, moderate directional bias';
    case 'high':
      return 'Unhedged short options, leveraged directional plays, high volatility exposure';
    default:
      return 'Risk level not determined';
  }
}