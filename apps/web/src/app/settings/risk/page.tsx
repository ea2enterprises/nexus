'use client';

import { useEffect, useState } from 'react';
import { PresetSelector } from '@/components/risk/PresetSelector';
import { RiskConfigurator } from '@/components/risk/RiskConfigurator';
import { WorstCaseCalc } from '@/components/risk/WorstCaseCalc';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useRiskProfile } from '@/hooks/use-risk-profile';
import { useAppStore } from '@/stores/app.store';
import { apiGet } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { RiskProfile } from '@nexus/shared';

export default function RiskSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, setRiskProfile } = useAppStore();
  const profile = useRiskProfile();
  const [localProfile, setLocalProfile] = useState<RiskProfile | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (profile) setLocalProfile(profile);
  }, [profile]);

  const refreshProfile = async () => {
    const res = await apiGet('/risk/profile');
    if (res.success) {
      setRiskProfile(res.data);
      setLocalProfile(res.data);
    }
  };

  if (!localProfile) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-text-primary-dark">Risk Configuration</h1>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary-dark">Risk Configuration</h1>
        <p className="text-sm text-text-secondary mt-1">
          Changes take effect at the next daily reset (00:00 UTC)
        </p>
      </div>

      {/* Presets */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Quick Presets
        </h2>
        <PresetSelector currentProfile={localProfile.profile_name} onApply={refreshProfile} />
      </div>

      {/* Worst Case Calculator */}
      <WorstCaseCalc
        baseRisk={Number(localProfile.base_risk_percent)}
        martingaleEnabled={localProfile.martingale_enabled}
        martingaleSteps={localProfile.martingale_steps}
        martingaleMultiplier={Number(localProfile.martingale_multiplier)}
        maxExposure={Number(localProfile.max_concurrent_exposure)}
      />

      {/* Full Configurator */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Custom Configuration
        </h2>
        <RiskConfigurator
          profile={localProfile}
          onUpdate={(updated) => {
            setRiskProfile(updated);
            setLocalProfile(updated);
          }}
        />
      </div>
    </div>
  );
}
