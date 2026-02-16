'use client';

import { cn } from '@/lib/utils';
import { INSTRUMENTS } from '@nexus/shared';

interface SignalFiltersProps {
  instrument: string | null;
  direction: string | null;
  signalType: string | null;
  sortBy: 'time' | 'confidence';
  onInstrumentChange: (v: string | null) => void;
  onDirectionChange: (v: string | null) => void;
  onSignalTypeChange: (v: string | null) => void;
  onSortChange: (v: 'time' | 'confidence') => void;
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
        active
          ? 'bg-electric text-white'
          : 'bg-border-dark text-text-secondary hover:text-text-primary-dark'
      )}
    >
      {label}
    </button>
  );
}

export function SignalFilters({
  instrument, direction, signalType, sortBy,
  onInstrumentChange, onDirectionChange, onSignalTypeChange, onSortChange,
}: SignalFiltersProps) {
  return (
    <div className="space-y-2">
      {/* Instrument filter */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill label="All Pairs" active={instrument === null} onClick={() => onInstrumentChange(null)} />
        {INSTRUMENTS.map((pair) => (
          <FilterPill key={pair} label={pair} active={instrument === pair} onClick={() => onInstrumentChange(pair)} />
        ))}
      </div>

      {/* Direction + Type + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <FilterPill label="All" active={direction === null} onClick={() => onDirectionChange(null)} />
          <FilterPill label="BUY" active={direction === 'BUY'} onClick={() => onDirectionChange('BUY')} />
          <FilterPill label="SELL" active={direction === 'SELL'} onClick={() => onDirectionChange('SELL')} />
        </div>

        <div className="w-px h-4 bg-border-dark" />

        <div className="flex gap-1.5">
          <FilterPill label="All" active={signalType === null} onClick={() => onSignalTypeChange(null)} />
          <FilterPill label="Turbo" active={signalType === 'TURBO'} onClick={() => onSignalTypeChange('TURBO')} />
          <FilterPill label="Short" active={signalType === 'SHORT'} onClick={() => onSignalTypeChange('SHORT')} />
        </div>

        <div className="w-px h-4 bg-border-dark" />

        <div className="flex gap-1.5">
          <FilterPill label="Newest" active={sortBy === 'time'} onClick={() => onSortChange('time')} />
          <FilterPill label="Confidence" active={sortBy === 'confidence'} onClick={() => onSortChange('confidence')} />
        </div>
      </div>
    </div>
  );
}
