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

const ITEMS_PER_PAGE = 10;

export default function WarrantiesPage() {
  const { activeStoreUser, currentStore } = useStore();
  const [warranties, setWarranties] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    product_id: '',
    customer_id: '',
    warranty_start: '',
  });

  useEffect(() => {
    if (activeStoreUser && currentStore) {
      fetchWarranties();
      fetchProducts();
      fetchCustomers();
    }
  }, [activeStoreUser, currentStore]);

  const fetchWarranties = async () => {
    if (!currentStore?._id) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/warranties?storeId=${currentStore._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch warranties');
      const data = await res.json();
      setWarranties(data.warranties || []);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } catch (err) {
      showToast('Failed to load warranties', 'error');
    }
  };

  const fetchProducts = async () => {
    if (!currentStore?._id) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/products?storeId=${currentStore._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      showToast('Failed to load products', 'error');
    }
  };

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
    } catch (err) {
      showToast('Failed to load customers', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!formData.product_id || !formData.customer_id || !formData.warranty_start) {
      setError('All fields are required');
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/warranties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to register warranty');
      setIsModalOpen(false);
      fetchWarranties();
      setFormData({ product_id: '', customer_id: '', warranty_start: '' });
      showToast('Warranty registered successfully', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (warrantyId: string) => {
    showConfirm('Delete Warranty', 'This action cannot be undone.', async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/warranties/${warrantyId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete warranty');
        fetchWarranties();
        showToast('Warranty deleted successfully', 'success');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An error occurred';
        showToast(msg, 'error');
      }
    }, { isDangerous: true, confirmText: 'Delete', cancelText: 'Cancel' });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      showToast('No warranties selected', 'error');
      return;
    }
    showConfirm('Delete Selected Warranties', `Delete ${selectedIds.size} warranty(ies)?`, async () => {
      const token = localStorage.getItem('token');
      try {
        for (const id of selectedIds) {
          await fetch(`/api/warranties/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        fetchWarranties();
        showToast(`${selectedIds.size} warranty(ies) deleted successfully`, 'success');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An error occurred';
        showToast(msg, 'error');
      }
    }, { isDangerous: true, confirmText: 'Delete All', cancelText: 'Cancel' });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = { active: 'success', expired: 'danger', claimed: 'warning', void: 'default' };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const filteredWarranties = useMemo(() => {
    return warranties.filter(w => {
      const template = w.product_id?.product_template_id as any;
      const matchesSearch = template?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template?.product_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           w.customer_id?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           w.product_id?.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !filterStatus || w.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [warranties, searchTerm, filterStatus]);

  const statuses = useMemo(() => [...new Set(warranties.map(w => w.status))], [warranties]);
  const totalPages = Math.ceil(filteredWarranties.length / ITEMS_PER_PAGE);
  const paginatedWarranties = filteredWarranties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedWarranties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedWarranties.map(w => w._id)));
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
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Warranties</h1>
            <p className="text-neutral-600">Register and manage product warranties</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchWarranties} variant="outline" className="h-11">↻</Button>
            <Button onClick={() => setIsModalOpen(true)} className="h-11">
              <span className="mr-2">+</span> Register Warranty
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Warranty Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <Input placeholder="Search by product, customer, or serial..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900">
                  <option value="">All Statuses</option>
                  {statuses.map(status => (<option key={status} value={status}>{status}</option>))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-600">Showing {paginatedWarranties.length} of {filteredWarranties.length} warranties</p>
                {selectedIds.size > 0 && (
                  <Button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                    <LuTrash2 className="w-4 h-4 mr-2" /> Delete {selectedIds.size}
                  </Button>
                )}
              </div>
            </div>

            {filteredWarranties.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🛡️</div>
                <p className="text-neutral-600 font-medium">No warranties found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input type="checkbox" checked={selectedIds.size === paginatedWarranties.length && paginatedWarranties.length > 0} onChange={toggleSelectAll} className="w-4 h-4" />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedWarranties.map((warranty) => (
                        <TableRow key={warranty._id}>
                          <TableCell>
                            <input type="checkbox" checked={selectedIds.has(warranty._id)} onChange={() => toggleSelect(warranty._id)} className="w-4 h-4" />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-neutral-900">
                              {(warranty.product_id?.product_template_id as any)?.brand} {(warranty.product_id?.product_template_id as any)?.product_model}
                            </div>
                            <div className="text-xs text-neutral-500 font-mono mt-1">
                              {warranty.product_id?.serial_number}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{warranty.customer_id?.customer_name}</TableCell>
                          <TableCell>{new Date(warranty.warranty_start).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(warranty.warranty_end).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(warranty.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {warranty.warranty_pdf_url && (
                                <Button variant="outline" size="sm" onClick={() => window.open(warranty.warranty_pdf_url, '_blank')}>
                                  📄 PDF
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(warranty._id)} className="text-red-600 hover:text-red-700">
                                <LuTrash2 className="w-4 h-4" />
                              </Button>
                            </div>
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

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Warranty" size="md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>)}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Product <span className="text-danger-600">*</span></label>
              <select className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900" value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} required>
                <option value="">Select a product</option>
                {products.map((product) => (<option key={product._id} value={product._id}>{product.brand} {product.product_model} - {product.serial_number}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Customer <span className="text-danger-600">*</span></label>
              <select className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900" value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} required>
                <option value="">Select a customer</option>
                {customers.map((customer) => (<option key={customer._id} value={customer._id}>{customer.customer_name} - {customer.phone}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Warranty Start Date <span className="text-danger-600">*</span></label>
              <input type="date" className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900" value={formData.warranty_start} onChange={(e) => setFormData({ ...formData, warranty_start: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>Register Warranty</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
