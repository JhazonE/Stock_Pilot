
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { XCircle, Minus, Plus, Ban, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface CancelSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCancelSelected: (quantity: number) => void;
  onCancelAll: () => void;
  selectedItem: any | null;
}

const peso = (n: number) =>
  n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CancelSaleDialog({
  isOpen,
  onOpenChange,
  onCancelSelected,
  onCancelAll,
  selectedItem,
}: CancelSaleDialogProps) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && selectedItem) setQuantity(1);
  }, [isOpen, selectedItem]);

  const maxQty: number = selectedItem?.quantity ?? 1;
  const price: number = selectedItem?.price ?? 0;
  const discount: number = selectedItem?.discount ?? 0;
  const netUnit = price * (1 - discount / 100);
  const lineTotal = netUnit * maxQty;
  const refundAmount = netUnit * quantity;
  const remainingQty = Math.max(0, maxQty - quantity);
  const remainingValue = netUnit * remainingQty;
  const voidPercent = maxQty > 0 ? (quantity / maxQty) * 100 : 0;

  const adjust = useCallback((delta: number) => {
    setQuantity(q => Math.max(1, Math.min(maxQty, q + delta)));
  }, [maxQty]);

  const handleConfirmVoidSelected = useCallback(() => {
    if (!selectedItem) return;
    onCancelSelected(quantity);
    onOpenChange(false);
  }, [selectedItem, quantity, onCancelSelected, onOpenChange]);

  // Keyboard shortcuts: ↑→ / ↓← / +-/Enter/1/A
  useEffect(() => {
    if (!isOpen || !selectedItem) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (isInput) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === '+' || e.key === '=') {
        e.preventDefault();
        adjust(1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === '-') {
        e.preventDefault();
        adjust(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirmVoidSelected();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setQuantity(maxQty);
      } else if (e.key === '1') {
        e.preventDefault();
        setQuantity(1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, selectedItem, maxQty, adjust, handleConfirmVoidSelected]);

  const presets = (() => {
    const out: { label: string; value: number }[] = [];
    if (maxQty >= 1) out.push({ label: 'Only 1', value: 1 });
    if (maxQty >= 4) out.push({ label: `Half (${Math.floor(maxQty / 2)})`, value: Math.floor(maxQty / 2) });
    out.push({ label: `All (${maxQty})`, value: maxQty });
    return out.filter((p, i, arr) => arr.findIndex(x => x.value === p.value) === i);
  })();

  const handleClearAll = () => {
    onCancelAll();
    onOpenChange(false);
  };

  const isVoidAll = quantity === maxQty;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Line Void</SheetTitle>
        <SheetDescription className="sr-only">Reduce the quantity of the selected item or clear the entire sale.</SheetDescription>

        {/* Header — restrained, professional */}
        <SheetHeader className="shrink-0 space-y-0 border-b bg-background px-6 py-4 pr-12 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Line Void</h2>
              <p className="mt-1 text-xs text-muted-foreground">Reduce quantity or remove this line</p>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {selectedItem ? (
            <>
              {/* Selected Item — receipt-style line */}
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Selected Item</p>
                <div className="rounded-xl border bg-card">
                  <div className="flex items-start justify-between gap-3 border-b border-dashed px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{selectedItem.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{selectedItem.unitOfMeasure || 'unit'}</p>
                    </div>
                    {discount > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {discount}% off
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 px-4 py-3 text-xs">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unit</p>
                      <p className="mt-0.5 font-mono font-semibold">₱{peso(netUnit)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">In Cart</p>
                      <p className="mt-0.5 font-mono font-semibold">× {maxQty}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Line Total</p>
                      <p className="mt-0.5 font-mono font-bold">₱{peso(lineTotal)}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Void quantity stepper */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Void Quantity</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <kbd className="rounded border bg-background px-1 font-mono">↑→</kbd>
                    <kbd className="rounded border bg-background px-1 font-mono">↓←</kbd>
                    <span className="opacity-40">·</span>
                    <kbd className="rounded border bg-background px-1 font-mono">1</kbd>
                    <kbd className="rounded border bg-background px-1 font-mono">A</kbd>
                    <span className="opacity-40">·</span>
                    <kbd className="rounded border bg-background px-1 font-mono">↵</kbd>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-xl border-2 transition-all hover:border-red-400 hover:bg-red-500/5 active:scale-95"
                      onClick={() => adjust(-1)}
                      disabled={quantity <= 1}
                      aria-label="Decrease"
                    >
                      <Minus className="!h-5 !w-5" />
                    </Button>
                    <div className="flex min-w-[7rem] flex-col items-center">
                      <span className="text-5xl font-black leading-none tracking-tighter tabular-nums text-foreground">
                        {quantity}
                      </span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        of {maxQty}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-xl border-2 transition-all hover:border-red-400 hover:bg-red-500/5 active:scale-95"
                      onClick={() => adjust(1)}
                      disabled={quantity >= maxQty}
                      aria-label="Increase"
                    >
                      <Plus className="!h-5 !w-5" />
                    </Button>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${voidPercent}%` }}
                    />
                  </div>

                  {/* Preset chips */}
                  <div className="grid grid-cols-3 gap-2">
                    {presets.map(p => (
                      <Button
                        key={p.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`h-8 text-xs font-semibold ${quantity === p.value ? 'border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-400' : ''}`}
                        onClick={() => setQuantity(p.value)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Refund preview */}
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Refund Preview</p>
                <div className="rounded-xl border bg-card">
                  <div className="space-y-2 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Voiding</span>
                      <span className="font-mono">{quantity} × ₱{peso(netUnit)}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-red-600 dark:text-red-400">
                      <span>Refund amount</span>
                      <span className="font-mono">−₱{peso(refundAmount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed px-4 py-2.5 text-xs">
                    <span className="text-muted-foreground">
                      {isVoidAll ? 'Line fully removed' : `${remainingQty} of ${maxQty} will remain`}
                    </span>
                    <span className={`font-mono font-semibold ${isVoidAll ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      ₱{peso(remainingValue)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Clear entire sale */}
              <button
                type="button"
                onClick={handleClearAll}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-destructive hover:bg-destructive/5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-destructive/10 group-hover:text-destructive">
                    <XCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Clear entire sale</p>
                    <p className="text-xs text-muted-foreground">Reset the cart and remove all items</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-destructive">→</span>
              </button>
            </>
          ) : (
            // No item selected
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/40 px-6 py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground opacity-40" />
              <p className="text-sm font-semibold">No item selected</p>
              <p className="text-xs text-muted-foreground">Select a line item in the cart to void, or clear the entire sale below.</p>
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <XCircle className="h-4 w-4" />
                Clear entire sale
              </button>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-3 border-t bg-background px-6 py-4">
          <Button variant="outline" className="h-12" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="h-12 bg-red-600 font-bold text-white shadow-md shadow-red-500/20 hover:bg-red-700"
            disabled={!selectedItem}
            onClick={handleConfirmVoidSelected}
          >
            <Ban className="mr-2 h-4 w-4" />
            {selectedItem ? (isVoidAll ? `Void all ${maxQty}` : `Void ${quantity} of ${maxQty}`) : 'Void'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
