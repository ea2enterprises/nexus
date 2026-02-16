"""
Synthetic 1-minute OHLC candle generator for MVP.
Produces realistic candle sequences, optionally injecting ICT patterns
(liquidity sweep → displacement → FVG) at a configurable probability.

When a real price feed replaces this, the ICT detection logic in
strategies/ict_confluence.py works identically — only the candle source changes.
"""

import random
import numpy as np
from datetime import datetime, timezone, timedelta
from models.candle import Candle


# ─── Base Prices (all 20 supported pairs, NO OTC) ────────────
BASE_PRICES = {
    "EUR/USD": 1.0825, "GBP/USD": 1.2610, "USD/JPY": 152.50,
    "AUD/USD": 0.6450, "USD/CHF": 0.8950, "USD/CAD": 1.3580,
    "EUR/GBP": 0.8585, "EUR/JPY": 165.10, "EUR/AUD": 1.6780,
    "EUR/CAD": 1.4700, "EUR/CHF": 0.9690,
    "GBP/JPY": 192.30, "GBP/CAD": 1.7120, "GBP/CHF": 1.1290,
    "AUD/JPY": 98.40, "AUD/CHF": 0.5770, "AUD/CAD": 0.8760,
    "CAD/CHF": 0.6590, "CAD/JPY": 112.30,
    "CHF/JPY": 170.40,
}

# ─── Volatility: average pip move per 1-min candle ───────────
VOLATILITY = {
    "EUR/USD": 0.00020, "GBP/USD": 0.00030, "USD/JPY": 0.020,
    "AUD/USD": 0.00025, "USD/CHF": 0.00020, "USD/CAD": 0.00022,
    "EUR/GBP": 0.00015, "EUR/JPY": 0.025, "EUR/AUD": 0.00030,
    "EUR/CAD": 0.00025, "EUR/CHF": 0.00015,
    "GBP/JPY": 0.030, "GBP/CAD": 0.00030, "GBP/CHF": 0.00025,
    "AUD/JPY": 0.020, "AUD/CHF": 0.00020, "AUD/CAD": 0.00020,
    "CAD/CHF": 0.00015, "CAD/JPY": 0.020,
    "CHF/JPY": 0.025,
}

ICT_PATTERN_PROBABILITY = 0.30

# ─── Base tick volume ranges ─────────────────────────────
BASE_VOLUME_MEAN = 120   # average ticks per 1-min candle
BASE_VOLUME_STD = 30     # standard deviation


def _round_price(price: float, instrument: str) -> float:
    decimals = 3 if "JPY" in instrument else 5
    return round(price, decimals)


def generate_candles(instrument: str, count: int = 25) -> list[Candle]:
    """
    Generate a sequence of synthetic 1-minute OHLC candles.
    ~30% of the time, the sequence will contain a valid ICT pattern.
    """
    base = BASE_PRICES.get(instrument, 1.0)
    vol = VOLATILITY.get(instrument, 0.00020)
    price = base + np.random.normal(0, vol * 5)
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=count)

    if random.random() < ICT_PATTERN_PROBABILITY:
        return _with_ict_pattern(instrument, price, vol, count, start)
    return _normal(instrument, price, vol, count, start)


def _normal(inst: str, price: float, vol: float, count: int, t0: datetime) -> list[Candle]:
    """Random-walk candles with no special pattern."""
    candles: list[Candle] = []
    for i in range(count):
        o = price
        body = np.random.normal(0, vol)
        c = o + body
        h = max(o, c) + abs(np.random.normal(0, vol * 0.5))
        l = min(o, c) - abs(np.random.normal(0, vol * 0.5))
        tick_vol = max(10, np.random.normal(BASE_VOLUME_MEAN, BASE_VOLUME_STD))
        candles.append(Candle(
            timestamp=t0 + timedelta(minutes=i),
            open=_round_price(o, inst),
            high=_round_price(h, inst),
            low=_round_price(l, inst),
            close=_round_price(c, inst),
            volume=round(tick_vol),
        ))
        price = c
    return candles


