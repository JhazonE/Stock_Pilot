'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Sale, Customer } from '@/lib/types';
import { format, isPast } from 'date-fns';
import RecordPaymentDialog from './record-payment-dialog';
import ViewInvoiceDialog from './view-invoice-dialog';
import ViewPaymentDialog from './view-payment-dialog';
import { AddPaymentDialog } from './add-payment-dialog';
import { printPaymentReceipt } from '@/lib/print-payment-receipt';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, AlertCircle, FileText, Search, MoreHorizontal, Printer, FileDown, Banknote, Eye, Check, ChevronsUpDown, ArrowUpRight, ArrowDownRight, Scale, Receipt, FileSpreadsheet, Loader2, Filter, X } from 'lucide-react';


import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { DateRange } from "react-day-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

// --- Shared Types & Helpers ---



// --- Outstanding Invoices Component ---
function OutstandingInvoices() {
    // ... [Logic from previous implementation]
    const [searchCustomer, setSearchCustomer] = useState<string>('');
    const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
    const [invoices, setInvoices] = useState<Sale[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 0
    });
    const { toast } = useToast();

    const fetchOutstandingInvoices = async () => {
        try {
            setIsLoadingInvoices(true);
            const params = new URLSearchParams();
            if (searchCustomer) params.append('search', searchCustomer);
            if (dateRange.from) params.append('from', dateRange.from.toISOString());
            if (dateRange.to) params.append('to', dateRange.to.toISOString());
            params.append('page', pagination.currentPage.toString());
            params.append('limit', pagination.pageSize.toString());

            const response = await fetch(getApiUrl(`/customers/invoices/outstanding?${params.toString()}`));
            if (!response.ok) throw new Error(`API error ${response.status}`);
            const result = await response.json();
            if (result.success) {
                setInvoices(result.data);
                if (result.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        totalPages: result.pagination.totalPages,
                        totalItems: result.pagination.totalItems || result.pagination.total // Backend uses total
                    }));
                }
            }
            else throw new Error(result.error);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch outstanding invoices' });
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchOutstandingInvoices, 500);
        return () => clearTimeout(timer);
    }, [searchCustomer, dateRange, pagination.currentPage, pagination.pageSize]);

    const analytics = useMemo(() => {
        let totalOutstanding = 0;
        let overdueAmount = 0;
        let overdueCount = 0;
        invoices.forEach(inv => {
            const amount = Number(inv.total);
            totalOutstanding += amount;
            const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
            if (isPast(dueDate) && inv.status !== 'Paid') {
                overdueAmount += amount;
                overdueCount += 1;
            }
        });
        return { totalOutstanding, overdueAmount, overdueCount, totalCount: invoices.length };
    }, [invoices]);

    function getStatusInfo(sale: Sale) {
        if ((sale.status as string) === 'Paid') return { text: 'Paid', variant: 'default' as const };
        const dueDate = sale.dueDate ? new Date(sale.dueDate) : new Date();
        if (isPast(dueDate) && (sale.status as string) !== 'Paid') return { text: 'Overdue', variant: 'destructive' as const };
        return { text: sale.status , variant: 'secondary' as const };
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.totalOutstanding)}</div>
                        <p className="text-xs text-muted-foreground">Across {analytics.totalCount} invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{formatCurrency(analytics.overdueAmount)}</div>
                        <p className="text-xs text-muted-foreground">{analytics.overdueCount} overdue invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalCount}</div>
                        <p className="text-xs text-muted-foreground">Require payment</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Outstanding Invoices</CardTitle>
                    <div className="pt-4 flex flex-col sm:flex-row gap-4">
                        <Input placeholder="Search customer..." value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)} className="max-w-sm" />
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[240px] pl-3 text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                                    {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}` : format(dateRange.from, "PPP")) : <span>Pick a date range</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="range" selected={dateRange} onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice Reference</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingInvoices ? Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            )) : invoices.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No invoices found.</TableCell></TableRow>
                            ) : invoices.map((invoice) => {
                                const status = getStatusInfo(invoice);
                                return (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-mono">{invoice.reference || invoice.id}</TableCell>
                                        <TableCell>{invoice.customer.name}</TableCell>
                                        <TableCell>{format(new Date(invoice.invoiceDate || invoice.date || new Date()), 'PP')}</TableCell>
                                        <TableCell>{invoice.dueDate ? format(new Date(invoice.dueDate), 'PP') : 'N/A'}</TableCell>
                                        <TableCell><Badge variant={status.variant}>{status.text}</Badge></TableCell>
                                        <TableCell className="text-right">{formatCurrency(Number(invoice.total))}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <RecordPaymentDialog sale={invoice}>
                                                    <Button variant="ghost" size="icon" title="Record Payment">
                                                        <Banknote className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                </RecordPaymentDialog>
                                                <ViewInvoiceDialog invoiceId={invoice.id}>
                                                    <Button variant="ghost" size="icon" title="View Details">
                                                        <Eye className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                </ViewInvoiceDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <div className="py-4">
                        <DataTablePagination 
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            pageSize={pagination.pageSize}
                            totalItems={pagination.totalItems}
                            setPage={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
                            setPageSize={(size) => setPagination(prev => ({ ...prev, pageSize: size, currentPage: 1 }))}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Payment History Component ---
function PaymentHistory() {
     const [payments, setPayments] = useState<any[]>([]);
     const [isLoading, setIsLoading] = useState(true);
     const [search, setSearch] = useState('');
     const [date, setDate] = useState<DateRange | undefined>(undefined);
     const [paymentType, setPaymentType] = useState('All');
     const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 0
     });
     const { toast } = useToast();
     const [isExporting, setIsExporting] = useState(false);
     const [paymentMethods, setPaymentMethods] = useState<any[]>([]);



     const fetchPayments = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (date?.from) params.append('from', date.from.toISOString());
            if (date?.to) params.append('to', date.to.toISOString());
            if (paymentType && paymentType !== 'All') params.append('paymentType', paymentType);
            params.append('page', pagination.currentPage.toString());
            params.append('limit', pagination.pageSize.toString());

            const response = await fetch(getApiUrl(`/customers/payments?${params.toString()}`));
            if (!response.ok) throw new Error(`API error ${response.status}`);
            const result = await response.json();
            if (result.success) {
                setPayments(result.data);
                if (result.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        totalPages: result.pagination.totalPages,
                        totalItems: result.pagination.total
                    }));
                }
            }
            else throw new Error(result.error);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch payment history' });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const response = await fetch(getApiUrl('/payment-methods?activeOnly=true'));
            if (!response.ok) throw new Error(`API error ${response.status}`);
            const result = await response.json();
            if (result.success) {
                setPaymentMethods(result.data);
            }
        } catch (error) {
            console.error('Error fetching payment methods:', error);
        }
    };

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const fetchAllPaymentsForExport = async () => {

        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (date?.from) params.append('from', date.from.toISOString());
            if (date?.to) params.append('to', date.to.toISOString());
            if (paymentType && paymentType !== 'All') params.append('paymentType', paymentType);
            params.append('page', '1');
            params.append('limit', '1000000'); // Fetch all

            const response = await fetch(getApiUrl(`/customers/payments?${params.toString()}`));
            if (!response.ok) throw new Error(`API error ${response.status}`);
            const result = await response.json();
            if (result.success) return result.data;
            return [];
        } catch (error) {
            console.error('Error fetching payments for export:', error);
            return [];
        }
    };

    const exportToCSV = async () => {
        try {
            setIsExporting(true);
            const allPayments = await fetchAllPaymentsForExport();
            if (allPayments.length === 0) {
                toast({ variant: 'destructive', title: 'No Data', description: 'No payments found to export.' });
                return;
            }

            const headers = ['Reference', 'Customer', 'Date', 'Payment Type', 'Amount'];
            const rows = allPayments.map((p: any) => [
                p.reference,
                p.customerName,
                format(new Date(p.paymentDate), 'yyyy-MM-dd'),
                p.paymentType,
                p.amount.toString()
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `customer_payments_${format(new Date(), 'yyyy-MM-dd')}.csv`;
            link.click();
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = async () => {
        try {
            setIsExporting(true);
            const allPayments = await fetchAllPaymentsForExport();
            if (allPayments.length === 0) {
                toast({ variant: 'destructive', title: 'No Data', description: 'No payments found to export.' });
                return;
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            // Fetch Business Name
            let businessName = 'BUSINESS NAME';
            try {
                const settingsRes = await fetch(getApiUrl('/pos-settings'));
                if (!settingsRes.ok) throw new Error(`API error ${settingsRes.status}`);
                const settings = await settingsRes.json();
                if (settings.success && settings.data?.businessName) {
                    businessName = settings.data.businessName;
                }
            } catch (e) {}

            const startDate = date?.from ? format(date.from, 'PP') : 'All Time';
            const endDate = date?.to ? format(date.to, 'PP') : 'All Time';
            const period = date?.from ? `${startDate} - ${endDate}` : 'All Time';

            const content = `
                <html>
                <head>
                    <title>Customer Payment History</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; font-size: 12px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .business-name { font-size: 18px; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .text-right { text-align: right; }
                        .footer { margin-top: 20px; font-size: 10px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="business-name">${businessName}</div>
                        <div>Customer Payment History Report</div>
                        <div>Period: ${period}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Payment Type</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allPayments.map((p: any) => `
                                <tr>
                                    <td>${p.reference}</td>
                                    <td>${p.customerName}</td>
                                    <td>${format(new Date(p.paymentDate), 'MMM dd, yyyy')}</td>
                                    <td>${p.paymentType}</td>
                                    <td class="text-right">${formatCurrency(Number(p.amount))}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="4" class="text-right">Total</th>
                                <th class="text-right">${formatCurrency(allPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0))}</th>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer">Generated on ${format(new Date(), 'PPpp')}</div>
                </body>
                </html>
            `;

            printWindow.document.write(content);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);

        } finally {
            setIsExporting(false);
        }
    };


    useEffect(() => {
        const timer = setTimeout(fetchPayments, 500);
        return () => clearTimeout(timer);
    }, [search, date, paymentType, pagination.currentPage, pagination.pageSize]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm mb-4">
                <div className="flex flex-1 items-center gap-2 w-full">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search payments..." className="pl-8 text-sm h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="relative h-9">
                                <Filter className="mr-2 h-4 w-4" />
                                Filter
                                {((date?.from || date?.to) || (paymentType !== 'All')) && (
                                    <Badge 
                                        variant="default" 
                                        className="ml-2 h-4 min-w-4 rounded-full p-0 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px]"
                                    >
                                        {(date?.from || date?.to ? 1 : 0) + (paymentType !== 'All' ? 1 : 0)}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2 mb-2">
                                    <h4 className="font-semibold text-sm">Filters</h4>
                                    {((date?.from || date?.to) || (paymentType !== 'All')) && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => {
                                                setDate(undefined);
                                                setPaymentType('All');
                                            }}
                                            className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <X className="mr-1 h-3 w-3" />
                                            Clear all
                                        </Button>
                                    )}
                                </div>
                                <div className="grid gap-4">
                                    <div className="grid gap-1.5">
                                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date Range</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                id="date"
                                                variant={"outline"}
                                                size="sm"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal h-9",
                                                    !date && "text-muted-foreground"
                                                )}
                                                >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date?.from ? (
                                                    date.to ? (
                                                    <>
                                                        {format(date.from, "LLL dd, y")} -{" "}
                                                        {format(date.to, "LLL dd, y")}
                                                    </>
                                                    ) : (
                                                    format(date.from, "LLL dd, y")
                                                    )
                                                ) : (
                                                    <span>Pick a date range</span>
                                                )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={date?.from}
                                                selected={date}
                                                onSelect={setDate}
                                                numberOfMonths={2}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="grid gap-1.5">
                                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Payment Type</label>
                                        <Select value={paymentType} onValueChange={setPaymentType}>
                                            <SelectTrigger className="w-full h-9"><SelectValue placeholder="All" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="All">All Payments</SelectItem>
                                                {paymentMethods.map(method => (
                                                    <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex gap-2 sm:ml-auto">
                    <AddPaymentDialog onSuccess={fetchPayments} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9" disabled={isExporting}>
                                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4"/>}
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={exportToCSV}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Export to CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToPDF}>
                                <FileText className="mr-2 h-4 w-4" />
                                Export to PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

             <Card>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold">Reference</TableHead>
                                    <TableHead className="font-semibold">Customer</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="font-semibold">Payment Type</TableHead>
                                    <TableHead className="text-right font-semibold">Amount Paid</TableHead>
                                    <TableHead className="text-right font-semibold">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? Array.from({length: 5}).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>) :
                                payments.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No payments found.</TableCell></TableRow> :
                                payments.map((payment) => (
                                    <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-mono text-xs">{payment.reference}</TableCell>
                                        <TableCell className="font-medium">{payment.customerName}</TableCell>
                                        <TableCell className="text-muted-foreground">{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {payment.paymentType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green-600">{formatCurrency(Number(payment.amount))}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => printPaymentReceipt({
                                                        id: payment.id,
                                                        customerName: payment.customerName,
                                                        date: payment.paymentDate,
                                                        amount: Number(payment.amount),
                                                        paymentMethod: payment.paymentType,
                                                        reference: payment.reference,
                                                    })}
                                                    title="Print Receipt"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <ViewPaymentDialog payment={payment} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="py-4">
                        <DataTablePagination 
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            pageSize={pagination.pageSize}
                            totalItems={pagination.totalItems}
                            setPage={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
                            setPageSize={(size) => setPagination(prev => ({ ...prev, pageSize: size, currentPage: 1 }))}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Statement of Account Component ---
function StatementOfAccount() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: undefined, to: undefined });
    const [soaData, setSoaData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [openCustomer, setOpenCustomer] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetch(getApiUrl('/customers')).then(res => res.json()).then(res => {
            if(res.success) setCustomers(res.data);
        });
    }, []);

    const generateSOA = async () => {
        if (!selectedCustomer || !dateRange?.from || !dateRange?.to) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please select a customer and date range.' });
            return;
        }
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                customerId: selectedCustomer,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
            });
            const res = await fetch(getApiUrl(`/reports/soa?${params.toString()}`));
            if (!res.ok) throw new Error(`API error ${res.status}`);
            const data = await res.json();
            if (data.success) setSoaData(data.data);
            else throw new Error(data.error);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate SOA' });
        } finally {
            setIsLoading(false);
        }
    }

    const summary = useMemo(() => {
        if (!soaData) return null;
        const totalDebit = soaData.transactions.reduce((sum: number, t: any) => sum + Number(t.debit || 0), 0);
        const totalCredit = soaData.transactions.reduce((sum: number, t: any) => sum + Number(t.credit || 0), 0);
        const netChange = totalDebit - totalCredit;
        return { totalDebit, totalCredit, netChange };
    }, [soaData]);

    const groupedTransactions = useMemo<{ groups: any[], unallocated: any[] }>(() => {
        if (!soaData?.transactions) return { groups: [], unallocated: [] };
        
        const groups: any[] = [];
        const invoiceMap = new Map<string, any>();
        const unallocated: any[] = [];

        soaData.transactions.forEach((t: any) => {
            if (t.type === 'Invoice' || t.type === 'Sales') {
                const group = { ...t, payments: [] };
                groups.push(group);
                invoiceMap.set(t.id, group);
            } else if (t.type === 'Payment') {
                if (t.allocatedInvoiceId && invoiceMap.has(t.allocatedInvoiceId)) {
                    invoiceMap.get(t.allocatedInvoiceId).payments.push(t);
                } else {
                    unallocated.push(t);
                }
            } else {
                groups.push(t);
            }
        });

        return { groups, unallocated };
    }, [soaData]);

    const handlePrint = () => {
        if (!soaData) return;
        
        const customer = customers.find(c => c.id === selectedCustomer);
        const printWindow = window.open('', '', 'height=800,width=800');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Statement of Account</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @page { size: auto; margin: 20mm; }
            body { font-family: "Inter", -apple-system, sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; }
            .company-info h1 { margin: 0; color: #111; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .company-info p { margin: 4px 0; color: #666; font-size: 13px; }
            .statement-title { text-align: right; }
            .statement-title h2 { margin: 0; color: #000; font-size: 20px; }
            .statement-title p { margin: 4px 0; color: #666; font-size: 12px; }
            
            .client-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info-box h3 { margin: 0 0 8px 0; font-size: 12px; color: #888; text-transform: uppercase; }
            .info-box p { margin: 2px 0; font-size: 14px; font-weight: 500; }
            
            .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background: #f9fafb; }
            .summary-table td { padding: 12px; border: 1px solid #e5e7eb; font-size: 13px; }
            .summary-label { color: #666; }
            .summary-value { text-align: right; font-weight: 600; }
            
            table.main-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            table.main-table th { background-color: #f3f4f6; color: #374151; font-weight: 600; font-size: 12px; text-transform: uppercase; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
            table.main-table td { padding: 10px; border: 1px solid #e5e7eb; font-size: 12px; }
            .text-right { text-align: right; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            
            .footer { margin-top: 50px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 8px; font-size: 11px; }
            .generation-info { text-align: center; color: #999; font-size: 10px; margin-top: 40px; }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(`
            <div class="container">
                <div class="header">
                    <div class="company-info">
                        <h1>Stockpilot</h1>
                        <p>Business Solutions & Inventory Management</p>
                        <p>123 Business Avenue, Suite 100</p>
                        <p>Contact: +63 912 345 6789 | email@stockpilot.com</p>
                    </div>
                    <div class="statement-title">
                        <h2>STATEMENT OF ACCOUNT</h2>
                        <p>Period: ${format(new Date(soaData.period.from), 'PP')} - ${format(new Date(soaData.period.to), 'PP')}</p>
                    </div>
                </div>

                <div class="client-info">
                    <div class="info-box">
                        <h3>BILL TO</h3>
                        <p>${customer?.name || 'Valued Customer'}</p>
                        <p>${customer?.address || 'N/A'}</p>
                        <p>TIN: ${customer?.tin || 'N/A'}</p>
                    </div>
                    <div class="info-box" style="text-align: right;">
                        <h3>DETAILS</h3>
                        <p>Date Generated: ${format(new Date(), 'PPP')}</p>
                        <p>Currency: PHP</p>
                    </div>
                </div>

                <table class="summary-table">
                    <tr>
                        <td class="summary-label">Opening Balance</td>
                        <td class="summary-value">${formatCurrency(Number(soaData.startingBalance))}</td>
                        <td class="summary-label">Total Charges</td>
                        <td class="summary-value">${formatCurrency(summary?.totalDebit || 0)}</td>
                    </tr>
                    <tr>
                        <td class="summary-label">Total Payments</td>
                        <td class="summary-value">${formatCurrency(summary?.totalCredit || 0)}</td>
                        <td class="summary-label" style="background:#edf2f7">Ending Balance</td>
                        <td class="summary-value" style="background:#edf2f7; font-size: 16px;">${formatCurrency(Number(soaData.endingBalance))}</td>
                    </tr>
                </table>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Reference</th>
                            <th class="text-right">Debit</th>
                            <th class="text-right">Credit</th>
                            <th class="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5" style="background: #fdfdfd">Beginning Balance</td>
                            <td class="text-right" style="background: #fdfdfd; font-weight: 600;">${formatCurrency(Number(soaData.startingBalance))}</td>
                        </tr>
                        ${groupedTransactions.groups.map((group: any) => `
                            <tr style="background: #f9fafb;">
                                <td>${format(new Date(group.date), 'MMM dd, yyyy')}</td>
                                <td><strong>${group.type}</strong>${group.description ? ` - ${group.description}` : ''}</td>
                                <td class="font-mono">${group.reference || group.id.substring(0, 8)}</td>
                                <td class="text-right">${group.debit > 0 ? formatCurrency(Number(group.debit)) : '-'}</td>
                                <td class="text-right">-</td>
                                <td class="text-right" style="font-weight: 600;">${formatCurrency(Number(group.runningBalance))}</td>
                            </tr>
                            ${group.payments.map((p: any) => `
                                <tr>
                                    <td style="padding-left: 25px; color: #666;">${format(new Date(p.date), 'MMM dd, yyyy')}</td>
                                    <td style="padding-left: 25px; color: #666;">└─ Payment: ${p.type} ${p.invoice_ref ? `(Invoice #${p.invoice_ref})` : (p.note ? `(${p.note})` : '')}</td>
                                    <td class="font-mono" style="color: #666;">${p.reference || p.id.substring(0, 8)}</td>
                                    <td class="text-right">-</td>
                                    <td class="text-right" style="color: #059669;">${formatCurrency(Number(p.credit))}</td>
                                    <td class="text-right" style="color: #666;">${formatCurrency(Number(p.runningBalance))}</td>
                                </tr>
                            `).join('')}
                        `).join('')}
                        ${groupedTransactions.unallocated.length > 0 ? `
                            <tr><td colspan="6" style="background: #f3f4f6; font-size: 10px; font-weight: bold; text-transform: uppercase;">Unallocated Payments</td></tr>
                            ${groupedTransactions.unallocated.map((p: any) => `
                                <tr>
                                    <td>${format(new Date(p.date), 'MMM dd, yyyy')}</td>
                                    <td>${p.type} ${p.description ? ` - ${p.description}` : ''}</td>
                                    <td class="font-mono">${p.reference || p.id.substring(0, 8)}</td>
                                    <td class="text-right">-</td>
                                    <td class="text-right" style="color: #059669;">${formatCurrency(Number(p.credit))}</td>
                                    <td class="text-right">${formatCurrency(Number(p.runningBalance))}</td>
                                </tr>
                            `).join('')}
                        ` : ''}
                    </tbody>
                </table>

                <div class="footer">
                    <p style="font-size: 11px; color: #666; font-style: italic;">Note: Please review this statement and notify us of any discrepancies within 7 days.</p>
                    <div class="signatures">
                        <div class="sig-line">Prepared By</div>
                        <div class="sig-line">Approved By</div>
                        <div class="sig-line">Received By / Date</div>
                    </div>
                    <div class="generation-info">
                        System generated by Stockpilot on ${format(new Date(), 'PPpp')}
                    </div>
                </div>
            </div>
        `);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Generate Statement of Account</CardTitle>
                    <CardDescription>Select a customer and date range to view their statement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Customer</label>
                                <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCustomer}
                                            className="w-full justify-between"
                                        >
                                            {selectedCustomer
                                                ? customers.find((customer) => customer.id === selectedCustomer)?.name
                                                : "Select customer..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search customer..." />
                                            <CommandList>
                                                <CommandEmpty>No customer found.</CommandEmpty>
                                                <CommandGroup>
                                                    {customers.map((customer) => (
                                                        <CommandItem
                                                            key={customer.id}
                                                            value={customer.name}
                                                            onSelect={() => {
                                                                setSelectedCustomer(customer.id === selectedCustomer ? "" : customer.id);
                                                                setOpenCustomer(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedCustomer === customer.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {customer.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                 <label className="text-sm font-medium">Date Range</label>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                            ) : (
                                            <span>Pick a date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={generateSOA} disabled={isLoading} className="w-full md:w-auto">
                                {isLoading ? 'Generating...' : 'Generate Statement'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {soaData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 border-blue-100 dark:border-blue-900/20">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-9 h-9 flex items-center justify-center">
                                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₱</span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Beginning</p>
                                    <p className="text-lg font-bold">{formatCurrency(Number(soaData.startingBalance))}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/10 border-orange-100 dark:border-orange-900/20">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <ArrowUpRight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Total Charges</p>
                                    <p className="text-lg font-bold">{formatCurrency(summary?.totalDebit || 0)}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/10 border-green-100 dark:border-green-900/20">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <ArrowDownRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Total Payments</p>
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">-{formatCurrency(summary?.totalCredit || 0)}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-primary/5 to-white dark:from-primary/10 border-primary/20">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Scale className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Net Ending</p>
                                    <p className="text-lg font-bold text-primary">{formatCurrency(Number(soaData.endingBalance))}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <div>
                                <CardTitle className="text-xl">Statement Preview</CardTitle>
                                <CardDescription>Period: {format(new Date(soaData.period.from), 'PP')} - {format(new Date(soaData.period.to), 'PP')}</CardDescription>
                            </div>
                            <Button variant="outline" onClick={handlePrint} className="shadow-sm hover:bg-primary hover:text-white transition-all">
                                <Printer className="mr-2 h-4 w-4" /> Print SOA
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                                            <TableHead className="w-[120px] font-semibold py-4 pl-6">Date</TableHead>
                                            <TableHead className="font-semibold py-4">Description</TableHead>
                                            <TableHead className="w-[150px] font-semibold py-4">Reference</TableHead>
                                            <TableHead className="text-right font-semibold py-4">Debit</TableHead>
                                            <TableHead className="text-right font-semibold py-4">Credit</TableHead>
                                            <TableHead className="text-right font-semibold py-4 pr-6">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="bg-gray-50/30 hover:bg-gray-50/50">
                                            <TableCell className="pl-6 text-muted-foreground">-</TableCell>
                                            <TableCell className="font-medium">Beginning Balance</TableCell>
                                            <TableCell className="text-muted-foreground">-</TableCell>
                                            <TableCell className="text-right">-</TableCell>
                                            <TableCell className="text-right">-</TableCell>
                                            <TableCell className="text-right font-bold pr-6">{formatCurrency(Number(soaData.startingBalance))}</TableCell>
                                        </TableRow>
                                        {groupedTransactions.groups.map((group: any, i: number) => (
                                            <Fragment key={group.id}>
                                                <TableRow className="group hover:bg-muted/30 transition-colors bg-blue-50/20">
                                                    <TableCell className="pl-6 py-4 text-muted-foreground font-medium text-xs">
                                                        {format(new Date(group.date), 'MMM dd, yyy')}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                                                            <span className="font-semibold text-foreground">{group.type}</span>
                                                            {group.description && <span className="text-muted-foreground hidden sm:inline text-xs">- {group.description}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 font-mono text-[10px]">
                                                        <ViewInvoiceDialog invoiceId={group.id}>
                                                            <Button variant="link" className="h-auto p-0 text-blue-600 hover:text-blue-800 font-mono text-xs">
                                                                {group.reference || group.id.substring(0, 8)}
                                                            </Button>
                                                        </ViewInvoiceDialog>
                                                    </TableCell>
                                                    <TableCell className="text-right py-4 font-semibold text-sm">
                                                        {formatCurrency(Number(group.debit))}
                                                    </TableCell>
                                                    <TableCell className="text-right py-4">-</TableCell>
                                                    <TableCell className="text-right py-4 font-bold pr-6">
                                                        {formatCurrency(Number(group.runningBalance))}
                                                    </TableCell>
                                                </TableRow>
                                                {group.payments.map((p: any) => (
                                                    <TableRow key={p.id} className="border-l-2 border-l-green-400/30 hover:bg-green-50/10 transition-colors">
                                                        <TableCell className="pl-8 py-2 text-muted-foreground font-medium text-[10px]">
                                                            {format(new Date(p.date), 'MMM dd, yyy')}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <div className="flex items-center gap-2 pl-4">
                                                                <span className="text-muted-foreground text-xs opacity-50">└─</span>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                                <span className="font-medium text-foreground text-xs">Payment: {p.type}</span>
                                                                {p.invoice_ref ? (
                                                                    <span className="text-muted-foreground text-[10px] italic ml-1"> (for Invoice #{p.invoice_ref})</span>
                                                                ) : p.note && (
                                                                    <span className="text-muted-foreground text-[10px] italic">({p.note})</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2 font-mono text-[10px]">
                                                            <ViewPaymentDialog payment={{id: p.id, reference: p.reference, amount: p.credit, paymentDate: p.date, customerName: customers.find(c => c.id === selectedCustomer)?.name || 'Valued Customer', paymentType: p.type}}>
                                                                <Button variant="link" className="h-auto p-0 text-green-600 hover:text-green-800 font-mono text-[10px]">
                                                                    {p.reference || p.id.substring(0, 8)}
                                                                </Button>
                                                            </ViewPaymentDialog>
                                                        </TableCell>
                                                        <TableCell className="text-right py-2">-</TableCell>
                                                        <TableCell className="text-right py-2 font-medium text-green-600 text-sm">
                                                            {formatCurrency(Number(p.credit))}
                                                        </TableCell>
                                                        <TableCell className="text-right py-2 font-medium pr-6 text-muted-foreground text-xs">
                                                            {formatCurrency(Number(p.runningBalance))}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </Fragment>
                                        ))}
                                        {groupedTransactions.unallocated.length > 0 && (
                                            <Fragment key="unallocated-section">
                                                <TableRow className="bg-gray-100/50">
                                                    <TableCell colSpan={6} className="text-[10px] font-bold uppercase tracking-wider pl-6 py-2 text-muted-foreground">Unallocated Payments</TableCell>
                                                </TableRow>
                                                {groupedTransactions.unallocated.map((p: any) => (
                                                    <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors">
                                                        <TableCell className="pl-6 py-4 text-muted-foreground font-medium text-xs">
                                                            {format(new Date(p.date), 'MMM dd, yyy')}
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-green-400" />
                                                                <span className="font-medium text-foreground">{p.type}</span>
                                                                {p.description && <span className="text-muted-foreground hidden sm:inline text-xs">- {p.description}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4 font-mono text-[10px]">
                                                           <ViewPaymentDialog payment={{id: p.id, reference: p.reference, amount: p.credit, paymentDate: p.date, customerName: customers.find(c => c.id === selectedCustomer)?.name || 'Valued Customer', paymentType: p.type}}>
                                                                <Button variant="link" className="h-auto p-0 text-green-600 hover:text-green-800 font-mono text-xs">
                                                                    {p.reference || p.id.substring(0, 8)}
                                                                </Button>
                                                            </ViewPaymentDialog>
                                                        </TableCell>
                                                        <TableCell className="text-right py-4">-</TableCell>
                                                        <TableCell className="text-right py-4 font-medium text-green-600">
                                                            {formatCurrency(Number(p.credit))}
                                                        </TableCell>
                                                        <TableCell className="text-right py-4 font-bold pr-6">
                                                            {formatCurrency(Number(p.runningBalance))}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </Fragment>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="p-6 bg-muted/20 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="text-xs text-muted-foreground italic">
                                    Generated on {format(new Date(), 'PPpp')}
                                </div>
                                <div className="flex items-center gap-2 text-xl font-bold">
                                    <span className="text-sm font-medium text-muted-foreground uppercase">Statement Ending Balance:</span>
                                    <span className="text-primary">{formatCurrency(Number(soaData.endingBalance))}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

// --- Main Page Component ---
export default function CustomerPaymentPage() {
  return (
    <div className="space-y-6">
       <div>
            <h2 className="text-3xl font-bold tracking-tight">Customer Payments</h2>
            <p className="text-muted-foreground">Manage invoices, payments, and statements.</p>
       </div>
       
       <Tabs defaultValue="outstanding" className="space-y-4">
          <TabsList>
             <TabsTrigger value="outstanding">Outstanding Invoices</TabsTrigger>
             <TabsTrigger value="history">Payment History</TabsTrigger>
             <TabsTrigger value="soa">Statement of Account</TabsTrigger>
          </TabsList>

          <TabsContent value="outstanding" className="space-y-4">
             <OutstandingInvoices />
          </TabsContent>

           <TabsContent value="history" className="space-y-4">
             <PaymentHistory />
          </TabsContent>

           <TabsContent value="soa" className="space-y-4">
             <StatementOfAccount />
          </TabsContent>
       </Tabs>
    </div>
  );
}
