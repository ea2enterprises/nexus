from dataclasses import dataclass
from datetime import datetime


@dataclass
class Candle:
    """Single OHLCV candle for 1-minute timeframe."""
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0  # tick volume (or synthetic proxy)

    @property
    def body_size(self) -> float:
        return abs(self.close - self.open)

    @property
    def upper_wick(self) -> float:
        return self.high - max(self.open, self.close)

    @property
    def lower_wick(self) -> float:
        return min(self.open, self.close) - self.low

    @property
    def is_bullish(self) -> bool:
        return self.close > self.open

    @property
    def is_bearish(self) -> bool:
        return self.close < self.open

    @property
    def range(self) -> float:
        return self.high - self.low
