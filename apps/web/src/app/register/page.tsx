'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/app.store';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAppStore();
  const [form, setForm] = useState({ email: '', password: '', display_name: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await apiPost('/auth/register', {
        email: form.email,
        password: form.password,
        display_name: form.display_name,
      });

      if (res.success) {
        setTokens(res.data.tokens.access_token, res.data.tokens.refresh_token);
        setUser(res.data.user);
        router.push('/onboarding');
      } else {
        setError(res.error || 'Registration failed');
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
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-electric flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="text-2xl font-bold text-text-primary-dark">NEXUS</span>
        </div>

        <h1 className="text-xl font-bold text-text-primary-dark text-center mb-2">Create your account</h1>
        <p className="text-sm text-text-secondary text-center mb-6">Start with $10,000 paper trading balance</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display Name"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="Your trading name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Min 8 characters"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Re-enter password"
            required
          />

          {error && <p className="text-sm text-loss text-center">{error}</p>}

          <div className="text-xs text-text-secondary">
            <label className="flex items-start gap-2">
              <input type="checkbox" required className="mt-0.5" />
              <span>
                I acknowledge that trading involves substantial risk of loss. Past performance does not
                guarantee future results. I have read and agree to the Terms of Service.
              </span>
            </label>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="text-sm text-text-secondary text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-electric hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
