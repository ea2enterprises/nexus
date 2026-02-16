"""
ICT Confluence Service — orchestrates signal generation.

Flow:
  1. Check killzone (skip if outside, unless BYPASS_KILLZONE is set)
  2. Pick random subset of instruments
  3. For each: generate candles → run full ICT + triple confluence analysis
  4. Return first valid signal with confidence >= 90, or None
"""

import random
from datetime import datetime, timezone
from models.signal import Signal
from services.candle_generator import generate_candles
from strategies.ict_confluence import analyze, get_active_killzone
from config import BYPASS_KILLZONE


# 20 major pairs — NO OTC
INSTRUMENTS = [
    "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD",
    "EUR/GBP", "EUR/JPY", "EUR/AUD", "EUR/CAD", "EUR/CHF",
    "GBP/JPY", "GBP/CAD", "GBP/CHF",
    "AUD/JPY", "AUD/CHF", "AUD/CAD",
    "CAD/CHF", "CAD/JPY",
    "CHF/JPY",
]

# Fallback killzone used when BYPASS_KILLZONE is enabled
_BYPASS_KZ = {"name": "Dev Bypass", "start": (0, 0), "end": (24, 0), "bonus": 3}


def check_confluence() -> Signal | None:
    """
    ICT Confluence Engine.
    Only fires when: Liquidity Sweep + MSS + FVG + Order Block
    + EMA Trend + Volume all align, during a killzone, with confidence >= 90.
    """
    now = datetime.now(timezone.utc)

    if BYPASS_KILLZONE:
        killzone = _BYPASS_KZ
    else:
        killzone = get_active_killzone(now.hour, now.minute)
        if killzone is None:
            return None

    # Scan a random subset of instruments each cycle
    subset = random.sample(INSTRUMENTS, min(random.randint(5, 8), len(INSTRUMENTS)))

    for instrument in subset:
        candles = generate_candles(instrument, count=25)
        signal = analyze(candles, instrument, killzone)
        if signal is not None:
            return signal

    return None
