# backend/schemas.py
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

# Enums for new fields
class AssetClass(str, Enum):
    EQUITY = "equity"
    OPTIONS = "options"
    CRYPTO = "crypto"
    FUTURES = "futures"
    FOREX = "forex"

class TimeHorizon(str, Enum):
    INTRADAY = "intraday"
    SWING = "swing"
    LONG_TERM = "long_term"

class AutomationLevel(str, Enum):
    FULLY_AUTO = "fully_auto"
    SEMI_AUTO = "semi_auto"
    MANUAL = "manual"

class BacktestMode(str, Enum):
    PAPER = "paper"
    SIM = "sim"
    LIVE = "live"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    MODERATE = "moderate"
    ADVANCED = "advanced"

# Simplified strategy models that match frontend expectations
class TradingStrategyBase(BaseModel):
    name: str
    type: str  # This should map to the strategy_type enum in DB
    description: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.MEDIUM
    min_capital: float = 0.0
    is_active: bool = False

    # Universal Bot Fields - simplified to match frontend
    account_id: Optional[str] = None
    asset_class: Optional[AssetClass] = None
    base_symbol: Optional[str] = None
    quote_currency: Optional[str] = None
    time_horizon: Optional[TimeHorizon] = None
    automation_level: Optional[AutomationLevel] = None

    # JSONB fields as simple dictionaries (not nested Pydantic models)
    capital_allocation: Optional[Dict[str, Any]] = Field(default_factory=dict)
    position_sizing: Optional[Dict[str, Any]] = Field(default_factory=dict)
    trade_window: Optional[Dict[str, Any]] = Field(default_factory=dict)
    order_execution: Optional[Dict[str, Any]] = Field(default_factory=dict)
    risk_controls: Optional[Dict[str, Any]] = Field(default_factory=dict)
    data_filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    notifications: Optional[Dict[str, Any]] = Field(default_factory=dict)

    backtest_mode: Optional[BacktestMode] = None
    backtest_params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    telemetry_id: Optional[str] = None

    # Strategy-specific configuration
    configuration: Dict[str, Any] = Field(default_factory=dict)

    performance: Optional[Dict[str, Any]] = None

class TradingStrategyCreate(TradingStrategyBase):
    pass

class TradingStrategyUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    min_capital: Optional[float] = None
    is_active: Optional[bool] = None

    # All universal fields are optional for update
    account_id: Optional[str] = None
    asset_class: Optional[AssetClass] = None
    base_symbol: Optional[str] = None
    quote_currency: Optional[str] = None
    time_horizon: Optional[TimeHorizon] = None
    automation_level: Optional[AutomationLevel] = None

    capital_allocation: Optional[Dict[str, Any]] = None
    position_sizing: Optional[Dict[str, Any]] = None
    trade_window: Optional[Dict[str, Any]] = None
    order_execution: Optional[Dict[str, Any]] = None
    risk_controls: Optional[Dict[str, Any]] = None
    data_filters: Optional[Dict[str, Any]] = None
    notifications: Optional[Dict[str, Any]] = None

    backtest_mode: Optional[BacktestMode] = None
    backtest_params: Optional[Dict[str, Any]] = None
    telemetry_id: Optional[str] = None

    configuration: Optional[Dict[str, Any]] = None
    performance: Optional[Dict[str, Any]] = None

class TradingStrategyResponse(TradingStrategyBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True