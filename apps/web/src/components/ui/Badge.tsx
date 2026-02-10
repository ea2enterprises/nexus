'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'profit' | 'loss' | 'caution' | 'electric' | 'halt';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-border-dark text-text-secondary',
  profit: 'bg-profit-bg text-profit',
  loss: 'bg-loss-bg text-loss',
  caution: 'bg-caution-bg text-caution',
  electric: 'bg-electric/10 text-electric',
  halt: 'bg-loss-bg text-halt',
};

export function Badge({ children, variant = 'default', className, pulse = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant],
        pulse && 'animate-pulse-signal',
        className
      )}
    >
      {children}
    </span>
  );
}
