'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useStore } from '@/context/store-context';
import { 
  LuLayoutDashboard, 
  LuStore, 
  LuUsers, 
  LuUser, 
  LuPackage, 
  LuShieldCheck, 
  LuClipboardList, 
  LuFileClock 
} from 'react-icons/lu';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LuLayoutDashboard, permission: null },
  { name: 'Customers', href: '/customers', icon: LuUser, permission: 'view_customers' },
  { name: 'Products', href: '/products', icon: LuPackage, permission: 'view_products' },
  { name: 'Warranties', href: '/warranties', icon: LuShieldCheck, permission: 'view_warranties' },
  { name: 'Claims', href: '/claims', icon: LuClipboardList, permission: 'view_claims' },
  { name: 'Settings', href: '/settings', icon: LuStore, permission: 'manage_settings' },
  { name: 'Audit Logs', href: '/audit-logs', icon: LuFileClock, permission: 'view_audit_logs' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeStoreUser, currentUser, allStores, currentStore } = useStore();

  // Check if user has permission
  const hasPermission = (permission: string | null) => {
    if (!permission) return true; // No permission required
    
    // User accounts (store owners) can manage stores
    if (permission === 'manage_stores' && !activeStoreUser && currentUser) {
      return true; // User accounts can always see stores
    }
    
    if (!activeStoreUser) return false;
    
    // Admin has all permissions
    if (activeStoreUser.role === 'admin') return true;
    
    // Check if 'all' permission is granted
    if (activeStoreUser.permissions?.includes('all')) return true;
    
    // Check specific permission
    return activeStoreUser.permissions?.includes(permission) || false;
  };

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => hasPermission(item.permission));

  return (
    <div className="flex flex-col w-72 bg-white border-r border-neutral-200 min-h-screen shadow-sm">
      <div className="flex items-center gap-3 px-6 h-20 border-b border-neutral-200 bg-gradient-to-r from-primary-600 to-primary-700">
        <LuShieldCheck className="w-8 h-8 text-white" />
        <h1 className="text-white text-lg font-bold tracking-wide">Product Management SyS</h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href.split('?')[0]); // Remove query params for comparison
          const Icon = item.icon; // Get the icon component
          
          // Get store ID from URL or context
          const storeId = currentStore?._id?.toString() || '';
          const href = storeId ? `${item.href}${item.href.includes('?') ? '&' : '?'}storeId=${storeId}` : item.href;
          
          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 mr-3 transition-colors",
                  isActive ? "text-primary-600" : "text-neutral-400 group-hover:text-neutral-600"
                )} 
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-4 bg-neutral-50">
        <p className="text-xs text-neutral-500 text-center font-medium">Warranty Management System v1.0</p>
      </div>
    </div>
  );
}