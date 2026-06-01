'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-config';
import type { Customer, Sale } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Zap } from 'lucide-react';

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  paymentType: z.string().min(1, 'Payment type is required'),
  paymentDate: z.date({
    required_error: 'Payment date is required',
  }),
  amount: z.coerce.number().positive('Amount must be positive'),
  note: z.string().optional(),
  allocations: z.array(z.object({
    invoiceId: z.string(),
    amountAllocated: z.number().positive()
  })).optional()
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const PAYMENT_TYPES = [
  'Cash',
  'Bank Transfer',
  'Check',
  'GCash',
  'PayMaya',
  'Credit Card',
  'Debit Card',
  'Other',
];

// Generate auto reference
function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAY-${timestamp}-${random}`;
}

interface AddPaymentDialogProps {
  onSuccess?: () => void;
}

export function AddPaymentDialog({ onSuccess }: AddPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: '',
      paymentType: '',
      paymentDate: new Date(),
      amount: 0,
      note: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch customers when dialog opens
      const fetchCustomers = async () => {
        try {
          setIsLoadingCustomers(true);
          const response = await fetch(getApiUrl('/customers'));
          if (response.ok) {
            const result = await response.json();
            setCustomers(result.data || []);
          }
        } catch (error) {
          console.error('Failed to fetch customers:', error);
        } finally {
          setIsLoadingCustomers(false);
        }
      };
      fetchCustomers();
    }
  }, [isOpen]);

  const selectedCustomerId = form.watch('customerId');
  const paymentAmount = form.watch('amount');

  useEffect(() => {
    if (selectedCustomerId) {
      const fetchInvoices = async () => {
        try {
          setIsLoadingInvoices(true);
          const response = await fetch(getApiUrl(`/customers/invoices/outstanding?customerId=${selectedCustomerId}`));
          if (response.ok) {
            const result = await response.json();
            // Sort by earliest date first
            const sortedInvoices = (result.data || []).sort((a: any, b: any) => 
               new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            setInvoices(sortedInvoices);
          }
        } catch (error) {
          console.error('Failed to fetch invoices:', error);
        } finally {
          setIsLoadingInvoices(false);
        }
      };
      fetchInvoices();
    } else {
      setInvoices([]);
      setManualAllocations({});
    }
  }, [selectedCustomerId]);

  const totalAllocated = Object.values(manualAllocations).reduce((sum, val) => sum + val, 0);
  const remainingToAllocate = Math.max(0, (paymentAmount || 0) - totalAllocated);

  const handleAllocationChange = (invoiceId: string, amount: number, maxBalance: number) => {
    const validAmount = Math.min(amount, maxBalance);
    setManualAllocations(prev => ({
        ...prev,
        [invoiceId]: validAmount <= 0 ? 0 : validAmount
    }));
  };

  const toggleInvoice = (invoice: Sale, checked: boolean) => {
    if (checked) {
        // Allocate full balance or what's left of the payment
        const balance = Number(invoice.balance);
        const amountToAllocate = Math.min(balance, remainingToAllocate + (manualAllocations[invoice.id] || 0));
        setManualAllocations(prev => ({
            ...prev,
            [invoice.id]: Number(amountToAllocate.toFixed(2))
        }));
    } else {
        setManualAllocations(prev => {
            const next = { ...prev };
            delete next[invoice.id];
            return next;
        });
    }
  };

  const handleAutoAllocate = () => {
    let remaining = paymentAmount || 0;
    const next: Record<string, number> = {};
    for (const inv of invoices) {
      if (remaining <= 0) break;
      const toApply = Math.min(remaining, Number(inv.balance));
      if (toApply > 0) {
        next[inv.id] = toApply;
        remaining -= toApply;
      }
    }
    setManualAllocations(next);
  };

  const allocations = Object.entries(manualAllocations)
    .filter(([_, amount]) => amount > 0)
    .map(([invoiceId, amountAllocated]) => ({
      invoiceId,
      amountAllocated
    }));

  const { isSubmitting } = form.formState;

  async function onSubmit(values: PaymentFormValues) {
    try {
      const response = await fetch(getApiUrl('/customer-payments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: values.customerId,
          paymentType: values.paymentType,
          paymentDate: values.paymentDate.toISOString(),
          amount: values.amount,
          reference: undefined,
          note: values.note || null,
          allocations
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Payment Added',
          description: `Payment of ${formatCurrency(values.amount)} recorded. Reference: ${result.data?.reference || 'Generated automatically'}.`,
        });
        setIsOpen(false);
        form.reset();
        setManualAllocations({});
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add payment.',
        });
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add payment. Please try again.',
      });
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Payment</SheetTitle>
          <SheetDescription>
            Record a new payment from a customer.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingCustomers ? "Loading customers..." : "Select a customer"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingCustomers ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.contactNumber})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Payment</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to be Paid</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCustomerId && invoices.length > 0 && (
                <div className="flex flex-col gap-2 p-3 rounded-md bg-muted/50 border">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">Total Payment:</span>
                        <span className="font-bold">{formatCurrency(paymentAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">Total Allocated:</span>
                        <span className={cn("font-bold", totalAllocated > (paymentAmount || 0) ? "text-destructive" : "text-green-600")}>
                            {formatCurrency(totalAllocated)}
                        </span>
                    </div>
                    {remainingToAllocate > 0 && (
                        <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2">
                            <span>Remaining to Allocate:</span>
                            <span>{formatCurrency(remainingToAllocate)}</span>
                        </div>
                    )}
                    {totalAllocated > (paymentAmount || 0) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 p-1.5 rounded mt-1">
                            <AlertCircle className="h-3 w-3" />
                            Allocated amount exceeds total payment!
                        </div>
                    )}
                </div>
            )}

             {selectedCustomerId && (invoices.length > 0 ? (
              <div className="rounded-md border p-2">
                 <div className="flex justify-between items-center mb-2">
                   <div className="text-sm font-semibold">Invoice Allocation</div>
                   <Button
                     type="button"
                     size="sm"
                     variant="outline"
                     onClick={handleAutoAllocate}
                     disabled={!paymentAmount || paymentAmount <= 0 || isLoadingInvoices}
                     className="h-7 text-xs"
                   >
                     <Zap className="mr-1 h-3 w-3" />
                     Auto-Allocate
                   </Button>
                 </div>
                 <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="w-[100px] text-right">Apply</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((invoice) => {
                            const currentAlloc = manualAllocations[invoice.id] || 0;
                            const isFullyAllocated = currentAlloc >= Number(invoice.balance);
                            
                            return (
                                <TableRow key={invoice.id} className={cn(currentAlloc > 0 && "bg-green-50/50 dark:bg-green-900/10")}>
                                  <TableCell className="p-2">
                                    <Checkbox 
                                        checked={currentAlloc > 0} 
                                        onCheckedChange={(checked) => toggleInvoice(invoice, !!checked)}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="font-mono">{invoice.reference || invoice.id.substring(0,8)}</div>
                                    <div className="text-[10px] text-muted-foreground">{format(new Date(invoice.date || invoice.invoiceDate || new Date()), 'PP')}</div>
                                  </TableCell>
                                  <TableCell className="text-right p-2 font-medium">
                                    {formatCurrency(Number(invoice.balance))}
                                  </TableCell>
                                  <TableCell className="text-right p-2">
                                     <Input 
                                        type="number" 
                                        step="0.01" 
                                        className="h-7 text-right text-xs p-1"
                                        value={currentAlloc || ''}
                                        placeholder="0.00"
                                        onChange={(e) => handleAllocationChange(invoice.id, parseFloat(e.target.value) || 0, Number(invoice.balance))}
                                     />
                                  </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                 </Table>
              </div>
            ) : !isLoadingInvoices && (
               <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  <span className="font-semibold">Note:</span> This customer has no outstanding invoices. This payment will simply be recorded as an unallocated credit/payment history.
               </div>
            ))}

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the payment..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || totalAllocated > (paymentAmount || 0)}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Payment...
                  </>
                ) : (
                  'Add Payment'
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
