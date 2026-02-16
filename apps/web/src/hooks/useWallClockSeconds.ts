'use client';

import { useEffect, useState } from 'react';

/**
 * Aligns setInterval to fire on exact wall-clock second boundaries.
 * Uses setTimeout chaining with `1000 - (Date.now() % 1000)` so ticks
 * land at :000ms of each second — no drift over time.
 */
export function useWallClockSeconds(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    function tick() {
      const current = Date.now();
      setNow(current);
      // Schedule next tick at the start of the next second
      const msUntilNextSecond = 1000 - (current % 1000);
      timerId = setTimeout(tick, msUntilNextSecond);
    }

    // Initial alignment: wait until next second boundary, then start ticking
    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    timerId = setTimeout(tick, msUntilNextSecond);

    return () => clearTimeout(timerId);
  }, []);

  return now;
}
