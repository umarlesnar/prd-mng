'use client';

import { createContext, useContext, useEffect, useState, ReactNode, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface StoreContextType {
  currentStore: any;
  currentUser: any;
  activeStoreUser: any;
  allStores: any[];
  allStoreUsers: any[];
  loggedInStoreUsers: any[]; // Store users the current user has logged into
  isLoading: boolean;
  setCurrentStore: (store: any) => void;
  setActiveStoreUser: (user: any) => void;
  refreshContext: () => void;
  addLoggedInStoreUser: (user: any) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

function StoreProviderContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentStore, setCurrentStoreState] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeStoreUser, setActiveStoreUser] = useState<any>(null);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [allStoreUsers, setAllStoreUsers] = useState<any[]>([]);
  const [loggedInStoreUsers, setLoggedInStoreUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContextData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const userRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!userRes.ok) {
        const errorData = await userRes.text();
        throw new Error(`Auth failed: ${userRes.status} - ${errorData}`);
      }
      const userData = await userRes.json();
      setCurrentUser(userData.user);
      
      // Handle both account types
      if (userData.accountType === 'store_user') {
        // Store user (employee)
        if (userData.storeUser) {
          setActiveStoreUser(userData.storeUser);
          const storedLoggedIn = localStorage.getItem('loggedInStoreUsers');
          if (storedLoggedIn) {
            try {
              const parsed = JSON.parse(storedLoggedIn);
              setLoggedInStoreUsers(parsed);
            } catch {
              setLoggedInStoreUsers([userData.storeUser]);
            }
          } else {
            setLoggedInStoreUsers([userData.storeUser]);
            localStorage.setItem('loggedInStoreUsers', JSON.stringify([userData.storeUser]));
          }
        }
      } else {
        // User account (store owner) - may have store user
        if (userData.storeUser) {
          setActiveStoreUser(userData.storeUser);
        }
      }

      // Get stores that the user has access to
      // Handle both populated object and string ID
      const storeIdValue = userData.storeUser?.store_id;
      let currentStoreId: string | null = null;
      
      if (storeIdValue) {
        if (typeof storeIdValue === 'string') {
          // Already a string, but check if it's a valid ObjectId format
          if (storeIdValue.match(/^[0-9a-fA-F]{24}$/)) {
            currentStoreId = storeIdValue;
          }
        } else if (typeof storeIdValue === 'object') {
          // It's an object, extract the _id
          if (storeIdValue._id) {
            currentStoreId = typeof storeIdValue._id === 'string' 
              ? storeIdValue._id 
              : storeIdValue._id.toString();
          } else if (storeIdValue.toString) {
            const str = storeIdValue.toString();
            // Check if it's a valid ObjectId string
            if (str.match(/^[0-9a-fA-F]{24}$/)) {
              currentStoreId = str;
            }
          }
        } else if (storeIdValue.toString) {
          const str = storeIdValue.toString();
          if (str.match(/^[0-9a-fA-F]{24}$/)) {
            currentStoreId = str;
          }
        }
      }
      
      if (currentStoreId) {
        const storeRes = await fetch(`/api/stores/${currentStoreId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setCurrentStoreState(storeData.store);
          localStorage.setItem('currentStoreId', currentStoreId);
        }
      }

      // Fetch all stores (for users who might have access to multiple stores)
      // This will be limited by what the API returns based on store user access
      const storesRes = await fetch('/api/stores', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const storesData = await storesRes.json();
      
      if (storesData.stores && storesData.stores.length > 0) {
        setAllStores(storesData.stores);
        // If no current store set yet, use the first one
        if (!currentStoreId && storesData.stores[0]) {
          setCurrentStoreState(storesData.stores[0]);
          localStorage.setItem('currentStoreId', storesData.stores[0]._id.toString());
        }
      } else if (currentStoreId) {
        // If no stores returned but we have a current store, use it
        const storeRes = await fetch(`/api/stores/${currentStoreId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setAllStores([storeData.store]);
        }
      }

      // Fetch store users for the current store
      if (currentStoreId && typeof currentStoreId === 'string' && currentStoreId.match(/^[0-9a-fA-F]{24}$/)) {
        const usersRes = await fetch(`/api/store-users?store_id=${currentStoreId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const users = usersData.storeUsers || [];
          setAllStoreUsers(users);
        }
      }
    } catch (error) {
      console.error('Error loading store context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrentStore = (store: any) => {
    if (!store || !store._id) return;
    
    // Ensure store._id is a string
    const storeId = typeof store._id === 'string' ? store._id : store._id.toString();
    
    setCurrentStoreState(store);
    localStorage.setItem('currentStoreId', storeId);
    
    // Refresh store users for the new store
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/store-users?store_id=${storeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(usersData => {
          const users = usersData.storeUsers || [];
          setAllStoreUsers(users);
          // Find logged in store user for this store
          const loggedInForStore = loggedInStoreUsers.find(su => {
            const suStoreId = typeof su.store_id === 'object' && su.store_id?._id 
              ? (typeof su.store_id._id === 'string' ? su.store_id._id : su.store_id._id.toString())
              : (typeof su.store_id === 'string' ? su.store_id : su.store_id?.toString());
            return suStoreId === storeId;
          });
          if (loggedInForStore) {
            setActiveStoreUser(loggedInForStore);
          } else {
            // Find current user's profile in this store
            const myProfile = users.find((su: any) => su._id === activeStoreUser?._id);
            if (myProfile) {
              setActiveStoreUser(myProfile);
            }
          }
        })
        .catch(err => console.error('Error fetching store users:', err));
    }
    // Update URL with store ID and redirect to dashboard
    const newUrl = `/dashboard?storeId=${storeId}`;
    router.push(newUrl);
  };

  const handleSetActiveStoreUser = (user: any) => {
    setActiveStoreUser(user);
    // Refresh context data when switching store users
    fetchContextData();
    // Redirect to dashboard when switching store users
    router.push('/dashboard');
  };

  const addLoggedInStoreUser = (user: any) => {
    const updated = [...loggedInStoreUsers, user];
    setLoggedInStoreUsers(updated);
    localStorage.setItem('loggedInStoreUsers', JSON.stringify(updated));
  };

  // Sync store ID from URL params
  useEffect(() => {
    const storeIdFromUrl = searchParams?.get('storeId');
    if (storeIdFromUrl && storeIdFromUrl !== currentStore?._id?.toString()) {
      // Find store in allStores and set it
      const store = allStores.find(s => s._id?.toString() === storeIdFromUrl);
      if (store) {
        setCurrentStoreState(store);
        localStorage.setItem('currentStoreId', storeIdFromUrl);
      }
    } else if (!storeIdFromUrl && currentStore?._id && pathname?.startsWith('/dashboard')) {
      // If no storeId in URL but we have a current store, add it to URL
      const storeId = typeof currentStore._id === 'string' ? currentStore._id : currentStore._id.toString();
      const newUrl = `${pathname}?storeId=${storeId}`;
      router.replace(newUrl);
    }
  }, [searchParams, currentStore, allStores, pathname, router]);

  useEffect(() => {
    fetchContextData();
  }, []);

  return (
    <StoreContext.Provider 
    value={{ 
      currentStore, 
      currentUser, 
      activeStoreUser, 
      allStores,
      allStoreUsers,
      loggedInStoreUsers,
      isLoading,
      setCurrentStore: handleSetCurrentStore,
      setActiveStoreUser: handleSetActiveStoreUser,
      refreshContext: fetchContextData,
      addLoggedInStoreUser
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <StoreProviderContent>{children}</StoreProviderContent>
    </Suspense>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
