'use client';

import { useEffect, useState, Suspense } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PhoneInputField } from '@/components/ui/PhoneInputField';
import { LuPencil } from 'react-icons/lu';

export const dynamic = 'force-dynamic';

function StoresContent() {
  const [stores, setStores] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [formData, setFormData] = useState({
    store_name: '',
    address: '',
    contact_phone: '',
    serial_prefix: '',
    serial_suffix: '',
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/stores', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStores(data.stores || []);
  };

  const handleEdit = (store: any) => {
    setEditingStore(store);
    setFormData({
      store_name: store.store_name,
      address: store.address || '',
      contact_phone: store.contact_phone || '',
      serial_prefix: store.serial_prefix,
      serial_suffix: store.serial_suffix || '',
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingStore(null);
    setFormData({
      store_name: '',
      address: '',
      contact_phone: '',
      serial_prefix: '',
      serial_suffix: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const url = editingStore ? `/api/stores/${editingStore._id}` : '/api/stores';
    const method = editingStore ? 'PUT' : 'POST';

    await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    setIsModalOpen(false);
    fetchStores();
    setEditingStore(null);
  };

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Stores</h1>
            <p className="text-neutral-600">Manage your store locations and configurations</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchStores} variant="outline" className="h-11">
              ↻
            </Button>
            <Button onClick={handleAdd} className="h-11">
              <span className="mr-2">+</span> Add Store
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Store Network</CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🏪</div>
                <p className="text-neutral-600 font-medium">No stores found</p>
                <p className="text-neutral-500 text-sm">Add your first store to get started</p>
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store._id}>
                        <TableCell className="font-medium text-neutral-900">{store.store_name}</TableCell>
                        <TableCell className="text-neutral-600">{store.address || '-'}</TableCell>
                        <TableCell>{store.contact_phone || '-'}</TableCell>
                        <TableCell>
                          <code className="bg-neutral-100 px-2 py-1 rounded text-sm font-mono">
                            {store.serial_prefix}####{store.serial_suffix || 'XXXX'}
                          </code>
                        </TableCell>
                        <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(store)}>
                                <LuPencil className="w-4 h-4 text-neutral-500" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStore ? "Edit Store" : "Add New Store"} size="md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Store Name"
              placeholder="Main Store"
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              required
            />

            <Input
              label="Address"
              placeholder="123 Main St, City, State 12345"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <PhoneInputField
              label="Contact Phone"
              value={formData.contact_phone}
              onChange={(phone) => setFormData({ ...formData, contact_phone: phone })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Serial Prefix"
                placeholder="PRD"
                value={formData.serial_prefix}
                onChange={(e) => setFormData({ ...formData, serial_prefix: e.target.value })}
                required
              />

              <Input
                label="Serial Suffix"
                placeholder="2024"
                value={formData.serial_suffix}
                onChange={(e) => setFormData({ ...formData, serial_suffix: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingStore ? "Update Store" : "Add Store"}</Button>
            </div>
          </form>
        </Modal>
    </div>
  );
}

export default function StoresPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <StoresContent />
      </Suspense>
    </DashboardLayout>
  );
}