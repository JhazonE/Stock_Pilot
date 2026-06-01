import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

const EXCLUDED_STATUS = "('Void','Voided','Cancelled','Returned')";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    let dateClause = '';
    const dateParams: any[] = [];
    if (startDate) {
      dateClause += ' AND DATE(st.created_at) >= ?';
      dateParams.push(startDate);
    }
    if (endDate) {
      dateClause += ' AND DATE(st.created_at) <= ?';
      dateParams.push(endDate);
    }

    const baseWhere = `
      WHERE pt.is_training = 0
        AND st.status NOT IN ${EXCLUDED_STATUS}
        AND pt.id IN (
          SELECT pos_transaction_id FROM pos_transaction_items WHERE discount_type = 'naac'
        )
        ${dateClause}
    `;

    const dataSql = `
      SELECT
        DATE(st.created_at) as date,
        c.name as customerName,
        c.pnstm_id as pnstmId,
        MAX(pt.order_number) as siOrNumber,
        SUM(pti.line_total) as grossSales,
        SUM(CASE WHEN pti.discount_type = 'naac' THEN pti.discount_amount ELSE 0 END) as discount
      FROM pos_transactions pt
      JOIN sales_transactions st ON pt.sale_id = st.id
      JOIN pos_transaction_items pti ON pti.pos_transaction_id = pt.id
      LEFT JOIN customers c ON st.customer_id = c.id
      ${baseWhere}
      GROUP BY pt.id, DATE(st.created_at), c.name, c.pnstm_id
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `;
    const results: any[] = await query(dataSql, [...dateParams, limit, offset]);

    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT pt.id
        FROM pos_transactions pt
        JOIN sales_transactions st ON pt.sale_id = st.id
        ${baseWhere}
        GROUP BY pt.id
      ) x
    `;
    const countResult: any[] = await query(countSql, dateParams);
    const totalCount = countResult[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const formattedResults = results.map((row: any) => {
      const grossSales = Number(row.grossSales || 0);
      const discount = Number(row.discount || 0);
      return {
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
        customerName: row.customerName || 'Walk-in Customer',
        pnstmId: row.pnstmId || '',
        siOrNumber: row.siOrNumber?.toString() || '',
        grossSales,
        discount,
        netSales: grossSales - discount,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedResults,
      pagination: { currentPage: page, limit, totalCount, totalPages },
    });
  } catch (error: any) {
    console.error('Error fetching NAAC sales:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch NAAC sales: ${error.message}` },
      { status: 500 }
    );
  }
}
