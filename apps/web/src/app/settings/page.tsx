'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/app.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, User, Bell, Link2, Palette } from 'lucide-react';

const sections = [
  { href: '/settings/risk', label: 'Risk Configuration', description: 'Manage risk profiles, presets, and position sizing', icon: Shield },
  { href: '#', label: 'Profile & Security', description: 'Personal info, 2FA, session management', icon: User },
  { href: '#', label: 'Notifications', description: 'Signal alerts, execution confirmations, daily reports', icon: Bell },
  { href: '#', label: 'Broker Connections', description: 'Linked accounts, connection health', icon: Link2 },
  { href: '#', label: 'Appearance', description: 'Theme, language, chart colors', icon: Palette },
];

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary-dark">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link key={section.label} href={section.href}>
            <Card hover className="h-full">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-electric/10">
                  <section.icon size={20} className="text-electric" />
                </div>
                <div>
                  <h3 className="font-medium text-text-primary-dark">{section.label}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{section.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
