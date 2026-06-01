
'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { WindowControls } from '@/components/window-controls';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Lightbulb,
  Search,
  Bell,
  Warehouse,
  Receipt,
  Monitor,
  LogOut,
  User as UserIcon,
  History,
  ArrowRightLeft,
  Users,
  Settings,
  Package2,
  ChartNoAxesCombined,
  ClipboardCheck,
  Menu,
  X,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { handleSignOut } from '../auth-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { getProducts, getLowStockAlerts } from './products/actions';
import { Product } from '@/lib/types';
import { AppBreadcrumbs } from '@/components/app-breadcrumbs';
import { Logo } from '@/components/logo';
import { getApiUrl } from '@/lib/api-config';
import { ApprovalsDrawer } from '@/components/approvals/approvals-drawer';
import { WorkflowSettingsDrawer } from '@/components/approvals/workflow-settings-drawer';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { NavigationProgress } from '@/components/navigation-progress';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'view_dashboard' },
  { href: '/products', icon: Package, label: 'Products', permission: 'manage_products' },
];

const inventoryNavItems = [
  { href: '/inventory', label: 'Stock Levels' },
  { href: '/inventory/stock-counts', label: 'Stock Counts (Snapshots)' },
  { href: '/inventory/repackaging', label: 'Repackaging' },
  { href: '/inventory/history', label: 'Adjustment History' },
  { href: '/inventory/movement', label: 'Stock Movement' },
]

const salesNavItems = [
  { href: '/sales', label: 'POS Sales Transaction' },
  { href: '/sales/details', label: 'POS Sales Detail' },
  { href: '/sales/by-product', label: 'Sales by Product/Service' },
  { href: '/sales/by-date', label: 'Sales by Date' },
  { href: '/sales/orders', label: 'Sales Order' },
  { href: '/sales/invoices', label: 'Sales Invoice/Delivery' },
  { href: '/sales/cash-transfer', label: 'POS Cash Transfer' },
  { href: '/sales/returns', label: 'Merchandise Credits' },
  { href: '/sales/voids', label: 'Post Void' },
  { href: '/sales/z-reading', label: 'POS Z-Reading' },
  { href: '/sales/x-reading', label: 'POS X-Reading' },
  { href: '/sales/overall-reading', label: 'POS Overall Reading' },
  { href: '/sales/analysis', label: 'Sales Analysis' },
];

const customerNavItems = [
  { href: '/customer', label: 'Customer List' },
  { href: '/customer/payment', label: 'Customer Payment' },
  { href: '/customer/balances', label: 'Customer Balances' },
  { href: '/customer/loyalty', label: 'Customer Loyalty Points' },
];

const suppliersNavItems = [
  { href: '/suppliers/list', label: 'Supplier List' },
  { href: '/suppliers/balance', label: 'Balance to Supplier' },
  { href: '/suppliers/payment', label: 'Payment Suppliers' },
];

const otherNavItems = [
  { href: '/approvals', icon: ClipboardCheck, label: 'Approvals Board', permission: 'view_approvals' },
  { href: '/approvals/settings', icon: Settings, label: 'Workflow Settings', permission: 'manage_approval_settings' },
  { href: '/reports', icon: BarChart3, label: 'Reports', permission: 'view_reports' },
  // Suppliers moved to own section
  { href: '/user-management', icon: Users, label: 'User Management', permission: 'manage_users' },
  { href: '/settings', icon: Settings, label: 'Settings', permission: 'manage_settings' },
];

const purchasesNavItems = [
  { href: '/purchases', label: 'Purchase Orders' },
  { href: '/purchases/bad-orders', label: 'Bad Orders' },
];

const queryClient = new QueryClient();

