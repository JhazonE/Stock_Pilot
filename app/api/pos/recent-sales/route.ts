import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch recent sales transactions
    const { searchParams } = new URL(request.url);
    const terminalId = searchParams.get('terminalId');
    const queryParam = searchParams.get('query');
    const customerId = searchParams.get('customerId');

    // 1. Fetch sales transactions
    // We join with pos_transactions to get terminal info and strictly filter POS sales
    let salesQuery = `
      SELECT
        st.id,
        st.customer_id,
        c.name as customer_name,
        c.contact_number as customer_contact,
        c.payment_terms as customer_payment_terms,
        st.date,
        st.due_date,
        st.total,
        (SELECT COALESCE(amount_paid, 0) FROM sales_invoices WHERE reference = st.reference LIMIT 1) as amount_paid,
        st.payment_method,
        st.reference,
        st.status,
        st.notes,
        st.created_at,
        pt.terminal_id,
        t.min_number as terminal_min,
        t.serial_number as terminal_sn,
        pt.order_number,
        u.display_name as cashier_name,
        pd.amount_tendered,
        pd.change_given,
        pd.points_used,
        COALESCE(pd.points_remaining, cl.current_points) as points_remaining,
        (SELECT SUM(points) FROM point_history ph WHERE ph.transaction_reference = st.id AND ph.transaction_type = 'purchase') as points_earned,
        pd.gateway_reference as payment_reference
      FROM sales_transactions st
      JOIN pos_transactions pt
        ON st.id = pt.sale_id
        AND (pt.transaction_type = 'sale' OR pt.transaction_type IS NULL)
      LEFT JOIN pos_terminals t ON pt.terminal_id = t.id
      LEFT JOIN customers c ON st.customer_id = c.id
      LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
      LEFT JOIN users u ON pt.user_id = u.uid
      LEFT JOIN payment_details pd ON pt.payment_details_id = pd.id
      WHERE LOWER(st.status) NOT IN ('voided', 'returned')
    `;

    const params: any[] = [];
    
    if (terminalId && terminalId !== 'all') {
        salesQuery += ' AND pt.terminal_id = ?';
        params.push(terminalId);
    }

    if (queryParam) {
        salesQuery += ' AND (pt.order_number LIKE ? OR st.id LIKE ?)';
        params.push(`%${queryParam}%`, `%${queryParam}%`);
    }

    if (customerId) {
        salesQuery += ' AND st.customer_id = ?';
        params.push(customerId);
    }

    salesQuery += ' ORDER BY st.created_at DESC';
    
    // Only limit if not searching, to ensure we find specific transactions
    if (!queryParam) {
        salesQuery += ' LIMIT 50';
    }

    const rawSales = await query(salesQuery, params);
    
    // Deduplicate sales by ID
    const uniqueSalesMap = new Map();
    rawSales.forEach((sale: any) => {
        if (!uniqueSalesMap.has(sale.id)) {
            uniqueSalesMap.set(sale.id, sale);
        }
    });

    // Take the first 20 unique sales
    const sales = Array.from(uniqueSalesMap.values()).slice(0, 20);

    // 2. Fetch items for each sale
    const salesWithItems = await Promise.all(
      sales.map(async (sale: any) => {
        const itemsQuery = `
          SELECT
            MIN(si.id) as id,
            si.product_id,
            si.product_name,
            SUM(si.quantity) as quantity,
            COALESCE(MIN(pti.unit_price), si.price) as original_price,
            p.sku,
            p.barcode,
            p.unit_of_measure,
            p.vat_status,
            COALESCE(SUM(pti.discount_amount), 0) as discount_amount
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          LEFT JOIN pos_transaction_items pti ON si.id = pti.sale_item_id
          WHERE si.sale_id = ?
          GROUP BY si.product_id, si.product_name, si.price, p.sku, p.barcode, p.unit_of_measure, p.vat_status
          HAVING SUM(si.quantity) > 0
        `;
        const items = await query(itemsQuery, [sale.id]);

        // 3. Fetch payment details for split payments
        const paymentsQuery = `
          SELECT payment_method, amount_tendered, gateway_reference
          FROM payment_details
          WHERE transaction_id = (SELECT id FROM pos_transactions WHERE sale_id = ? LIMIT 1)
        `;
        const paymentDetailsRows = await query(paymentsQuery, [sale.id]) as any[];
        
        const mappedPayments = paymentDetailsRows.map(row => ({
            method: row.payment_method,
            amount: parseFloat(row.amount_tendered),
            reference: row.gateway_reference
        }));

        return {
          id: sale.id,
          customer: {
            id: sale.customer_id || 'walk-in',
            name: sale.customer_name || 'Walk-in Customer',
            contactNumber: sale.customer_contact || '',
            paymentTerms: sale.customer_payment_terms || '',
          },
          date: sale.created_at, // Use created_at as it has time
          dueDate: sale.due_date,
          total: parseFloat(sale.total),
          paidAmount: parseFloat(sale.amount_paid || 0),
          paymentMethod: sale.payment_method,
          payments: mappedPayments,
          status: sale.status,
          notes: sale.notes,
          orderNumber: sale.order_number,
          reference: sale.reference,
          paymentReference: sale.payment_reference,
          pointsEarned: sale.points_earned ? parseFloat(sale.points_earned) : 0,
          pointsUsedCount: sale.points_used ? parseFloat(sale.points_used) : 0,
          pointsBalance: sale.points_remaining != null ? parseFloat(sale.points_remaining) : undefined,
          amountTendered: sale.amount_tendered ? parseFloat(sale.amount_tendered) : parseFloat(sale.total),
          change: sale.change_given ? parseFloat(sale.change_given) : 0,
          cashierName: sale.cashier_name || 'Admin',
          terminalMin: sale.terminal_min,
          terminalSerialNumber: sale.terminal_sn,
          items: items.map((item: any) => ({
            product: {
              id: item.product_id,
              name: item.product_name,
              sku: item.sku || '',
              barcode: item.barcode || '',
              price: parseFloat(item.original_price || item.price),
              unitOfMeasure: item.unit_of_measure || '',
              taxType: (() => {
                const s = (item.vat_status || '').toUpperCase();
                if (s.includes('EXEMPT')) return 'VAT_EXEMPT';
                if (s.includes('ZERO')) return 'ZERO_RATED';
                if (s.includes('NON-VAT') || s.includes('NON VAT')) return 'NON_VAT';
                return 'VAT';
              })()
            },
            quantity: parseFloat(item.quantity),
            price: parseFloat(item.original_price || item.price),
            discount: parseFloat(item.discount_amount || 0)
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: salesWithItems,
    });
  } catch (error: any) {
    console.error('Error fetching recent sales:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch recent sales' },
      { status: 500 }
    );
  }
}
