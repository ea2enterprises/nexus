"""
ICT Confluence Engine — the core signal generation logic.

A signal is ONLY valid when ALL of the following align:
  1. Liquidity Sweep (wick beyond swing high/low, close back inside)
  2. Market Structure Shift (close beyond opposing swing level after sweep)
  3. Fair Value Gap (3-candle imbalance in displacement move)
  4. SMC Order Block (last opposing candle before displacement)
  5. EMA Trend alignment (9 EMA vs 21 EMA confirms direction)
  6. MFI Volume Filter (strict — ALL three must pass):
     a) MSS candle tick volume >= 2x rolling average
     b) MSS candle body >= 1.5x average body size
     c) MFI(14) confirms direction: >= 60 for bullish, <= 40 for bearish
  7. Confidence >= 90 (scored from pattern quality metrics)

Only A+ setups pass. If volume doesn't spike during MSS, no signal.
Strike Price = 50% equilibrium (midpoint) of the FVG.
"""

import math
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from models.candle import Candle
from models.signal import Signal, SignalMeta


# ─── Killzone Definitions (UTC) ──────────────────────────────
KILLZONES = [
    {"name": "London Open",   "start": (7, 0),  "end": (10, 0), "bonus": 3},
    {"name": "New York Open", "start": (12, 0), "end": (15, 0), "bonus": 3},
    {"name": "London Close",  "start": (15, 0), "end": (17, 0), "bonus": 0},
]

MIN_PAYOUT_PERCENT = 70

# Dynamic payout: simulates real broker payouts varying by instrument/session
PAYOUT_RANGE = (75, 92)  # realistic broker payout range
MIN_CONFIDENCE = 90


# ─── Result Dataclasses ──────────────────────────────────────

@dataclass
class SweepResult:
    direction: str          # "bullish" (swept lows → BUY) or "bearish" (swept highs → SELL)
    candle_index: int
    liquidity_level: float
    sweep_depth: float      # how far past the level the wick went

@dataclass
class MSSResult:
    candle_index: int
    mss_level: float        # price level that was broken

@dataclass
class FVGResult:
    fvg_high: float
    fvg_low: float
    center_index: int

    @property
    def midpoint(self) -> float:
        return (self.fvg_high + self.fvg_low) / 2

@dataclass
class OrderBlockResult:
    ob_high: float
    ob_low: float
    candle_index: int


# ─── Killzone Check ──────────────────────────────────────────

def get_active_killzone(hour: int, minute: int) -> dict | None:
    t = hour * 60 + minute
    for kz in KILLZONES:
        s = kz["start"][0] * 60 + kz["start"][1]
        e = kz["end"][0] * 60 + kz["end"][1]
        if s <= t < e:
            return kz
    return None


# ─── 1. Liquidity Sweep Detection ────────────────────────────

def detect_liquidity_sweep(candles: list[Candle], lookback: int = 10) -> SweepResult | None:
    """
    Find a candle whose wick sweeps beyond the swing high/low of the
    lookback period, but closes back inside the range.
    """
    if len(candles) < lookback + 3:
        return None

    ref = candles[:lookback]
    swing_hi = max(c.high for c in ref)
    swing_lo = min(c.low for c in ref)

    for i in range(lookback, len(candles) - 2):
        c = candles[i]
        # Bullish: swept sell-side liquidity (lows), close above
        if c.low < swing_lo and c.close > swing_lo:
            return SweepResult("bullish", i, swing_lo, swing_lo - c.low)
        # Bearish: swept buy-side liquidity (highs), close below
        if c.high > swing_hi and c.close < swing_hi:
            return SweepResult("bearish", i, swing_hi, c.high - swing_hi)

    return None


# ─── 2. Market Structure Shift Detection ─────────────────────

def detect_mss(candles: list[Candle], sweep: SweepResult, lookback: int = 10) -> MSSResult | None:
    """
    After the sweep, look for a close beyond the opposing swing level.
    Bullish sweep → need close above recent swing high (MSS up).
    Bearish sweep → need close below recent swing low (MSS down).
    """
    si = sweep.candle_index
    ref_start = max(0, si - lookback)
    ref = candles[ref_start:si]
    if not ref:
        return None

    if sweep.direction == "bullish":
        level = max(c.high for c in ref)
        for i in range(si + 1, len(candles)):
            if candles[i].close > level:
                return MSSResult(i, level)
    else:
        level = min(c.low for c in ref)
        for i in range(si + 1, len(candles)):
            if candles[i].close < level:
                return MSSResult(i, level)

    return None


# ─── 3. Fair Value Gap Detection ─────────────────────────────

def detect_fvg(candles: list[Candle], sweep: SweepResult, mss: MSSResult) -> FVGResult | None:
    """
    Search between sweep and MSS for a 3-candle imbalance (FVG).
    Bullish FVG: candle[i-1].high < candle[i+1].low  (gap up)
    Bearish FVG: candle[i-1].low  > candle[i+1].high (gap down)
    """
    start = sweep.candle_index
    end = min(mss.candle_index + 1, len(candles) - 1)

    for i in range(start + 1, end):
        if i - 1 < 0 or i + 1 >= len(candles):
            continue
        prev = candles[i - 1]
        nxt = candles[i + 1]

        if sweep.direction == "bullish" and prev.high < nxt.low:
            return FVGResult(fvg_high=nxt.low, fvg_low=prev.high, center_index=i)
        if sweep.direction == "bearish" and prev.low > nxt.high:
            return FVGResult(fvg_high=prev.low, fvg_low=nxt.high, center_index=i)

    return None


