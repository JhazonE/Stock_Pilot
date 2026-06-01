
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Percent, Banknote, UserRound, Accessibility } from 'lucide-react';
import type { SaleItem } from './page';

interface DiscountDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onApplyDiscount: (itemId: string | 'ALL', discountPercentage: number, discountType?: string) => void;
  hasItems: boolean;
}

type DiscountType = 'percent' | 'amount' | 'pwd' | 'senior' | 'naac' | 'solo_parent';

export function DiscountDialog({
  isOpen,
  onOpenChange,
  item,
  onApplyDiscount,
  hasItems
}: DiscountDialogProps) {
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [scope, setScope] = useState<'selected' | 'all'>('selected');
  const [value, setValue] = useState<string>('0');

  useEffect(() => {
    if (isOpen) {
      setDiscountType('percent');
      setScope('selected');
      setValue(item?.discount.toString() || '0');
    }
  }, [isOpen, item]);

  const handleApply = () => {
    let percentage = 0;
    
    if (discountType === 'pwd' || discountType === 'senior' || discountType === 'naac') {
      percentage = 20;
    } else if (discountType === 'solo_parent') {
      percentage = 10;
    } else {
      const numValue = parseFloat(value) || 0;
      if (discountType === 'percent') {
        percentage = Math.min(100, Math.max(0, numValue));
      } else if (item) {
        // Fixed amount is only allowed for selected item
        const totalItemPrice = item.price * item.quantity;
        if (totalItemPrice > 0) {
          percentage = (numValue / totalItemPrice) * 100;
          percentage = Math.min(100, Math.max(0, percentage));
        }
      }
    }

    if (scope === 'all') {
      onApplyDiscount('ALL', percentage, discountType);
    } else if (item) {
      onApplyDiscount(item.id, percentage, discountType);
    }
    onOpenChange(false);
  };

  if (!hasItems) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Discount</SheetTitle>
        <SheetDescription className="sr-only">Apply a discount to the selected item or all cart items.</SheetDescription>

        {/* Header */}
        <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Apply Discount</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {scope === 'all' ? 'Apply to all items in cart' : `Item: ${item?.name || 'Selected Item'}`}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            {/* Scope Toggle */}
            <div className="flex bg-muted p-1.5 rounded-xl border">
              <Button
                type="button"
                variant="ghost"
                className={`flex-1 h-10 text-xs uppercase font-bold tracking-wider transition-all duration-200 rounded-lg ${
                  scope === 'selected'
                    ? 'bg-background shadow-sm text-primary ring-1 ring-border'
                    : 'text-muted-foreground hover:bg-background/60'
                }`}
                onClick={() => setScope('selected')}
                disabled={!item}
              >
                Selected
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`flex-1 h-10 text-xs uppercase font-bold tracking-wider transition-all duration-200 rounded-lg ${
                  scope === 'all'
                    ? 'bg-background shadow-sm text-primary ring-1 ring-border'
                    : 'text-muted-foreground hover:bg-background/60'
                }`}
                onClick={() => {
                  setScope('all');
                  setDiscountType('percent');
                }}
              >
                All Items
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1">Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(val: DiscountType) => {
                  setDiscountType(val);
                  if (val === 'pwd' || val === 'senior' || val === 'naac') {
                    setValue('20');
                  } else if (val === 'solo_parent') {
                    setValue('10');
                  } else if (val === 'percent' && item && (discountType === 'pwd' || discountType === 'senior' || discountType === 'naac' || discountType === 'solo_parent')) {
                      setValue(item.discount.toString());
                  }
                }}
              >
                <SelectTrigger className="w-full h-12 rounded-xl bg-muted/30">
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="percent" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-blue-500/10 p-1.5 rounded-md">
                        <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium text-foreground">Percentage (%)</span>
                    </div>
                  </SelectItem>
                  {scope === 'selected' && (
                    <SelectItem value="amount" className="rounded-lg">
                      <div className="flex items-center gap-3 py-1">
                        <div className="bg-green-500/10 p-1.5 rounded-md">
                          <Banknote className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-medium text-foreground">Fixed Amount (₱)</span>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="senior" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-orange-500/10 p-1.5 rounded-md">
                        <UserRound className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="font-medium text-foreground">Senior Citizen (20%)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pwd" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-purple-500/10 p-1.5 rounded-md">
                        <Accessibility className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium text-foreground">PWD Discount (20%)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="naac" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-teal-500/10 p-1.5 rounded-md">
                        <UserRound className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <span className="font-medium text-foreground">NAAC Discount (20%)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="solo_parent" className="rounded-lg">
                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-pink-500/10 p-1.5 rounded-md">
                        <UserRound className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                      </div>
                      <span className="font-medium text-foreground">Solo Parent Discount (10%)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1">
                {['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType) ? 'Fixed Rate' : `Value to Subtract`}
              </Label>
              <div className="relative group">
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={`text-center text-3xl font-black h-20 border-2 rounded-2xl transition-all duration-200 focus-visible:ring-ring focus:border-primary ${
                    ['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType)
                      ? 'bg-muted border-border text-muted-foreground'
                      : 'bg-background border-input hover:border-muted-foreground/40'
                  }`}
                  readOnly={['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType)}
                  autoFocus={!['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
                <div className={`absolute left-6 top-1/2 -translate-y-1/2 font-bold text-2xl transition-colors duration-200 ${
                  ['pwd', 'senior', 'naac', 'solo_parent'].includes(discountType) ? 'text-muted-foreground/50' : 'text-primary'
                }`}>
                  {discountType === 'amount' ? '₱' : '%'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-3 border-t bg-background px-6 py-4">
          <Button
            variant="outline"
            className="h-12 font-bold text-muted-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]"
            onClick={handleApply}
          >
            <Percent className="mr-2 h-4 w-4" />
            Apply Discount
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

