"""
Technical Indicators Module for Trading Strategies

This module provides calculations for various technical indicators used in trading strategies.
Includes RSI, MACD, Bollinger Bands, and other common indicators.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class TechnicalIndicators:
    """Technical indicators calculator for trading strategies"""
    
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> float:
        """
        Calculate Relative Strength Index (RSI)
        
        Args:
            prices: List of closing prices
            period: RSI calculation period (default 14)
            
        Returns:
            Current RSI value (0-100)
        """
        try:
            if len(prices) < period + 1:
                return 50.0  # Neutral RSI if insufficient data
            
            # Convert to numpy array for calculations
            price_array = np.array(prices)
            
            # Calculate price changes
            deltas = np.diff(price_array)
            
            # Separate gains and losses
            gains = np.where(deltas > 0, deltas, 0)
            losses = np.where(deltas < 0, -deltas, 0)
            
            # Calculate average gains and losses
            avg_gain = np.mean(gains[-period:])
            avg_loss = np.mean(losses[-period:])
            
            # Avoid division by zero
            if avg_loss == 0:
                return 100.0
            
            # Calculate RSI
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
            
            return float(rsi)
            
        except Exception as e:
            logger.error(f"Error calculating RSI: {e}")
            return 50.0  # Return neutral value on error
    
    @staticmethod
    def calculate_macd(prices: List[float], fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> Dict[str, float]:
        """
        Calculate MACD (Moving Average Convergence Divergence)
        
        Args:
            prices: List of closing prices
            fast_period: Fast EMA period (default 12)
            slow_period: Slow EMA period (default 26)
            signal_period: Signal line EMA period (default 9)
            
        Returns:
            Dictionary with macd, signal, and histogram values
        """
        try:
            if len(prices) < slow_period + signal_period:
                return {"macd": 0.0, "signal": 0.0, "histogram": 0.0}
            
            # Convert to pandas Series for EMA calculation
            price_series = pd.Series(prices)
            
            # Calculate EMAs
            ema_fast = price_series.ewm(span=fast_period).mean()
            ema_slow = price_series.ewm(span=slow_period).mean()
            
            # Calculate MACD line
            macd_line = ema_fast - ema_slow
            
            # Calculate signal line
            signal_line = macd_line.ewm(span=signal_period).mean()
            
            # Calculate histogram
            histogram = macd_line - signal_line
            
            return {
                "macd": float(macd_line.iloc[-1]),
                "signal": float(signal_line.iloc[-1]),
                "histogram": float(histogram.iloc[-1])
            }
            
        except Exception as e:
            logger.error(f"Error calculating MACD: {e}")
            return {"macd": 0.0, "signal": 0.0, "histogram": 0.0}
    
    @staticmethod
    def calculate_bollinger_bands(prices: List[float], period: int = 20, std_dev: float = 2.0) -> Dict[str, float]:
        """
        Calculate Bollinger Bands
        
        Args:
            prices: List of closing prices
            period: Moving average period (default 20)
            std_dev: Standard deviation multiplier (default 2.0)
            
        Returns:
            Dictionary with upper, middle, and lower band values
        """
        try:
            if len(prices) < period:
                current_price = prices[-1] if prices else 0
                return {
                    "upper": current_price * 1.02,
                    "middle": current_price,
                    "lower": current_price * 0.98
                }
            
            # Convert to pandas Series
            price_series = pd.Series(prices)
            
            # Calculate moving average (middle band)
            middle_band = price_series.rolling(window=period).mean()
            
            # Calculate standard deviation
            std = price_series.rolling(window=period).std()
            
            # Calculate upper and lower bands
            upper_band = middle_band + (std * std_dev)
            lower_band = middle_band - (std * std_dev)
            
            return {
                "upper": float(upper_band.iloc[-1]),
                "middle": float(middle_band.iloc[-1]),
                "lower": float(lower_band.iloc[-1])
            }
            
        except Exception as e:
            logger.error(f"Error calculating Bollinger Bands: {e}")
            current_price = prices[-1] if prices else 0
            return {
                "upper": current_price * 1.02,
                "middle": current_price,
                "lower": current_price * 0.98
            }
    
    @staticmethod
    def check_indicator_signals(
        prices: List[float], 
        indicators_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check all configured technical indicators for buy/sell signals
        
        Args:
            prices: List of recent closing prices
            indicators_config: Configuration for technical indicators
            
        Returns:
            Dictionary with indicator values and signals
        """
        signals = {
            "buy_signal": False,
            "sell_signal": False,
            "neutral_signal": True,
            "indicator_values": {}
        }
        
        try:
            # RSI signals
            if indicators_config.get("rsi", {}).get("enabled", False):
                rsi_config = indicators_config["rsi"]
                rsi_value = TechnicalIndicators.calculate_rsi(
                    prices, 
                    period=rsi_config.get("period", 14)
                )
                
                signals["indicator_values"]["rsi"] = rsi_value
                
                buy_threshold = rsi_config.get("buy_threshold", 30)
                sell_threshold = rsi_config.get("sell_threshold", 70)
                
                if rsi_value <= buy_threshold:
                    signals["buy_signal"] = True
                    signals["neutral_signal"] = False
                elif rsi_value >= sell_threshold:
                    signals["sell_signal"] = True
                    signals["neutral_signal"] = False
            
            # MACD signals
            if indicators_config.get("macd", {}).get("enabled", False):
                macd_config = indicators_config["macd"]
                macd_data = TechnicalIndicators.calculate_macd(
                    prices,
                    fast_period=macd_config.get("additional_params", {}).get("fast_period", 12),
                    slow_period=macd_config.get("additional_params", {}).get("slow_period", 26),
                    signal_period=macd_config.get("additional_params", {}).get("signal_period", 9)
                )
                
                signals["indicator_values"]["macd"] = macd_data
                
                # MACD bullish crossover (MACD line crosses above signal line)
                if macd_data["histogram"] > 0 and macd_data["macd"] > macd_data["signal"]:
                    signals["buy_signal"] = True
                    signals["neutral_signal"] = False
                # MACD bearish crossover (MACD line crosses below signal line)
                elif macd_data["histogram"] < 0 and macd_data["macd"] < macd_data["signal"]:
                    signals["sell_signal"] = True
                    signals["neutral_signal"] = False
            
            # Bollinger Bands signals
            if indicators_config.get("bollinger_bands", {}).get("enabled", False):
                bb_config = indicators_config["bollinger_bands"]
                bb_data = TechnicalIndicators.calculate_bollinger_bands(
                    prices,
                    period=bb_config.get("period", 20),
                    std_dev=bb_config.get("additional_params", {}).get("std_dev", 2.0)
                )
                
                signals["indicator_values"]["bollinger_bands"] = bb_data
                
                current_price = prices[-1] if prices else 0
                
                # Price near lower band = buy signal
                if current_price <= bb_data["lower"] * 1.01:  # Within 1% of lower band
                    signals["buy_signal"] = True
                    signals["neutral_signal"] = False
                # Price near upper band = sell signal
                elif current_price >= bb_data["upper"] * 0.99:  # Within 1% of upper band
                    signals["sell_signal"] = True
                    signals["neutral_signal"] = False
            
            logger.info(f"📊 Technical indicator signals: {signals}")
            return signals
            
        except Exception as e:
            logger.error(f"Error checking indicator signals: {e}")
            return signals

def get_recent_prices(symbol: str, period: int = 50) -> List[float]:
    """
    Get recent price data for technical indicator calculations
    
    Args:
        symbol: Trading symbol (e.g., "BTC/USD")
        period: Number of recent prices to fetch
        
    Returns:
        List of recent closing prices
    """
    try:
        # In production, this would fetch from your data provider
        # For now, generate mock price data based on symbol
        base_price = 50000 if "BTC" in symbol.upper() else 150
        
        # Generate realistic price movement
        prices = []
        current_price = base_price
        
        for i in range(period):
            # Random walk with slight upward bias
            change_percent = np.random.normal(0.001, 0.02)  # 0.1% average gain, 2% volatility
            current_price *= (1 + change_percent)
            prices.append(current_price)
        
        return prices
        
    except Exception as e:
        logger.error(f"Error generating price data for {symbol}: {e}")
        return [50000] * period  # Fallback to flat prices