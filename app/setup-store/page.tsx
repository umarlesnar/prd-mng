'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LuStore, LuArrowRight, LuLayoutDashboard, LuCheck } from 'react-icons/lu';

export default function SetupStorePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    serial_prefix: '',
  });

  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    if (step === 1) {
      if (!formData.store_name.trim()) {
        setError('Store name is required');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.store_phone && formData.store_phone.length < 10) {
        setError('Phone number must be at least 10 digits');
        return;
      }
      if (!formData.serial_prefix.trim()) {
        setError('Serial prefix is required');
        return;
      }
      await finishSetup();
    }
  };

  const finishSetup = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const res = await fetch('/api/stores/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...formData, user_id: userId}),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Setup failed');
      }
      
      setStep(3);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center pt-20 px-4">
      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= i ? 'bg-primary-600 text-white shadow-lg scale-110' : 'bg-neutral-200 text-neutral-500'
            }`}>
              {step > i ? <LuCheck /> : i}
            </div>
            {i < 3 && <div className={`w-12 h-1 mx-2 rounded-full transition-colors ${step > i ? 'bg-primary-600' : 'bg-neutral-200'}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">
            {step === 1 && "Name your Store"}
            {step === 2 && "Final Details"}
            {step === 3 && "You're all set!"}
          </h1>
          <p className="text-neutral-500 mt-2">
            {step === 1 && "Let's give your new workspace a identity."}
            {step === 2 && "Just a few more details to customize your experience."}
            {step === 3 && "Redirecting you to your dashboard..."}
          </p>
        </div>

        <Card className="shadow-2xl border-0 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary-500 to-purple-600 w-full"></div>
          <CardContent className="p-8">
            
            {step === 1 && (
              <form onSubmit={handleNext} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                    <LuStore className="w-10 h-10" />
                  </div>
                </div>
                <Input 
                  label="Store Name" 
                  placeholder="e.g. Tech World Electronics"
                  className="text-lg"
                  autoFocus
                  value={formData.store_name}
                  onChange={(e) => setFormData({...formData, store_name: e.target.value})}
                  required 
                />
                <Button type="submit" className="w-full h-12 text-lg">
                  Next Step <LuArrowRight className="ml-2" />
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleNext} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <Input 
                  label="Business Address (Optional)" 
                  placeholder="City, Country"
                  value={formData.store_address}
                  onChange={(e) => setFormData({...formData, store_address: e.target.value})}
                />
                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Phone" 
                        placeholder="+1 234..."
                        value={formData.store_phone}
                        onChange={(e) => setFormData({...formData, store_phone: e.target.value})}
                    />
                    <Input 
                        label="Serial Prefix" 
                        placeholder="PRD"
                        value={formData.serial_prefix}
                        onChange={(e) => setFormData({...formData, serial_prefix: e.target.value})}
                        maxLength={4}
                    />
                 </div>
                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">
                        Back
                    </Button>
                    <Button type="submit" className="flex-[2] h-12" loading={loading}>
                        Complete Setup
                    </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="text-center py-8 animate-pulse">
                 <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <LuCheck className="w-8 h-8 text-green-600" />
                 </div>
                 <h3 className="text-xl font-bold text-neutral-900">Setup Complete!</h3>
                 <p className="text-neutral-500 mt-2">Preparing your dashboard...</p>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}