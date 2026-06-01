
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ban, Search, User, CreditCard, ShoppingBag, Receipt, Loader2, X, CheckCircle2 } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { format } from 'date-fns';
import { formatQuantity } from '@/lib/utils';
import { AdminAuthDialog } from './admin-auth-dialog';
import { getApiUrl } from '@/lib/api-config';
import { usePrinter } from '@/lib/use-printer';
import { VoidSlipGenerator } from '@/lib/void-slip-generator';
import { useToast } from '@/hooks/use-toast';

interface VoidSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// ------- Step: Success -------
function SuccessView({ voidedSaleId, voidedTotal, onClose }: { voidedSaleId: string; voidedTotal: number; onClose: () => void; }) {
  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-none">Transaction Voided</h2>
            <p className="mt-1 text-xs text-muted-foreground">Stock has been restored to inventory</p>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
          <Ban className="h-10 w-10" />
        </div>
        <div className="w-full rounded-2xl border bg-card p-5 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Voided Amount</p>
          <p className="mt-2 text-5xl font-black tracking-tight text-foreground tabular-nums line-through decoration-red-500/60">
            ₱{voidedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Reference: <span className="font-mono font-medium text-foreground">{voidedSaleId}</span>
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t bg-background px-6 py-4">
        <Button className="h-12 w-full font-bold" onClick={onClose} autoFocus>Close</Button>
      </div>
    </div>
  );
}

