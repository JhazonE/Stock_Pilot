
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Minus, Plus, ArrowLeftRight, TrendingUp, TrendingDown } from 'lucide-react';
import { AdminAuthDialog } from './admin-auth-dialog';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';

const transferSchema = z.object({
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  reason: z.string().min(3, 'A reason is required (min. 3 characters).'),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface CashTransferDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shiftId: string | null;
  terminalId: string;
  userId: string;
}

export function CashTransferDialog({ isOpen, onOpenChange, shiftId, terminalId, userId }: CashTransferDialogProps) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [transferType, setTransferType] = useState<'pickup' | 'deposit'>('pickup');
  const { toast } = useToast();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: 0,
      reason: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
      setTransferType('pickup');
    }
  }, [isOpen, form]);

  const { isSubmitting } = form.formState;

  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    form.handleSubmit(onSubmit)();
  };

  async function onSubmit(values: TransferFormValues) {
    try {
      const response = await fetch(getApiUrl('/pos/cash-transfer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId,
          terminalId,
          userId,
          amount: values.amount,
          type: transferType,
          reason: values.reason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Transfer Recorded',
          description: `Successfully recorded cash ${transferType}.`,
        });
        onOpenChange(false);
      } else {
        toast({
          title: 'Transfer Failed',
          description: result.error || 'Failed to record transfer.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast({
        title: 'Transfer Failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  }

  const isDeposit = transferType === 'deposit';
  const accentText = isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const accentBg = isDeposit ? 'bg-emerald-500/10' : 'bg-red-500/10';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetTitle className="sr-only">Cash Transfer</SheetTitle>
          <SheetDescription className="sr-only">Record a cash deposit into or pickup from the drawer. Admin authentication required.</SheetDescription>

          {/* Header */}
          <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentBg} ${accentText}`}>
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-none">Cash Transfer</h2>
                <p className="mt-1 text-xs text-muted-foreground">Record a deposit into or pickup from the drawer</p>
              </div>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Transfer type toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-1.5">
              <button
                type="button"
                onClick={() => setTransferType('deposit')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  isDeposit
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Cash In (Deposit)
              </button>
              <button
                type="button"
                onClick={() => setTransferType('pickup')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  !isDeposit
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                Cash Out (Pickup)
              </button>
            </div>

            <Form {...form}>
              <form
                id="cash-transfer-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsAuthDialogOpen(true);
                }}
                className={`space-y-4 rounded-xl border-2 p-4 ${isDeposit ? 'border-emerald-500/30' : 'border-red-500/30'}`}
              >
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Amount (₱)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold ${accentText}`}>₱</span>
                          <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            {...field}
                            className="h-14 pl-10 text-2xl font-black"
                            placeholder="0.00"
                            autoFocus
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Reason / Notes</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Change for customer, end of day deposit"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold">Note:</span> Admin authentication is required to confirm this transfer.
            </div>
          </div>

          {/* Footer */}
          <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-3 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" className="h-12" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="cash-transfer-form"
              disabled={isSubmitting}
              className={`h-12 font-bold ${isDeposit ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20' : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20'}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming…
                </>
              ) : (
                <>
                  {isDeposit ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
                  Confirm {isDeposit ? 'Deposit' : 'Pickup'}
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AdminAuthDialog
        isOpen={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        onSuccess={handleAdminAuthSuccess}
      />
    </>
  );
}
