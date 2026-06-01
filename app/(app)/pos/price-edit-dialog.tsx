'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag } from 'lucide-react';
import type { SaleItem } from './page';

interface PriceEditDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onUpdate: (itemId: string, newName: string, newQuantity: number, newPrice: number, newDiscount: number) => void;
}

export function PriceEditDialog({
  isOpen,
  onOpenChange,
  item,
  onUpdate,
}: PriceEditDialogProps) {
  const [price, setPrice] = useState(item?.price || 0);

  useEffect(() => {
    if (isOpen && item) {
      setPrice(item.price);
    }
  }, [isOpen, item]);

  const save = () => {
    if (item) {
      const validPrice = Math.max(0, Number(price) || 0);
      onUpdate(item.id, item.name, item.quantity, validPrice, item.discount);
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl sm:max-w-[400px]">
        <div className="bg-background p-6 space-y-6">
          <DialogHeader className="space-y-3">
            <div className="flex justify-center">
              <div className="bg-purple-500/10 p-3 rounded-2xl">
                <Tag className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-extrabold text-center text-foreground">
              Edit Unit Price
            </DialogTitle>
            <DialogDescription className="sr-only">Enter a temporary price override for the selected item</DialogDescription>
            <p className="text-sm text-muted-foreground text-center px-4">
              Enter a temporary price for <span className="font-bold text-foreground">{item.name}</span>
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-purple-400 dark:text-purple-500 z-10">₱</span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      save();
                    }
                  }}
                  className="font-black focus-visible:ring-purple-500 !text-[60px] h-20 px-4 text-center leading-none bg-muted/40 border-input rounded-2xl focus:bg-background transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex justify-between items-center text-xs px-2">
                <span className="font-bold text-muted-foreground uppercase tracking-tight">Original Price</span>
                <span className="font-mono font-bold text-foreground">₱{item.price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
              onClick={save}
            >
              Update Price
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
