
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Product } from '@/lib/types';
import { useProducts } from '@/hooks/use-api';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { Search, Tag, Loader2, X, PackageSearch, Hash, Layers } from 'lucide-react';
import { calculateEffectivePrice } from '@/lib/pricing';

interface PriceInquiryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activeLevelId?: string;
  defaultLevelId?: string;
  activeLevelName?: string;
}

export function PriceInquiryDialog({
  isOpen,
  onOpenChange,
  activeLevelId,
  defaultLevelId,
  activeLevelName = 'Retail',
}: PriceInquiryDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { products, loading, error, refetch } = useProducts(searchTerm);

  // Auto-refresh on stock updates
  const stableRefresh = useCallback(() => { refetch(); }, [refetch]);
  useLiveRefresh(stableRefresh);

  // Reset when opened or when the active price level changes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setFocusedIndex(0);
      setSelectedProduct(null);
    }
  }, [isOpen, activeLevelId]);

  // Clamp cursor when list changes
  useEffect(() => {
    if (products.length === 0) return;
    setFocusedIndex(i => Math.min(i, products.length - 1));
  }, [products.length]);

  // Auto-select first or preserve current selection
  useEffect(() => {
    if (products.length === 0) {
      setSelectedProduct(null);
      return;
    }
    setSelectedProduct(prev => {
      if (prev && products.find(p => p.id === prev.id)) return prev;
      return products[0];
    });
  }, [products]);

  // Sync focusedIndex → selectedProduct + scroll into view
  useEffect(() => {
    if (products.length === 0) return;
    const target = products[focusedIndex];
    if (target) setSelectedProduct(target);
    document.getElementById(`price-product-${target?.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, products]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => Math.min(products.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, products.length]);

  // Compute tier breakdown for the selected product
  const tierRows = useMemo(() => {
    const p = selectedProduct as any;
    if (!p || !Array.isArray(p.priceLevels) || p.priceLevels.length === 0) return [];
    return p.priceLevels
      .map((lv: any) => ({
        levelName: lv.levelName || lv.name || lv.levelId || 'Tier',
        minQty: Number(lv.minQty ?? lv.qty ?? 1),
        price: Number(lv.price ?? 0),
      }))
      .sort((a: any, b: any) => a.minQty - b.minQty);
  }, [selectedProduct]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl"
      >
        <SheetTitle className="sr-only">Price Inquiry</SheetTitle>
        <SheetDescription className="sr-only">Look up a product to check its price and stock.</SheetDescription>

        {/* Header */}
        <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-none">Price Inquiry</h2>
                <p className="mt-1 text-xs text-muted-foreground">Check product prices and stock instantly</p>
              </div>
            </div>
            <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
              {activeLevelName}
            </span>
          </div>
        </SheetHeader>

        {/* Search */}
        <div className="shrink-0 border-b bg-background px-6 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, SKU, or barcode…"
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
          {/* Left: products list */}
          <div className="flex w-[320px] shrink-0 flex-col border-r">
            <div className="flex shrink-0 items-center gap-2 border-b bg-muted/10 px-4 py-1.5 text-[10px] text-muted-foreground">
              <kbd className="rounded border bg-background px-1 font-mono">↑↓</kbd> navigate products
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && products.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="p-4 text-center text-sm text-destructive">{error}</div>
              ) : products.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                  <PackageSearch className="h-8 w-8 opacity-30" />
                  <p className="text-sm font-medium">No products found</p>
                  <p className="text-xs">Try a different name, SKU, or barcode</p>
                </div>
              ) : (
                products.map((product, i) => {
                  const isSel = selectedProduct?.id === product.id;
                  const isFocused = focusedIndex === i;
                  const price = calculateEffectivePrice(product, 1, activeLevelId, defaultLevelId);
                  return (
                    <div
                      key={product.id}
                      id={`price-product-${product.id}`}
                      onClick={() => { setFocusedIndex(i); setSelectedProduct(product); }}
                      className={`relative cursor-pointer border-b border-border/40 px-4 py-2.5 transition-colors ${isSel ? 'bg-primary/5' : 'hover:bg-muted/40'} ${isFocused ? 'ring-2 ring-inset ring-primary' : ''}`}
                    >
                      {isSel && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-muted-foreground">{product.barcode || product.sku} · {product.unitOfMeasure}</span>
                        <span className="shrink-0 font-mono font-semibold text-primary">₱{price.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: price detail */}
          <div className="flex flex-1 flex-col bg-muted/10">
            {!selectedProduct ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                <Tag className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">Select a product</p>
                <p className="text-xs">Pick any product on the left to view its price details.</p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-y-auto">
                {/* Product header */}
                <div className="shrink-0 border-b bg-background px-6 py-4">
                  <h3 className="text-xl font-bold leading-tight">{selectedProduct.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                      <Hash className="h-3 w-3" />
                      {selectedProduct.barcode || selectedProduct.sku}
                    </span>
                    {selectedProduct.unitOfMeasure && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{selectedProduct.unitOfMeasure}</span>
                    )}
                    {selectedProduct.category && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{selectedProduct.category}</span>
                    )}
                  </div>
                </div>

                {/* Hero price */}
                <div className="relative shrink-0 overflow-hidden border-b bg-primary/5 px-6 py-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                  <div className="relative text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">{activeLevelName} Price</p>
                    <div className="mt-2 flex items-start justify-center text-primary">
                      <span className="mt-3 mr-1 text-2xl font-bold">₱</span>
                      <span className="text-6xl font-black leading-none tracking-tighter tabular-nums drop-shadow-sm">
                        {calculateEffectivePrice(selectedProduct, 1, activeLevelId, defaultLevelId).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      per {selectedProduct.unitOfMeasure || 'unit'}
                    </p>
                  </div>
                </div>

                {/* Info strips */}
                <div className="shrink-0 border-b bg-background px-6 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Brand</p>
                  <p className="mt-1 text-sm font-medium">{selectedProduct.brand || '—'}</p>
                </div>

                {/* Tiered pricing breakdown */}
                {tierRows.length > 0 && (
                  <div className="shrink-0 border-b bg-background px-6 py-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Layers className="h-3.5 w-3.5" />
                      Tiered Pricing
                    </div>
                    <div className="rounded-xl border">
                      <div className="grid grid-cols-3 border-b bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>Tier</span>
                        <span className="text-center">Min Qty</span>
                        <span className="text-right">Price</span>
                      </div>
                      {tierRows.map((row: any, i: number) => (
                        <div key={i} className="grid grid-cols-3 border-b border-border/40 px-3 py-2 text-sm last:border-0">
                          <span className="truncate font-medium">{row.levelName}</span>
                          <span className="text-center font-mono">{row.minQty}+</span>
                          <span className="text-right font-mono font-bold text-primary">₱{row.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description (optional) */}
                {selectedProduct.description && (
                  <div className="shrink-0 border-b bg-background px-6 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                    <p className="mt-1 text-sm text-foreground/80">{selectedProduct.description}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-auto shrink-0 border-t bg-background px-6 py-4">
                  <Button className="h-12 w-full font-bold" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
