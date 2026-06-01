
import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from './admin-auth-dialog';
import { XReadingPreview } from '../sales/x-reading/x-reading-preview';
import { BusinessSettings } from '../sales/z-reading/z-reading-preview';
import { XReadingData } from '@/lib/types';
import { usePrinter } from '@/lib/use-printer';
import { XReadingGenerator } from '@/lib/x-reading-generator';
import { getApiUrl } from '@/lib/api-config';

interface XReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId?: string;
  autoShow?: boolean;
  terminalName?: string;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
}

export function XReadingDialog({
  isOpen,
  onOpenChange,
  shiftId,
  autoShow = false,
  terminalName,
  printMode
}: XReadingDialogProps) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<XReadingData | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
  const { toast } = useToast();
  const authSucceededRef = useRef(false);

  useEffect(() => {
    if (isOpen && autoShow) {
        authSucceededRef.current = true;
        setShowReport(true);
        loadReportData();
    } else if (isOpen) {
        authSucceededRef.current = false;
        setIsAuthDialogOpen(true);
        setShowReport(false);
    } else {
        authSucceededRef.current = false;
        setIsAuthDialogOpen(false);
        setShowReport(false);
        setReportData(null);
    }
  }, [isOpen, autoShow]);

  useEffect(() => {
      if (isOpen) {
          fetch(getApiUrl('/pos-settings'))
              .then(res => res.json())
              .then(data => {
                  if (data.success) {
                      setBusinessSettings(data.data);
                  }
              })
              .catch(err => console.error("Failed to load settings", err));
      }
  }, [isOpen]);

  const loadReportData = async () => {
      setLoading(true);
      try {
          let url = '/sales/x-reading?limit=1';
          if (shiftId) {
             url = `/sales/x-reading?limit=1&shiftId=${shiftId}`;
          } else {
             url = '/sales/x-reading?shiftStatus=active&limit=1';
          }

          const response = await fetch(getApiUrl(url));
          if (!response.ok) throw new Error(`API error ${response.status}`);
          const result = await response.json();

          if (result.success && result.data.length > 0) {
              setReportData(result.data[0]);
          }
      } catch (error) {
          console.error("Error loading X-reading:", error);
          toast({ title: "Error", description: "Failed to load report data", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  const handlePrint = async () => {
      if (!reportData) return;

      if (printMode === 'browser') {
          try {
              const { printReactComponent } = await import('@/app/lib/print-utils');
              printReactComponent(
                  <XReadingPreview
                      data={{ ...reportData, terminalName }}
                      businessSettings={businessSettings || {} as BusinessSettings}
                      printerFormat="80mm"
                  />,
                  '80mm'
              );
              return;
          } catch (e) {
              console.error('Browser print error:', e);
              window.print();
              return;
          }
      }

      if (!isConnected) {
          const success = await connect();
          if (!success) return;
      }

      try {
          const generator = new XReadingGenerator();

          // Merge business details into report data for the generator
          const printData = {
              ...reportData,
              businessName: businessSettings?.businessName,
              operatedBy: businessSettings?.operatedBy,
              address: businessSettings?.address,
              tin: businessSettings?.tin,
              contactNumber: businessSettings?.contactNumber,
              email: businessSettings?.email,
              terminalName: terminalName,
              min: reportData?.min,
              sn: reportData?.sn
          };

          const bytes = generator.generate(printData as any);
          await print(bytes);
          toast({ title: "Success", description: "X-Reading report sent to printer." });
      } catch (error) {
          console.error("Print error:", error);
          toast({ title: "Print Failed", description: "Failed to send data to printer.", variant: "destructive" });
      }
  };

  const handleAdminAuthSuccess = () => {
    authSucceededRef.current = true;
    setIsAuthDialogOpen(false);
    setShowReport(true);
    loadReportData();
  };

  return (
    <>
      <Sheet open={isOpen && showReport} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
            <SheetTitle className="sr-only">X-Reading Report</SheetTitle>
            <SheetDescription className="sr-only">Mid-shift sales reading report.</SheetDescription>

            {showReport && (
                <>
                    {/* Header */}
                    <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold leading-none">X-Reading Report</h2>
                                <p className="mt-1 text-xs text-muted-foreground">{terminalName || 'Mid-shift sales reading'}</p>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Preview */}
                    <div className="flex flex-1 justify-center overflow-auto bg-muted/30 p-4">
                        {loading ? (
                            <div className="flex flex-col items-center gap-2 p-8 text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Loading report…</p>
                            </div>
                        ) : reportData ? (
                            <div className="h-fit w-full max-w-[400px] bg-white shadow-lg">
                                <XReadingPreview
                                    data={{ ...reportData, terminalName }}
                                    businessSettings={businessSettings}
                                />
                            </div>
                        ) : (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                <p>No data available.</p>
                                <Button onClick={loadReportData} variant="outline" size="sm" className="mt-2">Retry</Button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 border-t bg-background px-6 py-4">
                        <div className="grid grid-cols-[1fr_2fr] gap-3">
                            <Button variant="outline" className="h-12" onClick={() => onOpenChange(false)}>Close</Button>
                            <Button className="h-12 text-base font-bold" onClick={handlePrint} disabled={loading || isPrinting || !reportData}>
                                {isPrinting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-5 w-5" />}
                                Print
                            </Button>
                        </div>
                    </div>
                </>
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
