'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Star } from 'lucide-react';
import { AdjustPointsForm } from '../customer/loyalty/adjust-points-dialog';
import type { Customer } from '@/lib/types';

interface LoyaltyRewardsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function LoyaltyRewardsDialog({
  isOpen,
  onOpenChange,
  customer,
}: LoyaltyRewardsDialogProps) {
  const customerData = customer && customer.id !== 'walk-in'
    ? { ...customer, loyaltyPoints: (customer as any).loyaltyPoints || 0 }
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Loyalty Rewards</SheetTitle>
        <SheetDescription className="sr-only">View customer loyalty points balance, add points, or withdraw rewards.</SheetDescription>

        {/* Polished header */}
        <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Star className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none">Loyalty Rewards</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {customerData?.name ? `Manage rewards for ${customerData.name}` : 'Scan or enter a loyalty card'}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AdjustPointsForm
            customer={customerData as any}
            onFinished={() => onOpenChange(false)}
            hideAdjustments
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
