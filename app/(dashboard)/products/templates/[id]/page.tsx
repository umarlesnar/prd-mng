'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/context/store-context';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LuArrowLeft, LuDownload, LuChevronRight, LuTrash2, LuRotateCw } from 'react-icons/lu';
import { showToast } from '@/components/ui/Toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

interface ProductTemplate {
  _id: string;
  brand: string;
  product_model: string;
  category: string;
  created_at: string;
}

interface Batch {
  _id: string;
  manufacturing_date: string;
  warranty_period_months: number;
  quantity: number;
  created_at: string;
}

interface FormData {
  quantity: number;
  manufacturing_date: string;
  warranty_period_months: number;
}

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const { activeStoreUser, currentStore } = useStore();
  const [template, setTemplate] = useState<ProductTemplate | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    quantity: 1,
    manufacturing_date: '',
    warranty_period_months: 12,
  });

  useEffect(() => {
    if (activeStoreUser && currentStore && templateId) {
      fetchTemplate();
      fetchBatches();
    }
  }, [activeStoreUser, currentStore, templateId]);

  const fetchTemplate = async () => {
    if (!templateId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/products/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch template');
      const data = await res.json();
      setTemplate(data.template);
    } catch (err) {
      showToast('Failed to load template', 'error');
    }
  };

  const fetchBatches = async () => {
    if (!templateId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/products/templates/${templateId}/batches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch batches');
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (err) {
      showToast('Failed to load batches', 'error');
    }
  };

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const matchesSearch = new Date(b.manufacturing_date).toLocaleDateString().includes(searchTerm) ||
                           b.warranty_period_months.toString().includes(searchTerm) ||
                           b.quantity.toString().includes(searchTerm);
      return matchesSearch;
    });
  }, [batches, searchTerm]);

  const handleDelete = (batchId: string) => {
    showConfirm(
      'Delete Batch',
      'This will delete the batch and all associated product items. This action cannot be undone.',
      async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/products/batches/${batchId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to delete batch');
          fetchBatches();
          showToast('Batch and all items deleted successfully', 'success');
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'An error occurred';
          showToast(msg, 'error');
        }
      },
      { isDangerous: true, confirmText: 'Delete', cancelText: 'Cancel' }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!formData.manufacturing_date || formData.quantity < 1 || formData.quantity > 10000 || formData.warranty_period_months < 1) {
      setError('All fields are required and must be valid');
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/products/templates/${templateId}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create batch');
      setIsModalOpen(false);
      setFormData({ quantity: 1, manufacturing_date: '', warranty_period_months: 12 });
      fetchBatches();
      showToast(`Batch created successfully with ${data.quantity} product items`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSerials = async (batchId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/products/batches/${batchId}/download-serials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${batchId}-serials.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('PDF downloaded successfully', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      showToast(msg, 'error');
    }
  };

  if (!template) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/products')} className="h-11">
              <LuArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 mb-2">{template.brand} {template.product_model}</h1>
              <p className="text-neutral-600">
                <Badge variant="info" className="mr-2">{template.category}</Badge>
                Manage batches for this product template
              </p>
            </div>
          </div>
          <Button onClick={fetchBatches} variant="outline" className="h-11">
            <LuRotateCw className="w-4 h-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Batches</CardTitle>
              <Button onClick={() => { setFormData({ quantity: 1, manufacturing_date: '', warranty_period_months: 12 }); setIsModalOpen(true); }} className="h-11">
                <span className="mr-2">+</span> Generate Batch
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <Input placeholder="Search by date, warranty period, or quantity..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
              <p className="text-sm text-neutral-600">Showing {filteredBatches.length} of {batches.length} batches</p>
            </div>
            {filteredBatches.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-neutral-600 font-medium">No batches found</p>
                <p className="text-sm text-neutral-500 mt-2">Generate a batch to create product items</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Manufacturing Date</TableHead>
                      <TableHead>Warranty Period</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch) => (
                      <TableRow key={batch._id} className="cursor-pointer hover:bg-neutral-50" onClick={() => router.push(`/products/batches/${batch._id}`)}>
                        <TableCell>{new Date(batch.manufacturing_date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="primary">{batch.warranty_period_months} months</Badge></TableCell>
                        <TableCell className="font-medium">{batch.quantity} items</TableCell>
                        <TableCell>{new Date(batch.created_at).toLocaleDateString()}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => router.push(`/products/batches/${batch._id}`)} className="text-blue-600 hover:text-blue-700">
                              <LuChevronRight className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadSerials(batch._id)} className="text-green-600 hover:text-green-700">
                              <LuDownload className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(batch._id)} className="text-red-600 hover:text-red-700">
                              <LuTrash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Batch" size="md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>)}
            <Input label="Quantity" type="number" placeholder="1" min="1" max="10000" value={formData.quantity || ''} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} required />
            <Input label="Manufacturing Date" type="date" value={formData.manufacturing_date} onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value })} required />
            <Input label="Warranty Period (Months)" type="number" placeholder="12" min="1" value={formData.warranty_period_months} onChange={(e) => setFormData({ ...formData, warranty_period_months: parseInt(e.target.value) })} required />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>Generate Batch</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
