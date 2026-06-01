
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
import { Printer, ArrowLeft, Loader2, FileCheck2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from './admin-auth-dialog';
import { ZReadingPreview, BusinessSettings } from '../sales/z-reading/z-reading-preview';
import { ZReadingData } from '@/lib/types';
import { usePrinter } from '@/lib/use-printer';
import { ZReadingGenerator } from '@/lib/z-reading-generator';
import { getApiUrl } from '@/lib/api-config';

import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

function ReportHeader({ subtitle }: { subtitle?: string }) {
    return (
        <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold leading-none">Z-Reading Report</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{subtitle || 'End-of-day sales report'}</p>
                </div>
            </div>
        </SheetHeader>
    );
}

function ZReadingReportView({ onBack, printMode, terminalId, terminalName, initialData }: { onBack: () => void, printMode: 'browser' | 'escpos' | 'usb' | 'native', terminalId?: string, terminalName?: string, initialData?: ZReadingData | null }): JSX.Element {
    const [data, setData] = useState<ZReadingData | null>(initialData || null);
    const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
    const [isLoading, setIsLoading] = useState(!initialData);
    const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
    const { toast } = useToast();
    const contentRef = useRef<HTMLDivElement>(null);

    const paperSize = businessSettings?.paperSize || '58mm';

    const handleReactToPrint = useReactToPrint({
        contentRef: contentRef,
        content: () => contentRef.current,
        documentTitle: 'Z-Reading-Report',
        pageStyle: `
            @page {
                size: ${paperSize} auto;
                margin: 0;
            }
            @media print {
                body {
                    visibility: visible !important;
                    -webkit-print-color-adjust: exact;
                    margin: 0;
                    padding: 0;
                }
                * {
                    visibility: visible !important;
                }
                .printable-area {
                    box-shadow: none !important;
                    margin: 0 !important;
                    width: ${paperSize} !important;
                    min-width: ${paperSize} !important;
                    max-width: ${paperSize} !important;
                }
            }
        `,
        onAfterPrint: () => console.log('Print finished'),
        onPrintError: (error: unknown) => console.error('Print error:', error),
    } as any);

    useEffect(() => {
        const fetchData = async () => {
            if (initialData) {
                // Settings might still be needed for business branding/paper size
                 try {
                    const settingsRes = await fetch(getApiUrl('/pos-settings'));
                    if (!settingsRes.ok) throw new Error(`API error ${settingsRes.status}`);
                    const settingsResult = await settingsRes.json();
                    if (settingsResult.success) {
                        setBusinessSettings(settingsResult.data);
                    }
                } catch (e) { console.error(e); }
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const settingsRes = await fetch(getApiUrl('/pos-settings'));
                if (!settingsRes.ok) throw new Error(`API error ${settingsRes.status}`);
                const settingsResult = await settingsRes.json();
                if (settingsResult.success) {
                    setBusinessSettings(settingsResult.data);
                }

                const response = await fetch(getApiUrl(`/sales/z-reading?mode=current&terminalId=${terminalId || 'all'}`));
                if (!response.ok) throw new Error(`API error ${response.status}`);
                const result = await response.json();

                if (result.success && result.data.length > 0) {
                    setData({
                        ...result.data[0],
                        reportDate: new Date(result.data[0].reportDate),
                        terminalName: terminalName
                    });
                }
            } catch (error) {
                console.error("Error loading Z-Reading:", error);
                toast({
                    title: "Error",
                    description: "Failed to load Z-Reading data.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [toast, initialData, terminalId, terminalName]);

    const handlePrintAndFinalize = async () => {
        if (!data) return;

        try {
            // 1. Print the report
            if (printMode === 'browser') {
                if (handleReactToPrint) {
                    handleReactToPrint();
                } else {
                    console.error("Print handle not ready or failed to initialize");
                    throw new Error("Print engine not ready");
                }
            } else {
                if (!isConnected) {
                    const success = await connect();
                    if (!success) throw new Error("Could not connect to printer");
                }
                const generator = new ZReadingGenerator();
                const bytes = generator.generate({ ...data, terminalName } as any, businessSettings);
                await print(bytes);
            }

            // 2. SAVE to database (The actual Finalization)
            // We only save if it's a NEW Z-reading (PREVIEW mode)
            if (data.id === 'PREVIEW') {
                setIsLoading(true);
                const saveResponse = await fetch(getApiUrl('/sales/z-reading'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...data,
                        terminalId: terminalId || 'all',
                        cashierName: data.cashierName || 'Admin'
                    })
                });

                const saveResult = await saveResponse.json();
                if (!saveResult.success) {
                    throw new Error(saveResult.error || "Failed to save Z-Reading to database");
                }

                toast({
                    title: "Z-Reading Finalized",
                    description: `Report ${saveResult.data[0].id} has been saved successfully.`,
                });

                // Close dialog after successful finalization
                setTimeout(() => onBack(), 1500);
            } else {
                toast({
                    title: "Report Printed",
                    description: "Historical Z-Reading report printed.",
                });
            }

        } catch (error: any) {
            console.error("Z-Reading Error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to finalize Z-Reading.",
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <>
                <ReportHeader subtitle={terminalName} />
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Generating Z-Reading Report…</p>
                </div>
            </>
        );
    }

    if (!data) {
        return (
            <>
                <ReportHeader subtitle={terminalName} />
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                    <p className="text-muted-foreground">No pending sales found for Z-Reading. All transactions might have been finalized already.</p>
                    <Button variant="outline" onClick={onBack} className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </div>
            </>
        );
    }

    return (
        <>
            <ReportHeader subtitle={terminalName} />

            <div className="flex flex-1 justify-center overflow-auto bg-muted/30 p-4">
                <div className="h-fit w-full max-w-[400px] bg-white shadow-lg">
                    <ZReadingPreview
                        ref={contentRef}
                        data={data}
                        businessSettings={businessSettings}
                        printerFormat={paperSize as any}
                    />
                </div>
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
                <div className="grid grid-cols-[1fr_2fr] gap-3">
                    <Button variant="outline" className="h-12" onClick={onBack}>Close</Button>
                    <Button className="h-12 text-base font-bold" onClick={handlePrintAndFinalize} disabled={isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-5 w-5" />}
                        Print Z-Reading
                    </Button>
                </div>
            </div>
        </>
    );
}

interface ZReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
  autoShow?: boolean;
  terminalId?: string;
  terminalName?: string;
  initialData?: ZReadingData | null;
}

export function ZReadingDialog({
  isOpen,
  onOpenChange,
  printMode,
  autoShow = false,
  terminalId,
  terminalName,
  initialData = null
}: ZReadingDialogProps) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const authSucceededRef = useRef(false);

  useEffect(() => {
    if (isOpen && (autoShow || initialData)) {
        authSucceededRef.current = true;
        setShowReport(true);
    } else if (isOpen) {
        authSucceededRef.current = false;
        setIsAuthDialogOpen(true);
    } else {
        authSucceededRef.current = false;
        setIsAuthDialogOpen(false);
        setShowReport(false);
    }
  }, [isOpen, autoShow, initialData]);

  const handleAdminAuthSuccess = () => {
    authSucceededRef.current = true;
    setIsAuthDialogOpen(false);
    setShowReport(true);
  };

  return (
    <>
      <Sheet open={isOpen && showReport} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
            <SheetTitle className="sr-only">Z-Reading Report</SheetTitle>
            <SheetDescription className="sr-only">End-of-day sales reading report.</SheetDescription>

            {showReport && (
                <ZReadingReportView onBack={() => onOpenChange(false)} printMode={printMode} terminalId={terminalId} terminalName={terminalName} initialData={initialData} />
            )}
        </SheetContent>
      </Sheet>

      <AdminAuthDialog
          isOpen={isAuthDialogOpen}
          onOpenChange={(open) => {
              setIsAuthDialogOpen(open);
              // If auth dialog closed without success → close the whole flow
              if (!open && !authSucceededRef.current) onOpenChange(false);
          }}
          onSuccess={handleAdminAuthSuccess}
      />
    </>
  );
}
