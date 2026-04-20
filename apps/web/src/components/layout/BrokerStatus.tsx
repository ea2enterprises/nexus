'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app.store';
import { Wifi, WifiOff, AlertTriangle, X, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function BrokerStatus() {
  const { brokerConnected, brokerIsDemo, brokerDisconnectReason, accessToken, setBrokerConnected } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [ssid, setSsid] = useState('');
  const [isDemo, setIsDemo] = useState(true);
  const [showSsid, setShowSsid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsAttention = !brokerConnected && brokerDisconnectReason;
  const label = brokerConnected
    ? brokerIsDemo ? 'DEMO' : 'LIVE'
    : 'PAPER';

  const handleConnect = async () => {
    if (!ssid.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/broker/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ssid: ssid.trim(), is_demo: isDemo }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Connection failed');
        return;
      }

      setBrokerConnected(true, isDemo);
      setSsid('');
      setShowModal(false);
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Status badge */}
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
          brokerConnected
            ? brokerIsDemo
              ? 'bg-caution/10 border-caution/30 text-caution hover:bg-caution/20'
              : 'bg-profit/10 border-profit/30 text-profit hover:bg-profit/20'
            : needsAttention
            ? 'bg-loss/10 border-loss/30 text-loss hover:bg-loss/20 animate-pulse'
            : 'bg-surface-dark border-border-dark text-text-secondary hover:bg-navy'
        }`}
        title={needsAttention ? `Disconnected: ${brokerDisconnectReason}` : 'Broker connection'}
      >
        {brokerConnected ? (
          <Wifi size={12} />
        ) : needsAttention ? (
          <AlertTriangle size={12} />
        ) : (
          <WifiOff size={12} />
        )}
        {label}
      </button>

      {/* SSID modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-dark border border-border-dark rounded-xl shadow-modal w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-text-primary-dark">Connect Pocket Option</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {needsAttention
                    ? `Reconnect required: ${brokerDisconnectReason === 'ssid_expired' ? 'SSID expired' : 'Connection lost'}`
                    : 'Enter your session SSID to enable live trading'}
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); setError(null); }}
                className="p-1.5 rounded-lg hover:bg-navy text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-navy rounded-lg p-3 mb-4 text-xs text-text-secondary space-y-1">
              <p className="font-medium text-text-primary-dark">How to get your SSID:</p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Log in to <span className="text-electric">pocketoption.com</span> in your browser</li>
                <li>Open DevTools (F12) → Application → Cookies</li>
                <li>Find <span className="font-mono bg-black/30 px-1 rounded">pocketoption.com</span></li>
                <li>Copy the value of the <span className="font-mono bg-black/30 px-1 rounded">ssid</span> cookie</li>
              </ol>
            </div>

            {/* SSID input */}
            <div className="mb-4">
              <label className="block text-xs text-text-secondary mb-1.5">SSID Cookie Value</label>
              <div className="relative">
                <input
                  type={showSsid ? 'text' : 'password'}
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  placeholder="Paste your ssid value here..."
                  className="w-full bg-navy border border-border-dark rounded-lg px-3 py-2.5 pr-10 text-sm text-text-primary-dark placeholder-text-secondary/50 focus:outline-none focus:border-electric transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSsid(!showSsid)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary-dark"
                >
                  {showSsid ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Demo / Live toggle */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs text-text-secondary">Account type:</span>
              <div className="flex rounded-lg overflow-hidden border border-border-dark">
                <button
                  onClick={() => setIsDemo(true)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    isDemo ? 'bg-caution/20 text-caution' : 'text-text-secondary hover:text-text-primary-dark hover:bg-navy'
                  }`}
                >
                  Demo
                </button>
                <button
                  onClick={() => setIsDemo(false)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    !isDemo ? 'bg-profit/20 text-profit' : 'text-text-secondary hover:text-text-primary-dark hover:bg-navy'
                  }`}
                >
                  Live
                </button>
              </div>
              {!isDemo && (
                <span className="text-xs text-loss">Real funds will be used</span>
              )}
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 bg-loss/10 border border-loss/30 rounded-lg text-xs text-loss">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setError(null); }}
                className="flex-1 px-4 py-2.5 border border-border-dark rounded-lg text-sm text-text-secondary hover:bg-navy transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={loading || !ssid.trim()}
                className="flex-1 px-4 py-2.5 bg-electric hover:bg-electric-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
