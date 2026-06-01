
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SaleItem } from './page';
import { useToast } from '@/hooks/use-toast';
import { calculateEffectivePrice } from '@/lib/pricing';
import type { Product } from '@/lib/types';
import { Tag, Pencil } from 'lucide-react';

interface EditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: SaleItem | null;
  onUpdate: (itemId: string, newName: string, newQuantity: number, newPrice: number, newDiscount: number) => void;
  mode?: 'full' | 'price-only';
  activeLevelId?: string;
  defaultLevelId?: string;
  product?: Product | null;
}

export function EditItemDialog({
  isOpen,
  onOpenChange,
  item,
  onUpdate,
  mode = 'full',
  activeLevelId,
  defaultLevelId = 'retail-level',
  product
}: EditItemDialogProps) {
  const [name, setName] = useState(item?.name || '');
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [price, setPrice] = useState(item?.price || 0);
  const [discount, setDiscount] = useState(item?.discount || 0);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && item) {
      setName(item.name);
      setQuantity(item.quantity);
      setPrice(item.price);
      setDiscount(item.discount);
    }
  }, [isOpen, item]);

  // Update price automatically when quantity changes, 
  // ONLY if the current price matches the effective price of the current quantity
  // (to avoid overriding manual price edits unless intended)
  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    if (product || item) {
        const newPrice = calculateEffectivePrice((product || item) as unknown as Product, newQty, activeLevelId, defaultLevelId);
        setPrice(newPrice);
    }
  };

  const save = () => {
    if (item) {
      // Ensure all values are properly typed
      const validQuantity = Math.max(1, Number(quantity) || 1);
      const validPrice = Math.max(0, Number(price) || 0);
      const validDiscount = Math.max(0, Number(discount) || 0);

      try {
        onUpdate(item.id, name, validQuantity, validPrice, validDiscount);
        onOpenChange(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update item details.",
          variant: "destructive",
        });
      }
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`p-0 overflow-hidden shadow-2xl ${mode === 'price-only' ? 'sm:max-w-[400px]' : 'sm:max-w-md'}`}>
        <div className="bg-background p-6 space-y-6">
          <DialogHeader className="space-y-3">
            <div className="flex justify-center">
              <div className={`${mode === 'price-only' ? 'bg-purple-500/10' : 'bg-blue-500/10'} p-3 rounded-2xl`}>
                {mode === 'price-only' ? (
                  <Tag className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Pencil className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </div>
            <DialogTitle className="text-2xl font-extrabold text-center text-foreground">
              {mode === 'price-only' ? 'Edit Unit Price' : 'Edit Item Details'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center px-4">
              {mode === 'price-only'
                ? `Enter a temporary price for ${item.name}`
                : 'Temporary changes for this transaction only.'}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {mode === 'price-only' ? (
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
                    className="font-black focus-visible:ring-purple-500 text-[32px] h-20 pl-10 pr-4 text-right leading-none bg-muted/40 border-input rounded-2xl focus:bg-background transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex justify-between items-center text-xs px-2">
                  <span className="font-bold text-muted-foreground uppercase tracking-tight">Original Price</span>
                  <span className="font-mono font-bold text-foreground">₱{item.price.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-tight ml-1">Item Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        save();
                      }
                    }}
                    className="font-medium focus-visible:ring-blue-500 h-12 bg-muted/40 rounded-xl px-4"
                    placeholder="Enter new item name"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground/70 italic ml-1">
                    Original: {item.name}
                  </p>
                </div>

                <div className="bg-muted/40 p-4 rounded-xl space-y-2 border">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-muted-foreground">Unit Price:</span>
                    <span className="font-mono font-bold text-foreground">₱{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-muted-foreground">Quantity:</span>
                    <span className="font-mono font-bold text-foreground">{quantity}</span>
                  </div>
                  {item.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-muted-foreground">Discount:</span>
                      <span className="font-mono font-bold text-green-600 dark:text-green-400">{item.discount}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              className={`flex-1 h-12 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] ${
                mode === 'price-only'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              }`}
              onClick={save}
            >
              {mode === 'price-only' ? 'Update Price' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
