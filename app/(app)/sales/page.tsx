'use client';

import { useState, Fragment, useMemo } from 'react';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
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
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import {
  CalendarIcon,
  Search,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Download,
  FileText,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
} from 'lucide-react';
import { TerminalSelector } from '@/components/TerminalSelector';
import { getApiUrl } from '@/lib/api-config';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useQuery } from '@tanstack/react-query';

type Sale = Record<string, any>;

function SortHeader({ column, label, className }: { column: any; label: string; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-7 -ml-2 px-1.5 text-primary-foreground hover:text-primary-foreground hover:bg-primary/80 font-semibold text-[11px]', className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      {column.getIsSorted() === 'asc' ? (
        <ArrowUp className="ml-0.5 h-3 w-3" />
      ) : column.getIsSorted() === 'desc' ? (
        <ArrowDown className="ml-0.5 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-0.5 h-3 w-3 opacity-60" />
      )}
    </Button>
  );
}

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminalId, setTerminalId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Filter states
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [salesGroupFilter, setSalesGroupFilter] = useState<string>('all');
  const [referenceNumberFilter, setReferenceNumberFilter] = useState<string>('');
  const [transactionFromFilter, setTransactionFromFilter] = useState<string>('all');

  // Filter dialog open states
  const [paymentTypeDialogOpen, setPaymentTypeDialogOpen] = useState(false);
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [salesStatusDialogOpen, setSalesStatusDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [cashierDialogOpen, setCashierDialogOpen] = useState(false);
  const [salesGroupDialogOpen, setSalesGroupDialogOpen] = useState(false);
  const [referenceNumberDialogOpen, setReferenceNumberDialogOpen] = useState(false);
  const [transactionFromDialogOpen, setTransactionFromDialogOpen] = useState(false);

  // Temporary filter values for dialogs
  const [tempPaymentType, setTempPaymentType] = useState<string>('all');
  const [tempTerminalId, setTempTerminalId] = useState<string>('all');
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempSalesStatus, setTempSalesStatus] = useState<string>('all');
  const [tempCustomer, setTempCustomer] = useState<string>('');
  const [tempCashier, setTempCashier] = useState<string>('');
  const [tempSalesGroup, setTempSalesGroup] = useState<string>('all');
  const [tempReferenceNumber, setTempReferenceNumber] = useState<string>('');
  const [tempTransactionFrom, setTempTransactionFrom] = useState<string>('all');

  const { data: salesResult, isLoading } = useQuery({
    queryKey: ['salesTransactions', dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), terminalId, currentPage, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      if (terminalId && terminalId !== 'all') params.append('terminalId', terminalId);
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      const res = await fetch(getApiUrl(`/sales/transactions?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch sales');
      return result;
    },
    placeholderData: (prev) => prev,
  });

  const sales: Sale[] = salesResult?.data || [];
  const paginationMeta = salesResult?.pagination;
  const totalPages = paginationMeta?.totalPages ?? 1;

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) { newSet.delete(id); } else { newSet.add(id); }
      return newSet;
    });
  };

  const filteredSales = useMemo(() => sales.filter(sale => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const idMatch = String(sale.id || sale.posTransactionId).toLowerCase().includes(term);
      const customerMatch = sale.customer?.name?.toLowerCase().includes(term);
      if (!idMatch && !customerMatch) return false;
    }
    if (paymentTypeFilter !== 'all' && sale.paymentMethod !== paymentTypeFilter) return false;
    if (salesStatusFilter !== 'all') {
      const saleStatus = sale.status || (sale.paymentStatus === 'completed' ? 'Paid' : 'Pending');
      if (saleStatus !== salesStatusFilter) return false;
    }
    if (customerFilter && !sale.customer?.name?.toLowerCase().includes(customerFilter.toLowerCase())) return false;
    if (cashierFilter && cashierFilter !== 'all' && !sale.cashier?.toLowerCase().includes(cashierFilter.toLowerCase())) return false;
    if (referenceNumberFilter && !String(sale.orderNumber || '').includes(referenceNumberFilter)) return false;
    return true;
  }), [sales, searchTerm, paymentTypeFilter, salesStatusFilter, customerFilter, cashierFilter, referenceNumberFilter]);

  const columns = useMemo<ColumnDef<Sale>[]>(() => [
    {
      id: 'expand',
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => {
        const rowId = row.original.posTransactionId || row.original.id;
        return expandedRows.has(rowId)
          ? <ChevronUp className="h-4 w-4 text-primary" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />;
      },
    },
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <SortHeader column={column} label="SO No." />,
      cell: ({ row }) => (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
          {row.original.orderNumber || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'receiptNo',
      header: ({ column }) => <SortHeader column={column} label="Receipt No." />,
      cell: ({ row }) => row.original.receiptNo || row.original.orderNumber || '-',
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <SortHeader column={column} label="Date" />,
      cell: ({ row }) => {
        const d = row.original.date || row.original.invoiceDate;
        return d ? format(new Date(d), 'MM/dd/yy hh:mm a') : 'N/A';
      },
    },
    {
      accessorKey: 'terminal',
      header: ({ column }) => <SortHeader column={column} label="Terminal" />,
      cell: ({ row }) => row.original.terminal || '-',
    },
    {
      accessorKey: 'cashier',
      header: ({ column }) => <SortHeader column={column} label="Cashier" />,
      cell: ({ row }) => row.original.cashier || '-',
    },
    {
      id: 'customer',
      accessorFn: (row) => row.customer?.name || 'Walk-in Customer',
      header: ({ column }) => <SortHeader column={column} label="Customer" />,
      cell: ({ row }) => row.original.customer?.name || 'Walk-in Customer',
    },
    {
      accessorKey: 'total',
      header: ({ column }) => (
        <div className="text-right">
          <SortHeader column={column} label="Sales Amount" className="-mr-3" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {Number(row.original.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: 'paymentMethod',
      header: ({ column }) => <SortHeader column={column} label="Payment Type" />,
      cell: ({ row }) => row.original.paymentMethod || '-',
    },
    {
      id: 'paymentStatus',
      accessorFn: (row) => row.paymentStatus || row.status,
      header: ({ column }) => <SortHeader column={column} label="Payment Status" />,
      cell: ({ row }) => {
        const isPaid = row.original.paymentStatus === 'completed' || row.original.status === 'Paid';
        return (
          <Badge variant={isPaid ? 'default' : 'destructive'}>
            {isPaid ? 'Paid' : row.original.status || 'Pending'}
          </Badge>
        );
      },
    },
  ], [expandedRows]);

  const table = useReactTable({
    data: filteredSales,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setTerminalId('all');
    setPaymentTypeFilter('all');
    setSalesStatusFilter('all');
    setCustomerFilter('');
    setCashierFilter('all');
    setSalesGroupFilter('all');
    setReferenceNumberFilter('');
    setTransactionFromFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || dateRange || terminalId !== 'all' ||
    paymentTypeFilter !== 'all' || salesStatusFilter !== 'all' || customerFilter || (cashierFilter && cashierFilter !== 'all') ||
    salesGroupFilter !== 'all' || referenceNumberFilter || transactionFromFilter !== 'all';

  const summaryTotals = sales.reduce((acc, sale) => ({
    discounts: acc.discounts + Number(sale.discount || 0),
    revenue: acc.revenue + Number(sale.total || 0),
    amountPaid: acc.amountPaid + Number(sale.amountPaid || sale.total || 0),
    customerBalance: acc.customerBalance + Number(sale.balance || 0),
    cost: acc.cost + Number(sale.cost || 0),
    grossProfit: acc.grossProfit + Number(sale.profit || 0),
    vatableSales: acc.vatableSales + Number(sale.vatableSales || 0),
    vatAmount: acc.vatAmount + Number(sale.taxAmount || 0),
    nonVatSales: acc.nonVatSales + Number(sale.nonVatSales || 0),
    accountPayments: acc.accountPayments + (sale.paymentMethod === 'Account' ? Number(sale.total || 0) : 0),
  }), { discounts: 0, revenue: 0, amountPaid: 0, customerBalance: 0, cost: 0, grossProfit: 0, vatableSales: 0, vatAmount: 0, nonVatSales: 0, accountPayments: 0 });

  const fetchAllSalesForExport = async () => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (terminalId && terminalId !== 'all') params.append('terminalId', terminalId);
    params.append('limit', '1000000');
    try {
      const res = await fetch(getApiUrl(`/sales/transactions?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        let data = result.data;
        if (searchTerm) { const t = searchTerm.toLowerCase(); data = data.filter((s: any) => String(s.id || s.posTransactionId).toLowerCase().includes(t) || s.customer?.name?.toLowerCase().includes(t)); }
        if (paymentTypeFilter !== 'all') data = data.filter((s: any) => s.paymentMethod === paymentTypeFilter);
        if (salesStatusFilter !== 'all') data = data.filter((s: any) => { const st = s.status || (s.paymentStatus === 'completed' ? 'Paid' : 'Pending'); return st === salesStatusFilter; });
        if (customerFilter) data = data.filter((s: any) => s.customer?.name?.toLowerCase().includes(customerFilter.toLowerCase()));
        if (cashierFilter && cashierFilter !== 'all') data = data.filter((s: any) => s.cashier?.toLowerCase().includes(cashierFilter.toLowerCase()));
        if (referenceNumberFilter) data = data.filter((s: any) => String(s.orderNumber || '').includes(referenceNumberFilter));
        return data;
      }
      return [];
    } catch { return []; }
  };

  const exportToCSV = async () => {
    const data = await fetchAllSalesForExport();
    let printedBy = 'admin';
    try { const u = localStorage.getItem('mock-user-session'); if (u) { const user = JSON.parse(u); printedBy = user.display_name || user.email || 'admin'; } } catch {}
    let businessName = 'BUSINESS NAME';
    try { const r = await (await fetch(getApiUrl('/pos-settings'))).json(); if (r.success && r.data?.businessName) businessName = r.data.businessName; } catch {}
    const period = dateRange?.from ? `${format(dateRange.from, 'yyyy-MM-dd')} to ${dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd')}` : 'All Time';
    const summary = data.reduce((acc: any, s: any) => ({ salesAmount: acc.salesAmount + Number(s.total || 0), discount: acc.discount + Number(s.discount || 0), amountPaid: acc.amountPaid + Number(s.amountPaid || s.total || 0), balance: acc.balance + Number(s.balance || 0), cost: acc.cost + Number(s.cost || 0), profit: acc.profit + Number(s.profit || 0) }), { salesAmount: 0, discount: 0, amountPaid: 0, balance: 0, cost: 0, profit: 0 });
    const fmt = (n: any) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const metadata = [[businessName], ['Printed by:', printedBy], ['Print Out Date:', format(new Date(), 'yyyy-MM-dd')], ['Period:', period], []];
    const headers = ['SO No.', 'Receipt No.', 'Date', 'Terminal', 'Cashier', 'Customer', 'Discount', 'Sales Amount', 'Amount Paid', 'Balance', 'Cost', 'Profit'];
    const rows = data.map((s: any) => [s.orderNumber || '', s.receiptNo || s.orderNumber || '', s.date ? format(new Date(s.date), 'MMMM dd, yyyy hh:mm a') : '', s.terminal || '', s.cashier || '', s.customer?.name || 'Walk-in Customer', fmt(s.discount), fmt(s.total), fmt(s.amountPaid || s.total), fmt(s.balance), fmt(s.cost), fmt(s.profit)]);
    const totalRow = ['Grand Total', '', '', '', '', '', fmt(summary.discount), fmt(summary.salesAmount), fmt(summary.amountPaid), fmt(summary.balance), fmt(summary.cost), fmt(summary.profit)];
    const csv = [...metadata.map(r => r.map(c => `"${c}"`).join(',')), headers.join(','), ...rows.map((r: any[]) => r.map(c => `"${c}"`).join(',')), totalRow.map(c => `"${c}"`).join(',')].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `sales_transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write('<html><head><title>Generating Report...</title></head><body><h1>Loading Sales Data...</h1></body></html>');
    let printedBy = 'admin';
    try { const u = localStorage.getItem('mock-user-session'); if (u) { const user = JSON.parse(u); printedBy = user.display_name || user.email || 'admin'; } } catch {}
    let data: any[] = []; let businessName = 'BUSINESS NAME';
    try {
      const [salesData, settingsRes] = await Promise.all([fetchAllSalesForExport(), fetch(getApiUrl('/pos-settings')).then(r => r.json()).catch(() => ({ success: false }))]);
      data = salesData;
      if (settingsRes.success && settingsRes.data?.businessName) businessName = settingsRes.data.businessName;
    } catch {}
    const reportSummary = data.reduce((acc: any, s: any) => ({ salesAmount: acc.salesAmount + Number(s.total || 0), discount: acc.discount + Number(s.discount || 0), amountPaid: acc.amountPaid + Number(s.amountPaid || s.total || 0), balance: acc.balance + Number(s.balance || 0), cost: acc.cost + Number(s.cost || 0), profit: acc.profit + Number(s.profit || 0) }), { salesAmount: 0, discount: 0, amountPaid: 0, balance: 0, cost: 0, profit: 0 });
    const period = dateRange?.from ? `${format(dateRange.from, 'yyyy-MM-dd')} to ${dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd')}` : 'All Time';
    const fmt = (n: any) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const printContent = `<html><head><title>Sales Transaction Report</title><style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:10px;padding:20px;color:#000;}.header-container{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;}.business-name{font-size:14px;font-weight:bold;margin-bottom:10px;text-transform:uppercase;}.report-title{font-size:14px;font-weight:bold;text-align:right;}.meta-info{font-size:10px;line-height:1.4;}.meta-row{display:flex;}.meta-label{width:80px;}table{width:100%;border-collapse:collapse;margin-top:15px;}th{text-align:left;font-weight:bold;padding:6px;border-bottom:2px solid #000;font-size:10px;background-color:#f2f2f2;}td{padding:6px;font-size:10px;vertical-align:top;color:#333;border-bottom:1px solid #eee;}.row-main{font-weight:500;}.row-detail{background-color:#fafafa;color:#555;}.detail-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px 8px;font-size:9px;}.detail-item{display:flex;flex-direction:column;}.detail-label{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:0.5px;}.detail-value{font-weight:500;}.text-right{text-align:right;}.summary-box{margin-top:30px;border-top:2px solid #000;padding-top:10px;width:40%;margin-left:auto;}.summary-row{display:flex;justify-content:space-between;padding:3px 0;}.summary-total{font-weight:bold;font-size:11px;border-top:1px solid #ccc;padding-top:5px;margin-top:5px;}@media print{@page{margin:0.5cm;size:landscape;}body{margin:0;padding:0;}.row-detail{background-color:#f9f9f9!important;-webkit-print-color-adjust:exact;}th{background-color:#f2f2f2!important;-webkit-print-color-adjust:exact;}}</style></head><body><div class="header-container"><div><div class="business-name">${businessName}</div><div class="meta-info"><div class="meta-row"><span class="meta-label">Printed by:</span><span>${printedBy}</span></div><div class="meta-row"><span class="meta-label">Print Out Date:</span><span>${format(new Date(), 'yyyy-MM-dd')}</span></div><div class="meta-row"><span class="meta-label">Period:</span><span>${period}</span></div></div></div><div class="report-title">Sales Transaction Report</div></div><table><thead><tr><th style="width:10%">SO No.</th><th style="width:15%">Date</th><th style="width:25%">Customer</th><th style="width:15%">Payment Type</th><th style="width:15%">Status</th><th class="text-right" style="width:20%">Sales Amount</th></tr></thead><tbody>${data.map((s: any) => `<tr class="row-main"><td><strong>${s.orderNumber || ''}</strong></td><td>${s.date ? format(new Date(s.date), 'MMM dd, yyyy HH:mm') : ''}</td><td>${s.customer?.name || 'Walk-in Customer'}</td><td>${s.paymentMethod || ''}</td><td>${s.paymentStatus || s.status || ''}</td><td class="text-right"><strong>${fmt(s.total)}</strong></td></tr><tr class="row-detail"><td colspan="6"><div class="detail-grid"><div class="detail-item"><span class="detail-label">Receipt No.</span><span class="detail-value">${s.receiptNo || s.orderNumber || '-'}</span></div><div class="detail-item"><span class="detail-label">Terminal / Cashier</span><span class="detail-value">${s.terminal || '-'} / ${s.cashier || '-'}</span></div><div class="detail-item"><span class="detail-label">Discount</span><span class="detail-value">${fmt(s.discount)}</span></div><div class="detail-item"><span class="detail-label">Amount Paid</span><span class="detail-value">${fmt(s.amountPaid || s.total)}</span></div><div class="detail-item"><span class="detail-label">Balance</span><span class="detail-value">${fmt(s.balance)}</span></div><div class="detail-item"><span class="detail-label">Cost</span><span class="detail-value">${fmt(s.cost)}</span></div><div class="detail-item"><span class="detail-label">Profit</span><span class="detail-value">${fmt(s.profit)}</span></div><div class="detail-item"><span class="detail-label">Tax</span><span class="detail-value">${fmt(Number(s.taxAmount || 0) + Number(s.nonVatSales || 0))}</span></div></div></td></tr>`).join('')}</tbody></table><div class="summary-box"><div class="summary-row"><span>Total Sales:</span><span>${fmt(reportSummary.salesAmount)}</span></div><div class="summary-row"><span>Total Discount:</span><span>${fmt(reportSummary.discount)}</span></div><div class="summary-row"><span>Total Cost:</span><span>${fmt(reportSummary.cost)}</span></div><div class="summary-row summary-total"><span>Total Profit:</span><span>${fmt(reportSummary.profit)}</span></div></div></body></html>`;
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(<PaginationItem key={i}><PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>{i}</PaginationLink></PaginationItem>);
      }
    } else {
      items.push(<PaginationItem key={1}><PaginationLink isActive={currentPage === 1} onClick={() => handlePageChange(1)}>1</PaginationLink></PaginationItem>);
      if (currentPage > 3) items.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis /></PaginationItem>);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        items.push(<PaginationItem key={i}><PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>{i}</PaginationLink></PaginationItem>);
      }
      if (currentPage < totalPages - 2) items.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis /></PaginationItem>);
      items.push(<PaginationItem key={totalPages}><PaginationLink isActive={currentPage === totalPages} onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink></PaginationItem>);
    }
    return items;
  };

  return (
    <>
      <div className="flex flex-col gap-4 w-full min-w-0">
        <Card className="flex flex-col min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Sales Transactions</CardTitle>
                <CardDescription>A list of all POS sales to customers.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col min-w-0">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-3 shrink-0">
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Discounts</p><p className="text-sm font-bold">₱{summaryTotals.discounts.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Revenue</p><p className="text-sm font-bold text-primary">₱{summaryTotals.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Amount Paid</p><p className="text-sm font-bold">₱{summaryTotals.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Customer Balance</p><p className="text-sm font-bold">₱{summaryTotals.customerBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Cost</p><p className="text-sm font-bold">₱{summaryTotals.cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Gross Profit</p><p className="text-sm font-bold text-green-600">₱{summaryTotals.grossProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Vatable Sales</p><p className="text-sm font-bold">₱{summaryTotals.vatableSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">VAT Amount</p><p className="text-sm font-bold">₱{summaryTotals.vatAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Non-Vat Sales</p><p className="text-sm font-bold">₱{summaryTotals.nonVatSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-2 border"><p className="text-[10px] text-muted-foreground font-medium">Account Payments</p><p className="text-sm font-bold">₱{summaryTotals.accountPayments.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
            </div>

            {/* Search and Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by ID or customer..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                      {(paymentTypeFilter !== 'all' || terminalId !== 'all' || dateRange || salesStatusFilter !== 'all' || customerFilter || (cashierFilter && cashierFilter !== 'all') || salesGroupFilter !== 'all' || referenceNumberFilter || transactionFromFilter !== 'all') && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {[paymentTypeFilter !== 'all', terminalId !== 'all', !!dateRange, salesStatusFilter !== 'all', !!customerFilter, (cashierFilter && cashierFilter !== 'all'), salesGroupFilter !== 'all', !!referenceNumberFilter, transactionFromFilter !== 'all'].filter(Boolean).length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => { setTempPaymentType(paymentTypeFilter); setPaymentTypeDialogOpen(true); }}>Payment Type{paymentTypeFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{paymentTypeFilter}</Badge>}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempTerminalId(terminalId); setTerminalDialogOpen(true); }}>Terminal{terminalId !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempDateRange(dateRange); setDateRangeDialogOpen(true); }}>Date Range{dateRange && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempSalesStatus(salesStatusFilter); setSalesStatusDialogOpen(true); }}>Sales Status{salesStatusFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{salesStatusFilter}</Badge>}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempCustomer(customerFilter); setCustomerDialogOpen(true); }}>Customer{customerFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempCashier(cashierFilter); setCashierDialogOpen(true); }}>Cashier{cashierFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempSalesGroup(salesGroupFilter); setSalesGroupDialogOpen(true); }}>Sales Group{salesGroupFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{salesGroupFilter}</Badge>}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempReferenceNumber(referenceNumberFilter); setReferenceNumberDialogOpen(true); }}>Reference Number{referenceNumberFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempTransactionFrom(transactionFromFilter); setTransactionFromDialogOpen(true); }}>Transaction From{transactionFromFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{transactionFromFilter}</Badge>}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => { setPaymentTypeFilter('all'); setTerminalId('all'); setDateRange(undefined); setSalesStatusFilter('all'); setCustomerFilter(''); setCashierFilter('all'); setSalesGroupFilter('all'); setReferenceNumberFilter(''); setTransactionFromFilter('all'); }} className="text-destructive">Clear All Filters</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Columns className="h-4 w-4 mr-2" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table.getAllColumns().filter(col => col.getCanHide()).map(col => (
                      <DropdownMenuCheckboxItem key={col.id} className="capitalize" checked={col.getIsVisible()} onCheckedChange={val => col.toggleVisibility(!!val)}>
                        {col.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={exportToCSV}><FileSpreadsheet className="h-4 w-4 mr-2" />Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem onSelect={exportToPDF}><FileText className="h-4 w-4 mr-2" />Export as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={resetFilters} size="sm">
                    <X className="h-4 w-4 mr-1" />Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="border rounded-md overflow-hidden min-w-0">
              <Table className="text-[11px]" wrapperClassName="max-h-[500px] min-w-0 overflow-auto">
                <TableHeader className="sticky top-0 z-20 bg-primary">
                  {table.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id} className="bg-primary hover:bg-primary border-0">
                      {hg.headers.map(header => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            'text-primary-foreground font-semibold py-1.5 px-1.5 bg-primary sticky top-0 whitespace-nowrap',
                            header.column.id === 'expand' && 'w-6',
                            header.column.id === 'total' && 'text-right',
                            header.column.id === 'paymentStatus' && 'pr-2',
                          )}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          Loading transactions...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row, index) => {
                      const sale = row.original;
                      const rowId = sale.posTransactionId || sale.id;
                      const isExpanded = expandedRows.has(rowId);
                      const formatAmount = (val: any) => Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                      return (
                        <Fragment key={rowId}>
                          <TableRow
                            className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/50'} cursor-pointer hover:bg-accent`}
                            onClick={() => toggleRowExpansion(rowId)}
                          >
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id} className="py-1.5 px-1.5 whitespace-nowrap">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>

                          {isExpanded && (
                            <TableRow key={`${rowId}-details`} className="bg-muted/30">
                              <TableCell colSpan={row.getVisibleCells().length} className="py-3 px-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-4 text-xs">
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Discount</span><span className="font-semibold">{formatAmount(sale.discount)}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Amount Paid</span><span className="font-semibold">{formatAmount(sale.amountPaid || sale.total)}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Balance</span><span className="font-semibold">{formatAmount(sale.balance)}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Cost</span><span className="font-semibold">{formatAmount(sale.cost)}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Profit</span><span className="font-semibold">{formatAmount(sale.profit)}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Vatable Sales</span><span className="font-semibold">{formatAmount(sale.vatableSales)}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">VAT Amount</span><span className="font-semibold">{formatAmount(sale.taxAmount)}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Non-Vat Sales</span><span className="font-semibold">{formatAmount(sale.nonVatSales)}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Payment Ref.</span><span className="font-semibold">{sale.paymentReference || '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-muted-foreground font-medium">Note</span><span className="font-semibold">{sale.notes || '-'}</span></div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                        No transactions found for the selected criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && sales.length > 0 && (
              <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto sm:mr-0 whitespace-nowrap">
                  <Label htmlFor="rows-per-page" className="text-sm font-normal">Rows per page:</Label>
                  <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setCurrentPage(1); }}>
                    <SelectTrigger id="rows-per-page" className="h-8 w-[70px]"><SelectValue placeholder={limit.toString()} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Pagination className="justify-center sm:justify-end">
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious onClick={() => handlePageChange(Math.max(1, currentPage - 1))} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem><PaginationNext onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Type Filter Dialog */}
      <Dialog open={paymentTypeDialogOpen} onOpenChange={setPaymentTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Payment Type</DialogTitle><DialogDescription>Select the payment type to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="paymentType">Payment Type</Label><Select value={tempPaymentType} onValueChange={setTempPaymentType}><SelectTrigger className="mt-2"><SelectValue placeholder="Select payment type" /></SelectTrigger><SelectContent><SelectItem value="all">All Payment Types</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="GCash">GCash</SelectItem><SelectItem value="Maya">Maya</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Account">Account</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setPaymentTypeDialogOpen(false)}>Cancel</Button><Button onClick={() => { setPaymentTypeFilter(tempPaymentType); setPaymentTypeDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminal Filter Dialog */}
      <Dialog open={terminalDialogOpen} onOpenChange={setTerminalDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Terminal</DialogTitle><DialogDescription>Select the terminal to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="terminal">Terminal</Label><div className="mt-2"><TerminalSelector terminalId={tempTerminalId} onTerminalChange={setTempTerminalId} showAllOption={true} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setTerminalDialogOpen(false)}>Cancel</Button><Button onClick={() => { setTerminalId(tempTerminalId); setTerminalDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Range Filter Dialog */}
      <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
        <DialogContent className="sm:max-w-fit max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Filter by Date Range</DialogTitle><DialogDescription>Select a date range to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-2">
            <Label>Date Range</Label>
            <div className="mt-2 flex justify-center"><Calendar initialFocus mode="range" defaultMonth={tempDateRange?.from} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={1} className="rounded-md border" /></div>
            {tempDateRange?.from && (<p className="text-sm text-muted-foreground text-center mt-2">{tempDateRange.to ? <>Selected: {format(tempDateRange.from, 'LLL dd, y')} - {format(tempDateRange.to, 'LLL dd, y')}</> : <>Selected: {format(tempDateRange.from, 'LLL dd, y')}</>}</p>)}
          </div>
          <DialogFooter className="flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setTempDateRange(undefined)}>Clear Date</Button><Button variant="outline" size="sm" onClick={() => setDateRangeDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={() => { setDateRange(tempDateRange); setDateRangeDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales Status Filter Dialog */}
      <Dialog open={salesStatusDialogOpen} onOpenChange={setSalesStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Sales Status</DialogTitle><DialogDescription>Select the sales status to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="salesStatus">Sales Status</Label><Select value={tempSalesStatus} onValueChange={setTempSalesStatus}><SelectTrigger className="mt-2"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem><SelectItem value="Returned">Returned</SelectItem><SelectItem value="Void">Void</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setSalesStatusDialogOpen(false)}>Cancel</Button><Button onClick={() => { setSalesStatusFilter(tempSalesStatus); setSalesStatusDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Filter Dialog */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Customer</DialogTitle><DialogDescription>Enter customer name to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="customer">Customer Name</Label><Input id="customer" placeholder="Enter customer name..." className="mt-2" value={tempCustomer} onChange={(e) => setTempCustomer(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>Cancel</Button><Button onClick={() => { setCustomerFilter(tempCustomer); setCustomerDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cashier Filter Dialog */}
      <Dialog open={cashierDialogOpen} onOpenChange={setCashierDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Cashier</DialogTitle><DialogDescription>Enter cashier name to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="cashier">Cashier Name</Label><Select value={tempCashier} onValueChange={setTempCashier}><SelectTrigger className="mt-2"><SelectValue placeholder="Select cashier" /></SelectTrigger><SelectContent><SelectItem value="all">All Cashiers</SelectItem>{users.map((user: any) => (<SelectItem key={user.uid} value={user.displayName || user.username}>{user.displayName || user.username}</SelectItem>))}</SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setCashierDialogOpen(false)}>Cancel</Button><Button onClick={() => { setCashierFilter(tempCashier); setCashierDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales Group Filter Dialog */}
      <Dialog open={salesGroupDialogOpen} onOpenChange={setSalesGroupDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Sales Group</DialogTitle><DialogDescription>Select the sales group to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="salesGroup">Sales Group</Label><Select value={tempSalesGroup} onValueChange={setTempSalesGroup}><SelectTrigger className="mt-2"><SelectValue placeholder="Select sales group" /></SelectTrigger><SelectContent><SelectItem value="all">All Groups</SelectItem><SelectItem value="Retail">Retail</SelectItem><SelectItem value="Wholesale">Wholesale</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="In-Store">In-Store</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setSalesGroupDialogOpen(false)}>Cancel</Button><Button onClick={() => { setSalesGroupFilter(tempSalesGroup); setSalesGroupDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reference Number Filter Dialog */}
      <Dialog open={referenceNumberDialogOpen} onOpenChange={setReferenceNumberDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Reference Number</DialogTitle><DialogDescription>Enter reference number to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="referenceNumber">Reference Number</Label><Input id="referenceNumber" placeholder="Enter reference number..." className="mt-2" value={tempReferenceNumber} onChange={(e) => setTempReferenceNumber(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setReferenceNumberDialogOpen(false)}>Cancel</Button><Button onClick={() => { setReferenceNumberFilter(tempReferenceNumber); setReferenceNumberDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction From Filter Dialog */}
      <Dialog open={transactionFromDialogOpen} onOpenChange={setTransactionFromDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Transaction From</DialogTitle><DialogDescription>Select the transaction source to filter.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="transactionFrom">Transaction From</Label><Select value={tempTransactionFrom} onValueChange={setTempTransactionFrom}><SelectTrigger className="mt-2"><SelectValue placeholder="Select source" /></SelectTrigger><SelectContent><SelectItem value="all">All Sources</SelectItem><SelectItem value="POS">POS</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="Manual">Manual Entry</SelectItem><SelectItem value="Import">Import</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setTransactionFromDialogOpen(false)}>Cancel</Button><Button onClick={() => { setTransactionFromFilter(tempTransactionFrom); setTransactionFromDialogOpen(false); }}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
