'use client';

import { cn } from '@/lib/utils';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
}

export function Slider({ label, value, onChange, min, max, step = 0.5, unit = '%', description }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary-dark">{label}</label>
        <span className="text-sm font-mono text-electric tabular-nums">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-navy"
        style={{
          background: `linear-gradient(to right, #2D7FF9 0%, #2D7FF9 ${percentage}%, #2A3A52 ${percentage}%, #2A3A52 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-text-secondary">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
      {description && <p className="text-xs text-text-secondary">{description}</p>}
    </div>
  );
}
