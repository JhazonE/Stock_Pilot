'use client';

import { useState, useMemo, useEffect, memo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Banknote, Coins, CheckCircle2, AlertTriangle, Calculator } from 'lucide-react';

interface EndShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onShiftEnd: (data: { actualCash: number; cashDifference: number; notes: string; cashDenominations: any[] }) => void;
  startingCash: number;
  cashSales: number;
  cashIn?: number;
  cashOut?: number;
}

const billDenominations = [
  { value: 1000, label: '₱1,000' },
  { value: 500, label: '₱500' },
  { value: 200, label: '₱200' },
  { value: 100, label: '₱100' },
  { value: 50, label: '₱50' },
  { value: 20, label: '₱20' },
];

const coinDenominations = [
  { value: 10, label: '₱10 Coin' },
  { value: 5, label: '₱5 Coin' },
  { value: 1, label: '₱1 Coin' },
  { value: 0.25, label: '₱0.25 Coin' },
  { value: 0.05, label: '₱0.05 Coin' },
  { value: 0.01, label: '₱0.01 Coin' },
];

const peso = (n: number) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n);

const DenominationInput = memo(({
  denom,
  color,
  count,
  onCountChange
}: {
  denom: { value: number, label: string },
  color: string,
  count: number | undefined,
  onCountChange: (value: number, count: string) => void
}) => {
  const subtotal = (count || 0) * denom.value;

  // Format the visual badge (e.g., 1000, 10, .25, .05)
  const displayBadge = denom.value >= 1
    ? denom.value.toString()
    : denom.value.toFixed(2).substring(1); // .25, .05, etc.

  return (
    <div className="flex items-center gap-3 rounded-lg border border-transparent p-1.5 transition-colors hover:border-border/60 hover:bg-muted/50">
      <div className={`flex h-9 w-11 items-center justify-center rounded border text-xs font-bold ${color}`}>
        {displayBadge}
      </div>
      <Label htmlFor={`denom-${denom.value}`} className="flex-1 min-w-0 truncate text-sm font-semibold">
        {denom.label}
      </Label>
      <Input
        id={`denom-${denom.value}`}
        type="number"
        placeholder="0"
        value={count || ''}
        onChange={(e) => onCountChange(denom.value, e.target.value)}
        className="h-9 w-16 text-right font-mono"
        autoFocus={denom.value === 1000}
      />
      <div className={`w-24 text-right font-mono text-sm font-bold ${subtotal > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
        ₱{peso(subtotal)}
      </div>
    </div>
  );
});

DenominationInput.displayName = 'DenominationInput';

export function EndShiftDialog({ isOpen, onOpenChange, onShiftEnd, startingCash, cashSales, cashIn = 0, cashOut = 0 }: EndShiftDialogProps) {
  const [counts, setCounts] = useState<Record<number, number>>({});

  const countedCash = useMemo(() => {
    return [...billDenominations, ...coinDenominations].reduce((acc, denom) => {
      return acc + (counts[denom.value] || 0) * denom.value;
    }, 0);
  }, [counts]);

  const expectedCash = useMemo(() => startingCash + cashSales + (cashIn || 0) - (cashOut || 0), [startingCash, cashSales, cashIn, cashOut]);
  const variance = useMemo(() => countedCash - expectedCash, [countedCash, expectedCash]);
  const isBalanced = Math.round(variance * 100) === 0;

  const handleCountChange = (value: number, count: string) => {
    const numCount = parseInt(count, 10);
    setCounts(prev => ({
      ...prev,
      [value]: isNaN(numCount) || numCount < 0 ? 0 : numCount,
    }));
  };

  const handleEndShift = () => {
    // In a real app, you would save the end-of-shift report here.
    onShiftEnd({
        actualCash: countedCash,
        cashDifference: variance,
        notes: `End shift variance: ${variance}`,
        cashDenominations: Object.entries(counts).map(([value, qty]) => ({
             amount: parseFloat(value),
             qty,
             total: parseFloat(value) * qty
        })).filter(d => d.qty > 0)
    });
  };

  useEffect(() => {
    if (isOpen) {
      setCounts({});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleEndShift();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleEndShift]);

  const varianceTone = isBalanced
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
    : variance > 0
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
      : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Cash Count — End Shift</SheetTitle>
        <SheetDescription className="sr-only">Count the cash in your drawer and confirm the totals to end your shift.</SheetDescription>

        {/* Header */}
        <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Cash Count</h2>
              <p className="mt-1 text-xs text-muted-foreground">Count your drawer, then end the shift</p>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Settlement summary */}
          <div className="space-y-2.5 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Beginning Balance</span>
              <span className="font-mono font-medium">₱{peso(startingCash)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cash Sales</span>
              <span className="font-mono font-medium text-emerald-600">+₱{peso(cashSales)}</span>
            </div>
            {(cashIn > 0 || cashOut > 0) && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cash Deposits (In)</span>
                  <span className="font-mono font-medium text-emerald-600">+₱{peso(cashIn)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cash Pickups (Out)</span>
                  <span className="font-mono font-medium text-red-600">−₱{peso(cashOut)}</span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-foreground">Expected Cash</span>
              <span className="font-mono text-lg font-black">₱{peso(expectedCash)}</span>
            </div>
          </div>

          {/* Denominations */}
          <div className="space-y-4">
            <section className="space-y-1">
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                <Banknote className="h-4 w-4 text-emerald-500" />
                Bills
              </div>
              {billDenominations.map(denom => (
                <DenominationInput
                  key={denom.value}
                  denom={denom}
                  color="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                  count={counts[denom.value]}
                  onCountChange={handleCountChange}
                />
              ))}
            </section>

            <section className="space-y-1">
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                <Coins className="h-4 w-4 text-amber-500" />
                Coins
              </div>
              {coinDenominations.map(denom => (
                <DenominationInput
                  key={denom.value}
                  denom={denom}
                  color="bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                  count={counts[denom.value]}
                  onCountChange={handleCountChange}
                />
              ))}
            </section>
          </div>
        </div>

        {/* Sticky footer: live totals + actions */}
        <div className="shrink-0 border-t bg-background">
          <div className="grid grid-cols-3 divide-x border-b">
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expected</p>
              <p className="mt-0.5 font-mono text-sm font-bold">₱{peso(expectedCash)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Counted</p>
              <p className="mt-0.5 font-mono text-lg font-black tabular-nums">₱{peso(countedCash)}</p>
            </div>
            <div className={`flex flex-col justify-center px-4 py-3 ${varianceTone}`}>
              <div className="flex items-center gap-1.5">
                {isBalanced ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                <p className="text-[10px] font-bold uppercase tracking-wider">
                  {isBalanced ? 'Balanced' : variance > 0 ? 'Overage' : 'Shortage'}
                </p>
              </div>
              <p className="mt-0.5 font-mono text-sm font-black">₱{peso(Math.abs(variance))}</p>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-3 px-6 py-4">
            <Button type="button" variant="outline" className="h-12" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" className="h-12 text-base font-bold" onClick={handleEndShift} variant="destructive">
              Confirm &amp; End Shift
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
