// Reusable report printing helper.
//
// Instead of trying to coerce the live app DOM (sidebar, sticky headers,
// fixed-height scroll wrappers) into something printable with @media print
// rules, we render the data into a brand-new window that has its own clean,
// professional stylesheet. This prints reliably across browsers.

import { getApiUrl } from '@/lib/api-config';

/**
 * Fetches the business/company info used for the printed report header.
 * Returns null on any failure so printing still works without a header.
 */
export async function fetchPrintBusinessInfo(): Promise<PrintBusinessInfo | null> {
  try {
    const res = await fetch(getApiUrl('/pos-settings'));
    if (!res.ok) return null;
    const result = await res.json();
    if (result?.success && result.data) {
      const d = result.data;
      return {
        businessName: d.businessName,
        address: d.address,
        contactNumber: d.contactNumber,
        email: d.email,
        tin: d.tin,
        operatedBy: d.operatedBy,
        logoPath: d.logoPath,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PrintBusinessInfo {
  businessName?: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  tin?: string;
  operatedBy?: string;
  logoPath?: string;
}

export interface PrintReportOptions {
  /** Main heading, e.g. "BIR Sales Summary Report". */
  title: string;
  /** Optional line under the title (date range, store name, etc.). */
  subtitle?: string;
  /** Column header labels. */
  headers: string[];
  /** Table body rows. Each row aligns positionally with `headers`. */
  rows: (string | number)[][];
  /** Indices (0-based) of columns that should be right-aligned (amounts). */
  numericColumns?: number[];
  /** Optional totals row rendered in a bold footer. */
  totalsRow?: (string | number)[];
  /** Optional business header info (name, address, TIN). */
  business?: PrintBusinessInfo | null;
  /** Optional list of label/value summary cards shown above the table. */
  summary?: { label: string; value: string }[];
  /** Page orientation. Wide reports look best in landscape. Default 'portrait'. */
  orientation?: 'portrait' | 'landscape';
}

export function printReport({
  title,
  subtitle,
  headers,
  rows,
  numericColumns = [],
  totalsRow,
  business,
  summary,
  orientation = 'portrait',
}: PrintReportOptions): void {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) {
    alert('Please allow pop-ups for this site to print the report.');
    return;
  }

  const numeric = new Set(numericColumns);
  const cls = (i: number) => (numeric.has(i) ? ' class="r"' : '');

  const thead = `<tr>${headers
    .map((h, i) => `<th${cls(i)}>${escapeHtml(h)}</th>`)
    .join('')}</tr>`;

  const tbody = rows.length
    ? rows
        .map(
          (row, idx) =>
            `<tr class="${idx % 2 ? 'odd' : 'even'}">${row
              .map((cell, i) => `<td${cls(i)}>${escapeHtml(cell)}</td>`)
              .join('')}</tr>`
        )
        .join('')
    : `<tr><td colspan="${headers.length}" class="empty">No data found for the selected criteria.</td></tr>`;

  const tfoot = totalsRow
    ? `<tfoot><tr>${totalsRow
        .map((cell, i) => `<td${cls(i)}>${escapeHtml(cell)}</td>`)
        .join('')}</tr></tfoot>`
    : '';

  const printedOn = new Date().toLocaleString('en-PH', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // ---- Business / company header ----
  const businessBlock = business
    ? `
    <div class="biz">
      ${business.logoPath ? `<img class="logo" src="${escapeHtml(business.logoPath)}" alt="logo" />` : ''}
      <div class="biz-text">
        <div class="biz-name">${escapeHtml(business.businessName || 'MY BUSINESS')}</div>
        ${business.operatedBy ? `<div class="biz-line">Operated by: ${escapeHtml(business.operatedBy)}</div>` : ''}
        ${business.address ? `<div class="biz-line">${escapeHtml(business.address)}</div>` : ''}
        <div class="biz-line">
          ${business.contactNumber ? `Tel: ${escapeHtml(business.contactNumber)}` : ''}
          ${business.contactNumber && business.email ? ' &nbsp;|&nbsp; ' : ''}
          ${business.email ? escapeHtml(business.email) : ''}
        </div>
        ${business.tin ? `<div class="biz-line">VAT REG TIN: ${escapeHtml(business.tin)}</div>` : ''}
      </div>
    </div>`
    : '';

  // ---- Summary cards ----
  const summaryBlock =
    summary && summary.length
      ? `<div class="summary">${summary
          .map(
            (s) =>
              `<div class="summary-card"><div class="summary-label">${escapeHtml(
                s.label
              )}</div><div class="summary-value">${escapeHtml(s.value)}</div></div>`
          )
          .join('')}</div>`
      : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'}; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #1a1a1a;
    padding: 24px;
    font-size: 11px;
    line-height: 1.4;
  }

  /* Business header */
  .biz { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; }
  .logo { height: 56px; width: auto; object-fit: contain; }
  .biz-name { font-size: 18px; font-weight: 700; letter-spacing: 0.3px; }
  .biz-line { font-size: 11px; color: #444; }

  /* Title block */
  .title-block {
    border-top: 2px solid #1a1a1a;
    border-bottom: 1px solid #999;
    padding: 10px 0;
    margin-bottom: 14px;
    text-align: center;
  }
  h1 { font-size: 15px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
  .subtitle { font-size: 12px; color: #333; margin: 3px 0 0; }
  .printed-on { font-size: 10px; color: #777; margin: 2px 0 0; }

  /* Summary cards */
  .summary {
    display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;
  }
  .summary-card {
    flex: 1; min-width: 110px; border: 1px solid #ddd; border-radius: 6px;
    padding: 8px 10px; background: #fafafa;
  }
  .summary-label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.4px; }
  .summary-value { font-size: 13px; font-weight: 700; color: #111; margin-top: 2px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; }
  thead th {
    background: #1f2937; color: #fff; font-weight: 600;
    padding: 7px 8px; text-align: left; font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.3px;
    border: 1px solid #1f2937;
  }
  tbody td {
    padding: 6px 8px; font-size: 10px; border: 1px solid #e2e2e2;
    vertical-align: top; white-space: nowrap;
  }
  tbody tr.odd { background: #f7f8fa; }
  td.r, th.r { text-align: right; }
  td.empty { text-align: center; padding: 28px; color: #888; font-style: italic; }
  tfoot td {
    font-weight: 700; background: #eef1f5; border: 1px solid #cbd2dc;
    padding: 7px 8px; font-size: 10px;
  }

  /* Signature footer */
  .signatures {
    display: flex; justify-content: space-between; gap: 60px; margin-top: 48px;
  }
  .sign-box { flex: 1; text-align: center; }
  .sign-line { border-top: 1px solid #555; margin-top: 28px; padding-top: 4px; font-size: 10px; color: #444; }
  .footer-note {
    margin-top: 24px; font-size: 9px; color: #999; text-align: center;
    border-top: 1px solid #eee; padding-top: 8px;
  }

  @media print {
    body { padding: 0; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
    .summary-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead th, tbody tr.odd, tfoot td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  ${businessBlock}
  <div class="title-block">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
    <p class="printed-on">Generated on ${escapeHtml(printedOn)}</p>
  </div>
  ${summaryBlock}
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
    ${tfoot}
  </table>
  <div class="signatures">
    <div class="sign-box"><div class="sign-line">Prepared by</div></div>
    <div class="sign-box"><div class="sign-line">Checked by</div></div>
    <div class="sign-box"><div class="sign-line">Approved by</div></div>
  </div>
  <div class="footer-note">
    This report was generated by Stock Pilot POS. &nbsp;|&nbsp; ${escapeHtml(title)} &nbsp;|&nbsp; ${escapeHtml(printedOn)}
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();

  // Give the new document a tick to lay out (and load the logo) before printing.
  win.focus();
  setTimeout(() => {
    win.print();
  }, 350);
}
