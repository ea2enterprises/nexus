'use client';

import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm',
          'bg-navy border border-border-dark',
          'text-text-primary-dark placeholder:text-text-secondary/50',
          'focus:outline-none focus:ring-2 focus:ring-electric focus:border-electric',
          'transition-colors duration-200',
          error && 'border-loss focus:ring-loss',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  );
}
