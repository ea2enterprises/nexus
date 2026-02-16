import os

API_URL = os.getenv("API_URL", "http://localhost:3001")
API_KEY = os.getenv("SIGNAL_ENGINE_API_KEY", "dev-signal-key")
SIGNAL_INTERVAL_MIN = int(os.getenv("SIGNAL_INTERVAL_MIN", "15"))
SIGNAL_INTERVAL_MAX = int(os.getenv("SIGNAL_INTERVAL_MAX", "60"))
BYPASS_KILLZONE = os.getenv("BYPASS_KILLZONE", "false").lower() == "true"
