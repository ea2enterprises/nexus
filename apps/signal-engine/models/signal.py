from pydantic import BaseModel
from typing import Literal


class SignalMeta(BaseModel):
    session: str
    volume_confirmation: bool
    news_clear: bool
    correlation_check: Literal["PASS", "FAIL"]
    daily_losses_count: int
    weekly_drawdown_percent: float
    # ICT-specific fields
    killzone: str | None = None
    sweep_type: str | None = None
    fvg_high: float | None = None
    fvg_low: float | None = None
    mss_level: float | None = None
    order_block_high: float | None = None
    order_block_low: float | None = None
    ema_trend: str | None = None


class Signal(BaseModel):
    instrument: str
    direction: Literal["BUY", "SELL"]
    signal_type: Literal["TURBO", "SHORT"]
    confidence: int
    confirming_strategies: list[str]
    strike_price: float
    expiration_seconds: Literal[60]
    payout_percent: float
    position_size_percent: float
    start_time: str | None = None
    meta: SignalMeta