export function VoidSalesDialog({
  isOpen,
  onOpenChange,
}: VoidSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'list' | 'success'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [voidedSaleId, setVoidedSaleId] = useState('');
  const [voidedTotal, setVoidedTotal] = useState(0);
  const [posSettings, setPosSettings] = useState<any>(null);

  const authSucceededRef = useRef(false);
  const { print } = usePrinter(posSettings?.printMode || 'browser', posSettings?.nativePrinterName);
  const { toast } = useToast();

  // Reset and determine first step on open
  useEffect(() => {
    if (!isOpen) return;
    authSucceededRef.current = false;
    setStep('loading');
    setIsLoading(false);
    setIsVoiding(false);
    setVoidError('');
    setSales([]);
    setSearchTerm('');
    setSelectedSale(null);
    setFocusedIndex(0);
    setVoidedSaleId('');
    setVoidedTotal(0);

    fetch(getApiUrl(`/pos-settings?_t=${Date.now()}`), { cache: 'no-store' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          const settings = result.data;
          setPosSettings(settings);
          if (settings.enableVoidReturnAuth) {
            setStep('auth');
          } else {
            authSucceededRef.current = true;
            setStep('list');
          }
        } else {
          authSucceededRef.current = true;
          setStep('list');
        }
      })
      .catch(() => { authSucceededRef.current = true; setStep('list'); });
  }, [isOpen]);

  // Fetch sales when entering list step
  useEffect(() => {
    if (!isOpen || step !== 'list') return;
    const fetchSales = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(getApiUrl(`/pos/recent-sales?_t=${Date.now()}`), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) setSales(json.data || []);
      } catch (err) {
        console.error('Failed to load sales', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSales();
  }, [isOpen, step]);

  // Filter sales
  const q = searchTerm.trim().toLowerCase();
  const filteredSales = useMemo(() => {
    if (!q) return sales;
    return sales.filter((s: any) =>
      String(s.orderNumber ?? '').toLowerCase().includes(q) ||
      String(s.id ?? '').toLowerCase().includes(q) ||
      String(s.customer?.name ?? '').toLowerCase().includes(q) ||
      String(s.paymentMethod ?? '').toLowerCase().includes(q) ||
      String(s.paymentReference ?? '').toLowerCase().includes(q),
    );
  }, [sales, q]);

  // Clamp cursor
  useEffect(() => {
    if (filteredSales.length === 0) return;
    setFocusedIndex(i => Math.min(i, filteredSales.length - 1));
  }, [filteredSales.length]);

  // Auto-select
  useEffect(() => {
    if (filteredSales.length === 0) {
      setSelectedSale(null);
      return;
    }
    setSelectedSale(prev => {
      if (prev && filteredSales.find(s => s.id === prev.id)) return prev;
      return filteredSales[0];
    });
  }, [filteredSales]);

  // Sync focusedIndex → selectedSale + scroll into view
  useEffect(() => {
    if (filteredSales.length === 0) return;
    const target = filteredSales[focusedIndex];
    if (target) setSelectedSale(target);
    document.getElementById(`void-sale-${target?.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, filteredSales]);

  // Clear void error when sale changes
  useEffect(() => {
    setVoidError('');
  }, [selectedSale?.id]);

  // Auth flow
  const handleAuthSuccess = () => {
    authSucceededRef.current = true;
    setStep('list');
  };

  const handleAuthClose = (open: boolean) => {
    if (!open && !authSucceededRef.current) {
      onOpenChange(false);
    }
  };

  const handlePrintVoid = async (saleData: any) => {
    try {
      if (!posSettings || posSettings.printMode === 'none') return;
      const generator = new VoidSlipGenerator();
      const buffer = generator.generateVoidSlip(saleData, posSettings);
      await print(buffer);
    } catch (error) {
      console.error('Error printing void slip:', error);
    }
  };

  const handleVoidTransaction = async () => {
    if (!selectedSale) return;
    setIsVoiding(true);
    setVoidError('');
    try {
      const response = await fetch(getApiUrl('/pos/void-transaction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId: selectedSale.id }),
      });
      const result = await response.json();

      if (result.success) {
        // Print the void slip
        await handlePrintVoid(selectedSale);
        setVoidedSaleId(String(selectedSale.orderNumber || selectedSale.id));
        setVoidedTotal(Number(selectedSale.total) || 0);
        setStep('success');
      } else {
        setVoidError(result.error || 'Failed to void transaction');
        toast({ title: 'Void Failed', description: result.error || 'Failed to void transaction', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error voiding transaction', err);
      setVoidError('Error connecting to server');
      toast({ title: 'Error', description: 'Error connecting to server', variant: 'destructive' });
    } finally {
      setIsVoiding(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || step !== 'list') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => Math.min(filteredSales.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => Math.max(0, i - 1));
        return;
      }
      if (isInput) return;

      if (e.key === 'Enter') {
        if (tag === 'BUTTON') return;
        if (selectedSale && !isVoiding) {
          e.preventDefault();
          handleVoidTransaction();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, filteredSales, focusedIndex, selectedSale, isVoiding]);

  const handleClose = () => onOpenChange(false);

  return (
    <>
      <Sheet open={isOpen && (step === 'list' || step === 'success')} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetTitle className="sr-only">Post Void</SheetTitle>
          <SheetDescription className="sr-only">Select a transaction and void it entirely. Stock will be restored.</SheetDescription>

          {step === 'success' ? (
            <SuccessView voidedSaleId={voidedSaleId} voidedTotal={voidedTotal} onClose={handleClose} />
          ) : (
            <div className="flex h-full flex-col">
              {/* Header */}
              <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                      <Ban className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold leading-none">Post Void</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Pick a transaction to void</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {q ? `${filteredSales.length} of ${sales.length}` : `${sales.length} sale${sales.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </SheetHeader>

              {/* Search */}
              <div className="shrink-0 border-b bg-background px-6 py-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search SO #, customer, payment, or reference…"
                    className="h-10 pl-9 pr-9"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Master-detail */}
              <div className="flex min-h-0 flex-1">
                {/* Left: transactions list */}
                <div className="flex w-[320px] shrink-0 flex-col border-r">
                  <div className="flex shrink-0 items-center gap-2 border-b bg-muted/10 px-4 py-1.5 text-[10px] text-muted-foreground">
                    <kbd className="rounded border bg-background px-1 font-mono">↑↓</kbd> navigate
                    <span className="opacity-40">·</span>
                    <kbd className="rounded border bg-background px-1 font-mono">↵</kbd> void
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredSales.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                        <Receipt className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">{q ? 'No matching sales' : 'No recent sales'}</p>
                      </div>
                    ) : (
                      filteredSales.map((sale: any, i) => {
                        const isSel = selectedSale?.id === sale.id;
                        const isFocused = focusedIndex === i;
                        return (
                          <div
                            key={sale.id}
                            id={`void-sale-${sale.id}`}
                            onClick={() => { setFocusedIndex(i); setSelectedSale(sale); }}
                            className={`relative cursor-pointer border-b border-border/40 px-4 py-2.5 transition-colors ${isSel ? 'bg-primary/5' : 'hover:bg-muted/40'} ${isFocused ? 'ring-2 ring-inset ring-primary' : ''}`}
                          >
                            {isSel && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-sm font-semibold">#{sale.orderNumber ? sale.orderNumber : sale.id.substring(0, 7)}</span>
                              <span className="font-mono text-sm font-bold">₱{Number(sale.total).toFixed(2)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span className="truncate">{sale.customer?.name || 'Walk-in'}</span>
                              <span className="shrink-0">{format(new Date(sale.date || new Date()), 'p')}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: void panel */}
                <div className="flex flex-1 flex-col bg-muted/10">
                  {!selectedSale ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                      <ShoppingBag className="h-10 w-10 opacity-30" />
                      <p className="text-sm font-medium">Select a transaction</p>
                      <p className="text-xs">Pick any sale on the left to review and void.</p>
                    </div>
                  ) : (
                    <>
                      {/* Sale info header */}
                      <div className="shrink-0 border-b bg-background px-5 py-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold">#{selectedSale.orderNumber || selectedSale.id.substring(0, 7)}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(selectedSale.date || new Date()), 'PP p')}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-3.5 w-3.5" /><span className="truncate">{selectedSale.customer?.name || 'Walk-in'}</span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                            <CreditCard className="h-3.5 w-3.5" /><span className="truncate">{selectedSale.paymentMethod || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items header */}
                      <div className="flex shrink-0 items-center gap-2 border-b bg-muted/20 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Items ({selectedSale.items.length})</span>
                      </div>

                      {/* Items list (read-only) */}
                      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-3">
                        {selectedSale.items.map((item, i) => {
                          const lineTotal = item.price * item.quantity;
                          return (
                            <div key={`${item.product.id}-${i}`} className="rounded-lg border bg-card p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatQuantity(item.quantity, item.product.unitOfMeasure)} × ₱{item.price.toFixed(2)}
                                  </p>
                                </div>
                                <span className="shrink-0 font-mono text-sm font-semibold">₱{lineTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="shrink-0 space-y-3 border-t bg-background px-5 py-4">
                        <div className="flex items-baseline justify-between rounded-lg bg-red-500/10 px-4 py-2 text-red-700 dark:text-red-400">
                          <span className="text-xs font-bold uppercase tracking-wider">Void Amount</span>
                          <span className="font-mono text-lg font-black">₱{Number(selectedSale.total).toFixed(2)}</span>
                        </div>
                        {voidError && (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {voidError}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          This will void the entire transaction and restore stock for all items.
                        </p>
                        <div className="grid grid-cols-[1fr_2fr] gap-3">
                          <Button variant="outline" className="h-12" onClick={handleClose} disabled={isVoiding}>Cancel</Button>
                          <Button
                            className="h-12 font-bold"
                            variant="destructive"
                            disabled={isVoiding}
                            onClick={handleVoidTransaction}
                          >
                            {isVoiding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                            {isVoiding ? 'Voiding…' : 'Void Transaction'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AdminAuthDialog
        isOpen={isOpen && step === 'auth'}
        onOpenChange={handleAuthClose}
        onSuccess={handleAuthSuccess}
        requiredCredentials={null}
        title="Void Authorization"
        description="Enter admin credentials to access void functions."
      />
    </>
  );
}
