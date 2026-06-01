
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, Clock, User, CreditCard, ShoppingBag, Receipt, Loader2, Search, X } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { format } from 'date-fns';
import { AdminAuthDialog } from './admin-auth-dialog';
import { usePrinter } from '@/lib/use-printer';
import { ReceiptGenerator } from '@/lib/receipt-generator';
import { useToast } from '@/hooks/use-toast';
import { ReceiptView } from './receipt-view';
import { getApiUrl } from '@/lib/api-config';
import { SystemSettings } from '@/lib/types';


interface RecentSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
  settings?: SystemSettings | null;
}


const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function mapSaleToReceiptDetails(sale: Sale) {
    const mappedItems = sale.items.map(item => {
        const gross = item.price * item.quantity;
        const discountPercent = gross > 0 ? ((item.discount || 0) / gross) * 100 : 0;
        return {
            ...item.product,
            price: item.price,
            quantity: item.quantity,
            discount: discountPercent,
            name: item.product.name
        };
    });

    const vatableGross = mappedItems.reduce((acc, item) => {
        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        const taxType = item.taxType;
        return taxType === 'VAT' ? acc + netItemTotal : acc;
    }, 0);

    const vatableSales = vatableGross / 1.12;
    const vatAmountResult = vatableGross - vatableSales;

    const vatExemptSales = mappedItems.reduce((acc, item) => {
        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        return item.taxType === 'VAT_EXEMPT' ? acc + netItemTotal : acc;
    }, 0);

    const zeroRatedSales = mappedItems.reduce((acc, item) => {
        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        return item.taxType === 'ZERO_RATED' ? acc + netItemTotal : acc;
    }, 0);

    const nonVatSales = mappedItems.reduce((acc, item) => {
        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        return item.taxType === 'NON_VAT' ? acc + netItemTotal : acc;
    }, 0);

    return {
        items: mappedItems,
        customer: sale.customer,
        totalDue: sale.total,
        change: sale.change || 0,
        paymentMethod: sale.paymentMethod,
        payments: sale.payments,
        orderNumber: sale.orderNumber ? String(sale.orderNumber) : sale.id, // Ensure string
        amountTendered: sale.amountTendered || sale.total,
        transactionDate: sale.date ? new Date(sale.date) : new Date(),
        cashierName: sale.cashierName || sale.salesPerson, // Or fetch from sale.salesPersonId
        pointsEarned: sale.pointsEarned || 0,
        terminalMin: sale.terminalMin,
        terminalSerialNumber: sale.terminalSerialNumber,
        pointsUsedCount: sale.pointsUsedCount || 0,
        pointsBalance: sale.pointsBalance ?? 0,
        paymentReference: sale.paymentReference,
        taxBreakdown: {
            vatableSales,
            vatAmount: vatAmountResult,
            vatExemptSales,
            zeroRatedSales,
            nonVatSales
        }
    };
}

// Hidden render used for browser printing of a receipt
function ReceiptPrintView({ sale, settings }: { sale: Sale; settings?: SystemSettings | null; }) {
    const saleDetails = mapSaleToReceiptDetails(sale);
    return (
        <div className="printable-area bg-white p-4 shadow-sm mx-auto">
            <ReceiptView saleDetails={saleDetails} settings={settings} />
        </div>
    );
}

