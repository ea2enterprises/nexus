'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Radio, BookOpen, Settings, TrendingUp
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/signals', label: 'Signals', icon: Radio },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-56 fixed left-0 top-14 bottom-0 bg-surface-dark border-r border-border-dark py-4 px-3">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-electric/10 text-electric'
                  : 'text-text-secondary hover:text-text-primary-dark hover:bg-navy'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Paper Trading Badge */}
      <div className="mt-auto mx-1 p-3 rounded-lg bg-navy border border-border-dark">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-caution" />
          <span className="text-xs font-medium text-text-primary-dark">Paper Trading</span>
        </div>
        <div className="w-full h-1.5 bg-border-dark rounded-full overflow-hidden">
          <div className="h-full bg-electric rounded-full" style={{ width: '30%' }} />
        </div>
        <p className="text-xs text-text-secondary mt-1">15/50 trades to unlock live</p>
      </div>
    </aside>
  );
}
