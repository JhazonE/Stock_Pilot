
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { useProducts } from '@/hooks/use-api';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { useDebounce } from '@/hooks/use-debounce';
import { Loader2, Search, PackageSearch } from 'lucide-react';
import { calculateEffectivePrice } from '@/lib/pricing';
import { formatStockQuantity } from '@/lib/utils';

interface ProductSearchDialogProps {
  onSelectProduct: (product: Product) => void;
  children?: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  showQuantityInSearch?: boolean;
  activeLevelId?: string;
  defaultLevelId?: string;
  activeLevelName?: string;
  warehouseId?: string;
}

export function ProductSearchDialog({
  onSelectProduct,
  children,
  isOpen,
  onOpenChange,
  showQuantityInSearch = true,
  activeLevelId,
  defaultLevelId,
  activeLevelName = 'Retail',
  warehouseId
}: ProductSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { products, loading, error, refetch: refetchProducts } = useProducts(debouncedSearchTerm, 'Available', undefined, warehouseId);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);

  // Update displayed products only when not loading or when loading starts to keep previous results
  useEffect(() => {
    if (!loading && !error) {
      setDisplayedProducts(products);
    }
  }, [products, loading, error]);

  // Handle auto-refresh when stock is updated (e.g., after a sale)
  const stableRefresh = useCallback(() => { refetchProducts(); }, [refetchProducts]);
  useLiveRefresh(stableRefresh);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen, activeLevelId]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F9') {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onOpenChange]);

  const handleSelect = (productId: string) => {
    const product = displayedProducts.find(p => p.id === productId);
    if (product) {
      onSelectProduct(product);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="h-[50vh] w-full gap-0 border-b p-0 shadow-2xl rounded-b-2xl flex flex-col"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="flex h-full flex-col rounded-none bg-background">
          {/* Header */}
          <div className="shrink-0 bg-muted/20">
            <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-lg leading-none">Product Search</SheetTitle>
                  <SheetDescription className="mt-1 text-xs">Browse and add products to the current sale</SheetDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 pr-8">
                <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20">{activeLevelName}</span>
                <span className="hidden rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-block">
                  {displayedProducts.length} result{displayedProducts.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            {/* Search input (CommandInput keeps keyboard navigation working) */}
            <div className="relative">
              <CommandInput
                placeholder="Type a product name, SKU, or barcode…"
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="h-14 text-base"
              />
              {loading && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Column header */}
          <div className="flex shrink-0 items-center gap-3 border-y bg-muted/40 px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex-1">Description</span>
            <span className="w-28 text-left">Unit</span>
            {!!showQuantityInSearch && <span className="w-28 text-right">Stock</span>}
            <span className="w-32 text-right">Price</span>
          </div>

          {/* Results list */}
          <CommandList className="h-full max-h-none flex-1 overflow-y-auto">
            {error && <div className="p-4 text-center text-destructive">{error}</div>}

            {displayedProducts.length === 0 && !loading && !error && (
              <CommandEmpty className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                <PackageSearch className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No products found</p>
                <p className="text-xs">Try a different name, SKU, or barcode</p>
              </CommandEmpty>
            )}

            <CommandGroup className={`p-0 ${loading ? 'opacity-50' : ''} transition-opacity`}>
              {displayedProducts.map((product) => {
                const reorderPoint = product.reorderPoint ?? 0;
                const stockTone = product.stock <= 0
                  ? 'bg-destructive/10 text-destructive'
                  : product.stock <= reorderPoint
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.barcode || ''} ${product.sku}`}
                    onSelect={() => handleSelect(product.id)}
                    className="flex h-auto cursor-pointer items-center gap-3 rounded-none border-b border-border/40 px-6 py-2.5 transition-colors data-[selected=true]:bg-primary/5 data-[selected=true]:before:absolute data-[selected=true]:before:inset-y-0 data-[selected=true]:before:left-0 data-[selected=true]:before:w-1 data-[selected=true]:before:bg-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{product.barcode || product.sku}</p>
                    </div>
                    <span className="w-28 truncate text-left text-sm text-muted-foreground">{product.unitOfMeasure}</span>
                    {!!showQuantityInSearch && (
                      <span className="w-28 text-right">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${stockTone}`}>
                          {formatStockQuantity(product.stock)}
                        </span>
                      </span>
                    )}
                    <span className="w-32 text-right font-mono text-sm font-bold text-primary">
                      ₱{calculateEffectivePrice(product, 1, activeLevelId, defaultLevelId).toFixed(2)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>

          {/* Footer hint */}
          <div className="flex shrink-0 items-center justify-between border-t bg-muted/20 px-6 py-2.5">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">↵ Enter</kbd>
                add to sale
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <kbd className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
                <kbd className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">F9</kbd>
                close
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </Command>
      </SheetContent>
    </Sheet>
  );
}
