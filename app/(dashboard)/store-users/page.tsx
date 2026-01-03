'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/context/store-context';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import { PhoneInputField } from '@/components/ui/PhoneInputField';
import { showToast } from '@/components/ui/Toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

export default function StoreUsersPage() {
  const { currentStore, refreshContext } = useStore();
  const [storeUsers, setStoreUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    permissions: [] as string[],
  });

  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    role: 'staff',
    permissions: [] as string[],
  });

  const availablePermissions = [
    { id: 'view_customers', label: 'View Customers' },
    { id: 'view_products', label: 'View Products' },
    { id: 'view_warranties', label: 'View Warranties' },
    { id: 'view_claims', label: 'View Claims' },
    { id: 'manage_users', label: 'Manage Store Users' },
    { id: 'manage_settings', label: 'Manage Settings' },
    { id: 'view_audit_logs', label: 'View Audit Logs' },
  ];

  const togglePermission = (permissionId: string) => {
    if (formData.permissions.includes(permissionId)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permissionId),
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permissionId],
      });
    }
  };

  const toggleEditPermission = (permissionId: string) => {
    if (editFormData.permissions.includes(permissionId)) {
      setEditFormData({
        ...editFormData,
        permissions: editFormData.permissions.filter(p => p !== permissionId),
      });
    } else {
      setEditFormData({
        ...editFormData,
        permissions: [...editFormData.permissions, permissionId],
      });
    }
  };

  useEffect(() => {
    if (currentStore?._id) {
        fetchStoreUsers();
    }
  }, [currentStore]);

  const fetchStoreUsers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/store-users?store_id=${currentStore._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStoreUsers(data.storeUsers || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
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
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/store-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                ...formData,
                store_id: currentStore._id
            }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to add store user');
        }

        setIsModalOpen(false);
        fetchStoreUsers();
        refreshContext();
        setFormData({
            full_name: '',
            email: '',
            phone: '',
            password: '',
            role: 'staff',
            permissions: [],
        });
        showToast('Store User added successfully', 'success');
    } catch (err: any) {
        setError(err.message);
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions || [],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setLoading(true);
    
    if (!editFormData.full_name.trim()) {
      setError('Full name is required');
      setLoading(false);
      return;
    }
    if (!editFormData.phone || editFormData.phone.length < 10) {
      setError('Phone number must be at least 10 digits');
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/store-users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update store user');
      }

      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchStoreUsers();
      refreshContext();
      showToast('Store User updated successfully', 'success');
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    showConfirm(
      'Remove Store User',
      'This action cannot be undone. The store user will be permanently removed from your store.',
      async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/store-users/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to delete store user');
          }

          fetchStoreUsers();
          refreshContext();
          showToast('Store User removed successfully', 'success');
        } catch (error: any) {
          showToast(error.message, 'error');
        }
      },
      { isDangerous: true, confirmText: 'Remove', cancelText: 'Cancel' }
    );
  };

  const getRoleBadge = (role: string) => {
    const variants: any = { admin: 'danger', manager: 'warning', staff: 'success' };
    return <Badge variant={variants[role] || 'default'}>{role}</Badge>;
  };

  const filteredUsers = storeUsers.filter(u => {
    const matchesSearch = 
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const roles = [...new Set(storeUsers.map(u => u.role))];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Store Users</h1>
            <p className="text-neutral-600">Manage your team and their permissions</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchStoreUsers} variant="outline" className="h-11">
              ↻
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="h-11">
              <span className="mr-2">+</span> Add Store User
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900"
                >
                  <option value="">All Roles</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-neutral-600">
                Showing {filteredUsers.length} of {storeUsers.length} users
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((storeUser) => (
                    <TableRow key={storeUser._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600">
                                {storeUser.full_name?.charAt(0) || 'U'}
                            </div>
                            {storeUser.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="text-sm">{storeUser.email}</span>
                            <span className="text-xs text-neutral-500">{storeUser.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(storeUser.role)}</TableCell>
                      <TableCell>
                        {storeUser.role === 'admin' ? (
                          <Badge variant="default">All Permissions</Badge>
                        ) : storeUser.permissions && storeUser.permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {storeUser.permissions.slice(0, 3).map((perm: string) => (
                              <Badge key={perm} variant="success" className="text-xs">
                                {perm.replace('_', ' ')}
                              </Badge>
                            ))}
                            {storeUser.permissions.length > 3 && (
                              <Badge variant="default" className="text-xs">
                                +{storeUser.permissions.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">No permissions</span>
                        )}
                      </TableCell>
                      <TableCell className="text-neutral-600">{new Date(storeUser.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditUser(storeUser)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <LuPencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(storeUser._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <LuTrash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Store User" size="md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                />
                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
            </div>

            <PhoneInputField
              label="Phone"
              value={formData.phone}
              onChange={(phone) => setFormData({ ...formData, phone })}
              required
            />
            
            <Input
                label="Default Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Create a password for them"
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Role</label>
              <select
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900"
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setFormData({ 
                    ...formData, 
                    role: newRole,
                    permissions: newRole === 'admin' ? ['all'] : formData.permissions.filter(p => p !== 'all')
                  });
                }}
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {formData.role !== 'admin' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">Permissions</label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200 max-h-64 overflow-y-auto">
                  {availablePermissions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-neutral-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>Add Member</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Store User" size="md">
          <form onSubmit={handleUpdateUser} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <Input
                label="Full Name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                required
            />

            <PhoneInputField
              label="Phone"
              value={editFormData.phone}
              onChange={(phone) => setEditFormData({ ...editFormData, phone })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Role</label>
              <select
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900"
                value={editFormData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setEditFormData({ 
                    ...editFormData, 
                    role: newRole,
                    permissions: newRole === 'admin' ? ['all'] : editFormData.permissions.filter(p => p !== 'all')
                  });
                }}
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {editFormData.role !== 'admin' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">Permissions</label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200 max-h-64 overflow-y-auto">
                  {availablePermissions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.permissions.includes(perm.id)}
                        onChange={() => toggleEditPermission(perm.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-neutral-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>Update Member</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
