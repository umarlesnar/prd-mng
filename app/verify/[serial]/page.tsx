'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function VerifyPage({ params }: { params: Promise<{ serial: string }> }) {
  const [warranty, setWarranty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWarranty = async () => {
      try {
        const { serial } = await params;
        const res = await fetch(`/api/warranties/serial/${serial}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Warranty not found');
        }

        setWarranty(data.warranty);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWarranty();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Warranty Not Found</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const product = warranty.product_id;
  const customer = warranty.customer_id;
  const store = warranty.store_id;
  const daysLeft = Math.ceil((new Date(warranty.warranty_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft < 0;

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Warranty Verification</CardTitle>
              <Badge variant={isExpired ? 'danger' : warranty.status === 'active' ? 'success' : 'warning'}>
                {warranty.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Store Information</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Store:</span> {store.store_name}</p>
                {store.address && <p><span className="font-medium">Address:</span> {store.address}</p>}
                {store.contact_phone && <p><span className="font-medium">Phone:</span> {store.contact_phone}</p>}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Product Details</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Brand:</span> {product.brand}</p>
                <p><span className="font-medium">Model:</span> {product.product_model}</p>
                <p><span className="font-medium">Category:</span> {product.category}</p>
                <p><span className="font-medium">Serial Number:</span> <span className="font-mono">{product.serial_number}</span></p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Customer Details</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {customer.customer_name}</p>
                <p><span className="font-medium">Phone:</span> {customer.phone}</p>
                {customer.email && <p><span className="font-medium">Email:</span> {customer.email}</p>}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Warranty Period</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Start Date:</span> {new Date(warranty.warranty_start).toLocaleDateString()}</p>
                <p><span className="font-medium">End Date:</span> {new Date(warranty.warranty_end).toLocaleDateString()}</p>
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  {isExpired ? (
                    <span className="text-red-600">Expired</span>
                  ) : (
                    <span className="text-green-600">{daysLeft} days remaining</span>
                  )}
                </p>
              </div>
            </div>

            {warranty.warranty_pdf_url && (
              <div className="pt-4 border-t">
                <a
                  href={warranty.warranty_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Download Warranty Certificate
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
