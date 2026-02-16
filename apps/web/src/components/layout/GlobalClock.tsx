'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIMEZONES = [
  { label: 'Local', tz: undefined },
  { label: 'UTC', tz: 'UTC' },
  { label: 'New York', tz: 'America/New_York' },
  { label: 'London', tz: 'Europe/London' },
  { label: 'Tokyo', tz: 'Asia/Tokyo' },
] as const;

function formatClock(tz: string | undefined): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...(tz ? { timeZone: tz } : {}),
  });
}

function getStoredTzIndex(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem('nexus_clock_tz');
  if (!stored) return 0;
  const idx = TIMEZONES.findIndex((t) => t.label === stored);
  return idx >= 0 ? idx : 0;
}

export function GlobalClock() {
  const [tzIndex, setTzIndex] = useState(0);
  const [time, setTime] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTzIndex(getStoredTzIndex());
  }, []);

  useEffect(() => {
    const tz = TIMEZONES[tzIndex].tz;
    setTime(formatClock(tz));
    const id = setInterval(() => setTime(formatClock(tz)), 1000);
    return () => clearInterval(id);
  }, [tzIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectTz = (idx: number) => {
    setTzIndex(idx);
    localStorage.setItem('nexus_clock_tz', TIMEZONES[idx].label);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-navy transition-colors"
      >
        <span className="font-mono text-lg font-bold text-text-primary-dark tabular-nums tracking-wider">
          {time}
        </span>
        <div className="flex flex-col items-start">
          <span className="text-[9px] leading-none text-text-secondary font-medium uppercase">
            {TIMEZONES[tzIndex].label}
          </span>
          <ChevronDown size={10} className="text-text-secondary" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-surface-dark border border-border-dark rounded-lg shadow-modal py-1 z-50">
          {TIMEZONES.map((tz, i) => (
            <button
              key={tz.label}
              onClick={() => selectTz(i)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm transition-colors',
                i === tzIndex
                  ? 'text-electric bg-electric/10'
                  : 'text-text-secondary hover:text-text-primary-dark hover:bg-navy'
              )}
            >
              {tz.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
