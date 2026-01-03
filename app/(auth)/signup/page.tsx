'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LuArrowRight } from 'react-icons/lu';
import { PhoneInputField } from '@/components/ui/PhoneInputField';
import { showToast } from '@/components/ui/Toast';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    store_name: '',
    store_address: '',
    store_phone: '',
    serial_prefix: '',
    serial_suffix: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.full_name.trim()) {
      setError('Full name is required');
      setLoading(false);
      return;
    }
    if (!formData.email.includes('@')) {
      setError('Invalid email address');
      setLoading(false);
      return;
    }
    if (!formData.phone || formData.phone.length < 10) {
      setError('Phone number must be at least 10 digits');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          store_phone: formData.store_phone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Signup failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      if (data.store?.id) {
        localStorage.setItem('currentStoreId', data.store.id);
      }
      document.cookie = `token=${data.token}; path=/; max-age=604800`;
      
      showToast('Account created successfully! Redirecting...', 'success');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900">Create Account</h1>
          <p className="mt-2 text-neutral-600">Start your journey with us</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}
              
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <PhoneInputField
                label="Phone"
                value={formData.phone}
                onChange={(phone) => setFormData({ ...formData, phone })}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <div className="pt-2 border-t border-neutral-200">
                <p className="text-sm font-semibold text-neutral-700 mb-3">Store Information</p>
                <Input
                  label="Store Name"
                  placeholder="Your Store Name"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  required
                />
                <Input
                  label="Store Address (Optional)"
                  placeholder="City, Country"
                  value={formData.store_address}
                  onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                />
                <PhoneInputField
                  label="Store Phone (Optional)"
                  value={formData.store_phone}
                  onChange={(phone) => setFormData({ ...formData, store_phone: phone })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Serial Prefix"
                    placeholder="PRD"
                    value={formData.serial_prefix}
                    onChange={(e) => setFormData({ ...formData, serial_prefix: e.target.value.toUpperCase() })}
                    maxLength={4}
                    required
                  />
                  <Input
                    label="Serial Suffix (Optional)"
                    placeholder="2024"
                    value={formData.serial_suffix}
                    onChange={(e) => setFormData({ ...formData, serial_suffix: e.target.value.toUpperCase() })}
                    maxLength={10}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11" loading={loading}>
                <span>Get Started</span>
                <LuArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-neutral-600">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
