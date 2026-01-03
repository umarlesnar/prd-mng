'use client';

import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { LuLogOut, LuUser, LuStore, LuChevronDown } from 'react-icons/lu';
import { useStore } from '@/context/store-context';
import { useState, useRef, useEffect } from 'react';
import { showConfirm } from '@/components/ui/ConfirmDialog';

export function Header() {
  const router = useRouter();
  const { currentStore, currentUser, activeStoreUser, allStores, setCurrentStore } = useStore();
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const storeMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    showConfirm(
      'Logout',
      'Are you sure you want to logout?',
      () => {
        localStorage.removeItem('token');
        localStorage.removeItem('storeUserId');
        localStorage.removeItem('currentStoreId');
        localStorage.removeItem('loggedInStoreUsers');
        router.push('/login');
      },
      { confirmText: 'Logout', cancelText: 'Cancel' }
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (storeMenuRef.current && !storeMenuRef.current.contains(event.target as Node)) {
        setIsStoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-neutral-200 h-20 flex items-center justify-between px-8 shadow-sm relative z-20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center shadow-md">
          <LuStore className="text-white w-6 h-6" />
        </div>
        <div className="relative" ref={storeMenuRef}>
          <button 
            onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
            className="flex items-center gap-2 hover:bg-neutral-50 p-2 rounded-lg transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold text-neutral-800 tracking-tight leading-none">
                {currentStore?.store_name || 'Loading Store...'}
              </h2>
              <span className="text-xs text-neutral-500 font-medium">Product & Warranty Management</span>
            </div>
            {allStores.length > 1 && <LuChevronDown className="text-neutral-400 w-4 h-4" />}
          </button>

          {/* Store Switcher Dropdown */}
          {isStoreMenuOpen && allStores.length > 1 && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-neutral-100 py-2 z-30">
              <div className="px-4 py-2 border-b border-neutral-100">
                <p className="text-xs font-bold text-neutral-400 uppercase">Switch Store</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {allStores.map((store: any) => (
                  <button
                    key={store._id}
                    onClick={() => {
                      setCurrentStore(store);
                      setIsStoreMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-neutral-50 flex items-center gap-3 ${
                      currentStore?._id === store._id ? 'bg-primary-50 text-primary-900' : 'text-neutral-700'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      currentStore?._id === store._id ? 'bg-primary-200 text-primary-700' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      <LuStore className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{store.store_name}</p>
                      <p className="text-xs opacity-75">Store</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center gap-3 pl-6 border-l border-neutral-200">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-neutral-900">
              {activeStoreUser?.full_name || currentUser?.full_name || 'Loading...'}
            </span>
            <span className="text-xs text-neutral-500 uppercase tracking-wider">
              {activeStoreUser?.role || 'User'}
            </span>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
            <LuUser className="text-primary-600 w-6 h-6" />
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="flex items-center gap-2 text-neutral-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
        >
          <LuLogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
