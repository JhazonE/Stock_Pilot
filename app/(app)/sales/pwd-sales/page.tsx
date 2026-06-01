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
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import {
  Search,
  X,
  Loader2,
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
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

type PWDTransaction = {
  date: string;
  customerName: string;
  pwdId: string;
  pwdTin: string;
  siOrNumber: string;
  grossSales: number;
  vatAmount: number;
  vatExemptSales: number;
  discount: number;
  netSales: number;
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

export default function PWDSalesPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});


  const { data: rawData, isLoading } = useQuery({
    queryKey: [
      'pwdSales',
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
      const res = await fetch(`/api/sales/pwd-sales?${params.toString()}`);
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const salesData: PWDTransaction[] = rawData?.success ? rawData.data : [];
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
      const nameMatch = (row.customerName || '').toLowerCase().includes(term);
      const idMatch = (row.pwdId || '').toLowerCase().includes(term);
      const tinMatch = (row.pwdTin || '').toLowerCase().includes(term);
      const orMatch = (row.siOrNumber || '').toLowerCase().includes(term);
      return nameMatch || idMatch || tinMatch || orMatch;
    });
  }, [salesData, searchTerm]);

  const summaryTotals = useMemo(
    () =>
      salesData.reduce(
        (acc, row) => ({
          grossSales: acc.grossSales + row.grossSales,
          vatAmount: acc.vatAmount + row.vatAmount,
          vatExemptSales: acc.vatExemptSales + row.vatExemptSales,
          discount: acc.discount + row.discount,
          netSales: acc.netSales + row.netSales,
        }),
        {
          grossSales: 0,
          vatAmount: 0,
          vatExemptSales: 0,
          discount: 0,
          netSales: 0,
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
    const data: PWDTransaction[] = await fetchAllForExport();
    const headers = [
      'Date', 'Name of Person with Disability', 'PWD ID No.', 'PWD TIN', 'SI/OR Number',
      'Sales (Inclusive of VAT)', 'VAT Amount', 'VAT Exempt Sales', 'Discount (5% & 20%)', 'Net Sales',
    ];
    const numericColumns = [5, 6, 7, 8, 9];
    const rows = data.map((item) => [
      formatDate(item.date), item.customerName || '', item.pwdId || '', item.pwdTin || '',
      item.siOrNumber || '', formatCurrency(item.grossSales), formatCurrency(item.vatAmount),
      formatCurrency(item.vatExemptSales), formatCurrency(item.discount), formatCurrency(item.netSales),
    ]);
    const totals = data.reduce(
      (acc, r) => ({
        grossSales: acc.grossSales + r.grossSales,
        vatAmount: acc.vatAmount + r.vatAmount,
        vatExemptSales: acc.vatExemptSales + r.vatExemptSales,
        discount: acc.discount + r.discount,
        netSales: acc.netSales + r.netSales,
      }),
      { grossSales: 0, vatAmount: 0, vatExemptSales: 0, discount: 0, netSales: 0 }
    );
    const totalsRow = [
      'TOTAL', '', '', '', '',
      formatCurrency(totals.grossSales), formatCurrency(totals.vatAmount),
      formatCurrency(totals.vatExemptSales), formatCurrency(totals.discount),
      formatCurrency(totals.netSales),
    ];
    const business = await fetchPrintBusinessInfo();
    printReport({
      title: 'PWD Sales Report',
      subtitle: dateRangeLabel(),
      headers,
      rows,
      numericColumns,
      totalsRow,
      business,
      orientation: 'landscape',
      summary: [
        { label: 'Transactions', value: String(data.length) },
        { label: 'Gross Sales', value: formatCurrency(totals.grossSales) },
        { label: 'VAT Exempt', value: formatCurrency(totals.vatExemptSales) },
        { label: 'Total Discount', value: formatCurrency(totals.discount) },
        { label: 'Net Sales', value: formatCurrency(totals.netSales) },
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
      const res = await fetch(`/api/sales/pwd-sales?${params.toString()}`);
      const result = await res.json();
      return result.success && Array.isArray(result.data) ? result.data : [];
    } catch {
      return [];
    }
  };

  const exportToCSV = async () => {
    const data = await fetchAllForExport();
    const headers = [
      'Date', 'Name of Person with Disability', 'PWD ID No.', 'PWD TIN', 'SI/OR Number',
      'Sales (Inclusive of VAT)', 'VAT Amount', 'VAT Exempt Sales', 'Discount (5% & 20%)', 'Net Sales'
    ];
    const csvRows = data.map((item: PWDTransaction) => [
      formatDate(item.date), item.customerName || '', item.pwdId || '', item.pwdTin || '',
      item.siOrNumber || '', item.grossSales, item.vatAmount, item.vatExemptSales,
      item.discount, item.netSales
    ]);
    const csvContent = [
      headers.join(','),
      ...csvRows.map((r: any[]) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pwd_sales_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const columns = useMemo<ColumnDef<PWDTransaction>[]>(
    () => [
      {
        id: 'date',
        accessorKey: 'date',
        header: ({ column }) => <SortBtn column={column}>Date</SortBtn>,
        cell: ({ getValue }) => <span>{formatDate(getValue() as string)}</span>,
      },
      {
        id: 'customerName',
        accessorKey: 'customerName',
        header: ({ column }) => <SortBtn column={column}>PWD Name</SortBtn>,
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        id: 'pwdId',
        accessorKey: 'pwdId',
        header: 'PWD ID No.',
        cell: ({ getValue }) => getValue() || '-',
        enableSorting: false,
      },
      {
        id: 'pwdTin',
        accessorKey: 'pwdTin',
        header: 'PWD TIN',
        cell: ({ getValue }) => getValue() || '-',
        enableSorting: false,
      },
      {
        id: 'siOrNumber',
        accessorKey: 'siOrNumber',
        header: 'SI/OR No.',
        cell: ({ getValue }) => getValue() || '-',
        enableSorting: false,
      },
      {
        id: 'grossSales',
        accessorKey: 'grossSales',
        header: ({ column }) => <SortBtn column={column}>Sales (w/ VAT)</SortBtn>,
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
        header: ({ column }) => <SortBtn column={column}>VAT Exempt</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        id: 'discount',
        accessorKey: 'discount',
        header: ({ column }) => <SortBtn column={column}>Discount (5% & 20%)</SortBtn>,
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
            <CardTitle>Person with Disability (PWD) Sales Book</CardTitle>
            <CardDescription>Transaction details for PWD customers (PWD discounts and VAT exemptions).</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2 shrink-0">
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Total Sales</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.grossSales)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">VAT Amount</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.vatAmount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">VAT Exempt</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.vatExemptSales)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Discount</p>
            <p className="text-sm font-bold">{formatCurrency(summaryTotals.discount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <p className="text-[10px] text-muted-foreground font-medium">Net Sales</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(summaryTotals.netSales)}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-muted/20 p-2 rounded-md border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, ID, TIN..."
              className="pl-8 w-full h-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
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

            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>

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
                      ['grossSales', 'vatAmount', 'vatExemptSales', 'discount', 'netSales'].includes(header.column.id) && 'text-right'
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
                  key={`${row.original.siOrNumber}-${index}`}
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
                  No PWD transactions found.
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
