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

export default function ClaimsPage() {
  const { currentStore } = useStore();
  const [claims, setClaims] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    warranty_id: '',
    claim_type: 'repair',
    description: '',
  });

  useEffect(() => {
    if (currentStore) {
      fetchClaims();
      fetchWarranties();
    }
  }, [currentStore]);

  const fetchClaims = async () => {
    if (!currentStore?._id) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/claims?storeId=${currentStore._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch claims');
      const data = await res.json();
      setClaims(data.claims || []);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } catch (err) {
      showToast('Failed to load claims', 'error');
    }
  };

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
    } catch (err) {
      showToast('Failed to load warranties', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!formData.warranty_id || !formData.description.trim() || formData.description.length < 10) {
      setError('All fields required, description min 10 chars');
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create claim');
      setIsModalOpen(false);
      fetchClaims();
      setFormData({ warranty_id: '', claim_type: 'repair', description: '' });
      showToast('Claim created successfully', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (claimId: string) => {
    showConfirm('Delete Claim', 'This action cannot be undone.', async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/claims/${claimId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete claim');
        fetchClaims();
        showToast('Claim deleted successfully', 'success');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An error occurred';
        showToast(msg, 'error');
      }
    }, { isDangerous: true, confirmText: 'Delete', cancelText: 'Cancel' });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      showToast('No claims selected', 'error');
      return;
    }
    showConfirm('Delete Selected Claims', `Delete ${selectedIds.size} claim(s)?`, async () => {
      const token = localStorage.getItem('token');
      try {
        for (const id of selectedIds) {
          await fetch(`/api/claims/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        fetchClaims();
        showToast(`${selectedIds.size} claim(s) deleted successfully`, 'success');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An error occurred';
        showToast(msg, 'error');
      }
    }, { isDangerous: true, confirmText: 'Delete All', cancelText: 'Cancel' });
  };

  const updateStatus = async (claimId: string, status: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/claims/${claimId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchClaims();
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = { pending: 'warning', approved: 'info', rejected: 'danger', completed: 'success' };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const template = c.warranty_id?.product_id?.product_template_id as any;
      const matchesSearch = template?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template?.product_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.warranty_id?.customer_id?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !filterStatus || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchTerm, filterStatus]);

  const statuses = useMemo(() => [...new Set(claims.map(c => c.status))], [claims]);
  const totalPages = Math.ceil(filteredClaims.length / ITEMS_PER_PAGE);
  const paginatedClaims = filteredClaims.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedClaims.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedClaims.map(c => c._id)));
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
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Claims</h1>
            <p className="text-neutral-600">Manage warranty claims and service requests</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchClaims} variant="outline" className="h-11">↻</Button>
            <Button onClick={() => setIsModalOpen(true)} className="h-11">
              <span className="mr-2">+</span> Create Claim
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <Input placeholder="Search by product, customer, or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900">
                  <option value="">All Statuses</option>
                  {statuses.map(status => (<option key={status} value={status}>{status}</option>))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-600">Showing {paginatedClaims.length} of {filteredClaims.length} claims</p>
                {selectedIds.size > 0 && (
                  <Button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                    <LuTrash2 className="w-4 h-4 mr-2" /> Delete {selectedIds.size}
                  </Button>
                )}
              </div>
            </div>

            {filteredClaims.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-neutral-600 font-medium">No claims found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input type="checkbox" checked={selectedIds.size === paginatedClaims.length && paginatedClaims.length > 0} onChange={toggleSelectAll} className="w-4 h-4" />
                        </TableHead>
                        <TableHead>Claim ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClaims.map((claim) => (
                        <TableRow key={claim._id}>
                          <TableCell>
                            <input type="checkbox" checked={selectedIds.has(claim._id)} onChange={() => toggleSelect(claim._id)} className="w-4 h-4" />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold bg-neutral-50 px-2 py-1 rounded">{claim._id.slice(-8)}</TableCell>
                          <TableCell className="font-medium">
                            {(claim.warranty_id?.product_id?.product_template_id as any)?.brand} {(claim.warranty_id?.product_id?.product_template_id as any)?.product_model}
                          </TableCell>
                          <TableCell>{claim.warranty_id?.customer_id?.customer_name}</TableCell>
                          <TableCell>
                            <Badge variant="info" className="capitalize">{claim.claim_type}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(claim.status)}</TableCell>
                          <TableCell className="text-neutral-600 text-sm">{new Date(claim.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {claim.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => updateStatus(claim._id, 'approved')} className="text-success-600 hover:bg-success-50">
                                    ✓ Approve
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => updateStatus(claim._id, 'rejected')} className="text-danger-600 hover:bg-danger-50">
                                    ✕ Reject
                                  </Button>
                                </>
                              )}
                              {claim.status === 'approved' && (
                                <Button size="sm" variant="ghost" onClick={() => updateStatus(claim._id, 'completed')} className="text-primary-600 hover:bg-primary-50">
                                  ✓ Complete
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setSelectedClaim(claim)}>
                                View
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(claim._id)} className="text-red-600 hover:text-red-700">
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

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Claim" size="md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>)}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Warranty <span className="text-danger-600">*</span></label>
              <select className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900" value={formData.warranty_id} onChange={(e) => setFormData({ ...formData, warranty_id: e.target.value })} required>
                <option value="">Select a warranty</option>
                {warranties.map((warranty) => (<option key={warranty._id} value={warranty._id}>{warranty.product_id?.serial_number} - {warranty.customer_id?.customer_name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Claim Type <span className="text-danger-600">*</span></label>
              <select className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900" value={formData.claim_type} onChange={(e) => setFormData({ ...formData, claim_type: e.target.value })} required>
                <option value="repair">Repair</option>
                <option value="replacement">Replacement</option>
                <option value="refund">Refund</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Description <span className="text-danger-600">*</span></label>
              <textarea className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900" rows={4} placeholder="Describe the issue..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>Create Claim</Button>
            </div>
          </form>
        </Modal>

        {selectedClaim && (
          <Modal isOpen={!!selectedClaim} onClose={() => setSelectedClaim(null)} title="Claim Details" size="lg">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Claim ID</p>
                  <p className="text-lg font-mono text-neutral-900">{selectedClaim._id.slice(-12)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Status</p>
                  <div>{getStatusBadge(selectedClaim.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Type</p>
                  <p className="text-lg capitalize text-neutral-900">{selectedClaim.claim_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Created</p>
                  <p className="text-lg text-neutral-900">{new Date(selectedClaim.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600 mb-2">Description</p>
                <p className="text-neutral-700 bg-neutral-50 p-4 rounded-lg">{selectedClaim.description}</p>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
