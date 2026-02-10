from models.signal import Signal
from strategies.mock_generator import generate_mock_signal


def check_confluence() -> Signal | None:
    """
    3-confirmation engine: only fire when 3+ strategies converge.
    For MVP, uses the mock generator which always produces 3+ confirmations.
    In production, this would aggregate signals from real strategy instances.
    """
    signal = generate_mock_signal()

    # Ensure minimum 3 confirming strategies
    if len(signal.confirming_strategies) < 3:
        return None

    # Filter low confidence
    if signal.confidence < 60:
        return None

    # Skip if correlation check fails
    if signal.meta.correlation_check == "FAIL":
        return None

    # Skip if news not clear
    if not signal.meta.news_clear:
        return None

    return signal
