
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Undo, Search, Plus, Minus, CheckCircle2, Printer, Receipt, Loader2, X, User, CreditCard, Clock, ShoppingBag } from 'lucide-react';
import type { Sale, SaleItem } from '@/lib/types';
import { format } from 'date-fns';
import { AdminAuthDialog } from './admin-auth-dialog';
import { usePrinter } from '@/lib/use-printer';
import { CreditSlipGenerator, CreditSlipData } from '@/lib/credit-slip-generator';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { useReactToPrint } from 'react-to-print';
import { CreditSlipView } from './credit-slip-view';
import { formatQuantity } from '@/lib/utils';

interface ReturnSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUser?: any;
  terminalId?: string;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
}

// ------- Step: Success -------
function SuccessView({
  returnedTotal,
  saleId,
  onClose,
  onPrint,
  isPrinting,
}: {
  returnedTotal: number;
  saleId: string;
  onClose: () => void;
  onPrint: () => void;
  isPrinting: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-none">Return Successful</h2>
            <p className="mt-1 text-xs text-muted-foreground">Items returned to inventory</p>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="w-full rounded-2xl border bg-card p-5 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Merchandise Credit Issued</p>
          <p className="mt-2 text-5xl font-black tracking-tight text-primary tabular-nums">
            ₱{returnedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Reference: <span className="font-mono font-medium text-foreground">{saleId}</span>
          </p>
        </div>
      </div>

      <div className="shrink-0 grid grid-cols-2 gap-3 border-t bg-background px-6 py-4">
        <Button variant="outline" className="h-12 font-bold" onClick={onPrint} disabled={isPrinting}>
          {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
          Print Credit Slip
        </Button>
        <Button className="h-12 font-bold" onClick={onClose} autoFocus>Close</Button>
      </div>
    </div>
  );
}

export function ReturnSalesDialog({
  isOpen,
  onOpenChange,
  currentUser,
  terminalId,
  printMode,
}: ReturnSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'list' | 'success'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [itemFocusedIndex, setItemFocusedIndex] = useState(0);
  const [returnedItems, setReturnedItems] = useState<SaleItem[]>([]);
  const [returnedTotal, setReturnedTotal] = useState(0);
  const [posSettings, setPosSettings] = useState<any>(null);

  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
  const { toast } = useToast();
  const authSucceededRef = useRef(false);
  const creditSlipRef = useRef<HTMLDivElement>(null);

  const handleBrowserPrint = useReactToPrint({
    contentRef: creditSlipRef,
    documentTitle: `CreditSlip-${new Date().getTime()}`,
    pageStyle: `
        @page { size: 58mm auto; margin: 0; }
        @media print { body { -webkit-print-color-adjust: exact; } }
    `,
  });

  // Reset state and decide first step when the drawer opens
  useEffect(() => {
    if (!isOpen) return;
    authSucceededRef.current = false;
    setStep('loading');
    setIsLoading(false);
    setIsProcessing(false);
    setSales([]);
    setSearchTerm('');
    setSelectedSale(null);
    setSelectedIds(new Set());
    setReturnQuantities({});
    setFocusedIndex(0);
    setReturnedTotal(0);
    setReturnedItems([]);

    fetch(getApiUrl(`/pos-settings?_t=${Date.now()}`), { cache: 'no-store' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          const settings = result.data;
          setPosSettings(settings);
          setStep(settings.enableReturnAuth ? 'auth' : 'list');
        } else {
          setStep('list');
        }
      })
      .catch(err => { console.error(err); setStep('list'); });
  }, [isOpen]);

  // Fetch recent sales when entering list step
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

  // Reset item-selection state when the selected sale changes
  useEffect(() => {
    setSelectedIds(new Set());
    setReturnQuantities({});
    setItemFocusedIndex(0);
  }, [selectedSale?.id]);

  // Filter sales by the search term (SO #, customer, payment, reference)
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

  // Keep cursor pointing at a valid entry; auto-select first when nothing chosen
  useEffect(() => {
    if (filteredSales.length === 0) {
      setFocusedIndex(0);
      return;
    }
    setFocusedIndex(i => Math.min(i, filteredSales.length - 1));
  }, [filteredSales.length]);

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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || step !== 'list') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      // ↑/↓ — navigate sales list (works even while typing in search)
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

      // The rest only when not typing inside an input
      if (isInput) return;

      // ←/→ — navigate items in the right panel
      if (e.key === 'ArrowRight') {
        if (!selectedSale) return;
        e.preventDefault();
        setItemFocusedIndex(i => Math.min(selectedSale.items.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (!selectedSale) return;
        e.preventDefault();
        setItemFocusedIndex(i => Math.max(0, i - 1));
        return;
      }

      // Space — toggle the focused item
      if (e.key === ' ') {
        if (tag === 'BUTTON') return;
        if (!selectedSale) return;
        e.preventDefault();
        const item = selectedSale.items[itemFocusedIndex];
        if (item) toggleItem(item);
        return;
      }

      // + / − — adjust the focused item's return qty (if selected)
      if (e.key === '+' || e.key === '=') {
        if (!selectedSale) return;
        e.preventDefault();
        const item = selectedSale.items[itemFocusedIndex];
        if (item && selectedIds.has(item.product.id)) adjustItemQty(item, 1);
        return;
      }
      if (e.key === '-') {
        if (!selectedSale) return;
        e.preventDefault();
        const item = selectedSale.items[itemFocusedIndex];
        if (item && selectedIds.has(item.product.id)) adjustItemQty(item, -1);
        return;
      }

      // A — select / deselect all
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        toggleSelectAll();
        return;
      }

      // Enter — trigger the Return action
      if (e.key === 'Enter') {
        if (tag === 'BUTTON') return; // let focused button activate itself
        if (selectedIds.size > 0 && !isProcessing) {
          e.preventDefault();
          handleConfirmReturn();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, filteredSales, focusedIndex, itemFocusedIndex, selectedSale, selectedIds, returnQuantities, isProcessing]);

  // Scroll the focused item into view
  useEffect(() => {
    if (!selectedSale) return;
    const item = selectedSale.items[itemFocusedIndex];
    if (!item) return;
    document.getElementById(`return-item-${item.product.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [itemFocusedIndex, selectedSale]);

  // Sync focusedIndex to selectedSale and scroll into view
  useEffect(() => {
    if (filteredSales.length === 0) return;
    const target = filteredSales[focusedIndex];
    if (target) setSelectedSale(target);
    document.getElementById(`return-sale-${target?.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, filteredSales]);

  // Auth flow
  const handleAuthSuccess = () => {
    authSucceededRef.current = true;
    setStep('list');
  };
  const handleAuthClose = (open: boolean) => {
    if (!open && !authSucceededRef.current) {
      onOpenChange(false);
    }
    authSucceededRef.current = false;
  };

  // Item selection helpers (right panel)
  const toggleItem = (item: SaleItem) => {
    const id = item.product.id;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      const nq = { ...returnQuantities };
      delete nq[id];
      setReturnQuantities(nq);
    } else {
      next.add(id);
      setReturnQuantities(prev => ({ ...prev, [id]: item.quantity }));
    }
    setSelectedIds(next);
  };

  const adjustItemQty = (item: SaleItem, delta: number) => {
    const id = item.product.id;
    const cur = returnQuantities[id] ?? item.quantity;
    const next = Math.max(1, Math.min(item.quantity, cur + delta));
    setReturnQuantities(prev => ({ ...prev, [id]: next }));
  };

  const toggleSelectAll = () => {
    if (!selectedSale) return;
    if (selectedIds.size === selectedSale.items.length) {
      setSelectedIds(new Set());
      setReturnQuantities({});
    } else {
      const next = new Set<string>();
      const qty: Record<string, number> = {};
      selectedSale.items.forEach(it => { next.add(it.product.id); qty[it.product.id] = it.quantity; });
      setSelectedIds(next);
      setReturnQuantities(qty);
    }
  };

  const creditTotal = useMemo(() => {
    if (!selectedSale) return 0;
    return selectedSale.items
      .filter(it => selectedIds.has(it.product.id))
      .reduce((acc, it) => acc + (returnQuantities[it.product.id] || it.quantity) * it.price, 0);
  }, [selectedSale, selectedIds, returnQuantities]);

  const handleConfirmReturn = async () => {
    if (!selectedSale || selectedIds.size === 0) return;
    const items = selectedSale.items
      .filter(it => selectedIds.has(it.product.id))
      .map(it => ({ ...it, quantity: returnQuantities[it.product.id] || it.quantity }));

    setIsProcessing(true);
    try {
      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const response = await fetch(getApiUrl('/sales/returns'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: selectedSale.id,
          items: items.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price,
          })),
          terminalId: terminalId || posSettings?.terminalId,
          userId: currentUser?.uid || currentUser?.id || null,
          reason: 'Merchandise Credit',
          totalAmount,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setReturnedTotal(totalAmount);
        setReturnedItems(items);
        setStep('success');
      } else {
        toast({ title: 'Return Failed', description: result.error || 'Failed to process return', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error processing return:', err);
      toast({ title: 'Error', description: 'Error processing return. Please try again.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  const handlePrintCredit = async () => {
    if (!selectedSale || returnedItems.length === 0) return;

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 30);
    const creditSlipId = `MC-${selectedSale.orderNumber || selectedSale.id.slice(-6)}-${format(now, 'yyMMddHHmm')}`.toUpperCase();

    if (printMode === 'browser') {
      handleBrowserPrint();
      return;
    }

    if (!isConnected) {
      const success = await connect();
      if (!success) return;
    }

    try {
      const generator = new CreditSlipGenerator();
      const slipData: CreditSlipData = {
        creditSlipId,
        originalSoNumber: String(selectedSale.orderNumber || selectedSale.id),
        customerName: selectedSale.customer?.name || 'Walk-in Customer',
        date: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        cashierName: currentUser?.name || currentUser?.displayName || currentUser?.username || 'Cashier',
        items: returnedItems.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unitOfMeasure: item.product.unitOfMeasure,
          price: item.price,
          total: item.quantity * item.price,
        })),
        totalAmount: returnedTotal,
        businessSettings: {
          businessName: posSettings?.businessName,
          address: posSettings?.address,
          contactNumber: posSettings?.contactNumber,
          tin: posSettings?.tin,
          minNumber: posSettings?.minNumber,
          serialNumber: posSettings?.serialNumber,
        } as any,
      };

      const bytes = generator.generate(slipData);
      await print(bytes);
      toast({ title: 'Success', description: 'Credit slip sent to printer.' });
    } catch (err) {
      console.error('Print error', err);
      toast({ title: 'Print Failed', description: 'Could not send data to printer.', variant: 'destructive' });
    }
  };

  const allItemsSelected = selectedSale ? selectedIds.size === selectedSale.items.length && selectedSale.items.length > 0 : false;

  return (
    <>
      <Sheet open={isOpen && (step === 'list' || step === 'success')} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetTitle className="sr-only">Merchandise Credit</SheetTitle>
          <SheetDescription className="sr-only">Select a recent transaction, choose items to return, and issue a merchandise credit.</SheetDescription>

          {step === 'success' ? (
            <SuccessView
              returnedTotal={returnedTotal}
              saleId={String(selectedSale?.orderNumber || selectedSale?.id || '')}
              onClose={handleClose}
              onPrint={handlePrintCredit}
              isPrinting={isPrinting}
            />
          ) : (
            <div className="flex h-full flex-col">
              {/* Header */}
              <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <Undo className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold leading-none">Merchandise Credit</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Pick a transaction, then choose items to return</p>
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
                  <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/10 px-4 py-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 font-mono">↑↓</kbd> sales</span>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 font-mono">←→</kbd> items</span>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 font-mono">Space</kbd> toggle</span>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 font-mono">±</kbd> qty</span>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 font-mono">A</kbd> all</span>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 font-mono">↵</kbd> return</span>
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
                            id={`return-sale-${sale.id}`}
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

                {/* Right: items + return panel */}
                <div className="flex flex-1 flex-col bg-muted/10">
                  {!selectedSale ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                      <ShoppingBag className="h-10 w-10 opacity-30" />
                      <p className="text-sm font-medium">Select a transaction</p>
                      <p className="text-xs">Pick any sale on the left to view and return items.</p>
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

                      {/* Select all bar */}
                      <div className="flex shrink-0 items-center justify-between border-b bg-muted/20 px-5 py-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={toggleSelectAll}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelectAll(); } }}
                          className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                        >
                          <Checkbox checked={allItemsSelected} className="pointer-events-none" />
                          {allItemsSelected ? 'Deselect all' : 'Select all'}
                        </div>
                        <span className="text-xs text-muted-foreground">{selectedIds.size} of {selectedSale.items.length}</span>
                      </div>

                      {/* Items list */}
                      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-3">
                        {selectedSale.items.map((item, i) => {
                          const id = item.product.id;
                          const isSel = selectedIds.has(id);
                          const isItemFocused = itemFocusedIndex === i;
                          const rq = returnQuantities[id] ?? item.quantity;
                          return (
                            <div
                              key={`${id}-${i}`}
                              id={`return-item-${id}`}
                              onClick={() => setItemFocusedIndex(i)}
                              className={`rounded-xl border-2 p-3 transition-all ${isSel ? 'border-orange-400/60 bg-orange-500/5' : 'border-border bg-card hover:border-muted-foreground/40'} ${isItemFocused ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isSel}
                                  onCheckedChange={() => toggleItem(item)}
                                  className="mt-0.5"
                                />
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => toggleItem(item)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(item); } }}
                                  className="min-w-0 flex-1 cursor-pointer text-left"
                                >
                                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Sold: {formatQuantity(item.quantity, item.product.unitOfMeasure)} · ₱{item.price.toFixed(2)} each
                                  </p>
                                </div>
                                <span className="shrink-0 font-mono text-sm font-semibold">₱{(item.price * rq).toFixed(2)}</span>
                              </div>

                              {isSel && (
                                <div className="mt-3 flex items-center justify-between border-t border-dashed pt-3">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Return Qty</span>
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => adjustItemQty(item, -1)} disabled={rq <= 1} aria-label="Decrease">
                                      <Minus className="h-3.5 w-3.5" />
                                    </Button>
                                    <span className="min-w-[3rem] text-center font-mono text-base font-bold tabular-nums">{rq}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => adjustItemQty(item, 1)} disabled={rq >= item.quantity} aria-label="Increase">
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="shrink-0 space-y-3 border-t bg-background px-5 py-4">
                        {selectedIds.size > 0 && (
                          <div className="flex items-baseline justify-between rounded-lg bg-orange-500/10 px-4 py-2 text-orange-700 dark:text-orange-400">
                            <span className="text-xs font-bold uppercase tracking-wider">Credit Amount</span>
                            <span className="font-mono text-lg font-black">₱{creditTotal.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-[1fr_2fr] gap-3">
                          <Button variant="outline" className="h-12" onClick={handleClose} disabled={isProcessing}>Cancel</Button>
                          <Button
                            className="h-12 font-bold"
                            variant="destructive"
                            disabled={selectedIds.size === 0 || isProcessing}
                            onClick={handleConfirmReturn}
                          >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo className="mr-2 h-4 w-4" />}
                            Return {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
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
        requiredCredentials={posSettings?.enableReturnAuth ? {
          username: posSettings.returnAuthUsername,
          password: posSettings.returnAuthPassword,
        } : null}
        title="Return Authorization"
        description="Enter authorized credentials to access return functions."
      />

      {/* Hidden credit slip for browser printing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        {selectedSale && returnedItems.length > 0 && (
          <CreditSlipView
            ref={creditSlipRef}
            creditDetails={{
              creditSlipId: `MC-${selectedSale.orderNumber || selectedSale.id.slice(-6)}-${format(new Date(), 'yyMMddHHmm')}`.toUpperCase(),
              originalSoNumber: String(selectedSale.orderNumber || selectedSale.id),
              customerName: selectedSale.customer?.name || 'Walk-in Customer',
              date: new Date().toISOString(),
              expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cashierName: currentUser?.name || currentUser?.displayName || currentUser?.username || 'Cashier',
              items: returnedItems,
              totalAmount: returnedTotal,
            }}
            settings={posSettings}
          />
        )}
      </div>
    </>
  );
}
