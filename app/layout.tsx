'use client';

import './globals.css'
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ToastContainer } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const publicRoutes = ['/login', '/signup', '/verify'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (!token && !isPublicRoute) {
      router.push('/login');
    }
  }, [pathname, router]);

  return (
    <html lang="en">
      <body>
        {children}
        <ToastContainer />
        <ConfirmDialog />
      </body>
    </html>
  )
}