export function RecentSalesDialog({
  isOpen,
  onOpenChange,
  printMode,
  settings: initialSettings
}: RecentSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'list'>('loading');
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [posSettings, setPosSettings] = useState<SystemSettings | null>(initialSettings || null);
  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
  const { toast } = useToast();
  const authSucceededRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
        authSucceededRef.current = false;
        setStep('loading');
        setIsLoading(true);
        setSelectedSale(null);
        setSearchTerm('');

        if (initialSettings) {
            setPosSettings(initialSettings);
            setStep(initialSettings.enableRecentSalesAuth ? 'auth' : 'list');
            return;
        }

        // Fetch settings if not provided
        fetch(getApiUrl(`/pos-settings?_t=${Date.now()}`), { cache: 'no-store' })
          .then(res => res.json())
          .then(result => {
             if (result.success) {
                 const settings = result.data;
                 setPosSettings(settings);
                 setStep(settings.enableRecentSalesAuth ? 'auth' : 'list');
            } else {
                setStep('list'); // Fallback
            }
          })
          .catch(err => {
              console.error(err);
              setStep('list');
          });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 'list') {
        const fetchRecentSales = async () => {
            try {
                const response = await fetch(getApiUrl(`/pos/recent-sales?_t=${Date.now()}`), { cache: 'no-store' });
                if (!response.ok) throw new Error(`API error ${response.status}`);
                const result = await response.json();

                if (result.success) {
                    setRecentSales(result.data);
                } else {
                    console.error('Failed to fetch recent sales:', result.error);
                }
            } catch (error) {
                console.error('Error fetching recent sales:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecentSales();
        // Poll every 3 seconds to keep data real-time
        const interval = setInterval(fetchRecentSales, 3000);
        return () => clearInterval(interval);
    }
  }, [isOpen, step]);

  // Keep a transaction selected (preserve selection across polling refreshes)
  useEffect(() => {
    if (recentSales.length === 0) {
      setSelectedSale(null);
      return;
    }
    setSelectedSale(prev => {
      if (!prev) return recentSales[0];
      return recentSales.find(s => s.id === prev.id) || recentSales[0];
    });
  }, [recentSales]);

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

  const handlePrintReceiptAction = async (sale: Sale) => {
    if (printMode === 'browser') {
        try {
            const { printReactComponent } = await import('@/app/lib/print-utils');
            printReactComponent(<ReceiptPrintView sale={sale} settings={posSettings} />, '80mm');
            return;
        } catch (e) {
            console.error('Browser print error:', e);
            window.print();
            return;
        }
    }

    if (!isConnected) {
        const success = await connect();
        if (!success) return;
    }

    try {
        const generator = new ReceiptGenerator();
        const receiptData = {
            ...mapSaleToReceiptDetails(sale),
            orderNumber: String(sale.orderNumber || sale.id),
        };
        const bytes = generator.generateReceipt(receiptData, posSettings);
        await print(bytes);
        toast({ title: "Re-printed", description: "Receipt sent to printer." });
    } catch (e) {
        console.error("Reprint error", e);
        toast({ title: "Print Failed", description: "Could not send data to printer.", variant: "destructive" });
    }
  };

  const detail = selectedSale as any;
  const detailSubtotal = detail ? detail.items.reduce((acc: number, it: any) => acc + it.price * it.quantity, 0) : 0;
  const detailDiscount = detail ? detail.items.reduce((acc: number, it: any) => acc + (it.discount || 0), 0) : 0;

  const q = searchTerm.trim().toLowerCase();
  const filteredSales = q
    ? recentSales.filter((s: any) =>
        String(s.orderNumber ?? '').toLowerCase().includes(q) ||
        String(s.id ?? '').toLowerCase().includes(q) ||
        String(s.customer?.name ?? '').toLowerCase().includes(q) ||
        String(s.paymentMethod ?? '').toLowerCase().includes(q) ||
        String(s.paymentReference ?? '').toLowerCase().includes(q))
    : recentSales;

  // Keyboard navigation: Up/Down to move through the list, Enter to reprint
  useEffect(() => {
    if (!isOpen || step !== 'list') return;

    const handler = (e: KeyboardEvent) => {
      if (filteredSales.length === 0) return;
      const idx = filteredSales.findIndex((s: any) => s.id === selectedSale?.id);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSale(filteredSales[idx < filteredSales.length - 1 ? idx + 1 : 0]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSale(filteredSales[idx > 0 ? idx - 1 : filteredSales.length - 1]);
      } else if (e.key === 'Enter') {
        // Avoid reprinting while the cashier is typing in the search field
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (selectedSale) {
          e.preventDefault();
          handlePrintReceiptAction(selectedSale);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, step, filteredSales, selectedSale]);

  // Keep the selected row scrolled into view as the cursor moves
  useEffect(() => {
    if (selectedSale) {
      document.getElementById(`recent-sale-${selectedSale.id}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedSale]);

  return (
    <>
    <Sheet open={isOpen && step === 'list'} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="flex h-screen w-full flex-col gap-0 p-0 shadow-2xl"
      >
        <SheetTitle className="sr-only">Recent Transactions</SheetTitle>
        <SheetDescription className="sr-only">A list of the most recent sales. Click a transaction to view its items.</SheetDescription>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b bg-muted/20 px-6 py-4 pr-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Recent Transactions</h2>
              <p className="mt-1 text-xs text-muted-foreground">The 20 most recent sales · <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">↑</kbd> <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">↓</kbd> navigate · <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">↵</kbd> reprint</p>
            </div>
          </div>
          <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {q ? `${filteredSales.length} of ${recentSales.length}` : `${recentSales.length} sale${recentSales.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Search */}
        <div className="shrink-0 border-b px-6 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
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
          {/* List */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5">SO #</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td></tr>
                )}
                {!isLoading && filteredSales.length > 0 ? (
                  filteredSales.map((sale: any) => {
                    const isSel = selectedSale?.id === sale.id;
                    return (
                      <tr
                        key={sale.id}
                        id={`recent-sale-${sale.id}`}
                        onClick={() => setSelectedSale(sale)}
                        className={`relative cursor-pointer border-b border-border/40 transition-colors ${isSel ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                      >
                        <td className="px-4 py-2.5 font-mono">
                          {isSel && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                          {sale.orderNumber ? sale.orderNumber : sale.id.substring(0, 7)}
                        </td>
                        <td className="px-4 py-2.5 truncate max-w-[140px]">{sale.customer?.name || 'Walk-in'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{format(new Date(sale.date || new Date()), 'p')}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{sale.paymentMethod || '-'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold">₱{formatCurrency(sale.total)}</td>
                      </tr>
                    );
                  })
                ) : (
                  !isLoading && (
                    <tr><td colSpan={5} className="h-24 text-center text-muted-foreground">
                      {q ? `No transactions match "${searchTerm}".` : 'No recent sales found.'}
                    </td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Detail */}
          <div className="flex w-[360px] shrink-0 flex-col border-l bg-muted/10">
            {detail ? (
              <>
                {/* Detail header */}
                <div className="shrink-0 border-b px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">#{detail.orderNumber || detail.id?.substring(0, 7)}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(detail.date || new Date()), 'PP p')}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> <span className="truncate">{detail.customer?.name || 'Walk-in'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" /> <span className="truncate">{detail.paymentMethod || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Items list */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Items Purchased ({detail.items.length})
                  </div>
                  <div className="space-y-2.5">
                    {detail.items.map((it: any, i: number) => {
                      const lineGross = it.price * it.quantity;
                      const lineNet = lineGross - (it.discount || 0);
                      return (
                        <div key={i} className="flex items-start justify-between gap-3 border-b border-dashed border-border/40 pb-2.5 last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{it.product?.name || 'Item'}</p>
                            <p className="text-xs text-muted-foreground">
                              {it.quantity} × ₱{formatCurrency(it.price)}
                              {it.discount > 0 && <span className="ml-1 text-green-600 dark:text-green-400">(−₱{formatCurrency(it.discount)})</span>}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-sm font-semibold">₱{formatCurrency(lineNet)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary + actions */}
                <div className="shrink-0 space-y-2 border-t bg-background px-5 py-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">₱{formatCurrency(detailSubtotal)}</span>
                  </div>
                  {detailDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Discount</span>
                      <span className="font-mono">−₱{formatCurrency(detailDiscount)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between border-t border-dashed pt-2">
                    <span className="text-sm font-bold">Total</span>
                    <span className="font-mono text-lg font-black text-primary">₱{formatCurrency(detail.total)}</span>
                  </div>
                  {(detail.amountTendered || detail.change > 0) && (
                    <div className="space-y-1 pt-1 text-xs text-muted-foreground">
                      {detail.amountTendered != null && (
                        <div className="flex justify-between"><span>Tendered</span><span className="font-mono">₱{formatCurrency(detail.amountTendered)}</span></div>
                      )}
                      {detail.change > 0 && (
                        <div className="flex justify-between"><span>Change</span><span className="font-mono">₱{formatCurrency(detail.change)}</span></div>
                      )}
                    </div>
                  )}
                  <Button
                    className="mt-2 h-11 w-full font-bold"
                    onClick={() => handlePrintReceiptAction(selectedSale!)}
                    disabled={isPrinting}
                  >
                    {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Reprint Receipt
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                <Receipt className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">Select a transaction</p>
                <p className="text-xs">Click any sale to view its purchased items.</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <AdminAuthDialog
        isOpen={isOpen && step === 'auth'}
        onOpenChange={handleAuthClose}
        onSuccess={handleAuthSuccess}
        requiredCredentials={posSettings?.enableRecentSalesAuth ? {
            username: posSettings.recentSalesAuthUsername,
            password: posSettings.recentSalesAuthPassword
        } : null}
        title="Recent Sales Authorization"
        description="Enter authorized credentials to view recent sales."
      />
    </>
  );
}
