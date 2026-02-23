'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfidenceBadge } from './ConfidenceBadge';
import { CountdownTimer } from './CountdownTimer';
import { MartingaleWidget } from '@/components/risk/MartingaleWidget';
import { formatPrice, formatDuration, cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app.store';
import { useTradeAudio } from '@/hooks/use-trade-audio';
import { useWallClockSeconds } from '@/hooks/useWallClockSeconds';
import { ArrowUpRight, ArrowDownRight, Clock, Copy, Check, Radio } from 'lucide-react';
import type { Signal } from '@nexus/shared';

interface SignalCardProps {
  signal: Signal;
  onExecute?: (signalId: string) => void;
  onViewDetail?: (signalId: string) => void;
}

export function SignalCard({ signal, onExecute, onViewDetail }: SignalCardProps) {
  const { riskProfile } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isTracking, setIsTracking] = useState(signal.status === 'executed');
  const now = useWallClockSeconds();
  const { playTick, playChime } = useTradeAudio();
  const lastTickSecRef = useRef(-1);
  const chimedRef = useRef(false);
  const isBuy = signal.direction === 'BUY';
  const instrument = signal.instrument;

  const copyStrike = useCallback(() => {
    const price = formatPrice(Number(signal.strike_price), instrument);
    navigator.clipboard.writeText(price).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [signal.strike_price, instrument]);

  const startTime = new Date(signal.start_time).getTime();
  const expiresAt = startTime + signal.expiration_seconds * 1000;
  const timeToStart = startTime - now;
  const isPreparing = timeToStart > 0;
  const isFinal5 = isPreparing && timeToStart <= 5000;
  const isLive = !isPreparing && now < expiresAt;
  const timeIntoLive = now - startTime;
  const isGracePeriod = isLive && timeIntoLive <= 15000;
  const isWindowClosed = isLive && timeIntoLive > 15000;

  // Sync tracking state when backend confirms execution
  useEffect(() => {
    if (signal.status === 'executed') setIsTracking(true);
  }, [signal.status]);

  // Derived: is this card in live tracking mode? (tracking + past start time + before expiry)
  const isLiveTracking = isTracking && !isPreparing && now < expiresAt;
  const candleRemaining = Math.max(0, expiresAt - now);
  const candleFraction = signal.expiration_seconds * 1000 > 0
    ? candleRemaining / (signal.expiration_seconds * 1000)
    : 0;

  // A signal is truly "expired" only if past the grace window AND not being tracked
  const isExpired = !isPreparing && !isLive && !isTracking;
  // Candle fully resolved (tracking complete)
  const isResolved = isTracking && now >= expiresAt;

  // Audio triggers
  useEffect(() => {
    if (signal.status !== 'active') return;

    // Final 5 countdown ticks
    if (isFinal5) {
      const secLeft = Math.ceil(timeToStart / 1000);
      if (secLeft !== lastTickSecRef.current) {
        lastTickSecRef.current = secLeft;
        playTick();
      }
    }

    // Chime when going live
    if (isLive && !chimedRef.current) {
      chimedRef.current = true;
      playChime();
    }
  }, [now, signal.status, isFinal5, isLive, timeToStart, playTick, playChime]);

  // Compute background class based on phase
  const isActiveOrTracked = signal.status === 'active' || isTracking;
  const phaseClass = isActiveOrTracked
    ? isLiveTracking
      ? isBuy ? 'signal-live-buy' : 'signal-live-sell'
      : isPreparing && !isFinal5
        ? 'animate-pulse-prepare'
        : isFinal5 && isBuy
          ? 'animate-flash-buy'
          : isFinal5 && !isBuy
            ? 'animate-flash-sell'
            : isLive && isBuy
              ? 'signal-live-buy'
              : isLive && !isBuy
                ? 'signal-live-sell'
                : ''
    : '';

  return (
    <Card hover className={cn('animate-slide-in', phaseClass)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPreparing && !isTracking && (
            <Badge variant="caution" pulse>PREPARE</Badge>
          )}
          {isLiveTracking ? (
            <Badge variant="electric" pulse>TRACKING</Badge>
          ) : isResolved ? (
            <Badge variant="default">RESOLVING</Badge>
          ) : (
            <Badge variant={signal.status === 'active' ? 'profit' : 'default'} pulse={signal.status === 'active' && !isPreparing}>
              {signal.status === 'active' ? (isPreparing ? 'PENDING' : 'LIVE') : signal.status.toUpperCase()}
            </Badge>
          )}
          <Badge variant="electric">{signal.signal_type}</Badge>
          <Badge variant="default">
            <Clock size={10} className="mr-0.5" />
            {formatDuration(signal.expiration_seconds)}
          </Badge>
        </div>
        <ConfidenceBadge confidence={signal.confidence} />
      </div>

      {/* Direction + Instrument + Payout */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isBuy ? (
            <ArrowUpRight size={24} className="text-profit" />
          ) : (
            <ArrowDownRight size={24} className="text-loss" />
          )}
          <span className={cn('text-lg font-bold', isBuy ? 'text-profit' : 'text-loss')}>
            {signal.direction}
          </span>
          <span className="text-lg font-bold text-text-primary-dark">{instrument}</span>
        </div>
        <div className="flex items-center gap-1 bg-profit/15 border border-profit/30 rounded-lg px-3 py-1">
          <span className="text-xs text-profit/80 font-medium">PAYOUT</span>
          <span className="text-lg font-bold text-profit tabular-nums">{signal.payout_percent}%</span>
        </div>
      </div>

      {/* Strike Price + Payout */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Strike Price</span>
          <button
            onClick={copyStrike}
            className="group flex items-center gap-1.5 font-mono text-text-primary-dark tabular-nums hover:text-electric transition-colors"
            title="Click to copy"
          >
            {formatPrice(Number(signal.strike_price), instrument)}
            {copied ? (
              <Check size={12} className="text-profit" />
            ) : (
              <Copy size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            )}
          </button>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Size</span>
          <span className="font-mono text-text-primary-dark tabular-nums">
            {signal.position_size_percent}%
          </span>
        </div>
      </div>

      {/* Countdown Timer / Live Tracking Progress */}
      <div className="mb-4">
        {isLiveTracking ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-electric">
                <Radio size={12} className="animate-pulse" />
                Live Tracking
              </span>
              <span className="font-mono font-bold tabular-nums text-electric">
                {Math.ceil(candleRemaining / 1000)}s
              </span>
            </div>
            <div className="w-full h-1.5 bg-border-dark rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 bg-electric"
                style={{ width: `${Math.max(0, candleFraction * 100)}%` }}
              />
            </div>
          </div>
        ) : isResolved ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Awaiting Result</span>
              <span className="font-mono font-bold tabular-nums text-caution animate-pulse">
                RESOLVING...
              </span>
            </div>
            <div className="w-full h-1.5 bg-border-dark rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-caution animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        ) : (
          <CountdownTimer startTime={startTime} expiresAt={expiresAt} totalSeconds={signal.expiration_seconds} />
        )}
      </div>

      {/* Martingale Step */}
      <div className="mb-4">
        <MartingaleWidget
          step={signal.martingale_step || '0'}
          baseRisk={riskProfile?.base_risk_percent ?? 5}
          payoutPercent={Number(signal.payout_percent)}
        />
      </div>

      {/* Confirming Strategies */}
      <div className="flex flex-wrap gap-1 mb-4">
        {signal.confirming_strategies.map((s) => (
          <Badge key={s} variant="default">{s}</Badge>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onExecute && (() => {
          const handleTrack = () => {
            setIsTracking(true);
            onExecute(signal.id);
          };

          // Tracking in progress (clicked or backend confirmed)
          if (isTracking && now < expiresAt) {
            return (
              <Button variant="primary" size="sm" className="flex-1 animate-pulse" disabled>
                Tracking...
              </Button>
            );
          }
          // Tracking complete, awaiting resolution
          if (isResolved) {
            return (
              <Button variant="secondary" size="sm" className="flex-1 animate-pulse" disabled>
                Awaiting Result...
              </Button>
            );
          }
          // Expired — only if NOT tracking and past grace period
          if (isExpired) {
            return (
              <Button variant="secondary" size="sm" className="flex-1 opacity-50" disabled>
                Expired
              </Button>
            );
          }
          // Window closed (live, past 15s, not tracked)
          if (isWindowClosed && !isTracking) {
            return (
              <Button variant="secondary" size="sm" className="flex-1 opacity-50" disabled>
                Window Closed
              </Button>
            );
          }
          // Entry window open (final 5s of prep or first 15s of live)
          if (signal.status === 'active' && (isFinal5 || isGracePeriod)) {
            return (
              <Button variant="primary" size="sm" className="flex-1" onClick={handleTrack}>
                Track Trade
              </Button>
            );
          }
          // Pending (preparing, not final 5)
          if (signal.status === 'active' && isPreparing) {
            return (
              <Button variant="secondary" size="sm" className="flex-1 opacity-50" disabled>
                Track Trade
              </Button>
            );
          }
          return null;
        })()}
        {onViewDetail && (
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => onViewDetail(signal.id)}>
            View Analysis
          </Button>
        )}
      </div>
    </Card>
  );
}
