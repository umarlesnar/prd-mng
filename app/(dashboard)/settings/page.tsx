'use client';

import { useEffect, useState, Suspense } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useStore } from '@/context/store-context';
import { useSearchParams, useRouter } from 'next/navigation';
import { LuPencil, LuKey, LuTrash2 } from 'react-icons/lu';
import { PhoneInputField } from '@/components/ui/PhoneInputField';
import { showToast } from '@/components/ui/Toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

export const dynamic = 'force-dynamic';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'store';
  const { currentStore, activeStoreUser, refreshContext } = useStore();
  
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isEditApiKeyModalOpen, setIsEditApiKeyModalOpen] = useState(false);
  const [isStoresListModalOpen, setIsStoresListModalOpen] = useState(false);
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  const [isEditStoreModalOpen, setIsEditStoreModalOpen] = useState(false);
  
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<any>(null);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editApiKeyData, setEditApiKeyData] = useState({ status: 'Enabled' });
  
  const [storeFormData, setStoreFormData] = useState({
    store_name: '',
    address: '',
    contact_phone: '',
    serial_prefix: '',
    serial_suffix: '',
  });

  const [newStoreFormData, setNewStoreFormData] = useState({
    store_name: '',
    address: '',
    contact_phone: '',
    serial_prefix: '',
    serial_suffix: '',
  });

  useEffect(() => {
    if (currentStore) {
      setStoreFormData({
        store_name: currentStore.store_name || '',
        address: currentStore.address || '',
        contact_phone: currentStore.contact_phone || '',
        serial_prefix: currentStore.serial_prefix || '',
        serial_suffix: currentStore.serial_suffix || '',
      });
    }
  }, [currentStore]);

  useEffect(() => {
    if (activeTab === 'api-keys' && currentStore?._id) {
      fetchApiKeys();
    }
  }, [activeTab, currentStore]);

  useEffect(() => {
    if (activeTab === 'stores') {
      fetchStores();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'store-users' && currentStore?._id) {
      fetchStoreUsers();
    }
  }, [activeTab, currentStore]);

  const [storeUsers, setStoreUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({ full_name: '', email: '', phone: '', password: '', role: 'staff', permissions: [] as string[] });
  const [editUserFormData, setEditUserFormData] = useState({ full_name: '', phone: '', role: 'staff', permissions: [] as string[] });

  const fetchApiKeys = async () => {
    if (!currentStore?._id) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/api-keys?store_id=${currentStore._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setApiKeys(data.apiKeys || []);
  };

  const fetchStores = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/stores', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStores(data.stores || []);
  };

  const fetchStoreUsers = async () => {
    if (!currentStore?._id) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/store-users?store_id=${currentStore._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStoreUsers(data.storeUsers || []);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/store-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...userFormData, store_id: currentStore._id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add user');
      setIsAddUserModalOpen(false);
      fetchStoreUsers();
      setUserFormData({ full_name: '', email: '', phone: '', password: '', role: 'staff', permissions: [] });
      showToast('User added successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserFormData({ full_name: user.full_name, phone: user.phone, role: user.role, permissions: user.permissions || [] });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/store-users/${editingUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editUserFormData),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update user');
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      fetchStoreUsers();
      showToast('User updated successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    showConfirm('Delete User', 'This action cannot be undone.', async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/store-users/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete user');
        fetchStoreUsers();
        showToast('User deleted successfully', 'success');
      } catch (error: any) {
        showToast(error.message, 'error');
      }
    }, { isDangerous: true, confirmText: 'Delete', cancelText: 'Cancel' });
  };

  const handleStoreUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || activeStoreUser?.role !== 'admin') {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/stores/${currentStore._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(storeFormData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update store');
      }

      setIsStoreModalOpen(false);
      refreshContext();
      showToast('Store settings updated successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || activeStoreUser?.role !== 'admin') {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const expired_at = formData.get('expired_at') as string;

    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: currentStore._id,
          name,
          expired_at: expired_at || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create API key');
      }

      const data = await res.json();
      setIsApiKeyModalOpen(false);
      fetchApiKeys();
      showToast(`API Key created: ${data.apiKey._id}. Save it securely!`, 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    showConfirm(
      'Delete API Key',
      'This action cannot be undone. The API key will be permanently deleted.',
      async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/api-keys/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to delete API key');
          }

          fetchApiKeys();
          showToast('API key deleted successfully', 'success');
        } catch (error: any) {
          showToast(error.message, 'error');
        }
      },
      { isDangerous: true, confirmText: 'Delete', cancelText: 'Cancel' }
    );
  };

  const handleEditApiKey = (apiKey: any) => {
    setEditingApiKey(apiKey);
    setEditApiKeyData({ status: apiKey.status });
    setIsEditApiKeyModalOpen(true);
  };

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApiKey) return;

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/api-keys/${editingApiKey._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editApiKeyData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update API key');
      }

      setIsEditApiKeyModalOpen(false);
      setEditingApiKey(null);
      fetchApiKeys();
      showToast('API key updated successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newStoreFormData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add store');
      }

      setIsAddStoreModalOpen(false);
      fetchStores();
      setNewStoreFormData({ store_name: '', address: '', contact_phone: '', serial_prefix: '', serial_suffix: '' });
      showToast('Store added successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStore = (store: any) => {
    setEditingStore(store);
    setStoreFormData({
      store_name: store.store_name,
      address: store.address || '',
      contact_phone: store.contact_phone || '',
      serial_prefix: store.serial_prefix,
      serial_suffix: store.serial_suffix || '',
    });
    setIsEditStoreModalOpen(true);
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/stores/${editingStore._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(storeFormData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update store');
      }

      setIsEditStoreModalOpen(false);
      setEditingStore(null);
      fetchStores();
      showToast('Store updated successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (id: string) => {
    showConfirm(
      'Delete Store',
      'This action cannot be undone. The store will be permanently deleted.',
      async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/stores/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to delete store');
          }

          fetchStores();
          showToast('Store deleted successfully', 'success');
        } catch (error: any) {
          showToast(error.message, 'error');
        }
      },
      { isDangerous: true, confirmText: 'Delete', cancelText: 'Cancel' }
    );
  };

  const filteredStores = stores.filter(s => 
    s.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = activeStoreUser?.role === 'admin';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-neutral-900 mb-2">Settings</h1>
        <p className="text-neutral-600">Manage your store settings and integrations</p>
      </div>

      <div className="flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => router.push('/settings?tab=store')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'store'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Store Settings
        </button>
        <button
          onClick={() => router.push('/settings?tab=stores')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'stores'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          All Stores
        </button>
        <button
          onClick={() => router.push('/settings?tab=store-users')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'store-users'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Store Users
        </button>
        <button
          onClick={() => router.push('/settings?tab=api-keys')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'api-keys'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          API Keys
        </button>
      </div>

      {activeTab === 'store' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Store Information</CardTitle>
              {isAdmin && (
                <Button onClick={() => setIsStoreModalOpen(true)}>
                  <LuPencil className="w-4 h-4 mr-2" />
                  Edit Store
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentStore ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700">Store Name</label>
                  <p className="text-neutral-900 mt-1">{currentStore.store_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Address</label>
                  <p className="text-neutral-600 mt-1">{currentStore.address || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Contact Phone</label>
                  <p className="text-neutral-600 mt-1">{currentStore.contact_phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Serial Prefix</label>
                  <p className="text-neutral-900 mt-1 font-mono">{currentStore.serial_prefix}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Serial Suffix</label>
                  <p className="text-neutral-900 mt-1 font-mono">{currentStore.serial_suffix || '-'}</p>
                </div>
              </div>
            ) : (
              <p className="text-neutral-500">No store selected</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'stores' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Stores</CardTitle>
              {isAdmin && (
                <Button onClick={() => setIsAddStoreModalOpen(true)}>
                  <span className="mr-2">+</span> Add Store
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <Input
                placeholder="Search by store name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <p className="text-sm text-neutral-600">
                Showing {filteredStores.length} of {stores.length} stores
              </p>
            </div>

            {filteredStores.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600">No stores found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Serial Format</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStores.map((store) => (
                      <TableRow key={store._id}>
                        <TableCell className="font-medium text-neutral-900">{store.store_name}</TableCell>
                        <TableCell className="text-neutral-600">{store.address || '-'}</TableCell>
                        <TableCell>{store.contact_phone || '-'}</TableCell>
                        <TableCell>
                          <code className="bg-neutral-100 px-2 py-1 rounded text-sm font-mono">
                            {store.serial_prefix}####{store.serial_suffix || 'XXXX'}
                          </code>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditStore(store)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <LuPencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteStore(store._id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <LuTrash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'store-users' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Store Users</CardTitle>
              {isAdmin && (
                <Button onClick={() => { setEditingUser(null); setUserFormData({ full_name: '', email: '', phone: '', password: '', role: 'staff', permissions: [] }); setIsAddUserModalOpen(true); }}>
                  <span className="mr-2">+</span> Add User
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={userFilterRole}
                  onChange={(e) => setUserFilterRole(e.target.value)}
                  className="px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900"
                >
                  <option value="">All Roles</option>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {storeUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600">No store users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeUsers.filter(u => {
                      const matchesSearch = u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.phone.toLowerCase().includes(userSearchTerm.toLowerCase());
                      const matchesRole = !userFilterRole || u.role === userFilterRole;
                      return matchesSearch && matchesRole;
                    }).map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell><Badge variant={user.role === 'admin' ? 'danger' : user.role === 'manager' ? 'warning' : 'success'}>{user.role}</Badge></TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-700"><LuPencil className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(user._id)} className="text-red-600 hover:text-red-700"><LuTrash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'api-keys' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>API Keys</CardTitle>
              {isAdmin && (
                <Button onClick={() => setIsApiKeyModalOpen(true)}>
                  <LuKey className="w-4 h-4 mr-2" />
                  Create API Key
                </Button>
              )}
            </div>
            {!isAdmin && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-yellow-800 text-sm">Only admin users can manage API keys.</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600">No API keys found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>API Key (ID)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead>Created At</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((apiKey: any) => (
                      <TableRow key={apiKey._id}>
                        <TableCell className="font-medium">{apiKey.name}</TableCell>
                        <TableCell>
                          <code className="bg-neutral-100 px-2 py-1 rounded text-sm font-mono">
                            {apiKey._id}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={apiKey.status === 'Enabled' ? 'success' : 'default'}>
                            {apiKey.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {apiKey.expired_at
                            ? new Date(apiKey.expired_at).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {new Date(apiKey.created_at).toLocaleDateString()}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditApiKey(apiKey)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <LuPencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteApiKey(apiKey._id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <LuTrash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        title="Edit Store Settings"
        size="md"
      >
        <form onSubmit={handleStoreUpdate} className="space-y-5">
          <Input
            label="Store Name"
            value={storeFormData.store_name}
            onChange={(e) => setStoreFormData({ ...storeFormData, store_name: e.target.value })}
            required
          />
          <Input
            label="Address"
            value={storeFormData.address}
            onChange={(e) => setStoreFormData({ ...storeFormData, address: e.target.value })}
          />
          <PhoneInputField
            label="Contact Phone"
            value={storeFormData.contact_phone}
            onChange={(phone) => setStoreFormData({ ...storeFormData, contact_phone: phone })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Serial Prefix"
              value={storeFormData.serial_prefix}
              onChange={(e) => setStoreFormData({ ...storeFormData, serial_prefix: e.target.value })}
              required
            />
            <Input
              label="Serial Suffix"
              value={storeFormData.serial_suffix}
              onChange={(e) => setStoreFormData({ ...storeFormData, serial_suffix: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsStoreModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update Store
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAddStoreModalOpen}
        onClose={() => setIsAddStoreModalOpen(false)}
        title="Add New Store"
        size="md"
      >
        <form onSubmit={handleAddStore} className="space-y-5">
          <Input
            label="Store Name"
            placeholder="Main Store"
            value={newStoreFormData.store_name}
            onChange={(e) => setNewStoreFormData({ ...newStoreFormData, store_name: e.target.value })}
            required
          />
          <Input
            label="Address"
            placeholder="123 Main St, City, State 12345"
            value={newStoreFormData.address}
            onChange={(e) => setNewStoreFormData({ ...newStoreFormData, address: e.target.value })}
          />
          <PhoneInputField
            label="Contact Phone"
            value={newStoreFormData.contact_phone}
            onChange={(phone) => setNewStoreFormData({ ...newStoreFormData, contact_phone: phone })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Serial Prefix"
              placeholder="PRD"
              value={newStoreFormData.serial_prefix}
              onChange={(e) => setNewStoreFormData({ ...newStoreFormData, serial_prefix: e.target.value })}
              required
            />
            <Input
              label="Serial Suffix"
              placeholder="2024"
              value={newStoreFormData.serial_suffix}
              onChange={(e) => setNewStoreFormData({ ...newStoreFormData, serial_suffix: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddStoreModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Store
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditStoreModalOpen}
        onClose={() => setIsEditStoreModalOpen(false)}
        title="Edit Store"
        size="md"
      >
        <form onSubmit={handleUpdateStore} className="space-y-5">
          <Input
            label="Store Name"
            value={storeFormData.store_name}
            onChange={(e) => setStoreFormData({ ...storeFormData, store_name: e.target.value })}
            required
          />
          <Input
            label="Address"
            value={storeFormData.address}
            onChange={(e) => setStoreFormData({ ...storeFormData, address: e.target.value })}
          />
          <PhoneInputField
            label="Contact Phone"
            value={storeFormData.contact_phone}
            onChange={(phone) => setStoreFormData({ ...storeFormData, contact_phone: phone })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Serial Prefix"
              value={storeFormData.serial_prefix}
              onChange={(e) => setStoreFormData({ ...storeFormData, serial_prefix: e.target.value })}
              required
            />
            <Input
              label="Serial Suffix"
              value={storeFormData.serial_suffix}
              onChange={(e) => setStoreFormData({ ...storeFormData, serial_suffix: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditStoreModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update Store
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        title="Create API Key"
        size="md"
      >
        <form onSubmit={handleCreateApiKey} className="space-y-5">
          <Input
            label="Name"
            name="name"
            placeholder="e.g., Production API Key"
            required
          />
          <Input
            label="Expires At (Optional)"
            name="expired_at"
            type="date"
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The API key will be shown only once after creation. Make sure to save it securely.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsApiKeyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create API Key
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditApiKeyModalOpen}
        onClose={() => setIsEditApiKeyModalOpen(false)}
        title="Edit API Key"
        size="md"
      >
        <form onSubmit={handleUpdateApiKey} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
            <select
              value={editApiKeyData.status}
              onChange={(e) => setEditApiKeyData({ ...editApiKeyData, status: e.target.value })}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900"
            >
              <option value="Enabled">Enabled</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditApiKeyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update API Key
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} title="Add Store User" size="md">
        <form onSubmit={handleAddUser} className="space-y-5">
          <Input label="Full Name" value={userFormData.full_name} onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })} required />
          <Input label="Email" type="email" value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} required />
          <PhoneInputField label="Phone" value={userFormData.phone} onChange={(phone) => setUserFormData({ ...userFormData, phone })} required />
          <Input label="Password" type="password" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Role</label>
            <select value={userFormData.role} onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })} className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg">
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add User</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} title="Edit Store User" size="md">
        <form onSubmit={handleUpdateUser} className="space-y-5">
          <Input label="Full Name" value={editUserFormData.full_name} onChange={(e) => setEditUserFormData({ ...editUserFormData, full_name: e.target.value })} required />
          <PhoneInputField label="Phone" value={editUserFormData.phone} onChange={(phone) => setEditUserFormData({ ...editUserFormData, phone })} required />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Role</label>
            <select value={editUserFormData.role} onChange={(e) => setEditUserFormData({ ...editUserFormData, role: e.target.value })} className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg">
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditUserModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Update User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <SettingsContent />
      </Suspense>
    </DashboardLayout>
  );
}
