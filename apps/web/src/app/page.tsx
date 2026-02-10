'use client';

import { useEffect, useState } from 'react';
import { AccountOverview } from '@/components/dashboard/AccountOverview';
import { EquityCurve } from '@/components/dashboard/EquityCurve';
import { ActivePositions } from '@/components/dashboard/ActivePositions';
import { RiskStatus } from '@/components/dashboard/RiskStatus';
import { SignalCard } from '@/components/signals/SignalCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useSocket } from '@/hooks/use-socket';
import { useAppStore } from '@/stores/app.store';
import { apiGet, apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, setRiskProfile, setMartingaleStates, setSignals } = useAppStore();
  const { signals, riskProfile, martingaleStates } = useAppStore();

  const [dashboard, setDashboard] = useState<any>(null);
  const [equityData, setEquityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSocket();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    async function load() {
      try {
        const [dashRes, eqRes] = await Promise.all([
          apiGet('/dashboard'),
          apiGet('/dashboard/equity-curve?period=30'),
        ]);

        if (dashRes.success) {
          setDashboard(dashRes.data);
          if (dashRes.data.risk_profile) setRiskProfile(dashRes.data.risk_profile);
          if (dashRes.data.martingale_states) setMartingaleStates(dashRes.data.martingale_states);
          if (dashRes.data.recent_signals) setSignals(dashRes.data.recent_signals);
        }
        if (eqRes.success) setEquityData(eqRes.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAuthenticated, router, setRiskProfile, setMartingaleStates, setSignals]);

  const handleExecute = async (signalId: string) => {
    try {
      await apiPost('/trades/execute', { signal_id: signalId });
    } catch (err) {
      console.error('Execution failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <CardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const stats = dashboard?.daily_stats || {};
  const positions = dashboard?.active_positions || [];

  return (
    <div className="space-y-6">
      {/* Account Overview Cards */}
      <AccountOverview
        balance={Number(stats.ending_equity) || 10000}
        equity={Number(stats.ending_equity) || 10000}
        todayPnl={Number(stats.net_pnl) || 0}
        openPnl={positions.reduce((s: number, p: any) => s + (Number(p.pnl_usd) || 0), 0)}
        winRate7d={dashboard?.win_rate_7d || 0}
        freeMargin={Number(stats.ending_equity) || 10000}
      />

      {/* Equity Curve */}
      <EquityCurve data={equityData} />

      {/* Two Column: Positions + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivePositions positions={positions} />
        <RiskStatus
          riskProfile={riskProfile}
          martingaleStates={martingaleStates}
          totalExposure={dashboard?.total_exposure || 0}
          dailyDrawdown={Number(stats.max_drawdown_percent) || 0}
          isHalted={stats.is_halted || false}
        />
      </div>

      {/* Recent Signals */}
      {signals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Recent Signals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {signals.slice(0, 3).map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onExecute={handleExecute}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
