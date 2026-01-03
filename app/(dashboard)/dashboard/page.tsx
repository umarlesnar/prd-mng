'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/store-context'; // Import useStore
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  LuStore, 
  LuPackage, 
  LuShieldCheck, 
  LuClipboardList, 
  LuPackagePlus, 
  LuUserPlus, 
  LuFilePlus,
  LuBook,
  LuMessageCircle
} from 'react-icons/lu';

export const dynamic = 'force-dynamic';

function DashboardContent() {
  const { currentStore } = useStore(); // Get current store from context
  const [stats, setStats] = useState({
    stores: 0,
    products: 0,
    warranties: 0,
    claims: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      if (!currentStore?._id) return;

      const storeId = currentStore._id;
      
      try {
        const [storesRes, productsRes, warrantiesRes, claimsRes] = await Promise.all([
          fetch('/api/stores', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false, json: async () => ({ stores: [] }) })),
          // Pass storeId to these endpoints
          fetch(`/api/products?storeId=${storeId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false, json: async () => ({ total: 0 }) })),
          fetch(`/api/warranties?storeId=${storeId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false, json: async () => ({ total: 0 }) })),
          fetch(`/api/claims?storeId=${storeId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false, json: async () => ({ total: 0 }) })),
        ]);

        const stores = await storesRes.json();
        const products = await productsRes.json();
        const warranties = await warrantiesRes.json();
        const claims = await claimsRes.json();

        setStats({
          stores: stores.stores?.length || 0,
          products: products.total || 0,
          warranties: warranties.total || 0,
          claims: claims.total || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          stores: 0,
          products: 0,
          warranties: 0,
          claims: 0,
        });
      }
    };

    fetchStats();
  }, [currentStore]); // Add currentStore as dependency

  // Updated to use Icon components instead of strings
  const quickActions = [
    { icon: LuPackagePlus, name: 'Add Product', href: '/products', color: 'primary' },
    { icon: LuShieldCheck, name: 'Register Warranty', href: '/warranties', color: 'secondary' },
    { icon: LuUserPlus, name: 'Add Customer', href: '/customers', color: 'success' },
    { icon: LuFilePlus, name: 'File Claim', href: '/claims', color: 'warning' },
  ];

  return (
    <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">Welcome Back!</h1>
          <p className="text-neutral-600">Here's what's happening with your warranty business today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">
                <LuStore className="text-xl text-primary-600" />
                Total Stores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-neutral-900">{stats.stores}</p>
              <p className="text-xs text-neutral-500 mt-2">Active stores in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">
                <LuPackage className="text-xl text-primary-600" />
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-neutral-900">{stats.products}</p>
              <p className="text-xs text-neutral-500 mt-2">Products registered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">
                <LuShieldCheck className="text-xl text-primary-600" />
                Active Warranties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-neutral-900">{stats.warranties}</p>
              <p className="text-xs text-neutral-500 mt-2">Valid warranties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">
                <LuClipboardList className="text-xl text-primary-600" />
                Total Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-neutral-900">{stats.claims}</p>
              <p className="text-xs text-neutral-500 mt-2">Claims processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link key={action.name} href={action.href}>
                  <div className="p-6 border-2 border-dashed border-neutral-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 cursor-pointer group flex flex-col items-center text-center">
                    <action.icon className="text-4xl mb-3 text-neutral-400 group-hover:text-primary-600 group-hover:scale-110 transition-transform duration-200" />
                    <div className="text-sm font-semibold text-neutral-900 group-hover:text-primary-700">{action.name}</div>
                    <div className="text-xs text-neutral-500 mt-1">Quick access →</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-neutral-900">Set up your stores</p>
                  <p className="text-sm text-neutral-600 mt-1">Add your store locations and configurations</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-neutral-900">Register products</p>
                  <p className="text-sm text-neutral-600 mt-1">Add your product inventory to the system</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-neutral-900">Create warranties</p>
                  <p className="text-sm text-neutral-600 mt-1">Register customer warranties for your products</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-6">
                Our comprehensive documentation and support team are here to help you get the most out of the Warranty Management System.
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                  <LuBook className="w-4 h-4" />
                  View Documentation
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                  <LuMessageCircle className="w-4 h-4" />
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </DashboardLayout>
  );
}