def _with_ict_pattern(
    inst: str, price: float, vol: float, count: int, t0: datetime,
) -> list[Candle]:
    """
    Generate candles containing a valid ICT pattern:
      Phase 1 — Range (builds swing high/low with mild opposing trend)
      Phase 2 — Sweep candle (wick beyond liquidity, close back inside)
      Phase 3 — Displacement (strong move creating MSS + FVG)
      Phase 4 — Cool-down
    """
    candles: list[Candle] = []
    bullish = random.choice([True, False])  # True → sweep lows, BUY signal
    range_len = max(8, int(count * 0.6))

    # ── Phase 1: Range ──────────────────────────────────────
    bias = -vol * 0.3 if bullish else vol * 0.3
    swing_hi = -float("inf")
    swing_lo = float("inf")

    for i in range(range_len):
        o = price
        body = np.random.normal(bias, vol)
        c = o + body
        h = max(o, c) + abs(np.random.normal(0, vol * 0.4))
        l = min(o, c) - abs(np.random.normal(0, vol * 0.4))
        swing_hi = max(swing_hi, h)
        swing_lo = min(swing_lo, l)
        tick_vol = max(10, np.random.normal(BASE_VOLUME_MEAN, BASE_VOLUME_STD))
        candles.append(Candle(
            timestamp=t0 + timedelta(minutes=i),
            open=_round_price(o, inst),
            high=_round_price(h, inst),
            low=_round_price(l, inst),
            close=_round_price(c, inst),
            volume=round(tick_vol),
        ))
        price = c

    # ── Phase 2: Sweep candle ───────────────────────────────
    idx = range_len
    o = price
    if bullish:
        sweep_lo = swing_lo - vol * random.uniform(1.5, 3.0)
        c = swing_lo + vol * random.uniform(0.5, 1.5)
        h = max(o, c) + abs(np.random.normal(0, vol * 0.3))
        l = sweep_lo
    else:
        sweep_hi = swing_hi + vol * random.uniform(1.5, 3.0)
        c = swing_hi - vol * random.uniform(0.5, 1.5)
        l = min(o, c) - abs(np.random.normal(0, vol * 0.3))
        h = sweep_hi

    # Sweep candle gets elevated volume (1.5-2.5x)
    sweep_vol = BASE_VOLUME_MEAN * random.uniform(1.5, 2.5)
    candles.append(Candle(
        timestamp=t0 + timedelta(minutes=idx),
        open=_round_price(o, inst),
        high=_round_price(h, inst),
        low=_round_price(l, inst),
        close=_round_price(c, inst),
        volume=round(sweep_vol),
    ))
    price = c
    idx += 1

    # ── Phase 3: Displacement (MSS + FVG) ──────────────────
    disp_count = min(max(3, count - idx), 5)
    disp_size = vol * random.uniform(2.5, 4.5)

    for j in range(disp_count):
        o = price
        body = disp_size * random.uniform(0.6, 1.3)
        if bullish:
            c = o + body
        else:
            c = o - body
        # Tight wicks on displacement candle (j==1) to create a clear FVG gap
        if j == 1:
            uw = abs(np.random.normal(0, vol * 0.15))
            lw = abs(np.random.normal(0, vol * 0.10))
        else:
            uw = abs(np.random.normal(0, vol * 0.3))
            lw = abs(np.random.normal(0, vol * 0.3))
        h = max(o, c) + uw
        l = min(o, c) - lw
        # Displacement candles get heavy volume (2-4x average)
        disp_vol = BASE_VOLUME_MEAN * random.uniform(2.0, 4.0)
        candles.append(Candle(
            timestamp=t0 + timedelta(minutes=idx + j),
            open=_round_price(o, inst),
            high=_round_price(h, inst),
            low=_round_price(l, inst),
            close=_round_price(c, inst),
            volume=round(disp_vol),
        ))
        price = c

    idx += disp_count

    # ── Phase 4: Cool-down ──────────────────────────────────
    for k in range(idx, count):
        o = price
        body = np.random.normal(0, vol * 0.4)
        c = o + body
        h = max(o, c) + abs(np.random.normal(0, vol * 0.25))
        l = min(o, c) - abs(np.random.normal(0, vol * 0.25))
        tick_vol = max(10, np.random.normal(BASE_VOLUME_MEAN * 0.8, BASE_VOLUME_STD))
        candles.append(Candle(
            timestamp=t0 + timedelta(minutes=k),
            open=_round_price(o, inst),
            high=_round_price(h, inst),
            low=_round_price(l, inst),
            close=_round_price(c, inst),
            volume=round(tick_vol),
        ))
        price = c

    return candles
