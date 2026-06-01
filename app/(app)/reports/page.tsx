
'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { Package, ArrowLeftRight, AlertTriangle, TrendingUp, ClipboardList, Receipt, Package2, Percent, Undo, Users, BarChart, LineChart, PhilippinePeso, ShoppingCart, Layers, CreditCard } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="grid gap-6 auto-rows-max">
      {/* Inventory Reports Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Inventory Reports</h2>
        <p className="text-muted-foreground">
          Comprehensive inventory tracking, stock levels, and movement analysis.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/reports/inventory">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Stock on Hand & Valuation
                </CardTitle>
                <CardDescription>Current inventory levels and total value (Avg Cost).</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/movements">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Stock Movement
                </CardTitle>
                <CardDescription>History of stock changes with date filtering.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/low-stock">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Low Stock Report
                </CardTitle>
                <CardDescription>Products below reorder point.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/velocity">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Fast & Slow Moving
                </CardTitle>
                <CardDescription>Product sales velocity analysis.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/adjustments">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Adjustment Report
                </CardTitle>
                <CardDescription>Log of damaged, lost, or corrected stock.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
      </div>

      {/* Sales Reports Section */}
      <div className="space-y-2 mt-8">
        <h2 className="text-2xl font-bold tracking-tight">Sales Reports</h2>
        <p className="text-muted-foreground">
          Comprehensive sales analysis, revenue tracking, and customer insights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/reports/sales/summary">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhilippinePeso className="h-5 w-5 text-blue-600" />
                  Sales Summary
                </CardTitle>
                <CardDescription>Overall sales transactions with revenue, profit, and tax analysis.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/sales/by-product">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5 text-green-600" />
                  Sales by Product
                </CardTitle>
                <CardDescription>Product performance analysis with units sold and revenue breakdown.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/sales/top-volume">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-indigo-500" />
                  Top by Volume
                </CardTitle>
                <CardDescription>Highest selling items based on quantity sold.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/sales/top-sales">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-rose-500" />
                  Top by Sales
                </CardTitle>
                <CardDescription>Highest revenue generating items.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/sales/profit-margin">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-purple-600" />
                  Profit Margin Report
                </CardTitle>
                <CardDescription>Profitability analysis with margin percentages and ROI metrics.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/sales/returns">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Undo className="h-5 w-5 text-orange-600" />
                  Sales Returns
                </CardTitle>
                <CardDescription>Merchandise credit report with returned items and refund tracking.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/sales/batch-profit">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-600" />
                  Batch Profit Analysis
                </CardTitle>
                <CardDescription>Granular profit analysis per inventory batch with FIFO cost tracking.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/sales/by-customer">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Sales by Customer
                </CardTitle>
                <CardDescription>Customer purchase history with credit sales and outstanding balances.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/sales/split-payments">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-blue-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  Split Payments Report
                </CardTitle>
                <CardDescription>Breakdown of sales transactions paid with multiple payment methods.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
      </div>

      {/* BIR Compliance Reports Section */}
      <div className="space-y-2 mt-8">
        <h2 className="text-2xl font-bold tracking-tight">BIR Compliance Reports</h2>
        <p className="text-muted-foreground">
          Bureau of Internal Revenue compliance reports for tax documentation and filing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/sales/bir-summary">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-red-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-red-600" />
                  BIR Sales Summary
                </CardTitle>
                <CardDescription>Daily sales aggregation with VAT breakdown and deductions for BIR reporting.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/sales/senior-citizen-sales">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Senior Citizen Sales
                </CardTitle>
                <CardDescription>SC customer transactions with OSCA ID and TIN tracking for VAT discounts.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/sales/pwd-sales">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  PWD Sales Book
                </CardTitle>
                <CardDescription>Person with Disability transactions with PWD ID and VAT exemption documentation.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/sales/naac-sales">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  NAAC Sales Book
                </CardTitle>
                <CardDescription>National Athletes and Coaches transactions with PNSTM ID tracking.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/sales/solo-parent-sales">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-orange-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  Solo Parent Sales Book
                </CardTitle>
                <CardDescription>Solo Parent transactions with dependent child information and discount tracking.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
      </div>

      {/* Purchases Reports Section */}
      <div className="space-y-2 mt-8">
        <h2 className="text-2xl font-bold tracking-tight">Purchases Reports</h2>
        <p className="text-muted-foreground">
          Analyze procurement activity, supplier spending, and product costs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/reports/purchases/summary">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  Purchases Summary
                </CardTitle>
                <CardDescription>Overview of all purchase orders with status and payment tracking.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/purchases/by-supplier">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Purchases by Supplier
                </CardTitle>
                <CardDescription>Spending analysis per supplier with order frequency and last purchase.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports/purchases/by-product">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5 text-green-600" />
                  Purchases by Product
                </CardTitle>
                <CardDescription>Detailed breakdown of item procurement with cost and quantity analysis.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
      </div>
    </div>
  );
}
