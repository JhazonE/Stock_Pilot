'use client';

import { useState, useMemo } from 'react';
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
  CalendarIcon,
  FileDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  Printer,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { printReport, fetchPrintBusinessInfo } from '@/lib/print-report';
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

type BIRSalesData = {
  date: string;
  startOR: string;
  endOR: string;
  totalRevenue: number;
  discountSeniorCitizen: number;
  discountPWD: number;
  discountNAAC: number;
  discountSoloParent: number;
  discountOther: number;
  totalDiscount: number;
  returns: number;
  voids: number;
  totalDeductions: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  vatAdjustmentSC: number;
  vatAdjustmentPWD: number;
  vatAdjustmentOther: number;
  vatAdjustmentReturns: number;
  vatAdjustmentOtherAdj: number;
  totalVATAdjustment: number;
  vatPayable: number;
  netSales: number;
  salesOverrun: number;
  totalIncome: number;
  zCounter: number;
  remarks: string;
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

export default function BIRSummaryReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { data: rawData, isLoading } = useQuery({
    queryKey: [
      'birSalesData',
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
      currentPage,
      limit,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      const res = await fetch(`/api/sales/bir-summary?${params.toString()}`);
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const salesData: BIRSalesData[] = rawData?.success ? rawData.data : [];
  const totalPages = rawData?.pagination?.totalPages ?? 1;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(val || 0);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : format(date, 'PP');
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return salesData;
    const term = searchTerm.toLowerCase();
    return salesData.filter((row) => {
      const dateStr = formatDate(row.date).toLowerCase();
      const orStart = (row.startOR || '').toLowerCase();
      const orEnd = (row.endOR || '').toLowerCase();
      return dateStr.includes(term) || orStart.includes(term) || orEnd.includes(term);
    });
  }, [salesData, searchTerm]);

  const summaryTotals = useMemo(
    () =>
      salesData.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.totalRevenue,
          discounts: acc.discounts + row.totalDiscount,
          deductions: acc.deductions + row.totalDeductions,
          vatableSales: acc.vatableSales + row.vatableSales,
          vatAmount: acc.vatAmount + row.vatAmount,
          vatPayable: acc.vatPayable + row.vatPayable,
          netSales: acc.netSales + row.netSales,
          totalIncome: acc.totalIncome + row.totalIncome,
        }),
        {
          revenue: 0,
          discounts: 0,
          deductions: 0,
          vatableSales: 0,
          vatAmount: 0,
          vatPayable: 0,
          netSales: 0,
          totalIncome: 0,
        }
      ),
    [salesData]
  );

  const resetFilters = () => {
    setDateRange(undefined);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const dateRangeLabel = () => {
    if (dateRange?.from && dateRange?.to)
      return `${format(dateRange.from, 'PP')} - ${format(dateRange.to, 'PP')}`;
    if (dateRange?.from) return format(dateRange.from, 'PP');
    return 'All dates';
  };

  const handlePrint = async () => {
    const data: BIRSalesData[] = await fetchAllForExport();
    const headers = [
      'Date', 'Starting OR', 'Ending OR', 'Gross Sales', 'SC Discount', 'PWD Discount',
      'NAAC Discount', 'SP Discount', 'Other Discount', 'Returns', 'Voids', 'Total Deductions',
      'Vatable Sales', 'VAT Amount', 'VAT Exempt', 'Zero-Rated', 'VAT Payable',
      'Net Sales', 'Total Income', 'Z-Counter', 'Remarks',
    ];
    // Amount columns (right-aligned): indices 3..18
    const numericColumns = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const rows = data.map((item) => [
      formatDate(item.date), item.startOR || '', item.endOR || '',
      formatCurrency(item.totalRevenue), formatCurrency(item.discountSeniorCitizen),
      formatCurrency(item.discountPWD), formatCurrency(item.discountNAAC),
      formatCurrency(item.discountSoloParent), formatCurrency(item.discountOther),
      formatCurrency(item.returns), formatCurrency(item.voids),
      formatCurrency(item.totalDeductions), formatCurrency(item.vatableSales),
      formatCurrency(item.vatAmount), formatCurrency(item.vatExemptSales),
      formatCurrency(item.zeroRatedSales), formatCurrency(item.vatPayable),
      formatCurrency(item.netSales), formatCurrency(item.totalIncome),
      item.zCounter ?? '', item.remarks || '',
    ]);
    const totals = data.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.totalRevenue,
        scDisc: acc.scDisc + r.discountSeniorCitizen,
        pwdDisc: acc.pwdDisc + r.discountPWD,
        naacDisc: acc.naacDisc + r.discountNAAC,
        spDisc: acc.spDisc + r.discountSoloParent,
        otherDisc: acc.otherDisc + r.discountOther,
        returns: acc.returns + r.returns,
        voids: acc.voids + r.voids,
        deductions: acc.deductions + r.totalDeductions,
        vatable: acc.vatable + r.vatableSales,
        vatAmount: acc.vatAmount + r.vatAmount,
        vatExempt: acc.vatExempt + r.vatExemptSales,
        zeroRated: acc.zeroRated + r.zeroRatedSales,
        vatPayable: acc.vatPayable + r.vatPayable,
        netSales: acc.netSales + r.netSales,
        totalIncome: acc.totalIncome + r.totalIncome,
      }),
      {
        revenue: 0, scDisc: 0, pwdDisc: 0, naacDisc: 0, spDisc: 0, otherDisc: 0,
        returns: 0, voids: 0, deductions: 0, vatable: 0, vatAmount: 0, vatExempt: 0,
        zeroRated: 0, vatPayable: 0, netSales: 0, totalIncome: 0,
      }
    );
    const totalsRow = [
      'TOTAL', '', '',
      formatCurrency(totals.revenue), formatCurrency(totals.scDisc),
      formatCurrency(totals.pwdDisc), formatCurrency(totals.naacDisc),
      formatCurrency(totals.spDisc), formatCurrency(totals.otherDisc),
      formatCurrency(totals.returns), formatCurrency(totals.voids),
      formatCurrency(totals.deductions), formatCurrency(totals.vatable),
      formatCurrency(totals.vatAmount), formatCurrency(totals.vatExempt),
      formatCurrency(totals.zeroRated), formatCurrency(totals.vatPayable),
      formatCurrency(totals.netSales), formatCurrency(totals.totalIncome),
      '', '',
    ];
    const business = await fetchPrintBusinessInfo();
    printReport({
      title: 'BIR Sales Summary Report',
      subtitle: dateRangeLabel(),
      headers,
      rows,
      numericColumns,
      totalsRow,
      business,
      orientation: 'landscape',
      summary: [
        { label: 'Gross Sales', value: formatCurrency(totals.revenue) },
        { label: 'Total Discounts', value: formatCurrency(totals.scDisc + totals.pwdDisc + totals.naacDisc + totals.spDisc + totals.otherDisc) },
        { label: 'VAT Amount', value: formatCurrency(totals.vatAmount) },
        { label: 'Net Sales', value: formatCurrency(totals.netSales) },
        { label: 'Total Income', value: formatCurrency(totals.totalIncome) },
      ],
    });
  };

  const hasActiveFilters = dateRange || searchTerm;

  const fetchAllForExport = async () => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    params.append('limit', '1000000');
    try {
      const res = await fetch(`/api/sales/bir-summary?${params.toString()}`);
      const result = await res.json();
      return result.success && Array.isArray(result.data) ? result.data : [];
    } catch {
      return [];
    }
  };

  const exportToCSV = async () => {
    const data = await fetchAllForExport();
    const headers = [
      'Date', 'Starting OR', 'Ending OR', 'Gross Sales', 'SC Discount', 'PWD Discount',
      'NAAC Discount', 'SP Discount', 'Other Discount', 'Returns', 'Voids', 'Total Deductions',
      'Vatable Sales', 'VAT Amount', 'VAT Exempt', 'Zero-Rated', 'VAT Payable',
      'Net Sales', 'Total Income', 'Z-Counter', 'Remarks'
    ];
    const csvRows = data.map((item: BIRSalesData) => [
      formatDate(item.date), item.startOR || '', item.endOR || '', item.totalRevenue,
      item.discountSeniorCitizen, item.discountPWD, item.discountNAAC, item.discountSoloParent,
      item.discountOther, item.returns, item.voids, item.totalDeductions,
      item.vatableSales, item.vatAmount, item.vatExemptSales, item.zeroRatedSales,
      item.vatPayable, item.netSales, item.totalIncome, item.zCounter, item.remarks || ''
    ]);
    const csvContent = [
      headers.join(','),
      ...csvRows.map((r: any[]) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bir_sales_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const columns = useMemo<ColumnDef<BIRSalesData>[]>(
    () => [
      {
        id: 'date',
        accessorKey: 'date',
        header: ({ column }) => <SortBtn column={column}>Date</SortBtn>,
        cell: ({ getValue }) => <span className="font-medium">{formatDate(getValue() as string)}</span>,
      },
      {
        id: 'orRange',
        header: 'OR Range',
        cell: ({ row }) => (row.original.startOR && row.original.endOR)
          ? `${row.original.startOR} - ${row.original.endOR}`
          : '-',
        enableSorting: false,
      },
      {
        id: 'totalRevenue',
        accessorKey: 'totalRevenue',
        header: ({ column }) => <SortBtn column={column}>Gross Sales</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block font-semibold">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'totalDiscount',
        accessorKey: 'totalDiscount',
        header: ({ column }) => <SortBtn column={column}>Total Discount</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'vatableSales',
        accessorKey: 'vatableSales',
        header: ({ column }) => <SortBtn column={column}>Vatable Sales</SortBtn>,
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
        id: 'vatPayable',
        accessorKey: 'vatPayable',
        header: ({ column }) => <SortBtn column={column}>VAT Payable</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'netSales',
        accessorKey: 'netSales',
        header: ({ column }) => <SortBtn column={column}>Net Sales</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block font-semibold">{formatCurrency(getValue() as number)}</span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>BIR Sales Summary Report</CardTitle>
            <CardDescription>Daily sales summary for BIR compliance and reporting.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 shrink-0">
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Gross Sales</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.revenue)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Total Discount</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.discounts)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Vatable Sales</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.vatableSales)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">VAT Amount</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.vatAmount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">VAT Payable</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.vatPayable)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Net Sales</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(summaryTotals.netSales)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Total Deductions</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.deductions)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Total Income</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(summaryTotals.totalIncome)}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-muted/20 p-2 rounded-md border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by date or OR..."
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
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Print */}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>

            {/* Date Range Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('h-8 justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from
                    ? dateRange.to
                      ? <>{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}</>
                      : format(dateRange.from, 'LLL dd, y')
                    : <span>Pick a date range</span>}
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

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
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
                      ['totalRevenue', 'totalDiscount', 'vatableSales', 'vatAmount', 'vatPayable', 'netSales'].includes(header.column.id) && 'text-right'
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
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading data...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.original.date}
                  className={cn(
                    'hover:bg-muted/50',
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2 px-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                  No data found for the selected criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!isLoading && filteredData.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">
                Rows per page
              </Label>
              <Select
                value={limit.toString()}
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setCurrentPage(1);
                }}
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
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i + 1}>
                      <PaginationLink
                        isActive={currentPage === i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
    </Card>
  );
}
