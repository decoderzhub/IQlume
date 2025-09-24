# backend/schemas.py
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

# Enhanced grid configuration models
class GridMode(str, Enum):
    ARITHMETIC = "arithmetic"
    GEOMETRIC = "geometric"

class TakeProfitLevel(BaseModel):
    percent: float = Field(..., ge=0, le=1000, description="Profit percentage target")
    quantity_percent: float = Field(..., ge=0, le=100, description="Percentage of position to close")

class TechnicalIndicatorConfig(BaseModel):
    enabled: bool = False
    period: int = 14
    buy_threshold: Optional[float] = None
    sell_threshold: Optional[float] = None
    additional_params: Dict[str, Any] = Field(default_factory=dict)

class TechnicalIndicators(BaseModel):
    rsi: TechnicalIndicatorConfig = Field(default_factory=lambda: TechnicalIndicatorConfig(
        enabled=False, period=14, buy_threshold=30, sell_threshold=70
    ))
    macd: TechnicalIndicatorConfig = Field(default_factory=lambda: TechnicalIndicatorConfig(
        enabled=False, period=12, additional_params={"fast_period": 12, "slow_period": 26, "signal_period": 9}
    ))
    bollinger_bands: TechnicalIndicatorConfig = Field(default_factory=lambda: TechnicalIndicatorConfig(
        enabled=False, period=20, additional_params={"std_dev": 2}
    ))

# Asset allocation models
class AssetAllocationItem(BaseModel):
    symbol: str = Field(..., description="Asset symbol (e.g., AAPL, BTC/USD, CASH)")
    allocation_percent: float = Field(..., ge=0, le=100, description="Target allocation percentage")
    asset_class: Optional[str] = Field(None, description="Asset class (stock, crypto, cash)")
    market_cap: Optional[float] = Field(None, description="Market capitalization for weighting")
    name: Optional[str] = Field(None, description="Human-readable asset name")
    exchange: Optional[str] = Field(None, description="Exchange or platform")

class AllocationMode(str, Enum):
    MANUAL = "manual"
    EVEN_SPLIT = "even_split"
    MARKET_CAP_WEIGHTED = "market_cap_weighted"
    MAJORITY_CASH_EVEN = "majority_cash_even"
    MAJORITY_CASH_MARKET_CAP = "majority_cash_market_cap"

class CapitalAllocation(BaseModel):
    mode: AllocationMode = AllocationMode.MANUAL
    total_capital: float = Field(..., ge=0, description="Total capital allocated to strategy")
    assets: List[AssetAllocationItem] = Field(default_factory=list, description="Asset allocation breakdown")
    cash_percentage: Optional[float] = Field(None, ge=0, le=100, description="Cash percentage for majority cash modes")
    rebalance_threshold: float = Field(5.0, ge=0, le=50, description="Percentage deviation to trigger rebalance")
    rebalance_frequency: str = Field("weekly", description="Rebalancing frequency")

class MarketCapData(BaseModel):
    symbol: str
    market_cap: float
    price: float
    name: Optional[str] = None
    exchange: Optional[str] = None
    asset_class: str

class TelemetryData(BaseModel):
    allocated_capital_usd: float = 0
    allocated_capital_base: float = 0
    active_grid_levels: int = 0
    upper_price_limit: float = 0
    lower_price_limit: float = 0
    current_profit_loss_usd: float = 0
    current_profit_loss_percent: float = 0
    grid_spacing_interval: float = 0
    stop_loss_price: Optional[float] = None
    stop_loss_distance_percent: Optional[float] = None
    next_take_profit_price: Optional[float] = None
    take_profit_progress_percent: Optional[float] = None
    active_orders_count: int = 0
    fill_rate_percent: float = 0
    grid_utilization_percent: float = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)

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

    # Enhanced spot grid configuration
    grid_mode: Optional[GridMode] = GridMode.ARITHMETIC
    quantity_per_grid: Optional[float] = 0
    stop_loss_percent: Optional[float] = 0
    trailing_stop_loss_percent: Optional[float] = 0
    take_profit_levels: List[TakeProfitLevel] = Field(default_factory=list)
    technical_indicators: TechnicalIndicators = Field(default_factory=TechnicalIndicators)
    volume_threshold: Optional[float] = 0
    price_movement_threshold: Optional[float] = 0
    auto_start: bool = False
    telemetry_data: TelemetryData = Field(default_factory=TelemetryData)
    last_execution: Optional[datetime] = None
    execution_count: int = 0
    total_profit_loss: float = 0
    active_orders_count: int = 0
    grid_utilization_percent: float = 0

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

    # Enhanced spot grid configuration (all optional for updates)
    grid_mode: Optional[GridMode] = None
    quantity_per_grid: Optional[float] = None
    stop_loss_percent: Optional[float] = None
    trailing_stop_loss_percent: Optional[float] = None
    take_profit_levels: Optional[List[TakeProfitLevel]] = None
    technical_indicators: Optional[TechnicalIndicators] = None
    volume_threshold: Optional[float] = None
    price_movement_threshold: Optional[float] = None
    auto_start: Optional[bool] = None
    telemetry_data: Optional[TelemetryData] = None
    total_profit_loss: Optional[float] = None
    active_orders_count: Optional[int] = None
    grid_utilization_percent: Optional[float] = None

    configuration: Optional[Dict[str, Any]] = None
    performance: Optional[Dict[str, Any]] = None

class TradingStrategyResponse(TradingStrategyBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StrategiesListResponse(BaseModel):
    strategies: List[TradingStrategyResponse]