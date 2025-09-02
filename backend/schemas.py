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

# Nested models for JSONB fields
class CapitalAllocation(BaseModel):
    mode: Optional[str] = None # 'fixed_amount_usd' | 'percent_of_portfolio'
    value: Optional[float] = None
    max_positions: Optional[int] = None
    max_exposure_usd: Optional[float] = None

class PositionSizing(BaseModel):
    mode: Optional[str] = None # 'fixed_units' | 'percent_equity' | 'volatility_target'
    value: Optional[float] = None

class TradeWindow(BaseModel):
    enabled: Optional[bool] = None
    start_time: Optional[str] = None # "HH:MM"
    end_time: Optional[str] = None # "HH:MM"
    days_of_week: Optional[List[int]] = None # 0=Sunday, 1=Monday, ..., 6=Saturday

class OrderExecution(BaseModel):
    order_type_default: Optional[str] = None # 'market' | 'limit' | 'limit_if_touched'
    limit_tolerance_percent: Optional[float] = None
    allow_partial_fill: Optional[bool] = None
    combo_execution: Optional[str] = None # 'atomic' | 'legged'

class RiskControls(BaseModel):
    take_profit_percent: Optional[float] = None
    take_profit_usd: Optional[float] = None
    stop_loss_percent: Optional[float] = None
    stop_loss_usd: Optional[float] = None
    max_daily_loss_usd: Optional[float] = None
    max_drawdown_percent: Optional[float] = None
    pause_on_event_flags: Optional[List[str]] = None # e.g., ['earnings', 'FOMC']

class DataFilters(BaseModel):
    min_liquidity: Optional[float] = None
    max_bid_ask_spread_pct: Optional[float] = None
    iv_rank_threshold: Optional[float] = None
    min_open_interest: Optional[float] = None

class Notifications(BaseModel):
    email_alerts: Optional[bool] = None
    push_notifications: Optional[bool] = None
    webhook_url: Optional[str] = None

class BacktestParams(BaseModel):
    slippage: Optional[float] = None
    commission: Optional[float] = None

class PerformanceMetrics(BaseModel):
    total_return: Optional[float] = None
    win_rate: Optional[float] = None
    max_drawdown: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    total_trades: Optional[int] = None
    avg_trade_duration: Optional[float] = None
    volatility: Optional[float] = None
    standard_deviation: Optional[float] = None
    beta: Optional[float] = None
    alpha: Optional[float] = None
    value_at_risk: Optional[float] = None

# Main Strategy Models
class TradingStrategyBase(BaseModel):
    name: str
    type: str # This should map to the strategy_type enum in DB
    description: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.MEDIUM
    skill_level: SkillLevel = SkillLevel.BEGINNER
    min_capital: float = 0.0
    is_active: bool = False

    # Universal Bot Fields
    account_id: Optional[str] = None
    asset_class: Optional[AssetClass] = None
    base_symbol: Optional[str] = None
    quote_currency: Optional[str] = None
    time_horizon: Optional[TimeHorizon] = None
    automation_level: Optional[AutomationLevel] = None

    capital_allocation: Optional[CapitalAllocation] = Field(default_factory=CapitalAllocation)
    position_sizing: Optional[PositionSizing] = Field(default_factory=PositionSizing)
    trade_window: Optional[TradeWindow] = Field(default_factory=TradeWindow)
    order_execution: Optional[OrderExecution] = Field(default_factory=OrderExecution)
    risk_controls: Optional[RiskControls] = Field(default_factory=RiskControls)
    data_filters: Optional[DataFilters] = Field(default_factory=DataFilters)
    notifications: Optional[Notifications] = Field(default_factory=Notifications)

    backtest_mode: Optional[BacktestMode] = None
    backtest_params: Optional[BacktestParams] = Field(default_factory=BacktestParams)
    telemetry_id: Optional[str] = None

    # Strategy-specific configuration (still a generic JSONB)
    configuration: Dict[str, Any] = Field(default_factory=dict)

    performance: Optional[PerformanceMetrics] = None

class TradingStrategyCreate(TradingStrategyBase):
    pass

class TradingStrategyUpdate(TradingStrategyBase):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    skill_level: Optional[SkillLevel] = None
    min_capital: Optional[float] = None
    is_active: Optional[bool] = None

    # All universal fields and nested models are optional for update
    account_id: Optional[str] = None
    asset_class: Optional[AssetClass] = None
    base_symbol: Optional[str] = None
    quote_currency: Optional[str] = None
    time_horizon: Optional[TimeHorizon] = None
    automation_level: Optional[AutomationLevel] = None

    capital_allocation: Optional[CapitalAllocation] = None
    position_sizing: Optional[PositionSizing] = None
    trade_window: Optional[TradeWindow] = None
    order_execution: Optional[OrderExecution] = None
    risk_controls: Optional[RiskControls] = None
    data_filters: Optional[DataFilters] = None
    notifications: Optional[Notifications] = None

    backtest_mode: Optional[BacktestMode] = None
    backtest_params: Optional[BacktestParams] = None
    telemetry_id: Optional[str] = None

    configuration: Optional[Dict[str, Any]] = None
    performance: Optional[PerformanceMetrics] = None


class TradingStrategyResponse(TradingStrategyBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # For Pydantic v2, use from_attributes=True instead of orm_mode=True