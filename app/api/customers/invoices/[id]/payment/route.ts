
import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: invoiceId } = await params;
    const body = await request.json();
    const { amount, paymentMethod, reference, paymentDate } = body;

    // Validate request
    if (!invoiceId || !amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In this simplified version, we'll assume full payment for now as the UI restricts it,
    // but the backend logic can technically handle partials if we wanted.
    // However, the prompt just said "function", so I'll implement the recording logic.

    return await withTransaction(async (connection) => {
        // 1. Verify invoice exists and get current details
        const [invoiceResult]: any = await connection.query('SELECT total, status, amount_paid FROM sales_invoices WHERE id = ?', [invoiceId]);

        if (!invoiceResult || invoiceResult.length === 0) {
            throw new Error('Invoice not found');
        }

        const invoice = invoiceResult[0];

        // 2. Check if already paid
        if (invoice.status === 'Paid' || Number(invoice.amount_paid) >= Number(invoice.total)) {
            return NextResponse.json(
                { success: false, error: 'Invoice is already fully paid' },
                { status: 400 }
            );
        }

        const currentAmountPaid = Number(invoice.amount_paid || 0);
        const paymentAmount = Number(amount);
        const newAmountPaid = currentAmountPaid + paymentAmount;

        // 3. Record the payment in customer_payments table
        // We need to fetch the customer_id from the invoice first
        const [invCustomerResult]: any = await connection.query('SELECT customer_id FROM sales_invoices WHERE id = ?', [invoiceId]);
        const customerId = invCustomerResult[0].customer_id;

        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        let finalReference = reference;
        
        if (!finalReference) {
           // Generate sequential reference
           const [maxRefResult]: any = await connection.query(
               "SELECT MAX(CAST(reference AS UNSIGNED)) as max_ref FROM customer_payments WHERE reference REGEXP '^[0-9]+$'"
           );
           
           let nextRef = 1;
           if (maxRefResult && maxRefResult.length > 0 && maxRefResult[0].max_ref !== null) {
               nextRef = parseInt(maxRefResult[0].max_ref, 10) + 1;
           }
           finalReference = nextRef.toString().padStart(6, '0');
        }

        const insertPaymentSql = `
            INSERT INTO customer_payments (
                id, customer_id, payment_type, payment_date, amount, reference, note, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        // Note: 'payment_type' in table schema maps to 'paymentMethod' here. 
        // 'reference' in table schema can store the user provided reference OR the invoice ID.
        // It's probably better to use the payment reference for external refs and link to invoice via notes or a new joining table if needed.
        // For this task, we'll store the provided reference.
        
        await connection.query(insertPaymentSql, [
            paymentId,
            customerId,
            paymentMethod,
            new Date(paymentDate || Date.now()),
            amount,
            finalReference,
            `Payment for Invoice #${invoiceId}.`,
        ]);

        // 4. Update Invoice Status
        const newStatus = newAmountPaid >= Number(invoice.total) ? 'Paid' : 'Partially Paid';

        const updateInvoiceSql = `
            UPDATE sales_invoices
            SET amount_paid = ?, status = ?, updated_at = NOW()
            WHERE id = ?
        `;
        await connection.query(updateInvoiceSql, [newAmountPaid, newStatus, invoiceId]);

        // 5. Insert allocation record
        const allocationId = uuidv4();
        await connection.query(
            `INSERT INTO customer_payment_allocations
             (id, customer_payment_id, invoice_id, amount_allocated)
             VALUES (?, ?, ?, ?)`,
            [allocationId, paymentId, invoiceId, amount]
        );

        return NextResponse.json({
            success: true,
            message: 'Payment recorded successfully',
            data: { paymentId, reference: finalReference },
        });
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { success: false, error: `Failed to record payment: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
