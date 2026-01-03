'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/context/store-context';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuRotateCw, LuTrash2 } from 'react-icons/lu';
import { showToast } from '@/components/ui/Toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

interface Batch {
  _id: string;
  manufacturing_date: string;
  warranty_period_months: number;
  quantity: number;
  created_at: string;
  product_template_id: {
    _id: string;
    brand: string;
    product_model: string;
    category: string;
  };
}

interface ProductItem {
  _id: string;
  serial_number: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;

export default function BatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;
  const { activeStoreUser, currentStore } = useStore();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeStoreUser && currentStore && batchId) {
      fetchBatch();
    }
  }, [activeStoreUser, currentStore, batchId]);

  const fetchBatch = async () => {
    if (!batchId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/products/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch batch');
      const data = await res.json();
      setBatch(data.batch);
      setProductItems(data.productItems || []);
    } catch (err) {
      showToast('Failed to load batch', 'error');
    }
  };

  const handleDelete = (itemId: string) => {
    showConfirm(
      'Delete Product Item',
      'This action cannot be undone.',
      async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/products/serial/${itemId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to delete item');
          await fetchBatch();
          const updatedRes = await fetch(`/api/products/batches/${batchId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const updatedData = await updatedRes.json();
          if (updatedData.productItems?.length === 0) {
            await fetch(`/api/products/batches/${batchId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            router.push(`/products/templates/${template._id}`);
            showToast('Item deleted. Batch deleted as it has no items', 'success');
          } else {
            showToast('Item deleted successfully', 'success');
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'An error occurred';
          showToast(msg, 'error');
        }
      },
      { isDangerous: true, confirmText: 'Delete', cancelText: 'Cancel' }
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      showToast('No items selected', 'error');
      return;
    }
    showConfirm(
      'Delete Selected Items',
      `Delete ${selectedIds.size} item(s)? This cannot be undone.`,
      async () => {
        const token = localStorage.getItem('token');
        try {
          for (const id of selectedIds) {
            await fetch(`/api/products/serial/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
          await fetchBatch();
          const updatedRes = await fetch(`/api/products/batches/${batchId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const updatedData = await updatedRes.json();
          if (updatedData.productItems?.length === 0) {
            await fetch(`/api/products/batches/${batchId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            router.push(`/products/templates/${template._id}`);
            showToast(`${selectedIds.size} item(s) deleted. Batch deleted as it has no items`, 'success');
          } else {
            showToast(`${selectedIds.size} item(s) deleted successfully`, 'success');
          }
          setSelectedIds(new Set());
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'An error occurred';
          showToast(msg, 'error');
        }
      },
      { isDangerous: true, confirmText: 'Delete All', cancelText: 'Cancel' }
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map(item => item._id)));
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

  const filteredItems = useMemo(() => {
    return productItems.filter((item: ProductItem) => {
      return item.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [productItems, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (!batch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  const template = batch.product_template_id as any;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push(`/products/templates/${template._id}`)} className="h-11">
              <LuArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 mb-2">Batch Details</h1>
              <p className="text-neutral-600">
                <Badge variant="info" className="mr-2">{template.category}</Badge>
                {template.brand} {template.product_model} • {batch.quantity} items
              </p>
            </div>
          </div>
          <Button onClick={fetchBatch} variant="outline" className="h-11">
            <LuRotateCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-neutral-600 mb-1">Manufacturing Date</div>
              <div className="text-lg font-semibold">{new Date(batch.manufacturing_date).toLocaleDateString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-neutral-600 mb-1">Warranty Period</div>
              <div className="text-lg font-semibold"><Badge variant="primary">{batch.warranty_period_months} months</Badge></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-neutral-600 mb-1">Total Items</div>
              <div className="text-lg font-semibold">{batch.quantity}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search by serial number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900"
                />
                <Button onClick={fetchBatch} variant="outline" size="sm" className="h-10">
                  <LuRotateCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-600">Showing {paginatedItems.length} of {filteredItems.length} items</p>
                {selectedIds.size > 0 && (
                  <Button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                    <LuTrash2 className="w-4 h-4 mr-2" /> Delete {selectedIds.size}
                  </Button>
                )}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-neutral-600 font-medium">No product items found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input type="checkbox" checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0} onChange={toggleSelectAll} className="w-4 h-4" />
                        </TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item, index) => (
                        <TableRow key={item._id}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.has(item._id)} onChange={() => toggleSelect(item._id)} className="w-4 h-4" />
                          </TableCell>
                          <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                          <TableCell className="font-mono text-primary-600 font-semibold">{item.serial_number}</TableCell>
                          <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {paginatedItems.length > 0 && (
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-700">
                                <LuTrash2 className="w-4 h-4" />
                              </Button>
                            )}
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
      </div>
    </DashboardLayout>
  );
}

