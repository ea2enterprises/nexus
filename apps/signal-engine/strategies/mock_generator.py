import math
import random
from datetime import datetime, timezone
from models.signal import Signal, SignalMeta

INSTRUMENTS = [
    # Majors
    "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD",
    # EUR crosses
    "EUR/GBP", "EUR/JPY", "EUR/AUD", "EUR/CAD", "EUR/CHF",
    # GBP crosses
    "GBP/JPY", "GBP/CAD", "GBP/CHF",
    # AUD crosses
    "AUD/JPY", "AUD/CHF", "AUD/CAD",
    # CAD crosses
    "CAD/CHF", "CAD/JPY",
    # CHF crosses
    "CHF/JPY",
]

STRATEGIES = [
    "SMC-01", "ICT-01", "PA-01", "QUANT-01",
    "FLOW-01", "SENT-01", "ML-01", "SCALP-01",
]

SESSIONS = ["Tokyo", "London", "New York", "Sydney"]

# All signal types use a fixed 60-second binary option duration
EXPIRATION_SECONDS = 60
PAYOUT_RANGE = (70, 92)  # dynamic broker payout range

# Approximate current prices for realistic strike prices
BASE_PRICES = {
    # Majors
    "EUR/USD": 1.0825, "GBP/USD": 1.2610, "USD/JPY": 152.50,
    "AUD/USD": 0.6450, "USD/CHF": 0.8950, "USD/CAD": 1.3580,
    # EUR crosses
    "EUR/GBP": 0.8585, "EUR/JPY": 165.10, "EUR/AUD": 1.6780,
    "EUR/CAD": 1.4700, "EUR/CHF": 0.9690,
    # GBP crosses
    "GBP/JPY": 192.30, "GBP/CAD": 1.7120, "GBP/CHF": 1.1290,
    # AUD crosses
    "AUD/JPY": 98.40, "AUD/CHF": 0.5770, "AUD/CAD": 0.8760,
    # CAD crosses
    "CAD/CHF": 0.6590, "CAD/JPY": 112.30,
    # CHF crosses
    "CHF/JPY": 170.40,
}


def generate_mock_signal() -> Signal:
    instrument = random.choice(INSTRUMENTS)
    direction = random.choice(["BUY", "SELL"])
    signal_type = random.choice(["TURBO", "SHORT"])
    confidence = random.randint(60, 95)

    # Pick 3-4 confirming strategies (3-confirmation rule)
    num_strategies = random.randint(3, 4)
    confirming = random.sample(STRATEGIES, num_strategies)

    # Generate realistic strike price from base price with small offset
    base_price = BASE_PRICES.get(instrument, 1.0)
    is_jpy = "JPY" in instrument
    tick_size = 0.01 if is_jpy else 0.0001
    price_offset = random.uniform(-50, 50) * tick_size
    strike_price = round(base_price + price_offset, 3 if is_jpy else 5)

    expiration_seconds = EXPIRATION_SECONDS
    payout_percent = float(random.randint(PAYOUT_RANGE[0], PAYOUT_RANGE[1]))

    now = datetime.now(timezone.utc)

    # Compute start_time as the top of the next minute
    epoch_seconds = now.timestamp()
    next_minute = math.ceil(epoch_seconds / 60) * 60
    start_time_dt = datetime.fromtimestamp(next_minute, tz=timezone.utc)
    start_time_iso = start_time_dt.isoformat()

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
        strike_price=strike_price,
        expiration_seconds=expiration_seconds,
        payout_percent=payout_percent,
        position_size_percent=5.0,
        start_time=start_time_iso,
        meta=SignalMeta(
            session=session,
            volume_confirmation=random.random() > 0.2,
            news_clear=random.random() > 0.1,
            correlation_check="PASS" if random.random() > 0.15 else "FAIL",
            daily_losses_count=random.randint(0, 2),
            weekly_drawdown_percent=round(random.uniform(-5, 0), 1),
        ),
    )