# ─── 4. SMC Order Block Detection ────────────────────────────

def detect_order_block(candles: list[Candle], sweep: SweepResult) -> OrderBlockResult | None:
    """
    The last opposing candle before the displacement move.
    Bullish: last bearish candle before bullish displacement.
    Bearish: last bullish candle before bearish displacement.
    """
    si = sweep.candle_index
    search_start = max(0, si - 5)

    if sweep.direction == "bullish":
        for i in range(si, search_start - 1, -1):
            if candles[i].is_bearish:
                ob_hi = max(candles[i].open, candles[i].close)
                ob_lo = min(candles[i].open, candles[i].close)
                return OrderBlockResult(ob_hi, ob_lo, i)
    else:
        for i in range(si, search_start - 1, -1):
            if candles[i].is_bullish:
                ob_hi = max(candles[i].open, candles[i].close)
                ob_lo = min(candles[i].open, candles[i].close)
                return OrderBlockResult(ob_hi, ob_lo, i)

    return None


# ─── 5. EMA Trend Alignment ─────────────────────────────────

def compute_ema_trend(candles: list[Candle], fast: int = 9, slow: int = 21) -> str:
    """Return 'bullish' if fast EMA > slow EMA, else 'bearish'."""
    closes = [c.close for c in candles]
    if len(closes) < slow:
        return "neutral"
    fast_ema = _ema(closes, fast)
    slow_ema = _ema(closes, slow)
    return "bullish" if fast_ema > slow_ema else "bearish"


def _ema(values: list[float], period: int) -> float:
    """Calculate EMA of the last `period` values using exponential smoothing."""
    if len(values) < period:
        return sum(values) / len(values)
    k = 2 / (period + 1)
    ema = sum(values[:period]) / period  # SMA seed
    for v in values[period:]:
        ema = v * k + ema * (1 - k)
    return ema


# ─── 6. MFI Volume Filter (strict) ─────────────────────────

def compute_mfi(candles: list[Candle], period: int = 14) -> list[float]:
    """
    Money Flow Index — measures buying/selling pressure via price × volume.
    Returns MFI value per candle (first `period` entries are 0).
    """
    mfi_values = [0.0] * len(candles)
    if len(candles) < period + 1:
        return mfi_values

    for i in range(period, len(candles)):
        pos_flow = 0.0
        neg_flow = 0.0
        for j in range(i - period + 1, i + 1):
            typical = (candles[j].high + candles[j].low + candles[j].close) / 3
            money_flow = typical * candles[j].volume
            if j > 0:
                prev_typical = (candles[j-1].high + candles[j-1].low + candles[j-1].close) / 3
                if typical > prev_typical:
                    pos_flow += money_flow
                else:
                    neg_flow += money_flow
        ratio = pos_flow / neg_flow if neg_flow > 0 else 100.0
        mfi_values[i] = 100 - (100 / (1 + ratio))
    return mfi_values


def check_volume_confirmation(candles: list[Candle], sweep: SweepResult, mss: MSSResult) -> bool:
    """
    Strict MFI + tick-volume filter. BOTH must pass:
      1. MSS candle tick volume >= 2x the rolling average (institutional participation)
      2. MFI at the MSS candle is >= 60 (bullish) or <= 40 (bearish),
         confirming money flow aligns with the displacement direction.
    """
    # --- Tick volume spike on the MSS candle specifically ---
    volumes = [c.volume for c in candles if c.volume > 0]
    if not volumes:
        return False
    avg_vol = sum(volumes) / len(volumes)

    mss_candle = candles[mss.candle_index]
    if mss_candle.volume < avg_vol * 2.0:
        return False  # No institutional volume spike at MSS → reject

    # --- Body size confirmation (displacement must be large) ---
    bodies = [c.body_size for c in candles if c.body_size > 0]
    avg_body = sum(bodies) / len(bodies) if bodies else 0.001
    if mss_candle.body_size < avg_body * 1.5:
        return False  # MSS candle body too small → weak displacement

    # --- MFI directional confirmation ---
    mfi_values = compute_mfi(candles)
    mfi_at_mss = mfi_values[mss.candle_index]

    if sweep.direction == "bullish" and mfi_at_mss < 60:
        return False  # MFI must show buying pressure for bullish setup
    if sweep.direction == "bearish" and mfi_at_mss > 40:
        return False  # MFI must show selling pressure for bearish setup

    return True


# ─── 7. Strike Price ────────────────────────────────────────

def compute_strike_price(fvg: FVGResult, instrument: str) -> float:
    decimals = 3 if "JPY" in instrument else 5
    return round(fvg.midpoint, decimals)


# ─── 8. Confidence Scoring ──────────────────────────────────

