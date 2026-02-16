'use client';

import Link from 'next/link';
import { useAppStore } from '@/stores/app.store';
import { MartingaleWidget } from '@/components/risk/MartingaleWidget';
import { GlobalClock } from './GlobalClock';
import { resumeAudioContext } from '@/hooks/use-trade-audio';
import { Bell, LogOut, Settings, User, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Navbar() {
  const { user, isAuthenticated, logout, martingaleStates, riskProfile, isMuted, audioReady, toggleMute } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Find the most important martingale state (non-base)
  const activeState = martingaleStates.find(ms => ms.current_step !== '0') || martingaleStates[0];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-14 bg-surface-dark/95 backdrop-blur-sm border-b border-border-dark">
      <div className="h-full max-w-[1440px] mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-lg font-bold text-text-primary-dark hidden sm:block">NEXUS</span>
        </Link>

        {/* Center: Clock + Martingale */}
        <div className="flex items-center gap-4">
          {mounted && <GlobalClock />}
          {mounted && isAuthenticated && activeState && riskProfile && (
            <div className="hidden md:block">
              <MartingaleWidget
                step={activeState.current_step}
                baseRisk={Number(riskProfile.base_risk_percent)}
                payoutPercent={88}
              />
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {mounted && isAuthenticated ? (
            <>
              <button
                onClick={async () => {
                  await resumeAudioContext();
                  if (!audioReady) return;
                  toggleMute();
                }}
                className={`relative p-2 rounded-lg hover:bg-navy transition-colors ${
                  isMuted || !audioReady ? 'text-loss' : 'text-profit'
                }`}
                title={
                  !audioReady ? 'Click to enable sounds' : isMuted ? 'Unmute sounds' : 'Mute sounds'
                }
              >
                {isMuted || !audioReady ? <VolumeX size={18} /> : <Volume2 size={18} />}
                {!audioReady && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-caution rounded-full animate-pulse" />
                )}
              </button>
              <button className="p-2 rounded-lg hover:bg-navy text-text-secondary hover:text-text-primary-dark transition-colors">
                <Bell size={18} />
              </button>
              <Link href="/settings" className="p-2 rounded-lg hover:bg-navy text-text-secondary hover:text-text-primary-dark transition-colors">
                <Settings size={18} />
              </Link>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-navy transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-electric/20 flex items-center justify-center">
                    <User size={14} className="text-electric" />
                  </div>
                  <span className="text-sm text-text-primary-dark hidden sm:block">
                    {user?.display_name || 'User'}
                  </span>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface-dark border border-border-dark rounded-lg shadow-modal py-1">
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary-dark hover:bg-navy transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => { logout(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-loss hover:bg-navy transition-colors flex items-center gap-2"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 bg-electric hover:bg-electric-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
