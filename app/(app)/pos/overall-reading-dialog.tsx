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
import { Printer, Loader2, RefreshCw, Files } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OverallReadingPreview, OverallReadingData } from '../sales/overall-reading/overall-reading-preview';
import { getApiUrl } from '@/lib/api-config';
import { usePrinter } from '@/lib/use-printer';
import { OverallReadingGenerator } from '@/lib/overall-reading-generator';

interface OverallReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  terminalId: string;
  terminalName?: string;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
}

export function OverallReadingDialog({
  isOpen,
  onOpenChange,
  terminalId,
  terminalName,
  printMode
}: OverallReadingDialogProps) {
  const [reportData, setReportData] = useState<OverallReadingData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);

  useEffect(() => {
    if (isOpen) {
        loadReportData();
    } else {
        setReportData(null);
    }
  }, [isOpen, terminalId]);

  const loadReportData = async () => {
      if (!terminalId) return;
      setLoading(true);
      try {
          const response = await fetch(getApiUrl(`/sales/overall-reading?terminalId=${terminalId}`));
          if (!response.ok) throw new Error(`API error ${response.status}`);
          const result = await response.json();

          if (result.success) {
              setReportData({
                  ...result.data,
                  terminalName: result.data.terminalName || terminalName || terminalId,
              });
          } else {
              toast({ title: "Error", description: result.error || "Failed to load report data", variant: "destructive" });
          }
      } catch (error) {
          console.error("Error loading overall reading:", error);
          toast({ title: "Error", description: "Failed to connect to server", variant: "destructive" });
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
                  <OverallReadingPreview
                      data={reportData}
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
          const generator = new OverallReadingGenerator();
          const bytes = generator.generate(reportData);
          await print(bytes);
          toast({ title: "Success", description: "Overall Reading report sent to printer." });
      } catch (error) {
          console.error("Print error:", error);
          toast({ title: "Print Failed", description: "Failed to send data to printer.", variant: "destructive" });
      }
  };

  return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
            <SheetTitle className="sr-only">Overall Terminal Reading</SheetTitle>
            <SheetDescription className="sr-only">Cumulative terminal sales reading since the last Z-reading.</SheetDescription>

            {/* Header */}
            <SheetHeader className="shrink-0 space-y-0 border-b bg-muted/20 px-6 py-4 pr-12 text-left">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Files className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold leading-none">Overall Reading</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{terminalName || 'All terminals'}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={loadReportData} disabled={loading} className="h-8 w-8" title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </SheetHeader>

            {/* Preview */}
            <div className="flex flex-1 justify-center overflow-auto bg-muted/30 p-4">
                {loading ? (
                    <div className="flex flex-col items-center gap-2 p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Generating overall reading…</p>
                    </div>
                ) : reportData ? (
                    <div className="h-fit w-full max-w-[400px] bg-white shadow-lg">
                        <OverallReadingPreview
                            data={reportData}
                            printerFormat="80mm"
                        />
                    </div>
                ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        <p>No data available for this terminal since last Z-reading.</p>
                        <Button onClick={loadReportData} variant="outline" size="sm" className="mt-4">Retry</Button>
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
        </SheetContent>
      </Sheet>
  );
}
