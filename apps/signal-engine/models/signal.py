from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class TakeProfit(BaseModel):
    level: str
    price: float
    close_percent: float


class SignalEntry(BaseModel):
    type: Literal["MARKET", "LIMIT"]
    price: float
    valid_until: str


class SignalMeta(BaseModel):
    session: str
    key_level: str
    volume_confirmation: bool
    news_clear: bool
    correlation_check: Literal["PASS", "FAIL"]
    daily_losses_count: int
    weekly_drawdown_percent: float


class Signal(BaseModel):
    instrument: str
    direction: Literal["BUY", "SELL"]
    signal_type: Literal["SCALP", "INTRADAY", "SWING", "POSITION"]
    confidence: int
    confirming_strategies: list[str]
    entry: SignalEntry
    stop_loss: float
    take_profits: list[TakeProfit]
    risk_reward: float
    position_size_percent: float
    meta: SignalMeta
