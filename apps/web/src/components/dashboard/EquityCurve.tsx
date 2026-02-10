'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { useState, useEffect, useRef } from 'react';

interface DataPoint {
  date: string;
  ending_equity: number;
}

interface EquityCurveProps {
  data: DataPoint[];
}

export function EquityCurve({ data }: EquityCurveProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // Use lightweight-charts if available, otherwise render SVG
    const container = chartRef.current;
    const width = container.clientWidth;
    const height = 200;

    const values = data.map(d => d.ending_equity);
    const minVal = Math.min(...values) * 0.99;
    const maxVal = Math.max(...values) * 1.01;
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((d.ending_equity - minVal) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const isProfit = values.length > 1 && values[values.length - 1] >= values[0];
    const color = isProfit ? '#00C48C' : '#FF4757';

    container.innerHTML = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="eq-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="0,${height} ${points} ${width},${height}" fill="url(#eq-gradient)" />
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />
      </svg>
    `;
  }, [data]);

  const periods = [
    { label: '7D', value: '7' as const },
    { label: '1M', value: '30' as const },
    { label: '3M', value: '90' as const },
    { label: 'ALL', value: 'all' as const },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
        <div className="flex gap-1">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                period === p.value
                  ? 'bg-electric text-white'
                  : 'text-text-secondary hover:text-text-primary-dark'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <div ref={chartRef} className="w-full min-h-[200px]" />
    </Card>
  );
}
