'use client';

import { useState, useEffect, Fragment, useMemo } from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import {
  Search,
  X,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  FileDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
} from 'lucide-react';
import { TerminalSelector } from '@/components/TerminalSelector';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';

type SalesData = {
  date: string;
  transactionCount: number;
  startOR: string;
  endOR: string;
  totalRevenue: number;
  totalDiscount: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  nonVatSales: number;
  cost: number;
  profit: number;
};

function SortBtn({ column, children }: { column: any; children: React.ReactNode }) {
  return (
    <button
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="flex items-center gap-1 text-primary-foreground hover:bg-primary/80 px-1 py-0.5 rounded"
    >
      {children}
      {column.getIsSorted() === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : column.getIsSorted() === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

export default function SalesByDatePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  // eslint-disable-next-line no-shadow
  const [interval, setInterval] = useState<string>('daily');
  const [paymentType, setPaymentType] = useState<string>('all');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [transactionsByDate, setTransactionsByDate] = useState<Record<string, any[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Record<string, boolean>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [tempTerminal, setTempTerminal] = useState<string>('all');
  const [tempInterval, setTempInterval] = useState<string>('daily');
  const [tempPaymentType, setTempPaymentType] = useState<string>('all');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { data: rawData, isLoading } = useQuery({
    queryKey: [
      'salesByDate',
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
      terminal,
      interval,
      paymentType,
      currentPage,
      limit,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      if (terminal && terminal !== 'all') params.append('terminalId', terminal);
      if (interval) params.append('interval', interval);
      if (paymentType && paymentType !== 'all') params.append('paymentType', paymentType);
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      const res = await fetch(`/api/sales/by-date?${params.toString()}`);
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const salesData: SalesData[] = rawData?.success ? rawData.data : [];

  useEffect(() => {
    if (rawData?.success && rawData.pagination) {
      if (rawData.pagination.totalPages !== totalPages)
        setTotalPages(rawData.pagination.totalPages);
    }
  }, [rawData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(val || 0);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    if (interval === 'monthly') return format(date, 'MMMM yyyy');
    if (interval === 'hourly') return format(date, 'PP p');
    return format(date, 'PP');
  };

  const filteredSalesData = useMemo(() => {
    if (!searchTerm) return salesData;
    const term = searchTerm.toLowerCase();
    return salesData.filter((row) => {
      const dateStr = formatDate(row.date).toLowerCase();
      const orStart = (row.startOR || '').toLowerCase();
      const orEnd = (row.endOR || '').toLowerCase();
      return dateStr.includes(term) || orStart.includes(term) || orEnd.includes(term);
    });
  }, [salesData, searchTerm, interval]);

  const summaryTotals = useMemo(
    () =>
      salesData.reduce(
        (acc, row) => ({
          discount: acc.discount + row.totalDiscount,
          revenue: acc.revenue + row.totalRevenue,
          vatable: acc.vatable + row.vatableSales,
          vatAmount: acc.vatAmount + row.vatAmount,
          vatExempt: acc.vatExempt + row.vatExemptSales,
          zeroRated: acc.zeroRated + row.zeroRatedSales,
          nonVat: acc.nonVat + row.nonVatSales,
          cost: acc.cost + row.cost,
          profit: acc.profit + row.profit,
        }),
        {
          discount: 0, revenue: 0, vatable: 0, vatAmount: 0,
          vatExempt: 0, zeroRated: 0, nonVat: 0, cost: 0, profit: 0,
        }
      ),
    [salesData]
  );

  const resetFilters = () => {
    setDateRange(undefined);
    setTerminal('all');
    setInterval('daily');
    setPaymentType('all');
    setTransactionReference('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const fetchAllSalesForExport = async () => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (terminal && terminal !== 'all') params.append('terminalId', terminal);
    if (interval) params.append('interval', interval);
    if (paymentType && paymentType !== 'all') params.append('paymentType', paymentType);
    params.append('limit', '1000000');
    try {
      const res = await fetch(`/api/sales/by-date?${params.toString()}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) return result.data;
      return [];
    } catch {
      return [];
    }
  };

  const exportToCSV = async () => {
    const data = await fetchAllSalesForExport();
    const headers = [
      'Date', 'Terminal', 'OR Start', 'OR End', 'Transaction Count', 'Discount', 'Revenue',
      'Vatable Sales', 'VAT Amount', 'VAT Exempt', 'Zero Rated', 'Non-VAT', 'Cost', 'Profit',
    ];
    const csvRows = data.map((item: SalesData) => [
      formatDate(item.date) || '',
      terminal === 'all' ? 'All' : terminal,
      item.startOR || '', item.endOR || '',
      item.transactionCount || 0, item.totalDiscount || 0, item.totalRevenue || 0,
      item.vatableSales || 0, item.vatAmount || 0, item.vatExemptSales || 0,
      item.zeroRatedSales || 0, item.nonVatSales || 0, item.cost || 0, item.profit || 0,
    ]);
    const csvContent = [
      headers.join(','),
      ...csvRows.map((r: any[]) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_by_date_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    const data = await fetchAllSalesForExport();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `
      <html>
        <head>
          <title>Sales by Date Report</title>
          <style>
            body { font-family: sans-serif; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .summary-row { font-weight: bold; background-color: #f9f9f9; }
            h2 { margin-bottom: 10px; }
            p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <h2>Sales by Date Report</h2>
          <p>Generated: ${format(new Date(), 'PPpp')}</p>
          <p>Interval: ${interval.charAt(0).toUpperCase() + interval.slice(1)}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>OR Range</th>
                <th class="text-right">Discount</th><th class="text-right">Revenue</th>
                <th class="text-right">Vatable</th><th class="text-right">VAT</th>
                <th class="text-right">Exempt</th><th class="text-right">Zero</th>
                <th class="text-right">Non-VAT</th><th class="text-right">Cost</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (item: SalesData) => `
                <tr>
                  <td>${formatDate(item.date) || ''}</td>
                  <td>${item.startOR && item.endOR ? `${item.startOR} - ${item.endOR}` : '-'}</td>
                  <td class="text-right">${formatCurrency(item.totalDiscount)}</td>
                  <td class="text-right">${formatCurrency(item.totalRevenue)}</td>
                  <td class="text-right">${formatCurrency(item.vatableSales)}</td>
                  <td class="text-right">${formatCurrency(item.vatAmount)}</td>
                  <td class="text-right">${formatCurrency(item.vatExemptSales)}</td>
                  <td class="text-right">${formatCurrency(item.zeroRatedSales)}</td>
                  <td class="text-right">${formatCurrency(item.nonVatSales)}</td>
                  <td class="text-right">${formatCurrency(item.cost)}</td>
                  <td class="text-right">${formatCurrency(item.profit)}</td>
                </tr>`
                )
                .join('')}
              <tr class="summary-row">
                <td colspan="2">TOTAL</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.totalDiscount, 0))}</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.totalRevenue, 0))}</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.vatableSales, 0))}</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.vatAmount, 0))}</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.vatExemptSales, 0))}</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.zeroRatedSales, 0))}</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.nonVatSales, 0))}</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.cost, 0))}</td>
                <td class="text-right">${formatCurrency(data.reduce((s: number, i: SalesData) => s + i.profit, 0))}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>`;
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const fetchTransactionsForDate = async (dateStr: string) => {
    if (transactionsByDate[dateStr]) return;
    setLoadingTransactions((prev) => ({ ...prev, [dateStr]: true }));
    try {
      const formattedDate = format(new Date(dateStr), 'yyyy-MM-dd');
      const res = await fetch(
        `/api/sales/transactions?startDate=${formattedDate}&endDate=${formattedDate}`
      );
      const result = await res.json();
      if (result.success) {
        setTransactionsByDate((prev) => ({ ...prev, [dateStr]: result.data }));
      }
    } catch {
      // noop
    } finally {
      setLoadingTransactions((prev) => ({ ...prev, [dateStr]: false }));
    }
  };

  const toggleRowExpansion = (date: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
        fetchTransactionsForDate(date);
      }
      return next;
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink isActive={currentPage === 1} onClick={() => handlePageChange(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (currentPage > 3)
        items.push(<PaginationItem key="e1"><PaginationEllipsis /></PaginationItem>);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>{i}</PaginationLink>
          </PaginationItem>
        );
      }
      if (currentPage < totalPages - 2)
        items.push(<PaginationItem key="e2"><PaginationEllipsis /></PaginationItem>);
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink isActive={currentPage === totalPages} onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  const columns = useMemo<ColumnDef<SalesData>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={() => toggleRowExpansion(row.original.date)}
            className="text-muted-foreground hover:text-primary"
          >
            {expandedRows.has(row.original.date) ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'date',
        accessorKey: 'date',
        header: ({ column }) => <SortBtn column={column}>Date</SortBtn>,
        cell: ({ getValue }) => (
          <span className="font-medium">{formatDate(getValue() as string)}</span>
        ),
      },
      {
        id: 'terminal',
        header: 'Terminal',
        cell: () => terminal === 'all' ? 'All' : terminal,
        enableSorting: false,
      },
      {
        id: 'orRange',
        header: 'OR Range',
        cell: ({ row }) =>
          row.original.startOR && row.original.endOR ? (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span>{row.original.startOR}</span>
              <span>{row.original.endOR}</span>
            </div>
          ) : (
            '-'
          ),
        enableSorting: false,
      },
      {
        id: 'totalDiscount',
        accessorKey: 'totalDiscount',
        header: ({ column }) => <SortBtn column={column}>Discount</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'totalRevenue',
        accessorKey: 'totalRevenue',
        header: ({ column }) => <SortBtn column={column}>Revenue</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block font-bold">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'vatableSales',
        accessorKey: 'vatableSales',
        header: ({ column }) => <SortBtn column={column}>Vatable</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'vatAmount',
        accessorKey: 'vatAmount',
        header: ({ column }) => <SortBtn column={column}>VAT</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'vatExemptSales',
        accessorKey: 'vatExemptSales',
        header: ({ column }) => <SortBtn column={column}>Exempt</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'zeroRatedSales',
        accessorKey: 'zeroRatedSales',
        header: ({ column }) => <SortBtn column={column}>Zero</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'nonVatSales',
        accessorKey: 'nonVatSales',
        header: ({ column }) => <SortBtn column={column}>Non-VAT</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'cost',
        accessorKey: 'cost',
        header: ({ column }) => <SortBtn column={column}>Cost</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'profit',
        accessorKey: 'profit',
        header: ({ column }) => <SortBtn column={column}>Profit</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block font-bold text-green-600">
            {formatCurrency(getValue() as number)}
          </span>
        ),
      },
    ],
    [expandedRows, interval, terminal]
  );

  const table = useReactTable({
    data: filteredSalesData,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const hasActiveFilters =
    dateRange || terminal !== 'all' || interval !== 'daily' || paymentType !== 'all' || searchTerm;

  return (
    <Card className="flex flex-col">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales By Date</CardTitle>
            <CardDescription>
              Comprehensive sales report aggregated by {interval}.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2 shrink-0">
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Discount</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.discount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Revenue</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(summaryTotals.revenue)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Amount Paid</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.revenue)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Vatable</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.vatable)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">VAT</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.vatAmount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Exempt</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.vatExempt)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Zero</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.zeroRated)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Non-VAT</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.nonVat)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Cost</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.cost)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Profit</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(summaryTotals.profit)}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-muted/20 p-2 rounded-md border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 w-full h-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Columns className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      className="capitalize"
                      checked={col.getIsVisible()}
                      onCheckedChange={(val) => col.toggleVisibility(!!val)}
                    >
                      {col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={exportToCSV}>Export to CSV</DropdownMenuItem>
                <DropdownMenuItem onSelect={exportToPDF}>Export to PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Range Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('h-8 justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}</>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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

            {/* Filters Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 px-1 rounded-sm">!</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Time Interval ({interval})</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={interval} onValueChange={setInterval}>
                      <DropdownMenuRadioItem value="daily">Daily</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="hourly">Hourly</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="monthly">Monthly</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setFilterDialogOpen(true); }}
                >
                  Advanced Filters...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={resetFilters} className="text-destructive">
                  Reset Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Table
          className="text-xs whitespace-nowrap w-full"
          wrapperClassName="h-[420px] shrink-0 overflow-auto border rounded-md"
        >
          <TableHeader className="sticky top-0 z-40">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-primary hover:bg-primary border-none">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'text-primary-foreground font-semibold h-9 py-2 bg-primary border-none',
                      header.column.id === 'expand' && 'w-8',
                      [
                        'totalDiscount', 'totalRevenue', 'vatableSales', 'vatAmount',
                        'vatExemptSales', 'zeroRatedSales', 'nonVatSales', 'cost', 'profit',
                      ].includes(header.column.id) && 'text-right'
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading data...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, index) => (
                <Fragment key={row.original.date}>
                  <TableRow
                    className={cn(
                      'cursor-pointer hover:bg-muted/50',
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    )}
                    onClick={() => toggleRowExpansion(row.original.date)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 px-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows.has(row.original.date) && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell
                        colSpan={table.getVisibleLeafColumns().length}
                        className="p-4"
                      >
                        {loadingTransactions[row.original.date] ? (
                          <div className="flex justify-center items-center h-20">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Loading transactions...
                          </div>
                        ) : transactionsByDate[row.original.date]?.length > 0 ? (
                          <div className="border rounded-md bg-background">
                            <Table className="text-xs">
                              <TableHeader>
                                <TableRow className="bg-muted hover:bg-muted">
                                  <TableHead className="h-8 py-1">Order No</TableHead>
                                  <TableHead className="h-8 py-1">Receipt No</TableHead>
                                  <TableHead className="h-8 py-1">Cashier</TableHead>
                                  <TableHead className="h-8 py-1">Method</TableHead>
                                  <TableHead className="h-8 py-1 text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transactionsByDate[row.original.date].map((tx: any, txIdx: number) => (
                                  <TableRow key={`${tx.posTransactionId || tx.id}-${txIdx}`} className="hover:bg-muted/50">
                                    <TableCell className="py-1">{tx.orderNumber}</TableCell>
                                    <TableCell className="py-1">{tx.receiptNo}</TableCell>
                                    <TableCell className="py-1">{tx.cashier}</TableCell>
                                    <TableCell className="py-1">{tx.paymentMethod}</TableCell>
                                    <TableCell className="py-1 text-right">
                                      {formatCurrency(tx.total)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-20 text-muted-foreground bg-background/50 rounded border border-dashed">
                            <span>No detailed transactions found for {formatDate(row.original.date)}.</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  No sales data found for the selected criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!isLoading && filteredSalesData.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">
                Rows per page
              </Label>
              <Select
                value={limit.toString()}
                onValueChange={(v) => { setLimit(Number(v)); setCurrentPage(1); }}
              >
                <SelectTrigger id="rows-per-page" className="h-8 w-[70px] text-xs">
                  <SelectValue placeholder={limit.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="order-1 sm:order-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {renderPaginationItems()}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      aria-disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>

      {/* Advanced Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Options</DialogTitle>
            <DialogDescription className="sr-only">Filter sales by date, terminal, and payment method</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Interval</Label>
              <Select value={tempInterval} onValueChange={setTempInterval}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Terminal</Label>
              <div className="col-span-3">
                <TerminalSelector
                  terminalId={tempTerminal}
                  onTerminalChange={setTempTerminal}
                  showAllOption={true}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Payment</Label>
              <Select value={tempPaymentType} onValueChange={setTempPaymentType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Types</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="GCash">GCash</SelectItem>
                  <SelectItem value="Maya">Maya</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Account">Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Reference</Label>
              <Input
                placeholder="Transaction Reference"
                className="col-span-3"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setTerminal(tempTerminal);
                setInterval(tempInterval);
                setPaymentType(tempPaymentType);
                setFilterDialogOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
