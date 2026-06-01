'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { printPaymentReceipt } from '@/lib/print-payment-receipt';
import { formatCurrency } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-config';
import { Skeleton } from '@/components/ui/skeleton';

interface ViewPaymentDialogProps {
  payment: {
    id: string;
    customerName: string;
    paymentDate: string | Date;
    amount: number;
    paymentType: string;
    reference: string;
    note?: string;
  };
  children?: React.ReactNode;
}

export default function ViewPaymentDialog({ payment, children }: ViewPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && payment.id) {
      fetchAllocations();
    }
  }, [isOpen, payment.id]);

  const fetchAllocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl(`/customer-payments/${payment.id}/allocations`));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setAllocations(result.data);
      }
    } catch (error) {
      console.error('Error fetching allocations:', error);
      setAllocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    printPaymentReceipt({
      id: payment.id,
      customerName: payment.customerName,
      date: payment.paymentDate,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentType,
      reference: payment.reference,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" title="View Details">
            <Eye className="h-4 w-4 text-blue-600" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payment Details</span>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
          </DialogTitle>
          <DialogDescription>
            Reference: <span className="font-mono font-medium text-foreground">{payment.reference}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-muted-foreground text-xs uppercase">Customer</p>
              <p className="font-medium text-lg">{payment.customerName}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-muted-foreground text-xs uppercase">Amount</p>
              <p className="font-bold text-lg text-green-600">{formatCurrency(payment.amount)}</p>
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{format(new Date(payment.paymentDate), 'PPP p')}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium">{payment.paymentType}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono text-xs">{payment.id}</span>
             </div>
          </div>

          {payment.note && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md text-sm border border-yellow-100 dark:border-yellow-900/20">
               <p className="font-semibold text-xs text-yellow-800 dark:text-yellow-500 mb-1 uppercase">Note</p>
               <p className="text-yellow-700 dark:text-yellow-400/90 italic">{payment.note}</p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : allocations.length > 0 ? (
            <div className="space-y-3 border-t pt-4">
              <p className="font-semibold text-sm text-muted-foreground uppercase">Applied to Invoices</p>
              <div className="space-y-2">
                {allocations.map((alloc) => (
                  <div key={alloc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/20 text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{alloc.invoice_reference || alloc.invoice_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(alloc.invoice_date), 'PPP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(alloc.amount_allocated)}</p>
                      <Badge variant={alloc.status === 'Paid' ? 'default' : 'secondary'} className="text-xs mt-1">
                        {alloc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