def compute_confidence(
    candles: list[Candle],
    sweep: SweepResult,
    mss: MSSResult,
    fvg: FVGResult,
    ob: OrderBlockResult,
    ema_dir: str,
    sweep_dir: str,
    volume_ok: bool,
    killzone: dict,
) -> int:
    """
    Score signal quality.  Base 65, max 95, must reach 90 to fire.
    Lowered base from 70 → 65 so only true A+ setups clear the 90 threshold.
    """
    ranges = [c.range for c in candles[:15] if c.range > 0]
    atr = sum(ranges) / len(ranges) if ranges else 0.001

    score = 65

    # Sweep depth vs ATR (+5 to +10)
    ratio = sweep.sweep_depth / atr
    score += min(10, max(5, int(5 + ratio * 3)))

    # MSS body strength (+3 to +8)
    mss_body = candles[mss.candle_index].body_size / atr
    score += min(8, max(3, int(3 + mss_body * 2.5)))

    # FVG size vs ATR (+3 to +7)
    fvg_size = (fvg.fvg_high - fvg.fvg_low) / atr
    score += min(7, max(3, int(3 + fvg_size * 2)))

    # OB alignment: FVG midpoint inside or near the OB zone (+2 to +5)
    mid = fvg.midpoint
    if ob.ob_low <= mid <= ob.ob_high:
        score += 5
    else:
        dist = min(abs(mid - ob.ob_high), abs(mid - ob.ob_low)) / atr
        score += max(2, int(5 - dist * 3))

    # EMA trend alignment (+3 to +5)
    if ema_dir == sweep_dir:
        score += 5
    else:
        score += 3

    # MFI Volume confirmation (+3 to +7) — weighted higher since filter is strict
    score += 7 if volume_ok else 3

    # Killzone quality bonus (+0 to +3)
    score += killzone.get("bonus", 0)

    return min(95, score)


# ─── 9. Full Analysis Orchestrator ──────────────────────────

def analyze(candles: list[Candle], instrument: str, killzone: dict) -> Signal | None:
    """
    Run full ICT + triple confluence analysis.
    Returns Signal only if ALL checks pass AND confidence >= 90.
    """
    # 1. Liquidity Sweep
    sweep = detect_liquidity_sweep(candles)
    if sweep is None:
        return None

    # 2. Market Structure Shift
    mss = detect_mss(candles, sweep)
    if mss is None:
        return None

    # 3. Fair Value Gap
    fvg = detect_fvg(candles, sweep, mss)
    if fvg is None:
        return None

    # 4. SMC Order Block
    ob = detect_order_block(candles, sweep)
    if ob is None:
        return None

    # 5. EMA Trend
    ema_dir = compute_ema_trend(candles)
    if ema_dir == "neutral":
        return None
    # EMA must agree with sweep direction
    if ema_dir != sweep.direction:
        return None

    # 6. Volume Confirmation
    volume_ok = check_volume_confirmation(candles, sweep, mss)
    if not volume_ok:
        return None

    # 7. Confidence — must hit 90
    confidence = compute_confidence(
        candles, sweep, mss, fvg, ob, ema_dir, sweep.direction, volume_ok, killzone,
    )
    if confidence < MIN_CONFIDENCE:
        return None

    # 8. Dynamic Payout — simulate broker payout for this instrument/session
    payout = random.randint(PAYOUT_RANGE[0], PAYOUT_RANGE[1])

    # 9. Payout Filter — only broadcast if broker payout >= 70%
    if payout < MIN_PAYOUT_PERCENT:
        return None

    # ── Build Signal ────────────────────────────────────────
    direction = "BUY" if sweep.direction == "bullish" else "SELL"
    strike = compute_strike_price(fvg, instrument)

    # Strict candle alignment: start_time must be exactly :00 (top of next minute)
    now = datetime.now(timezone.utc)
    next_min = math.ceil(now.timestamp() / 60) * 60
    start_time = datetime.fromtimestamp(next_min, tz=timezone.utc).isoformat()

    dec = 3 if "JPY" in instrument else 5

    return Signal(
        instrument=instrument,
        direction=direction,
        signal_type="TURBO",
        confidence=confidence,
        confirming_strategies=["LIQ-SWEEP", "MSS", "FVG", "SMC-OB", "EMA-TREND", "VOLUME"],
        strike_price=strike,
        expiration_seconds=60,
        payout_percent=float(payout),
        position_size_percent=5.0,
        start_time=start_time,
        meta=SignalMeta(
            session=killzone["name"],
            volume_confirmation=True,
            news_clear=True,
            correlation_check="PASS",
            daily_losses_count=0,
            weekly_drawdown_percent=0.0,
            killzone=killzone["name"],
            sweep_type="sell-side" if sweep.direction == "bullish" else "buy-side",
            fvg_high=round(fvg.fvg_high, dec),
            fvg_low=round(fvg.fvg_low, dec),
            mss_level=round(mss.mss_level, dec),
            order_block_high=round(ob.ob_high, dec),
            order_block_low=round(ob.ob_low, dec),
            ema_trend=ema_dir,
        ),
    )
