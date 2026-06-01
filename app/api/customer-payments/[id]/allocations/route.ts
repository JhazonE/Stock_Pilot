import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const allocations = await query(
      `SELECT
        cpa.id,
        cpa.amount_allocated,
        si.id AS invoice_id,
        si.reference AS invoice_reference,
        si.total AS invoice_total,
        si.amount_paid,
        si.status,
        si.invoice_date,
        si.due_date
      FROM customer_payment_allocations cpa
      JOIN sales_invoices si ON si.id = cpa.invoice_id
      WHERE cpa.customer_payment_id = ?
      ORDER BY si.invoice_date ASC`,
      [paymentId]
    );

    return NextResponse.json({
      success: true,
      data: allocations,
    });
  } catch (error) {
    console.error('Error fetching payment allocations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
