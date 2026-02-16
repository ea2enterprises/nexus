'use client';

import { Badge } from '@/components/ui/Badge';
import { INSTRUMENTS } from '@nexus/shared';

interface TradeFiltersProps {
  selectedInstrument: string | null;
  selectedResult: string | null;
  onInstrumentChange: (instrument: string | null) => void;
  onResultChange: (result: string | null) => void;
}

export function TradeFilters({
  selectedInstrument, selectedResult, onInstrumentChange, onResultChange
}: TradeFiltersProps) {
  const instruments = ['All', ...INSTRUMENTS];
  const results = ['All', 'win', 'loss'];

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div>
        <p className="text-xs text-text-secondary mb-1.5">Instrument</p>
        <div className="flex flex-wrap gap-1">
          {instruments.map((inst) => (
            <button
              key={inst}
              onClick={() => onInstrumentChange(inst === 'All' ? null : inst)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                (inst === 'All' && !selectedInstrument) || selectedInstrument === inst
                  ? 'bg-electric text-white'
                  : 'bg-surface-dark text-text-secondary hover:text-text-primary-dark border border-border-dark'
              }`}
            >
              {inst}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-text-secondary mb-1.5">Result</p>
        <div className="flex gap-1">
          {results.map((r) => (
            <button
              key={r}
              onClick={() => onResultChange(r === 'All' ? null : r)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                (r === 'All' && !selectedResult) || selectedResult === r
                  ? 'bg-electric text-white'
                  : 'bg-surface-dark text-text-secondary hover:text-text-primary-dark border border-border-dark'
              }`}
            >
              {r === 'All' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
