"""
Market data service — placeholder for MVP.
In production, this would connect to real price feeds.
"""


async def get_current_price(instrument: str) -> float:
    """Get current price for instrument. Returns mock data for MVP."""
    prices = {
        "EUR/USD": 1.0825,
        "GBP/USD": 1.2610,
        "USD/JPY": 152.50,
        "EUR/GBP": 0.8585,
        "AUD/USD": 0.6450,
        "USD/CHF": 0.8950,
        "USD/CAD": 1.3580,
        "NZD/USD": 0.5950,
    }
    return prices.get(instrument, 1.0)
