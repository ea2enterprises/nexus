'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PresetSelector } from '@/components/risk/PresetSelector';
import { useAppStore } from '@/stores/app.store';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { CheckCircle, Shield, TrendingUp, Zap, Target } from 'lucide-react';

const steps = [
  { title: 'Welcome to NEXUS', icon: Zap, description: 'Your autonomous trading intelligence platform' },
  { title: 'Choose Risk Profile', icon: Shield, description: 'Select a risk preset that matches your trading style' },
  { title: 'Connect Broker', icon: Target, description: 'Link your trading account or start with paper trading' },
  { title: 'Paper Trading', icon: TrendingUp, description: 'Complete 50 trades to unlock live execution' },
  { title: 'Ready to Trade', icon: CheckCircle, description: 'Your account is set up and ready' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step >= steps.length - 1) {
      router.push('/');
      return;
    }
    setStep(step + 1);
  };

  const handleSetupMockBroker = async () => {
    try {
      await apiPost('/broker/connections', { broker_name: 'mock' });
    } catch (err) {
      console.error('Failed to setup mock broker:', err);
    }
    handleNext();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy p-4">
      <Card className="w-full max-w-2xl" padding="lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-electric w-8' : 'bg-border-dark w-4'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-electric/10 mb-4">
            {(() => {
              const Icon = steps[step].icon;
              return <Icon size={32} className="text-electric" />;
            })()}
          </div>
          <h1 className="text-2xl font-bold text-text-primary-dark mb-2">
            {steps[step].title}
          </h1>
          <p className="text-text-secondary">{steps[step].description}</p>
          <Badge variant="default" className="mt-2">Step {step + 1} of {steps.length}</Badge>
        </div>

        {/* Step-specific content */}
        {step === 0 && (
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Real-time Signals', desc: '3-confirmation rule' },
                { label: 'Auto Execution', desc: 'Hands-free trading' },
                { label: 'Risk Management', desc: 'Disciplined approach' },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-lg bg-navy border border-border-dark text-center">
                  <p className="text-sm font-medium text-text-primary-dark">{f.label}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mb-8">
            <PresetSelector onApply={handleNext} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 mb-8">
            <div onClick={handleSetupMockBroker} className="cursor-pointer">
              <Card hover className="border-electric/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-electric/10">
                    <TrendingUp size={20} className="text-electric" />
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary-dark">Paper Trading (Recommended)</h3>
                    <p className="text-xs text-text-secondary">Start with $10,000 simulated balance</p>
                  </div>
                </div>
              </Card>
            </div>
            <div className="opacity-50">
              <Card hover>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface-dark">
                    <Target size={20} className="text-text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary-dark">Connect Real Broker</h3>
                    <p className="text-xs text-text-secondary">Available after 50 paper trades</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center mb-8">
            <div className="w-full h-3 bg-navy rounded-full overflow-hidden mb-3">
              <div className="h-full bg-electric rounded-full" style={{ width: '0%' }} />
            </div>
            <p className="text-sm text-text-secondary">0/50 paper trades completed</p>
            <p className="text-xs text-text-secondary mt-1">
              Execute signals from the dashboard to progress
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="text-center mb-8">
            <p className="text-text-secondary">
              Your paper trading account is active. Start executing signals to build your track record.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
          ) : <div />}
          {step !== 1 && step !== 2 && (
            <Button variant="primary" onClick={handleNext}>
              {step >= steps.length - 1 ? 'Go to Dashboard' : 'Continue'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
