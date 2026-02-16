'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/app.store';

// ─── Persistent audio elements (pre-loaded from public WAV files) ───
let tickAudio: HTMLAudioElement | null = null;
let chimeAudio: HTMLAudioElement | null = null;
let initialized = false;

function ensureAudioElements() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  tickAudio = new Audio('/sounds/tick.wav');
  tickAudio.preload = 'auto';
  tickAudio.volume = 1.0;

  chimeAudio = new Audio('/sounds/chime.wav');
  chimeAudio.preload = 'auto';
  chimeAudio.volume = 1.0;
}

function playAudioElement(el: HTMLAudioElement | null) {
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

// ─── Exported: resume (unlocks autoplay for audio elements) ─────────
export async function resumeAudioContext(): Promise<boolean> {
  ensureAudioElements();
  if (tickAudio) {
    try {
      tickAudio.volume = 0;
      await tickAudio.play();
      tickAudio.pause();
      tickAudio.currentTime = 0;
      tickAudio.volume = 1.0;
    } catch { /* ignore */ }
  }
  useAppStore.getState().setAudioReady(true);
  return true;
}

// ─── Hook ───────────────────────────────────────────────────────────
export function useTradeAudio() {
  const lastTickRef = useRef(0);

  useEffect(() => {
    ensureAudioElements();
  }, []);

  const playTick = useCallback(() => {
    if (useAppStore.getState().isMuted) return;
    const now = Date.now();
    if (now - lastTickRef.current < 800) return;
    lastTickRef.current = now;
    playAudioElement(tickAudio);
  }, []);

  const playChime = useCallback(() => {
    if (useAppStore.getState().isMuted) return;
    playAudioElement(chimeAudio);
  }, []);

  return { playTick, playChime };
}
