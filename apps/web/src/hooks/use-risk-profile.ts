'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app.store';
import { apiGet } from '@/lib/api';

export function useRiskProfile() {
  const { riskProfile, setRiskProfile, isAuthenticated } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchProfile() {
      try {
        const res = await apiGet('/risk/profile');
        if (res.success) {
          setRiskProfile(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch risk profile:', err);
      }
    }

    fetchProfile();
  }, [isAuthenticated, setRiskProfile]);

  return riskProfile;
}
