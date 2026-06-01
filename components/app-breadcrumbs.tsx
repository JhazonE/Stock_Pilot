'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment } from 'react';

export function AppBreadcrumbs() {
  const pathname = usePathname();

  // Check if this is a BIR report page
  const birReportPages = [
    'bir-summary',
    'senior-citizen-sales',
    'pwd-sales',
    'naac-sales',
    'solo-parent-sales',
  ];

  const isBIRReport = birReportPages.some(page => pathname.includes(page));

  // If it's a BIR report, show "Reports > Report Name" instead of "Sales > Report Name"
  let displaySegments = pathname.split('/').filter(Boolean);

  if (isBIRReport) {
    // Replace 'sales' with 'reports' for BIR report pages
    displaySegments = displaySegments.map(segment =>
      segment === 'sales' ? 'reports' : segment
    );
  }

  // Custom label mappings
  const labelMap: Record<string, string> = {
    'returns': 'Merchandise Credits',
    'voids': 'Post Void',
    'by-product': 'By Product',
    'by-supplier': 'By Supplier',
    'profit-margin': 'Profit Margin',
    'by-customer': 'By Customer',
    'by-date': 'By Date',
    'summary': 'Summary',
    'bir-summary': 'BIR Sales Summary',
    'senior-citizen-sales': 'Senior Citizen Sales',
    'pwd-sales': 'PWD Sales',
    'naac-sales': 'NAAC Sales',
    'solo-parent-sales': 'Solo Parent Sales',
    'reports': 'Reports',
    'inventory': 'Stock on Hand & Valuation',
    'movements': 'Stock Movement',
    'low-stock': 'Low Stock Report',
    'velocity': 'Fast & Slow Moving',
    'adjustments': 'Adjustment Report',
    'sales': 'Sales',
    'purchases': 'Purchases',
    'invoices': 'Invoices',
    'orders': 'Orders',
    'top-volume': 'Top by Volume',
    'top-sales': 'Top by Sales',
    'batch-profit': 'Batch Profit Analysis',
    'split-payments': 'Split Payments',
    'customer': 'Customers',
    'payment': 'Payment',
    'balances': 'Balances',
    'loyalty': 'Loyalty Points',
    'cash-transfer': 'Cash Transfer',
    'z-reading': 'Z-Reading',
    'x-reading': 'X-Reading',
    'overall-reading': 'Overall Reading',
    'analysis': 'Analysis',
    'details': 'Details',
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {displaySegments.map((segment, index) => {
          const href = `/${displaySegments.slice(0, index + 1).join('/')}`;
          const isLast = index === displaySegments.length - 1;
          const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

          return (
            <Fragment key={href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
