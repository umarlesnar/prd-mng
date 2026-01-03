'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LuShieldCheck } from 'react-icons/lu';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
  
      if (!formData.email.includes('@')) {
        setError('Invalid email address');
        setLoading(false);
        return;
      }
      if (!formData.password) {
        setError('Password is required');
        setLoading(false);
        return;
      }
  
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
  
        const data = await res.json();
  
        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }
  
        localStorage.setItem('token', data.token);
        
        if (data.accountType === 'user_account') {
          localStorage.setItem('userId', data.user.id);
          if (data.store) {
            localStorage.setItem('currentStoreId', data.store._id || data.store);
          }
          if (data.needsStore) {
            router.push('/setup-store');
            return;
          }
        } else {
          localStorage.setItem('storeUserId', data.storeUser.id);
          if (data.store) {
            localStorage.setItem('currentStoreId', data.store._id || data.store);
          }
        }
        
        document.cookie = `token=${data.token}; path=/; max-age=604800`;
        
        // Redirect to dashboard
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 mb-4 shadow-lg">
            <LuShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Welcome Back</h1>
          <p className="text-neutral-600">Sign in to your Product Management System</p>
        </div>

        <Card className="shadow-xl border-neutral-200">
           <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-neutral-700">Password</label>
                  <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full h-11 text-base" loading={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-neutral-500">New to Product Management System?</span>
                </div>
              </div>

              <Link href="/signup">
                <Button type="button" variant="outline" className="w-full h-11 text-base">
                  Create Account
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-neutral-500 mt-6">
          © 2024 Warranty Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
