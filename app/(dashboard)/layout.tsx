'use client';

import { StoreProvider } from '@/context/store-context';

export const dynamic = 'force-dynamic';

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
        {children}
    </StoreProvider>
  );
}