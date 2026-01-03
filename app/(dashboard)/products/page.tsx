'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/context/store-context';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LuTrash2, LuChevronLeft, LuChevronRight, LuArrowRight, LuRotateCw } from 'react-icons/lu';
import { showToast } from '@/components/ui/Toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

interface ProductTemplate {
  _id: string;
  brand: string;
  product_model: string;
  category: string;
  created_at: string;
  batches_count?: number;
}

interface FormData {
  brand: string;
  product_model: string;
  category: string;
}

const ITEMS_PER_PAGE = 10;

export default function ProductsPage() {
  const router = useRouter();
  const { activeStoreUser, currentStore } = useStore();
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<FormData>({
    brand: '',
    product_model: '',
    category: '',
  });

  useEffect(() => {
    if (activeStoreUser && currentStore) fetchTemplates();
  }, [activeStoreUser, currentStore]);

  const fetchTemplates = async () => {
    if (!currentStore?._id) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/products/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      // Fetch batch counts for each template
      const templatesWithCounts = await Promise.all(
        (data.templates || []).map(async (template: ProductTemplate) => {
          const batchesRes = await fetch(`/api/products/templates/${template._id}/batches`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const batchesData = batchesRes.ok ? await batchesRes.json() : { batches: [] };
          return { ...template, batches_count: batchesData.batches?.length || 0 };
        })
      );
      setTemplates(templatesWithCounts);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } catch (err) {
      showToast('Failed to load products', 'error');
    }
  };

  const handleDelete = (templateId: string) => {
    showConfirm(
      'Delete Product',
      'This will delete the product and all the associated batches and product items. This action cannot be undone.',
      async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/products/templates/${templateId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to delete template');
          fetchTemplates();
          showToast('Product deleted successfully', 'success');
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
      showToast('No Products selected', 'error');
      return;
    }
    showConfirm(
      'Delete Selected Products',
      `Delete ${selectedIds.size} product(s)? This will also delete all associated batches and product items. This cannot be undone.`,
      async () => {
        const token = localStorage.getItem('token');
        try {
          for (const id of selectedIds) {
            await fetch(`/api/products/templates/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
          fetchTemplates();
          showToast(`${selectedIds.size} product(s) deleted successfully`, 'success');
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'An error occurred';
          showToast(msg, 'error');
        }
      },
      { isDangerous: true, confirmText: 'Delete All', cancelText: 'Cancel' }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!currentStore?._id) {
      setError('No store selected.');
      setLoading(false);
      return;
    }
    if (!formData.brand.trim() || !formData.product_model.trim() || !formData.category.trim()) {
      setError('All fields are required');
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/products/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template');
      setIsModalOpen(false);
      setFormData({ brand: '', product_model: '', category: '' });
      fetchTemplates();
      showToast('Product created successfully', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.product_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || t.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, filterCategory]);

  const categories = useMemo(() => [...new Set(templates.map(t => t.category))], [templates]);
  const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTemplates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTemplates.map(t => t._id)));
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
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Products list</h1>
            <p className="text-neutral-600">Manage your products and generate batches</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchTemplates} variant="outline" className="h-11" title="Refresh products">
              <LuRotateCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => { setFormData({ brand: '', product_model: '', category: '' }); setIsModalOpen(true); }} className="h-11">
              <span className="mr-2">+</span> Create Product
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <Input placeholder="Search by brand, model, or category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900">
                  <option value="">All Categories</option>
                  {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-600">Showing {paginatedTemplates.length} of {filteredTemplates.length} templates</p>
                {selectedIds.size > 0 && (
                  <Button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                    <LuTrash2 className="w-4 h-4 mr-2" /> Delete {selectedIds.size}
                  </Button>
                )}
              </div>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-neutral-600 font-medium">No products found</p>
                <p className="text-sm text-neutral-500 mt-2">Create a product to get started</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input type="checkbox" checked={selectedIds.size === paginatedTemplates.length && paginatedTemplates.length > 0} onChange={toggleSelectAll} className="w-4 h-4" />
                        </TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Batches</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTemplates.map((template) => (
                        <TableRow key={template._id} className="cursor-pointer hover:bg-neutral-50" onClick={() => router.push(`/products/templates/${template._id}`)}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.has(template._id)} onChange={() => toggleSelect(template._id)} className="w-4 h-4" />
                          </TableCell>
                          <TableCell className="font-medium">{template.brand}</TableCell>
                          <TableCell>{template.product_model}</TableCell>
                          <TableCell><Badge variant="info">{template.category}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="primary">{template.batches_count || 0} batch{template.batches_count !== 1 ? 'es' : ''}</Badge>
                          </TableCell>
                          <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => router.push(`/products/templates/${template._id}`)} className="text-blue-600 hover:text-blue-700">
                                <LuArrowRight className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(template._id)} className="text-red-600 hover:text-red-700">
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

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Product Template" size="md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>)}
            <Input label="Brand" placeholder="Apple, Samsung, etc." value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} required />
            <Input label="Model" placeholder="iPhone 15 Pro Max" value={formData.product_model} onChange={(e) => setFormData({ ...formData, product_model: e.target.value })} required />
            <Input label="Category" placeholder="Electronics, Appliances, etc." value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>Create Product</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
