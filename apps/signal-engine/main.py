import asyncio
import random
import httpx
from fastapi import FastAPI
from contextlib import asynccontextmanager
from services.confluence import check_confluence
from config import API_URL, API_KEY, SIGNAL_INTERVAL_MIN, SIGNAL_INTERVAL_MAX

signal_task = None


async def signal_generation_loop():
    """Background loop that generates signals at random intervals."""
    await asyncio.sleep(5)  # Wait for API to be ready
    print("Signal generation loop started")

    async with httpx.AsyncClient() as client:
        while True:
            try:
                signal = check_confluence()
                if signal:
                    response = await client.post(
                        f"{API_URL}/signals",
                        json=signal.model_dump(),
                        headers={"X-API-Key": API_KEY},
                        timeout=10,
                    )
                    if response.status_code == 201:
                        data = response.json()
                        sid = data.get("data", {}).get("signal_id", "unknown")
                        print(f"Signal sent: {sid} — {signal.instrument} {signal.direction} ({signal.confidence}%)")
                    else:
                        print(f"Failed to send signal: {response.status_code} {response.text}")
            except Exception as e:
                print(f"Signal generation error: {e}")

            # Random interval between signals
            wait = random.randint(SIGNAL_INTERVAL_MIN, SIGNAL_INTERVAL_MAX)
            await asyncio.sleep(wait)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global signal_task
    signal_task = asyncio.create_task(signal_generation_loop())
    yield
    if signal_task:
        signal_task.cancel()


app = FastAPI(
    title="NEXUS Signal Engine",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "signal-engine", "version": "0.1.0"}


@app.get("/signal/generate")
async def generate_one():
    """Manually trigger a single signal generation (for testing)."""
    signal = check_confluence()
    if signal:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/signals",
                json=signal.model_dump(),
                headers={"X-API-Key": API_KEY},
                timeout=10,
            )
            return {"status": "sent", "signal": signal.model_dump(), "api_response": response.status_code}
    return {"status": "no_signal", "reason": "Confluence check failed"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
