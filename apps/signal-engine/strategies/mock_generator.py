import random
from datetime import datetime, timedelta, timezone
from models.signal import Signal, SignalEntry, TakeProfit, SignalMeta

INSTRUMENTS = [
    "EUR/USD", "GBP/USD", "USD/JPY", "EUR/GBP",
    "AUD/USD", "USD/CHF", "USD/CAD", "NZD/USD",
]

STRATEGIES = [
    "SMC-01", "ICT-01", "PA-01", "QUANT-01",
    "FLOW-01", "SENT-01", "ML-01", "SCALP-01",
]

SIGNAL_TYPES = ["SCALP", "INTRADAY", "SWING"]

SESSIONS = ["Tokyo", "London", "New York", "Sydney"]

# Approximate current prices for realistic signals
BASE_PRICES = {
    "EUR/USD": 1.0825,
    "GBP/USD": 1.2610,
    "USD/JPY": 152.50,
    "EUR/GBP": 0.8585,
    "AUD/USD": 0.6450,
    "USD/CHF": 0.8950,
    "USD/CAD": 1.3580,
    "NZD/USD": 0.5950,
}


def generate_mock_signal() -> Signal:
    instrument = random.choice(INSTRUMENTS)
    direction = random.choice(["BUY", "SELL"])
    signal_type = random.choice(SIGNAL_TYPES)
    confidence = random.randint(60, 95)

    # Pick 3-4 confirming strategies (3-confirmation rule)
    num_strategies = random.randint(3, 4)
    confirming = random.sample(STRATEGIES, num_strategies)

    # Generate realistic prices
    base_price = BASE_PRICES.get(instrument, 1.0)
    is_jpy = "JPY" in instrument
    pip_size = 0.01 if is_jpy else 0.0001
    spread = random.uniform(1, 3) * pip_size

    # Add some randomness to base price
    price_offset = random.uniform(-50, 50) * pip_size
    current_price = round(base_price + price_offset, 5 if not is_jpy else 3)

    # Calculate SL and TP
    sl_pips = random.uniform(10, 25)
    rr_ratio = random.uniform(1.5, 3.0)

    if direction == "BUY":
        entry_price = current_price
        stop_loss = round(entry_price - sl_pips * pip_size, 5 if not is_jpy else 3)
        tp1_price = round(entry_price + sl_pips * pip_size * (rr_ratio * 0.5), 5 if not is_jpy else 3)
        tp2_price = round(entry_price + sl_pips * pip_size * rr_ratio, 5 if not is_jpy else 3)
    else:
        entry_price = current_price
        stop_loss = round(entry_price + sl_pips * pip_size, 5 if not is_jpy else 3)
        tp1_price = round(entry_price - sl_pips * pip_size * (rr_ratio * 0.5), 5 if not is_jpy else 3)
        tp2_price = round(entry_price - sl_pips * pip_size * rr_ratio, 5 if not is_jpy else 3)

    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(minutes=random.randint(5, 30))

    # Determine current session
    hour = now.hour
    if 0 <= hour < 3:
        session = "Tokyo"
    elif 7 <= hour < 10:
        session = "London"
    elif 12 <= hour < 15:
        session = "New York"
    else:
        session = random.choice(SESSIONS)

    return Signal(
        instrument=instrument,
        direction=direction,
        signal_type=signal_type,
        confidence=confidence,
        confirming_strategies=confirming,
        entry=SignalEntry(
            type=random.choice(["MARKET", "LIMIT"]),
            price=entry_price,
            valid_until=valid_until.isoformat(),
        ),
        stop_loss=stop_loss,
        take_profits=[
            TakeProfit(level="TP1", price=tp1_price, close_percent=50),
            TakeProfit(level="TP2", price=tp2_price, close_percent=50),
        ],
        risk_reward=round(rr_ratio, 1),
        position_size_percent=5.0,
        meta=SignalMeta(
            session=session,
            key_level=random.choice([
                "4H order block rejection",
                "Daily FVG fill",
                "Weekly support bounce",
                "London session high sweep",
                "Previous day high liquidity grab",
                "1H demand zone test",
            ]),
            volume_confirmation=random.random() > 0.2,
            news_clear=random.random() > 0.1,
            correlation_check="PASS" if random.random() > 0.15 else "FAIL",
            daily_losses_count=random.randint(0, 2),
            weekly_drawdown_percent=round(random.uniform(-5, 0), 1),
        ),
    )
