'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/context/store-context';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LuTrash2, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { showToast } from '@/components/ui/Toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

function CustomersContent() {
  const { activeStoreUser, currentStore } = useStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    customer_name: '',
    phone_country_code: '+91',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
  });

  useEffect(() => {
    if (activeStoreUser && currentStore) fetchCustomers();
  }, [activeStoreUser, currentStore]);

  const fetchCustomers = async () => {
    if (!currentStore?._id) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/customers?storeId=${currentStore._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(data.customers || []);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } catch (err) {
      showToast('Failed to load customers', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!formData.customer_name.trim() || !formData.phone.trim() || formData.phone.length < 10) {
      setError('Name and valid phone required');
      setLoading(false);
      return;
    }
    if (formData.email && !formData.email.includes('@')) {
      setError('Invalid email');
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          phone: `${formData.phone_country_code}${formData.phone}`,
          email: formData.email,
          address: formData.address,
          gst_number: formData.gst_number,
        }),
      });
      if (!res.ok) throw new Error('Failed to add customer');
      setIsModalOpen(false);
      fetchCustomers();
      setFormData({ customer_name: '', phone_country_code: '+91', phone: '', email: '', address: '', gst_number: '' });
      showToast('Customer added successfully', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (customerId: string) => {
    showConfirm('Delete Customer', 'This action cannot be undone.', async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/customers/${customerId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete customer');
        fetchCustomers();
        showToast('Customer deleted successfully', 'success');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An error occurred';
        showToast(msg, 'error');
      }
    }, { isDangerous: true, confirmText: 'Delete', cancelText: 'Cancel' });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      showToast('No customers selected', 'error');
      return;
    }
    showConfirm('Delete Selected Customers', `Delete ${selectedIds.size} customer(s)?`, async () => {
      const token = localStorage.getItem('token');
      try {
        for (const id of selectedIds) {
          await fetch(`/api/customers/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        fetchCustomers();
        showToast(`${selectedIds.size} customer(s) deleted successfully`, 'success');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An error occurred';
        showToast(msg, 'error');
      }
    }, { isDangerous: true, confirmText: 'Delete All', cancelText: 'Cancel' });
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (c.gst_number && c.gst_number.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [customers, searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCustomers.map(c => c._id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">Customers</h1>
          <p className="text-neutral-600">Manage customer information and profiles</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchCustomers} variant="outline" className="h-11">↻</Button>
          <Button onClick={() => setIsModalOpen(true)} className="h-11">
            <span className="mr-2">+</span> Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <Input placeholder="Search by name, phone, email, or GST..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <div className="flex justify-between items-center">
              <p className="text-sm text-neutral-600">Showing {paginatedCustomers.length} of {filteredCustomers.length} customers</p>
              {selectedIds.size > 0 && (
                <Button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                  <LuTrash2 className="w-4 h-4 mr-2" /> Delete {selectedIds.size}
                </Button>
              )}
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">👤</div>
              <p className="text-neutral-600 font-medium">No customers found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input type="checkbox" checked={selectedIds.size === paginatedCustomers.length && paginatedCustomers.length > 0} onChange={toggleSelectAll} className="w-4 h-4" />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>GST Number</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((customer) => (
                      <TableRow key={customer._id}>
                        <TableCell>
                          <input type="checkbox" checked={selectedIds.has(customer._id)} onChange={() => toggleSelect(customer._id)} className="w-4 h-4" />
                        </TableCell>
                        <TableCell className="font-medium text-neutral-900">{customer.customer_name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell className="text-primary-600">{customer.email || '-'}</TableCell>
                        <TableCell>
                          {customer.gst_number ? (<Badge variant="info">{customer.gst_number}</Badge>) : (<span className="text-neutral-400">-</span>)}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(customer._id)} className="text-red-600 hover:text-red-700">
                            <LuTrash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-neutral-600">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" size="sm">
                    <LuChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" size="sm">
                    <LuChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Customer" size="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>)}
          <Input label="Customer Name" placeholder="John Doe" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Phone <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select className="w-32 px-3 py-2.5 border border-neutral-300 rounded-lg text-neutral-900" value={formData.phone_country_code} onChange={(e) => setFormData({ ...formData, phone_country_code: e.target.value })}>
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
              </select>
              <input type="tel" placeholder="9876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900" required />
            </div>
          </div>
          <Input label="Email (Optional)" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Address" placeholder="123 Main St, City" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <Input label="GST Number" placeholder="27AAPFL1234H1Z0" value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <DashboardLayout>
      <CustomersContent />
    </DashboardLayout>
  );
}
