
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SaleItem } from './page';
import { formatQuantity } from '@/lib/utils';
import { Plus, Minus, RotateCcw, Hash } from 'lucide-react';

interface AdjustQuantityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onUpdate: (itemId: string, newQuantity: number) => void;
}

const ADD_CHIPS = [1, 5, 10, 25];
const SUB_CHIPS = [1, 5, 10];

export function AdjustQuantityDialog({
  isOpen,
  onOpenChange,
  item,
  onUpdate,
}: AdjustQuantityDialogProps) {
  const [newQty, setNewQty] = useState(item?.quantity ?? 1);

  useEffect(() => {
    if (isOpen && item) setNewQty(item.quantity);
  }, [isOpen, item]);

  if (!item) return null;

  const delta = +(newQty - item.quantity).toFixed(4);
  const lineTotal = newQty * item.price;

  const adjust = (d: number) =>
    setNewQty(prev => {
      const next = +(prev + d).toFixed(4);
      return next < 0 ? 0 : next;
    });

  const reset = () => setNewQty(item.quantity);

  const handleConfirm = () => {
    onUpdate(item.id, newQty);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isButton = (e.target as HTMLElement)?.tagName === 'BUTTON';

    if (e.key === 'Enter') {
      if (isButton) return; // let the focused button activate itself
      e.preventDefault();
      handleConfirm();
      return;
    }
    if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
      e.preventDefault();
      adjust(1);
    } else if (e.key === 'ArrowDown' || e.key === '-') {
      e.preventDefault();
      adjust(-1);
    } else if ((e.key === 'r' || e.key === 'R') && !isButton) {
      e.preventDefault();
      reset();
    }
  };

  const displayQty = Number.isInteger(newQty) ? String(newQty) : newQty.toFixed(2);
  const deltaLabel = delta > 0 ? `+${Number.isInteger(delta) ? delta : delta.toFixed(2)}` : Number.isInteger(delta) ? String(delta) : delta.toFixed(2);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden shadow-2xl" onKeyDown={handleKeyDown}>
        <div className="bg-background p-6 space-y-5">
          <DialogHeader className="space-y-3">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-3 rounded-2xl">
                <Hash className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-extrabold text-center text-foreground">
              Adjust Quantity
            </DialogTitle>
            <DialogDescription className="sr-only">Set the new quantity for the selected item.</DialogDescription>
            <div className="text-sm text-muted-foreground text-center bg-muted py-2 px-3 rounded-lg border truncate">
              {item.name}
            </div>
          </DialogHeader>

          {/* Stepper area */}
          <div className="flex items-stretch gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-24 w-24 shrink-0 rounded-2xl border-2 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-95"
              onClick={() => adjust(-1)}
              disabled={newQty <= 0}
              aria-label="Decrease"
            >
              <Minus className="!h-9 !w-9" />
            </Button>
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/5">
              <span className="text-6xl font-black tracking-tighter text-primary tabular-nums leading-none">
                {displayQty}
              </span>
              <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {item.unitOfMeasure || 'units'}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-24 w-24 shrink-0 rounded-2xl border-2 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-95"
              onClick={() => adjust(1)}
              aria-label="Increase"
            >
              <Plus className="!h-9 !w-9" />
            </Button>
          </div>

          {/* Quick chips */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {ADD_CHIPS.map(n => (
                <Button
                  key={`p${n}`}
                  type="button"
                  variant="outline"
                  className="h-11 font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300"
                  onClick={() => adjust(n)}
                >
                  +{n}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SUB_CHIPS.map(n => (
                <Button
                  key={`m${n}`}
                  type="button"
                  variant="outline"
                  className="h-11 font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-700 dark:hover:text-red-300"
                  onClick={() => adjust(-n)}
                  disabled={newQty <= 0}
                >
                  −{n}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-11 font-bold text-muted-foreground hover:bg-muted"
                onClick={reset}
                disabled={newQty === item.quantity}
                title="Reset to original (R)"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 rounded-xl border bg-muted/40 p-3 text-center text-xs">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Was</p>
              <p className="mt-0.5 font-mono font-bold text-foreground">{formatQuantity(item.quantity, item.unitOfMeasure)}</p>
            </div>
            <div className="border-x">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Change</p>
              <p className={`mt-0.5 font-mono font-bold ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {deltaLabel}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="mt-0.5 font-mono font-bold text-primary">₱{lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={newQty === item.quantity}
              className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
            >
              Confirm
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
