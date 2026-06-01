
import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
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
import { Loader2, Printer, User, Star, Info, AlertCircle, Wallet, Plus, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { SaleItem, mapVatStatusToTaxType } from './page';
import { mapVatStatusToTaxType as mapTax } from './page';
import type { Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { usePrinter } from '@/lib/use-printer';
import { ReceiptGenerator } from '@/lib/receipt-generator';
import { useReactToPrint } from 'react-to-print';
import { ReceiptView } from './receipt-view';
import { getApiUrl } from '@/lib/api-config';

import { SystemSettings } from '@/lib/types';

interface TenderDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    paymentMethod: string;
    totalDue: number;
    items: SaleItem[];
    customer: Customer | null;
    currentUser: any;
    onSuccess: (paymentMethod: string, amount: number) => void;
    shiftId: string | null;
    terminalId: string;
    terminalMin?: string;
    terminalSerialNumber?: string;
    terminalName?: string;
    isTrainingMode?: boolean;
    paymentMethods: { id: string; name: string; isReferenceRequired?: boolean; pointsAmount?: number; currencyEquivalent?: number }[];
    printMode: 'browser' | 'escpos' | 'usb' | 'native';
    settings?: SystemSettings | null;
    onTriggerCustomerSelection?: () => void;
    onCheckoutComplete?: (change: number, orNumber: string) => void;
}


// Print-only receipt component is imported
// Wrapper for visible receipt view with actions
function ReceiptActionView({
    saleDetails,
    onNewSale,
    onPrint,
    settings
}: {
    saleDetails: any;
    onNewSale: () => void;
    onPrint: () => void;
    settings?: SystemSettings | null;
}) {
    return (
        <div className="flex flex-col h-full bg-gray-50 p-4">
             <div className="flex-1 overflow-auto flex justify-center">
                <div className="bg-white shadow-sm my-4 h-fit">
                    <ReceiptView saleDetails={saleDetails} settings={settings} />
                </div>
            </div>
            <div className="mt-4 flex justify-center gap-4 print:hidden">
                 <Button onClick={onPrint} size="lg" className="w-40">
                    <Printer className="mr-2 h-4 w-4" />
                    Reprint
                </Button>
                <Button onClick={onNewSale} size="lg" className="w-40" variant="secondary">
                    New Sale
                </Button>
            </div>
        </div>
    );
}


export function TenderDialog({
    isOpen,
    onOpenChange,
    paymentMethod,
    totalDue,
    items,
    customer,
    currentUser,
    onSuccess,
    shiftId,
    terminalId,
    terminalMin,
    terminalSerialNumber,
    terminalName,
    isTrainingMode,
    paymentMethods = [],
    printMode,
    settings,
    onTriggerCustomerSelection,
    onCheckoutComplete
}: TenderDialogProps) {
    const [selectedMethod, setSelectedMethod] = useState(paymentMethod);
    const [amountTendered, setAmountTendered] = useState('');
    const [referenceInput, setReferenceInput] = useState('');
    const [payments, setPayments] = useState<{ id: string; method: string; amount: number; reference?: string }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [view, setView] = useState<'tender' | 'receipt' | 'change' | 'print_prompt'>('tender');
    const [completedSale, setCompletedSale] = useState<any>(null);
    const [pointsToRedeemInput, setPointsToRedeemInput] = useState<string>('');
    const { isPrinting, isConnected, connect, print } = usePrinter(printMode, settings?.nativePrinterName);
    const { toast } = useToast();
    const pointsInputRef = useRef<HTMLInputElement>(null);

    const pointsMethod = useMemo(() => {
        return paymentMethods.find(pm => pm.name.toLowerCase().includes('points'));
    }, [paymentMethods]);

    const pointsRate = useMemo(() => {
        if (!pointsMethod || !pointsMethod.pointsAmount || !pointsMethod.currencyEquivalent) {
            return 1; // Default 1:1
        }
        return Number(pointsMethod.currencyEquivalent) / Number(pointsMethod.pointsAmount);
    }, [pointsMethod]);

    // Sync local state when prop changes (dialog opens)
    useEffect(() => {
        if (isOpen && paymentMethod) {
            setSelectedMethod(paymentMethod);
        }
    }, [isOpen, paymentMethod]);

    // Sync selectedMethod with paymentMethods options (fixing case mismatch)
    useEffect(() => {
        if (paymentMethods.length > 0 && selectedMethod) {
             const match = paymentMethods.find(p => p.name.toUpperCase() === selectedMethod.toUpperCase());
             if (match && match.name !== selectedMethod) {
                 setSelectedMethod(match.name);
             }
        }
    }, [paymentMethods, selectedMethod]);

    const isCashPayment = selectedMethod?.toUpperCase() === 'CASH';
    const isChargePayment = selectedMethod?.toUpperCase() === 'CHARGE';

    // UX: Reset points when opening
    // Modified: Use a ref to track what triggered the reset to avoid resetting when totalDue changes while open
    const lastOpenRef = useRef(false);
    useEffect(() => {
        const justOpened = isOpen && !lastOpenRef.current;

        if (justOpened) {
            setAmountTendered(totalDue.toFixed(2));
            setPointsToRedeemInput('');
            setPayments([]);
        }
        lastOpenRef.current = isOpen;
    }, [isOpen, totalDue]);

    const customerPoints = Number((customer as any)?.current_points || (customer as any)?.loyaltyPoints || 0);
    const pointsToRedeemValueRaw = useMemo(() => parseFloat(pointsToRedeemInput) || 0, [pointsToRedeemInput]);
    
    // Capped by BOTH totalDue and actual available points (Strict 1:1)
    const pointsToRedeemValue = useMemo(() => Math.min(pointsToRedeemValueRaw, totalDue, customerPoints), [pointsToRedeemValueRaw, totalDue, customerPoints]);
    
    // The actual points to be deducted (1:1 ratio)
    const pointsToRedeemCount = pointsToRedeemValue;

    const amountTenderedNum = useMemo(() => parseFloat(amountTendered) || 0, [amountTendered]);
    
    const totalAddedPayments = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);

    const balanceRemaining = useMemo(() => {
        return Math.max(0, totalDue - pointsToRedeemValue - totalAddedPayments);
    }, [totalDue, pointsToRedeemValue, totalAddedPayments]);

    // Sync amountTendered with balanceRemaining when points or payments change
    // Modified: Only auto-sync if amountTendered is empty or was previously exactly equal to the old balance
    const lastBalanceRef = useRef(balanceRemaining);
    useEffect(() => {
        const isDefaultAmount = amountTendered === '' || parseFloat(amountTendered) === lastBalanceRef.current;
        if (isDefaultAmount) {
            setAmountTendered(balanceRemaining.toFixed(2));
        }
        lastBalanceRef.current = balanceRemaining;
    }, [balanceRemaining, amountTendered]);

    const change = useMemo(() => {
        // Change is calculated from the *current* amountTendered (if it's cash and covers the rest)
        // plus any excess from already added cash payments.
        // For simplicity, we assume change is only calculated when the *last* payment added (or being added) is Cash and exceeds the balance.
        // Actually, if we allow adding payments until total >= totalDue, change is simply:
        return Math.max(0, totalAddedPayments + (isCashPayment ? amountTenderedNum : 0) - (totalDue - pointsToRedeemValue));
    }, [amountTenderedNum, totalAddedPayments, totalDue, pointsToRedeemValue, isCashPayment]);

    const isReferenceRequired = useMemo(() => {
        if (!selectedMethod) return false;
        if (selectedMethod.toUpperCase() === 'CASH') return false; // Never require for cash
        const method = paymentMethods.find(pm => pm.name === selectedMethod);
        return method?.isReferenceRequired || false;
    }, [selectedMethod, paymentMethods]);

    // Broadcast live tendered/change to customer display as cashier types
    useEffect(() => {
        if (!isOpen || view !== 'tender') return;
        try {
            const channel = new BroadcastChannel('pos-customer-display');
            const tendered = totalAddedPayments + (isCashPayment ? amountTenderedNum : 0);
            channel.postMessage({
                type: 'PAYMENT_UPDATE',
                tendered,
                change,
                currency: settings?.currencySymbol || '₱',
            });
            channel.close();
        } catch { /* BroadcastChannel not available */ }
    }, [amountTenderedNum, totalAddedPayments, change, isOpen, view, isCashPayment, settings?.currencySymbol]);




    const receiptRef = useRef<HTMLDivElement>(null);
    const yesButtonRef = useRef<HTMLButtonElement>(null);
    const noButtonRef = useRef<HTMLButtonElement>(null);
    const paymentMethodRef = useRef<HTMLButtonElement>(null);
    const amountTenderedRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${new Date().getTime()}`,
        onAfterPrint: () => console.log('Print finished'),
        pageStyle: `
            @page {
                size: ${settings?.paperSize === '80mm' ? '80mm' : '58mm'} auto;
                margin: 0;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    margin: 0;
                    padding: 0;
                }
                .printable-area {
                    box-shadow: none ! from-neutral-500;
                    margin: 0 !important;
                    width: ${settings?.paperSize === '80mm' ? '80mm' : '58mm'} !important;
                }
            }
        `
    });

    const handlePrintReceipt = async (dataToPrint?: any) => {
         const details = dataToPrint || completedSale;
         if (!details) return;

         if (printMode === 'browser') {
             // We need to ensure state is set before printing if passed explicitly
             if (dataToPrint && dataToPrint !== completedSale) {
                 setCompletedSale(dataToPrint);
                 // Allow a small tick for ref to update with new data
                 setTimeout(() => {
                     handlePrint();
                 }, 100);
             } else {
                 handlePrint();
             }
             return;
         }

         if (!isConnected) {
             const connected = await connect();
             if (!connected) return;
         }

         try {
             const { ReceiptGenerator } = await import('@/lib/receipt-generator');
             const generator = new ReceiptGenerator();
             // Pass settings to native generator to allow printing of business name/TIN
             const bytes = generator.generateReceipt(details, settings);
             await print(bytes);
         } catch (e) {
             console.error("Printing error", e);
             toast({
                 title: "Print Failed",
                 description: "Could not send data to printer.",
                 variant: "destructive"
             });
         }
    };


    const handleAddPayment = () => {
        if (isReferenceRequired && !referenceInput.trim()) {
            toast({
                title: "Reference Required",
                description: "Please enter a reference number.",
                variant: 'destructive'
            });
            return;
        }
        if (amountTenderedNum <= 0 && !isChargePayment) return;
        
        setPayments([...payments, {
            id: Math.random().toString(),
            method: selectedMethod,
            amount: isChargePayment ? balanceRemaining : amountTenderedNum,
            reference: isReferenceRequired ? referenceInput : undefined
        }]);
        setAmountTendered('');
        setReferenceInput('');
        setSelectedMethod(''); // Clear selection so they must choose the next payment method
    };

    const handleConfirmPayment = async () => {
        
        // Strict Point Validation
        const availablePoints = (customer as any)?.current_points || (customer as any)?.loyaltyPoints || 0;

        if (pointsToRedeemValue > (Number(availablePoints) * pointsRate)) {
            toast({
                title: "Insufficient Points",
                description: `Customer only has ${Number(availablePoints).toFixed(0)} points.`,
                variant: "destructive"
            });
            return;
        }

        // Assemble final payments array combining already added payments and current input
        const finalPayments = [...payments];
        if (amountTenderedNum > 0 || (isChargePayment && balanceRemaining > 0)) {
            if (isReferenceRequired && !referenceInput.trim()) {
                 toast({
                    title: "Reference Required",
                    description: "Please enter a reference number for this payment method.",
                    variant: 'destructive'
                });
                return;
            }
            finalPayments.push({
                id: Math.random().toString(),
                method: selectedMethod,
                amount: isChargePayment ? balanceRemaining : amountTenderedNum,
                reference: isReferenceRequired ? referenceInput : undefined
            });
        }

        const totalTenderedAll = finalPayments.reduce((acc, p) => acc + p.amount, 0);
        
        if (totalTenderedAll < balanceRemaining) {
             toast({
                title: "Insufficient Amount",
                description: `Amount tendered must be greater than or equal to balance due (₱${balanceRemaining.toFixed(2)}).`,
                variant: 'destructive'
            });
            return;
        }

        setIsProcessing(true);

        try {
            const response = await fetch(getApiUrl('/pos/checkout'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionDate: new Date(), // Use server time preferably, but this is for reference
                    totalDue: totalDue,
                    subtotal: items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                    discountAmount: items.reduce((acc, item) => acc + (item.price * item.quantity * ((item.discount || 0) / 100)), 0),
                    taxAmount: items.reduce((acc, item) => {
                        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
                        // Precise matching logic
                        const taxType = item.taxType || mapTax(item.vatStatus);
                        if (taxType === 'VAT') {
                            return acc + (netItemTotal - (netItemTotal / 1.12));
                        }
                        return acc;
                    }, 0),
                    payments: finalPayments,
                    change: change,
                    paymentMethod: pointsToRedeemValue > 0 && finalPayments.length === 0 ? 'POINTS' : (finalPayments.length > 1 ? 'MULTIPLE' : finalPayments[0]?.method || 'UNKNOWN'),
                    items: items.map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        discount: item.discount,
                        discountType: item.discountType,
                        taxType: item.taxType || mapTax(item.vatStatus),
                        cost: item.cost 
                    })),

                    customer: customer || { id: 'walk-in', name: 'Walk-in Customer' },
                    status: 'completed',
                    paymentDetails: {
                        pointsUsed: pointsToRedeemCount, 
                        pointsConversionRate: pointsRate
                    },
                    currentUser: { ...currentUser, id: currentUser?.id || 'admin' }, // Ensure ID exists
                    userId: currentUser?.id || currentUser?.uid || 'admin',
                    shiftId,
                    terminalId
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save transaction');
            }

            // Success feedback
            toast({ 
                title: "Payment Successful", 
                description: "Transaction saved. Printing receipt...",
                duration: 2000
            });

            // Calculate detailed tax breakdown for receipt
            // Aggregated gross vatable sales to minimize rounding errors
            const vatableGross = items.reduce((acc, item) => {
                const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
                // Precise matching: use taxType if set, fallback to mapping from vatStatus
                const taxType = item.taxType || mapTax(item.vatStatus);
                return taxType === 'VAT' ? acc + netItemTotal : acc;
            }, 0);

            const vatableSales = vatableGross / 1.12;
            const vatAmountResult = vatableGross - vatableSales;

            const vatExemptSales = items.reduce((acc, item) => {
                const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
                const taxType = item.taxType || mapTax(item.vatStatus);
                return taxType === 'VAT_EXEMPT' ? acc + netItemTotal : acc;
            }, 0);

            const zeroRatedSales = items.reduce((acc, item) => {
                const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
                const taxType = item.taxType || mapTax(item.vatStatus);
                return taxType === 'ZERO_RATED' ? acc + netItemTotal : acc;
            }, 0);

            const nonVatSales = items.reduce((acc, item) => {
                const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
                const taxType = item.taxType || mapTax(item.vatStatus);
                // NON_VAT refers to items that are not VATable AND not specifically exempt/zero-rated in this context
                // but usually it's just a catch-all for non-vatable items.
                return taxType === 'NON_VAT' ? acc + netItemTotal : acc;
            }, 0);

            const saleDetails = {
                items: [...items],
                customer: customer || { id: 'walk-in', name: 'Walk-in' } as any,
                totalDue,
                change,
                paymentMethod: pointsToRedeemValue > 0 && finalPayments.length === 0 ? 'POINTS' : (finalPayments.length > 1 ? 'MULTIPLE' : finalPayments[0]?.method || 'UNKNOWN'),
                payments: finalPayments,
                orderNumber: result.data.orderNumber.toString(),
                amountTendered: totalTenderedAll,
                transactionDate: new Date(),
                cashierName: currentUser?.display_name || currentUser?.username || 'Admin',
                pointsEarned: result.data.pointsEarned,
                pointsUsedCount: pointsToRedeemCount,
                pointsUsedValue: pointsToRedeemValue,
                pointsBalance: result.data.pointsRemaining,
                terminalMin: terminalMin || settings?.minNumber,
                terminalSerialNumber: terminalSerialNumber || settings?.serialNumber,
                terminalName: terminalName,
                isTrainingMode: isTrainingMode,
                taxBreakdown: {
                    vatableSales,
                    vatAmount: vatAmountResult,
                    vatExemptSales,
                    zeroRatedSales,
                    nonVatSales
                }
            };

            console.log('Final Sale Details for Receipt:', saleDetails);
            console.log('Points Earned from API:', result.data.pointsEarned);

            setCompletedSale(saleDetails);

            onCheckoutComplete?.(change, result.data.orderNumber.toString());

            // Auto-print logic moved or handled here based on flow
            
            // If Change > 0, show Change View, do NOT close/print yet (unless we want to background print)
            // User requested: Enter Amount -> Dialog Change -> Print
            if (change > 0) {
                 setView('change');
                 // We don't print or close yet. We wait for user interaction in Change View.
            } else {
                 // Standard flow for non-cash or exact cash
                 // Transition to Print Prompt instead of auto-printing
                 setView('print_prompt');
            }

        } catch (error: any) {
            const isBatchError = error.message?.includes('Batch stock exhausted');
            
            if (isBatchError) {
                // For batch errors, we show a cleaner message and skip the console.error
                // which can trigger Next.js development overlays.
                toast({
                    title: "Stock Alert",
                    description: error.message,
                    variant: "destructive",
                    duration: 5000,
                });
            } else {
                console.error('Error saving payment:', error);
                toast({
                    title: "Transaction Error",
                    description: error.message || "Failed to save the transaction to the database.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };


    const handleCompleteChange = async () => {
        if (!completedSale) return;

        // Transition to Print Prompt after showing change
        setView('print_prompt');
    }

    const handleConfirmPrint = async (shouldPrint: boolean) => {
        if (!completedSale) return;

        if (shouldPrint) {
            await handlePrintReceipt(completedSale);
            
            // If the setting is enabled, print a second copy
            if (settings?.printTwoReceipts) {
                // Short delay to allow the printer/buffer to breathe
                await new Promise(resolve => setTimeout(resolve, 800));
                await handlePrintReceipt(completedSale);
            }

            // Small delay to ensure print command is sent
            setTimeout(() => {
                onSuccess(selectedMethod, totalDue);
                onOpenChange(false);
            }, 500);
        } else {
            onSuccess(selectedMethod, totalDue);
            onOpenChange(false);
        }
    };
    
    const handleSmartPrint = () => {
        if (completedSale) {
             handlePrintReceipt(completedSale);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setView('tender');
            setCompletedSale(null);
            setIsProcessing(false);
            setPointsToRedeemInput(''); 
            setAmountTendered(totalDue.toFixed(2));
            setReferenceInput('');
            // Auto-confirm removed to allow amount entry for all methods
        }
    }, [isOpen]);

    const handleQuickAmount = (amount: number) => {
        setAmountTendered(amount.toString());
    }

    const handleNewSale = () => {
        onOpenChange(false);
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (view === 'print_prompt') {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (document.activeElement === yesButtonRef.current) {
                    noButtonRef.current?.focus();
                } else {
                    yesButtonRef.current?.focus();
                }
            } else if (e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleConfirmPrint(true);
            } else if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                handleConfirmPrint(false);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleConfirmPrint(false);
            }
            return;
        }

        if (view === 'tender') {
            if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                e.preventDefault();
                if (document.activeElement === paymentMethodRef.current) {
                    amountTenderedRef.current?.focus();
                    amountTenderedRef.current?.select();
                } else if (document.activeElement === amountTenderedRef.current) {
                    if (isReferenceRequired) {
                        referenceInputRef.current?.focus();
                    } else {
                        confirmButtonRef.current?.focus();
                    }
                } else if (document.activeElement === referenceInputRef.current) {
                    confirmButtonRef.current?.focus();
                } else if (document.activeElement === confirmButtonRef.current || document.activeElement === cancelButtonRef.current) {
                    paymentMethodRef.current?.focus();
                }
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                e.preventDefault();
                if (document.activeElement === amountTenderedRef.current) {
                    paymentMethodRef.current?.focus();
                } else if (document.activeElement === referenceInputRef.current) {
                    amountTenderedRef.current?.focus();
                    amountTenderedRef.current?.select();
                } else if (document.activeElement === confirmButtonRef.current || document.activeElement === cancelButtonRef.current) {
                    if (isReferenceRequired) {
                        referenceInputRef.current?.focus();
                    } else {
                        amountTenderedRef.current?.focus();
                        amountTenderedRef.current?.select();
                    }
                } else if (document.activeElement === paymentMethodRef.current) {
                    confirmButtonRef.current?.focus();
                }
            } else if (e.key === 'ArrowRight' && document.activeElement === cancelButtonRef.current) {
                e.preventDefault();
                confirmButtonRef.current?.focus();
            } else if (e.key === 'ArrowLeft' && document.activeElement === confirmButtonRef.current) {
                e.preventDefault();
                cancelButtonRef.current?.focus();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onOpenChange(false);
            }
        }
    };

    const getQuickAmounts = (total: number) => {
        const amounts = new Set<number>();
        amounts.add(Math.ceil(total));
        if (total < 50) {
            amounts.add(50);
            amounts.add(100);
        } else if (total < 100) {
            amounts.add(Math.ceil(total / 50) * 50);
            amounts.add(Math.ceil(total / 50) * 50 + 50);
        } else if (total < 1000) {
            amounts.add(Math.ceil(total / 100) * 100);
            amounts.add(Math.ceil(total / 100) * 100 + 100);
        }
        amounts.add(1000);

        return Array.from(amounts).filter(a => a >= total).sort((a, b) => a - b).slice(0, 4);
    }

    const amountTenderedFloat = parseFloat(amountTendered) || 0;

    const confirmDisabled =
        isProcessing ||
        (balanceRemaining > 0 && !amountTendered && !isChargePayment) ||
        (payments.length === 0 && (selectedMethod === 'CASH' || selectedMethod === 'POINTS') && parseFloat(amountTendered) < balanceRemaining) ||
        (pointsToRedeemValue > (Number((customer as any)?.current_points || (customer as any)?.loyaltyPoints || 0) * pointsRate)) ||
        (payments.length === 0 && isReferenceRequired && !referenceInput.trim()) ||
        (isChargePayment && (!customer || (customer as any).id === 'walk-in'));

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className={`${(view === 'print_prompt' || view === 'receipt') ? 'w-full sm:max-w-xl' : 'w-full sm:max-w-md'} flex flex-col gap-0 p-0 transition-[width,max-width] duration-300`}
                onInteractOutside={(e) => e.preventDefault()}
                onKeyDown={handleKeyDown}
            >
                <SheetTitle className="sr-only">Tender Payment</SheetTitle>
                <SheetDescription className="sr-only">Finalize the transaction and complete the sale.</SheetDescription>

                {view === 'receipt' && completedSale ? (
                    <ReceiptActionView saleDetails={completedSale} onNewSale={handleNewSale} onPrint={handleSmartPrint} settings={settings} />
                ) : view === 'change' && completedSale ? (
                    <div className="flex h-full flex-col items-center justify-center gap-10 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <div className="space-y-2 text-center">
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Change Due</h2>
                            <div className="text-7xl font-black tracking-tight text-primary tabular-nums">
                                ₱{completedSale.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-sm text-muted-foreground">Please hand the change to the customer.</p>
                        </div>
                        <Button size="lg" className="h-16 w-full text-xl font-bold shadow-lg shadow-primary/20" onClick={handleCompleteChange} autoFocus>
                            Next
                        </Button>
                    </div>
                ) : view === 'print_prompt' && completedSale ? (
                    <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header */}
                        <div className="flex shrink-0 items-center gap-3 border-b bg-muted/20 px-6 py-4 pr-12">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Printer className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold leading-none">Print Receipt?</h2>
                                <p className="mt-1 text-xs text-muted-foreground">Review the receipt below, then choose an option.</p>
                            </div>
                        </div>

                        {/* Receipt Preview */}
                        <div className="flex-1 overflow-y-auto bg-muted/40 p-4">
                            <div className="flex justify-center">
                                <div className="origin-top bg-white shadow-md">
                                    <ReceiptView saleDetails={completedSale} settings={settings} />
                                </div>
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="shrink-0 space-y-3 border-t bg-background px-6 py-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-14 text-lg font-bold transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => handleConfirmPrint(false)}
                                    ref={noButtonRef}
                                >
                                    No
                                </Button>
                                <Button
                                    size="lg"
                                    className="h-14 text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    onClick={() => handleConfirmPrint(true)}
                                    ref={yesButtonRef}
                                    autoFocus
                                >
                                    <Printer className="mr-2 h-5 w-5" />
                                    Yes, Print
                                </Button>
                            </div>
                            <p className="text-center text-[10px] uppercase tracking-tight text-muted-foreground">
                                Arrow keys to navigate • Y for Yes • N for No
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full flex-col">
                        {/* Header */}
                        <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold leading-none">Tender Payment</h2>
                                    <p className="mt-1 text-xs text-muted-foreground">Finalize the transaction</p>
                                </div>
                            </div>
                        </SheetHeader>

                        {/* Body */}
                        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                            {isChargePayment && (!customer || (customer as any).id === 'walk-in') && (
                                <Alert className="animate-in fade-in slide-in-from-top-4 border-2 border-orange-200 bg-orange-50 text-orange-900 duration-500">
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                    <AlertTitle className="font-bold text-orange-900">Charge to Account - Customer Required</AlertTitle>
                                    <AlertDescription className="font-medium text-orange-700">
                                        Please select a customer to proceed with this charge.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Total Due hero */}
                            <div className="rounded-2xl border-2 border-primary/10 bg-primary/5 p-5 text-center">
                                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Due</p>
                                <p className="text-5xl font-black tracking-tight text-primary tabular-nums">
                                    ₱{totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                {(pointsToRedeemValue > 0 || totalAddedPayments > 0) && (
                                    <div className="mt-4 space-y-1.5 border-t border-primary/10 pt-3 text-sm animate-in fade-in duration-300">
                                        {totalAddedPayments > 0 && (
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span>Paid so far</span>
                                                <span className="font-mono">₱{totalAddedPayments.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {pointsToRedeemValue > 0 && (
                                            <div className="flex items-center justify-between text-purple-600">
                                                <span>Points applied</span>
                                                <span className="font-mono">−₱{pointsToRedeemValue.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-base font-black text-foreground">
                                            <span>Balance Due</span>
                                            <span className="font-mono">₱{balanceRemaining.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="paymentMethod" className="text-sm font-semibold">Payment Method</Label>
                                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                                    <SelectTrigger className="h-12 w-full text-base" ref={paymentMethodRef}>
                                        <SelectValue placeholder="Select Payment Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map((method) => (
                                            <SelectItem key={method.id} value={method.name}>
                                                {method.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Amount Tendered Section - Always show for Points and Cash */}
                            {(selectedMethod === 'CASH' || selectedMethod === 'POINTS' || (balanceRemaining > 0 && !isChargePayment)) && (
                                <div className="space-y-2">
                                    <Label htmlFor="amountTendered" className="text-sm font-semibold">
                                        {selectedMethod === 'POINTS' ? 'Cash Balance Tendered' : 'Amount Tendered'}
                                    </Label>
                                    <Input
                                        id="amountTendered"
                                        ref={amountTenderedRef}
                                        type="text"
                                        inputMode="decimal"
                                        value={amountTendered}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                setAmountTendered(value);
                                            }
                                        }}
                                        placeholder="0.00"
                                        className="h-14 border-2 pr-4 text-right text-3xl font-black text-foreground [&:not(:placeholder-shown)]:text-foreground focus-visible:ring-primary/30"
                                        style={{ color: 'hsl(var(--foreground))' }}
                                        autoFocus={selectedMethod !== 'POINTS'}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (!isProcessing) {
                                                    handleConfirmPayment();
                                                }
                                            }
                                        }}
                                    />
                                    {selectedMethod === 'POINTS' && balanceRemaining > 0 && (
                                        <p className="mt-1 text-right text-xs font-medium italic text-muted-foreground">
                                            Please enter the cash amount given by the customer for the remaining balance.
                                        </p>
                                    )}
                                    {/* Quick amounts */}
                                    {totalDue > 0 && selectedMethod === 'CASH' && (
                                        <div className="grid grid-cols-4 gap-2 pt-1">
                                            {getQuickAmounts(balanceRemaining || totalDue).map(amount => (
                                                <Button key={amount} variant="outline" onClick={() => handleQuickAmount(amount)} className="h-10 font-bold">₱{amount}</Button>
                                            ))}
                                        </div>
                                    )}
                                    {change > 0 && (
                                        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                                            <span className="text-sm font-semibold">Change</span>
                                            <span className="font-mono text-lg font-black">₱{change.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reference Input */}
                            {isReferenceRequired && (
                                <div className="space-y-2">
                                    <Label htmlFor="referenceInput" className="text-sm font-bold text-red-600">
                                        Reference Number *
                                    </Label>
                                    <Input
                                        id="referenceInput"
                                        ref={referenceInputRef}
                                        type="text"
                                        value={referenceInput}
                                        onChange={(e) => setReferenceInput(e.target.value)}
                                        placeholder="Enter reference # (e.g. Check No., Trans ID)"
                                        className="h-12 text-lg"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleConfirmPayment();
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Loyalty Points Redemption */}
                            {customer && (customer as any).id !== 'walk-in' && !(customer as any)?.isExpired && customerPoints > 0 && (
                                <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300 dark:border-purple-500/30 dark:bg-purple-500/10">
                                    <div className="flex items-center justify-between px-1">
                                        <Label htmlFor="manualPoints" className="flex items-center gap-2 text-base font-bold text-purple-900 dark:text-purple-300">
                                            <Star className="h-4 w-4 fill-purple-600 text-purple-600" />
                                            Redeem Points
                                        </Label>
                                        <span className="rounded-full border border-purple-100 bg-white px-2 py-0.5 text-[10px] font-bold text-purple-600 shadow-sm">
                                            Available: {customerPoints.toLocaleString()} (₱{customerPoints.toFixed(2)})
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            id="manualPoints"
                                            ref={pointsInputRef}
                                            type="text"
                                            inputMode="decimal"
                                            value={pointsToRedeemInput}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setPointsToRedeemInput(val);
                                                }
                                            }}
                                            placeholder="0"
                                            className="h-12 flex-1 border-purple-300 bg-white pl-4 text-xl font-bold focus-visible:ring-purple-500"
                                        />
                                        <Button
                                            variant="secondary"
                                            className="h-12 bg-purple-600 px-6 font-bold text-white shadow-md shadow-purple-100 transition-all hover:bg-purple-700 active:scale-95"
                                            onClick={() => {
                                                const maxPossibleValue = Math.min(totalDue, customerPoints);
                                                setPointsToRedeemInput(maxPossibleValue.toFixed(2));
                                            }}
                                        >
                                            Redeem All
                                        </Button>
                                    </div>
                                    <p className="flex items-center gap-1 px-1 text-[10px] font-bold text-purple-600">
                                        <Info className="h-3 w-3" />
                                        1 Point = ₱1.00 (Strict 1:1)
                                    </p>
                                </div>
                            )}

                            {/* Charge to Account */}
                            {isChargePayment && (
                                (!customer || (customer as any).id === 'walk-in') ? (
                                    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="rounded-full bg-white p-3 text-orange-600 shadow-sm">
                                            <User className="h-6 w-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-orange-900">Charge to Account requires a Customer</p>
                                            <p className="text-sm text-orange-600/70">Please select a customer to proceed with charging.</p>
                                        </div>
                                        <Button
                                            onClick={onTriggerCustomerSelection}
                                            className="bg-orange-600 px-8 font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-700"
                                        >
                                            Select Customer
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label className="flex items-center gap-2 px-1 text-base font-bold text-orange-900">
                                            <Info className="h-4 w-4 text-orange-600" />
                                            Account Details
                                        </Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="rounded-lg border border-orange-100 bg-white p-3 shadow-sm">
                                                <p className="text-[10px] font-bold uppercase text-orange-600">Credit Limit</p>
                                                <p className="text-lg font-black text-orange-900">₱{(customer as any).creditLimit?.toLocaleString() || '0.00'}</p>
                                            </div>
                                            <div className="rounded-lg border border-orange-100 bg-white p-3 shadow-sm">
                                                <p className="text-[10px] font-bold uppercase text-orange-600">Current Balance</p>
                                                <p className="text-lg font-black text-orange-900">₱{(customer as any).balance?.toLocaleString() || '0.00'}</p>
                                            </div>
                                        </div>
                                        <p className="flex items-center gap-1 px-1 text-[10px] font-bold text-orange-600">
                                            <Info className="h-3 w-3" />
                                            This transaction will be added to the customer's account balance.
                                        </p>
                                    </div>
                                )
                            )}

                            {/* Added Payments List */}
                            {payments.length > 0 && (
                                <div className="space-y-3 border-t border-dashed pt-4">
                                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Added Payments</Label>
                                    <div className="space-y-2">
                                        {payments.map(p => (
                                            <div key={p.id} className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 shadow-sm animate-in fade-in slide-in-from-top-1">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{p.method}</span>
                                                    {p.reference && <span className="text-xs text-muted-foreground">Ref: {p.reference}</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black">₱{p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => setPayments(payments.filter(x => x.id !== p.id))} className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-700">
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Split Payment */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddPayment}
                                disabled={amountTenderedNum <= 0 && !isChargePayment}
                                className="w-full border-dashed font-bold"
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                Add Split Payment
                            </Button>
                        </div>

                        {/* Sticky Footer */}
                        <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-3 border-t bg-background px-6 py-4">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isProcessing || (selectedMethod === 'POINTS' && (customer as any)?.isExpired)}
                                className="h-12 text-muted-foreground hover:text-foreground"
                                ref={cancelButtonRef}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmPayment}
                                ref={confirmButtonRef}
                                disabled={confirmDisabled}
                                className="h-12 text-lg font-bold shadow-md shadow-primary/20"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Confirm Payment'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
                {/* Hidden Receipt for Printing - using absolute positioning instead of display:none to ensure it renders for print */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    {completedSale && <ReceiptView ref={receiptRef} saleDetails={completedSale} settings={settings} />}
                </div>
            </SheetContent>
        </Sheet>
    );
};