function AnimatedHamburger() {
  const { toggleSidebar, state } = useSidebar();
  const isOpen = state === 'expanded';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="relative h-9 w-9 rounded-lg border border-transparent bg-background/40 hover:bg-accent hover:border-border hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] hover:ring-1 hover:ring-primary/30 transition-all duration-200 active:scale-95 group"
        >
          <span className="relative block h-4 w-5">
            <span
              className="absolute left-0 top-0 block h-[2px] w-5 origin-center rounded-full bg-foreground transition-transform duration-300 ease-out group-hover:bg-primary"
              style={{ transform: isOpen ? 'none' : 'translateY(7px) rotate(45deg)' }}
            />
            <span
              className="absolute left-0 top-[7px] block h-[2px] w-5 rounded-full bg-foreground transition-opacity duration-200 ease-out group-hover:bg-primary"
              style={{ opacity: isOpen ? 1 : 0 }}
            />
            <span
              className="absolute left-0 top-[14px] block h-[2px] w-5 origin-center rounded-full bg-foreground transition-transform duration-300 ease-out group-hover:bg-primary"
              style={{ transform: isOpen ? 'none' : 'translateY(-7px) rotate(-45deg)' }}
            />
          </span>
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isOpen ? 'Collapse sidebar' : 'Expand sidebar'} <kbd className="ml-1 rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Ctrl B</kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const current = mounted ? (theme || 'system') : 'system';
  const options: { key: 'light' | 'dark' | 'system'; icon: React.ElementType; label: string }[] = [
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'dark', icon: Moon, label: 'Dark' },
    { key: 'system', icon: Laptop, label: 'System' },
  ];
  return (
    <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 p-1 shadow-inner">
        {options.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            aria-label={label}
            title={label}
            className={`relative flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all duration-200 ${
              current === key
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const normalizeText = (s: string) => s.toLowerCase().trim();

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ email: string, permissions?: string[], userType?: string } | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [businessName, setBusinessName] = useState<string>('Stockpilot');
  const [navSearch, setNavSearch] = useState('');

  const isPOSPage = pathname === '/pos' || pathname === '/pos/customer-display';

  useEffect(() => {
    // Skip global auth enforcement if landing directly on the POS page or customer display.
    if (pathname === '/pos' || pathname === '/pos/customer-display') {
      setIsUserLoading(false);
      return;
    }

    const userSession = localStorage.getItem('mock-user-session');
    if (userSession) {
      setUser(JSON.parse(userSession));
    } else {
      router.push('/login');
    }
    setIsUserLoading(false);

  }, [router, pathname]);

  useEffect(() => {
    fetch(getApiUrl('/pos-settings'))
      .then(res => { if (!res.ok) throw new Error('not ok'); return res.json(); })
      .then(result => {
        if (result.success && result.data?.businessName != null && result.data.businessName !== '') {
          setBusinessName(result.data.businessName);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = businessName;
  }, [businessName]);

  // Force Cashiers to the POS page
  useEffect(() => {
    if (user?.userType === 'Cashier' && pathname !== '/pos') {
      router.push('/pos');
    }
  }, [user, pathname, router]);

  // If this is the POS page, immediately bypass the layout and global auth checks!
  if (isPOSPage) {
    return <>{children}</>;
  }

  // Enforce auth UI wrapper for normal pages
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasPermission = (permission?: string) => {
    if (!user) return false;

    // Super admin bypass
    if (user.permissions?.includes('super_admin')) return true;

    // Cashier restriction: ONLY access_pos is allowed
    if (user.userType === 'Cashier') {
      return permission === 'access_pos';
    }

    // General permission check
    if (permission && !user.permissions?.includes(permission)) {
      return false;
    }

    return true;
  };

  const isSalesPage = pathname.startsWith('/sales');
  const isInventoryPage = pathname.startsWith('/inventory');
  const isCustomerPage = pathname.startsWith('/customer');
  const isSuppliersPage = pathname.startsWith('/suppliers');
  const isPurchasesPage = pathname.startsWith('/purchases');

  const getInitials = (email?: string | null) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  };

  const matchesSearch = (label: string) => !navSearch || normalizeText(label).includes(normalizeText(navSearch));
  const isSearching = navSearch.trim().length > 0;

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission) && matchesSearch(item.label));
  const filteredOtherNavItems = otherNavItems.filter(item => hasPermission(item.permission) && matchesSearch(item.label));

  const inventoryFiltered = matchesSearch('Inventory') ? inventoryNavItems : inventoryNavItems.filter(i => matchesSearch(i.label));
  const salesFiltered = matchesSearch('Sales') ? salesNavItems : salesNavItems.filter(i => matchesSearch(i.label));
  const customerFiltered = matchesSearch('Customers') ? customerNavItems : customerNavItems.filter(i => matchesSearch(i.label));
  const purchasesFiltered = matchesSearch('Purchases') ? purchasesNavItems : purchasesNavItems.filter(i => matchesSearch(i.label));
  const suppliersFiltered = matchesSearch('Suppliers') ? suppliersNavItems : suppliersNavItems.filter(i => matchesSearch(i.label));

  const showInventoryGroup = hasPermission('manage_inventory') && inventoryFiltered.length > 0;
  const showSalesGroup = hasPermission('view_sales') && salesFiltered.length > 0;
  const showCustomerGroup = hasPermission('manage_customers') && customerFiltered.length > 0;
  const showPurchasesGroup = hasPermission('manage_purchases') && purchasesFiltered.length > 0;
  const showSuppliersGroup = hasPermission('manage_suppliers') && suppliersFiltered.length > 0;
  const showOperationsGroup = showInventoryGroup || showSalesGroup || showCustomerGroup || showPurchasesGroup || showSuppliersGroup;
  const hasAnyMatch = filteredNavItems.length > 0 || filteredOtherNavItems.length > 0 || showOperationsGroup;

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <SidebarProvider className="h-screen overflow-hidden">
      <Sidebar className="non-printable border-r" collapsible="icon">
        <SidebarHeader className="h-20 border-b border-sidebar-border sticky top-0 bg-gradient-to-b from-sidebar to-sidebar/95 backdrop-blur-xl z-10 px-6 group-data-[collapsible=icon]:px-0 justify-center shadow-sm">
          <div className="flex items-center gap-3 transition-all duration-300 group-data-[collapsible=icon]:justify-center">
            <Logo variant="icon" size={36} />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
               <h1 className="text-xl font-extrabold font-headline tracking-tight text-sidebar-foreground">{businessName}</h1>
               <span className="text-[10px] uppercase font-bold text-primary tracking-[0.2em] mt-0.5 opacity-90">Enterprise</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4 gap-2 overflow-y-auto flex-1 group-data-[collapsible=icon]:px-0">
          <div className="px-2 mb-2 group-data-[collapsible=icon]:hidden">
            <div className="relative group/search">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
              <Input
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search menu..."
                className="h-8 pl-8 pr-7 text-[12px] bg-sidebar-accent/30 border-sidebar-border/60 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-background transition-all"
              />
              {navSearch && (
                <button
                  type="button"
                  onClick={() => setNavSearch('')}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          {filteredNavItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Platform</SidebarGroupLabel>
              <SidebarMenu>
                {filteredNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={{ children: item.label }}
                        className="group/nav relative gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm hover:translate-x-0.5 hover:bg-sidebar-accent/50 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-0 before:bg-primary before:rounded-r-full before:transition-all before:duration-300 data-[active=true]:before:h-2/3 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:via-primary/10 data-[active=true]:to-transparent data-[active=true]:text-primary data-[active=true]:shadow-sm [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110 data-[active=true]:[&_svg]:text-primary"
                      >
                        <item.icon />
                        <span className="text-[14px]">{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}

          {showOperationsGroup && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Operations</SidebarGroupLabel>

            <SidebarMenu>

              {showInventoryGroup && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isInventoryPage} open={isSearching ? true : undefined} className="group/collapsible group-data-[collapsible=icon]:items-center">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isInventoryPage}
                        tooltip={{ children: "Inventory" }}
                        className="group/nav relative justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm hover:translate-x-0.5 hover:bg-sidebar-accent/50 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-0 before:bg-primary before:rounded-r-full before:transition-all before:duration-300 data-[active=true]:before:h-2/3 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:via-primary/5 data-[active=true]:to-transparent data-[active=true]:shadow-sm [&_>div_svg]:transition-transform [&_>div_svg]:duration-200 hover:[&_>div_svg]:scale-110 data-[active=true]:[&_>div_svg]:text-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Warehouse />
                          <span className="text-[14px]">Inventory</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                        {inventoryFiltered.map((item) => (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={pathname === item.href} className="relative text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 hover:translate-x-0.5 transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold">
                              <Link href={item.href}>{item.label}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {showSalesGroup && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isSalesPage} open={isSearching ? true : undefined} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isSalesPage}
                        tooltip={{ children: "Sales" }}
                        className="group/nav relative justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm hover:translate-x-0.5 hover:bg-sidebar-accent/50 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-0 before:bg-primary before:rounded-r-full before:transition-all before:duration-300 data-[active=true]:before:h-2/3 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:via-primary/5 data-[active=true]:to-transparent data-[active=true]:shadow-sm [&_>div_svg]:transition-transform [&_>div_svg]:duration-200 hover:[&_>div_svg]:scale-110 data-[active=true]:[&_>div_svg]:text-primary"
                      >
                         <div className="flex items-center gap-3">
                          <ChartNoAxesCombined />
                          <span className="text-[14px]">Sales</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                        {salesFiltered.map((item) => (
                          <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="relative text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 hover:translate-x-0.5 transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold">
                              <Link href={item.href}>{item.label}</Link>
                             </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}


               {showCustomerGroup && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isCustomerPage} open={isSearching ? true : undefined} className="group/collapsible">
                     <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isCustomerPage}
                        tooltip={{ children: "Customers" }}
                        className="group/nav relative justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm hover:translate-x-0.5 hover:bg-sidebar-accent/50 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-0 before:bg-primary before:rounded-r-full before:transition-all before:duration-300 data-[active=true]:before:h-2/3 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:via-primary/5 data-[active=true]:to-transparent data-[active=true]:shadow-sm [&_>div_svg]:transition-transform [&_>div_svg]:duration-200 hover:[&_>div_svg]:scale-110 data-[active=true]:[&_>div_svg]:text-primary"
                      >
                        <div className="flex items-center gap-3">
                          <UserIcon />
                          <span className="text-[14px]">Customers</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                     <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                        {customerFiltered.map((item) => (
                           <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="relative text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 hover:translate-x-0.5 transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold">
                              <Link href={item.href}>{item.label}</Link>
                             </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

               {showPurchasesGroup && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isPurchasesPage} open={isSearching ? true : undefined} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isPurchasesPage}
                        tooltip={{ children: "Purchases" }}
                         className="group/nav relative justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm hover:translate-x-0.5 hover:bg-sidebar-accent/50 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-0 before:bg-primary before:rounded-r-full before:transition-all before:duration-300 data-[active=true]:before:h-2/3 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:via-primary/5 data-[active=true]:to-transparent data-[active=true]:shadow-sm [&_>div_svg]:transition-transform [&_>div_svg]:duration-200 hover:[&_>div_svg]:scale-110 data-[active=true]:[&_>div_svg]:text-primary"
                      >
                         <div className="flex items-center gap-3">
                          <ShoppingCart />
                          <span className="text-[14px]">Purchases</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                         {purchasesFiltered.map((item) => (
                          <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="relative text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 hover:translate-x-0.5 transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold">
                              <Link href={item.href}>{item.label}</Link>
                             </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

               {showSuppliersGroup && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isSuppliersPage} open={isSearching ? true : undefined} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isSuppliersPage}
                        tooltip={{ children: "Suppliers" }}
                         className="group/nav relative justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm hover:translate-x-0.5 hover:bg-sidebar-accent/50 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-0 before:bg-primary before:rounded-r-full before:transition-all before:duration-300 data-[active=true]:before:h-2/3 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:via-primary/5 data-[active=true]:to-transparent data-[active=true]:shadow-sm [&_>div_svg]:transition-transform [&_>div_svg]:duration-200 hover:[&_>div_svg]:scale-110 data-[active=true]:[&_>div_svg]:text-primary"
                      >
                         <div className="flex items-center gap-3">
                          <Users />
                          <span className="text-[14px]">Suppliers</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                         {suppliersFiltered.map((item) => (
                          <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="relative text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 hover:translate-x-0.5 transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold">
                              <Link href={item.href}>{item.label}</Link>
                             </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
          )}

          {filteredOtherNavItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Management</SidebarGroupLabel>
              <SidebarMenu>
                {filteredOtherNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={{ children: item.label }}
                        className="group/nav relative gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm hover:translate-x-0.5 hover:bg-sidebar-accent/50 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-0 before:bg-primary before:rounded-r-full before:transition-all before:duration-300 data-[active=true]:before:h-2/3 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:via-primary/10 data-[active=true]:to-transparent data-[active=true]:text-primary data-[active=true]:shadow-sm [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110 data-[active=true]:[&_svg]:text-primary"
                      >
                        <item.icon />
                        <span className="text-[14px]">{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
          {isSearching && !hasAnyMatch && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              <Search className="mx-auto h-6 w-6 opacity-40 mb-2" />
              <p className="font-medium">No menu items found</p>
              <p className="text-[11px] mt-1 opacity-70">Try a different search term</p>
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="sticky bottom-0 bg-gradient-to-t from-sidebar to-sidebar/95 backdrop-blur-xl border-t border-sidebar-border mt-auto shadow-lg">
          <SidebarThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 overflow-hidden rounded-lg p-3 text-left text-sm text-sidebar-foreground outline-none ring-sidebar-ring transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground focus-visible:ring-2 hover:shadow-sm">
                <Avatar className="size-9 ring-2 ring-sidebar-border shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold border border-primary/20">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-semibold">
                    {user.email || 'Anonymous'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">View Profile</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">My Account</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSignOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">

        <header className="sticky top-0 z-30 flex items-center h-16 gap-4 px-4 border-b bg-background/80 backdrop-blur-sm sm:px-6 non-printable window-drag">
          <div className="flex items-center gap-4 window-no-drag">
            <AnimatedHamburger />
            <AppBreadcrumbs />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <NotificationsBell user={user} />
            <WindowControls />
          </div>
        </header>
        <main className="flex-1 flex flex-col overflow-auto p-4 sm:p-6 min-h-0 min-w-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
    </QueryClientProvider>
  );
}

function NotificationsBell({ user }: { user: { email: string, permissions?: string[], userType?: string, roleId?: string, uid?: string } | null }) {
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; type: 'warning' | 'info'; link: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const checkNotifications = useCallback(async () => {
    try {
      // First check if notifications are enabled
      const settingsResponse = await fetch('/api/pos-settings');
      if (!settingsResponse.ok) return;
      const settingsResult = await settingsResponse.json();

      if (!settingsResult.success || !settingsResult.data.enablePushNotifications) {
          setNotifications([]);
          return;
      }

      // 1. Fetch Low Stock Alerts
      const lowStock = await getLowStockAlerts();
      const lowStockNotifications = lowStock.map((p: any) => ({
          id: `low-stock-${p.id}`,
          title: 'Low Stock Alert',
          message: `${p.name} is below reorder point (${p.stock}/${p.reorderPoint})`,
          type: 'warning' as const,
          link: `/products?filter=low-stock`
      }));

      // 2. Fetch Approvals
      let approvalNotifications: { id: string; title: string; message: string; type: 'warning' | 'info'; link: string }[] = [];
      
      if (user) {
        const approvalsRes = await fetch('/api/approvals/queue?status=ALL');
        if (!approvalsRes.ok) return;
        const approvalsData = await approvalsRes.json();

        if (approvalsData.success) {
          const items = approvalsData.data;

          // Approver Notifications (Pending)
          const canAction = (item: any) => {
            if (item.status !== 'Pending') return false;
            const isAdmin = user.userType === 'Admin' || user.userType === 'Super Admin' || user.email === 'admin@example.com';
            if (isAdmin) return true;
            const byId   = user.roleId   && String(user.roleId)   === String(item.currentStepRoleId);
            const byName = user.userType && String(user.userType) === String(item.currentStepRole);
            return !!(byId || byName);
          };

          const pendingItems = items.filter(canAction);
          const approverNotes = pendingItems.map((item: any) => ({
            id: `approval-pending-${item.id}`,
            title: 'Pending Approval',
            message: `${item.transaction_type.replace(/_/g, ' ')} requested by ${item.requester_name}`,
            type: 'info' as const,
            link: `/approvals`
          }));

          // Requester Notifications (Approved/Rejected)
          const requesterItems = items.filter((item: any) => 
            item.created_by === user.uid && item.status !== 'Pending'
          );

          // Filter for items updated in the last 24 hours
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentRequesterItems = requesterItems.filter((item: any) => {
            const updatedAt = new Date(item.updated_at);
            return updatedAt > oneDayAgo;
          });

          const requesterNotes = recentRequesterItems.map((item: any) => ({
            id: `approval-status-${item.id}`,
            title: `Request ${item.status}`,
            message: `Your ${item.transaction_type.replace(/_/g, ' ')} request has been ${item.status.toLowerCase()}`,
            type: item.status === 'Approved' ? 'info' as const : 'warning' as const,
            link: `/approvals`
          }));

          approvalNotifications = [...approverNotes, ...requesterNotes];
        }
      }
      
      setNotifications([...lowStockNotifications, ...approvalNotifications]);
    } catch (e) {
        console.error("Failed to fetch notifications", e);
    }
  }, [user]);

  // Poll for notifications and listen for updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    checkNotifications();
    
    interval = setInterval(checkNotifications, 30000);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkNotifications]);

  useLiveRefresh(checkNotifications);

  const unreadCount = notifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-600 border-2 border-background animate-pulse" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 font-medium border-b">Notifications</div>
        <div className="max-h-[300px] overflow-y-auto">
             {notifications.length === 0 ? (
                 <div className="p-4 text-center text-sm text-muted-foreground">
                     No new notifications
                 </div>
             ) : (
                 <div className="grid">
                     {notifications.map((notification) => (
                        <div 
                            key={notification.id} 
                            className="p-4 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors"
                            onClick={() => {
                                setIsOpen(false);
                                router.push(notification.link);
                            }}
                        >
                            <div className="flex gap-3">
                                <div className="mt-1">
                                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium leading-none">{notification.title}</p>
                                    <p className="text-sm text-muted-foreground mt-1 text-xs">
                                        {notification.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                     ))}
                 </div>
             )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
