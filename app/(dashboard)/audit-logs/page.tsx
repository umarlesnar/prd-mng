'use client';

import { useEffect, useState, Suspense } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

function AuditLogsContent() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    entity: '',
    page: 1,
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      page: filters.page.toString(),
      ...(filters.entity && { entity: filters.entity }),
    });

    const res = await fetch(`/api/audit-logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setLogs(data.logs || []);
  };

  const getActionBadge = (action: string) => {
    const variants: any = {
      create: 'success',
      update: 'info',
      delete: 'danger',
    };
    return <Badge variant={variants[action] || 'default'}>{action}</Badge>;
  };

  return (
    <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">Audit Logs</h1>
          <p className="text-neutral-600">Track all system activities and changes</p>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <CardTitle>System Activity Log</CardTitle>
              <div className="flex gap-3">
                <Button onClick={fetchLogs} variant="outline" className="h-9">
                  ↻
                </Button>
                <select
                  className="px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
                  value={filters.entity}
                  onChange={(e) => setFilters({ ...filters, entity: e.target.value, page: 1 })}
                >
                  <option value="">All Entities</option>
                  <option value="stores">Stores</option>
                  <option value="products">Products</option>
                  <option value="customers">Customers</option>
                  <option value="warranties">Warranties</option>
                  <option value="claims">Claims</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-neutral-600 font-medium">No activities found</p>
                <p className="text-neutral-500 text-sm">Activities will appear here as you use the system</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell className="text-neutral-600">{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{log.user_id?.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="info" className="uppercase">{log.entity}</Badge>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-mono text-xs bg-neutral-50 px-2 py-1 rounded">{log.entity_id.toString().slice(-8)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <AuditLogsContent />
      </Suspense>
    </DashboardLayout>
  );
}