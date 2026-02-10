from abc import ABC, abstractmethod
from models.signal import Signal


class BaseStrategy(ABC):
    strategy_id: str
    name: str

    @abstractmethod
    def analyze(self, instrument: str, timeframe: str) -> dict | None:
        """Analyze instrument and return signal data or None if no signal."""
        pass
