'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Undo, Trash2, Clock, Package, FileText, Pause } from 'lucide-react';
import type { SaleItem } from './page';
import type { SuspendedTransaction } from './page';
import { formatDistanceToNow } from 'date-fns';

interface HeldTransactionsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  heldTransactions: SuspendedTransaction[];
  onRestore: (index: number) => void;
  onDelete: (index: number) => void;
}

export function HeldTransactionsDialog({
  isOpen,
  onOpenChange,
  heldTransactions,
  onRestore,
  onDelete,
}: HeldTransactionsDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (heldTransactions.length === 0) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < heldTransactions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'Enter') {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT') return;
        e.preventDefault();
        onRestore(selectedIndex);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        onDelete(selectedIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, heldTransactions, selectedIndex, onRestore, onDelete]);

  // Auto-scroll focused row into view
  useEffect(() => {
    const id = heldTransactions[selectedIndex]?.id;
    if (id) document.getElementById(`held-tx-${id}`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, heldTransactions]);

  const calculateTotal = (items: SaleItem[]) =>
    items.reduce((acc, item) => acc + item.price * item.quantity * (1 - item.discount / 100), 0);

  const calculateItemCount = (items: SaleItem[]) =>
    items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Suspended Transactions</SheetTitle>
        <SheetDescription className="sr-only">Restore or delete suspended transactions. Use arrow keys to navigate and Enter to restore.</SheetDescription>

        {/* Header */}
        <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Pause className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-none">Suspended Transactions</h2>
                <p className="mt-1 text-xs text-muted-foreground">Restore or delete a suspended sale</p>
              </div>
            </div>
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {heldTransactions.length} held
            </span>
          </div>
        </SheetHeader>

        {/* Keyboard hints */}
        {heldTransactions.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 border-b bg-muted/10 px-6 py-1.5 text-[10px] text-muted-foreground">
            <kbd className="rounded border bg-background px-1 font-mono">↑↓</kbd> navigate
            <span className="opacity-40">·</span>
            <kbd className="rounded border bg-background px-1 font-mono">↵</kbd> restore
            <span className="opacity-40">·</span>
            <kbd className="rounded border bg-background px-1 font-mono">Del</kbd> delete
          </div>
        )}

        {/* List */}
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {heldTransactions.length > 0 ? (
            heldTransactions.map((transaction, index) => {
              const isSel = index === selectedIndex;
              return (
                <div
                  key={transaction.id || index}
                  id={`held-tx-${transaction.id}`}
                  onClick={() => setSelectedIndex(index)}
                  onDoubleClick={() => onRestore(index)}
                  className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
                    isSel
                      ? 'border-orange-500/60 bg-orange-500/5 shadow-md ring-2 ring-orange-500/20'
                      : 'border-border bg-card hover:border-orange-400/50 hover:shadow-sm'
                  }`}
                >
                  {isSel && <span className="absolute inset-y-0 left-0 w-1.5 bg-orange-500" />}

                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className={`h-4 w-4 shrink-0 ${isSel ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`} />
                          <h4 className={`truncate text-base font-bold ${isSel ? 'text-orange-700 dark:text-orange-300' : 'text-foreground'}`}>
                            {transaction.note || 'No Note Provided'}
                          </h4>
                        </div>
                        <div className="mt-1.5 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 opacity-70" />
                            {calculateItemCount(transaction.items)} items
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 opacity-70" />
                            {transaction.timestamp
                              ? formatDistanceToNow(new Date(transaction.timestamp), { addSuffix: true })
                              : 'Unknown time'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black tracking-tight text-foreground">
                          <span className="mr-1 text-base font-bold text-muted-foreground">₱</span>
                          {calculateTotal(transaction.items).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-dashed pt-2">
                      <Button
                        size="sm"
                        className="flex-1 h-9 rounded-lg bg-orange-600 font-bold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-700"
                        onClick={(e) => { e.stopPropagation(); onRestore(index); }}
                      >
                        <Undo className="mr-1.5 h-3.5 w-3.5" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-lg font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700"
                        onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-muted/40 px-6 py-20 text-center text-muted-foreground">
              <Pause className="h-12 w-12 opacity-20 fill-current" />
              <p className="text-lg font-bold">No Suspended Transactions</p>
              <p className="text-sm opacity-70">Transactions you suspend will appear here.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" className="h-12 w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
