"""
Market data service — placeholder for MVP.
In production, this would connect to real price feeds.
"""


async def get_current_price(instrument: str) -> float:
    """Get current price for instrument. Returns mock data for MVP."""
    prices = {
        "EUR/USD": 1.0825, "GBP/USD": 1.2610, "USD/JPY": 152.50,
        "AUD/USD": 0.6450, "USD/CHF": 0.8950, "USD/CAD": 1.3580,
        "EUR/GBP": 0.8585, "EUR/JPY": 165.10, "EUR/AUD": 1.6780,
        "EUR/CAD": 1.4700, "EUR/CHF": 0.9690,
        "GBP/JPY": 192.30, "GBP/CAD": 1.7120, "GBP/CHF": 1.1290,
        "AUD/JPY": 98.40, "AUD/CHF": 0.5770, "AUD/CAD": 0.8760,
        "CAD/CHF": 0.6590, "CAD/JPY": 112.30,
        "CHF/JPY": 170.40,
    }
    return prices.get(instrument, 1.0)
