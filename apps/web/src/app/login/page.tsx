'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/app.store';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiPost('/auth/login', { email, password });

      if (res.success) {
        setTokens(res.data.tokens.access_token, res.data.tokens.refresh_token);
        setUser(res.data.user);
        router.push('/');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy p-4">
      <Card className="w-full max-w-md" padding="lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-electric flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="text-2xl font-bold text-text-primary-dark">NEXUS</span>
        </div>

        <h1 className="text-xl font-bold text-text-primary-dark text-center mb-2">Welcome back</h1>
        <p className="text-sm text-text-secondary text-center mb-6">Sign in to your trading account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          {error && (
            <p className="text-sm text-loss text-center">{error}</p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="text-sm text-text-secondary text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-electric hover:underline">
            Create one
          </Link>
        </p>

        {/* Demo login hint */}
        <div className="mt-4 p-3 rounded-lg bg-navy border border-border-dark text-center">
          <p className="text-xs text-text-secondary">
            Demo: <span className="font-mono text-text-primary-dark">demo@nexus.dev</span> / <span className="font-mono text-text-primary-dark">nexus123!</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
