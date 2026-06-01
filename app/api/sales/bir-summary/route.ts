import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// Statuses that should be excluded from "sales" (handled separately as returns/voids)
const EXCLUDED_STATUS = "('Void','Voided','Cancelled','Returned')";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Date filter on st.created_at, reusable across the sub-queries
    const dateFilter = (col = 'st.created_at') => {
      let clause = '';
      const p: any[] = [];
      if (startDate) {
        clause += ` AND DATE(${col}) >= ?`;
        p.push(startDate);
      }
      if (endDate) {
        clause += ` AND DATE(${col}) <= ?`;
        p.push(endDate);
      }
      return { clause, p };
    };

    // ---- 1. Sale-level aggregates per day (revenue, OR range) ----
    const sale = dateFilter();
    const saleSql = `
      SELECT
        DATE(st.created_at) as date,
        MIN(pt.order_number) as startOR,
        MAX(pt.order_number) as endOR,
        SUM(st.total) as totalRevenue,
        COUNT(DISTINCT st.id) as txnCount
      FROM sales_transactions st
      JOIN pos_transactions pt ON st.id = pt.sale_id
      WHERE pt.is_training = 0
        AND st.status NOT IN ${EXCLUDED_STATUS}
        ${sale.clause}
      GROUP BY DATE(st.created_at)
    `;
    const saleRows: any[] = await query(saleSql, sale.p);

    // ---- 2. Item-level breakdown per day (discounts by type, VAT by tax_type) ----
    const item = dateFilter();
    const itemSql = `
      SELECT
        DATE(st.created_at) as date,
        SUM(CASE WHEN pti.discount_type = 'senior'      THEN pti.discount_amount ELSE 0 END) as discountSeniorCitizen,
        SUM(CASE WHEN pti.discount_type = 'pwd'         THEN pti.discount_amount ELSE 0 END) as discountPWD,
        SUM(CASE WHEN pti.discount_type = 'naac'        THEN pti.discount_amount ELSE 0 END) as discountNAAC,
        SUM(CASE WHEN pti.discount_type = 'solo_parent' THEN pti.discount_amount ELSE 0 END) as discountSoloParent,
        SUM(CASE WHEN pti.discount_type NOT IN ('senior','pwd','naac','solo_parent')
                 THEN pti.discount_amount ELSE 0 END) as discountOther,
        SUM(CASE WHEN UPPER(pti.tax_type) = 'VAT' THEN pti.line_total / 1.12 ELSE 0 END) as vatableSales,
        SUM(CASE WHEN UPPER(pti.tax_type) = 'VAT' THEN pti.line_total - (pti.line_total / 1.12) ELSE 0 END) as vatAmount,
        SUM(CASE WHEN UPPER(pti.tax_type) = 'VAT_EXEMPT' THEN pti.line_total ELSE 0 END) as vatExemptSales,
        SUM(CASE WHEN UPPER(pti.tax_type) = 'ZERO_RATED' THEN pti.line_total ELSE 0 END) as zeroRatedSales
      FROM pos_transaction_items pti
      JOIN pos_transactions pt ON pti.pos_transaction_id = pt.id
      JOIN sales_transactions st ON pt.sale_id = st.id
      WHERE pt.is_training = 0
        AND st.status NOT IN ${EXCLUDED_STATUS}
        ${item.clause}
      GROUP BY DATE(st.created_at)
    `;
    const itemRows: any[] = await query(itemSql, item.p);

    // ---- 3. Returns per day ----
    const ret = dateFilter();
    const returnsSql = `
      SELECT DATE(st.created_at) as date, SUM(st.total) as returns
      FROM sales_transactions st
      JOIN pos_transactions pt ON st.id = pt.sale_id
      WHERE st.status = 'Returned' AND pt.is_training = 0
        ${ret.clause}
      GROUP BY DATE(st.created_at)
    `;
    const returnRows: any[] = await query(returnsSql, ret.p);

    // ---- 4. Voids per day ----
    const vd = dateFilter();
    const voidsSql = `
      SELECT DATE(st.created_at) as date, SUM(st.total) as voids
      FROM sales_transactions st
      JOIN pos_transactions pt ON st.id = pt.sale_id
      WHERE st.status IN ('Void','Voided','Cancelled') AND pt.is_training = 0
        ${vd.clause}
      GROUP BY DATE(st.created_at)
    `;
    const voidRows: any[] = await query(voidsSql, vd.p);

    // ---- Merge everything by date ----
    const dayKey = (d: any) => (d ? new Date(d).toISOString().split('T')[0] : '');
    const itemMap = new Map(itemRows.map((r) => [dayKey(r.date), r]));
    const returnMap = new Map(returnRows.map((r) => [dayKey(r.date), Number(r.returns || 0)]));
    const voidMap = new Map(voidRows.map((r) => [dayKey(r.date), Number(r.voids || 0)]));

    const merged = saleRows
      .map((s) => {
        const key = dayKey(s.date);
        const it: any = itemMap.get(key) || {};
        const discountSeniorCitizen = Number(it.discountSeniorCitizen || 0);
        const discountPWD = Number(it.discountPWD || 0);
        const discountNAAC = Number(it.discountNAAC || 0);
        const discountSoloParent = Number(it.discountSoloParent || 0);
        const discountOther = Number(it.discountOther || 0);
        const totalDiscount =
          discountSeniorCitizen + discountPWD + discountNAAC + discountSoloParent + discountOther;
        const returns = returnMap.get(key) || 0;
        const voids = voidMap.get(key) || 0;
        const totalDeductions = totalDiscount + returns + voids;
        const totalRevenue = Number(s.totalRevenue || 0);
        const vatableSales = Number(it.vatableSales || 0);
        const vatAmount = Number(it.vatAmount || 0);
        const vatExemptSales = Number(it.vatExemptSales || 0);
        const zeroRatedSales = Number(it.zeroRatedSales || 0);
        const netSales = totalRevenue - totalDiscount - returns - voids;

        return {
          date: key,
          startOR: s.startOR?.toString() || '',
          endOR: s.endOR?.toString() || '',
          totalRevenue,
          discountSeniorCitizen,
          discountPWD,
          discountNAAC,
          discountSoloParent,
          discountOther,
          totalDiscount,
          returns,
          voids,
          totalDeductions,
          vatableSales,
          vatAmount,
          vatExemptSales,
          zeroRatedSales,
          vatAdjustmentSC: Number((discountSeniorCitizen * 0).toFixed(2)),
          vatAdjustmentPWD: 0,
          vatAdjustmentOther: 0,
          vatAdjustmentReturns: 0,
          vatAdjustmentOtherAdj: 0,
          totalVATAdjustment: 0,
          vatPayable: vatAmount,
          netSales,
          salesOverrun: 0,
          totalIncome: netSales,
          zCounter: 0,
          remarks: '',
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // DESC by date

    // ---- Pagination (in-memory; one row per business day) ----
    const totalCount = merged.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const offset = (page - 1) * limit;
    const pageData = merged.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: pageData,
      pagination: { currentPage: page, limit, totalCount, totalPages },
    });
  } catch (error: any) {
    console.error('Error fetching BIR summary:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch BIR summary: ${error.message}` },
      { status: 500 }
    );
  }
}
