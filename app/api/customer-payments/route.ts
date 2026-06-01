import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, paymentType, paymentDate, amount, reference, note, allocations } = body;

    // Validate required fields
    if (!customerId || !paymentType || !paymentDate || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    return await withTransaction(async (connection) => {
        // Check if customer exists
        const [customerCheck]: any = await connection.query(
          'SELECT id FROM customers WHERE id = ?',
          [customerId]
        );

        if (!customerCheck || customerCheck.length === 0) {
          throw new Error('Customer not found');
        }

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
        } else {
            // Check if user-provided reference is unique
            const [referenceCheck]: any = await connection.query(
              'SELECT id FROM customer_payments WHERE reference = ?',
              [finalReference]
            );

            if (referenceCheck && referenceCheck.length > 0) {
              throw new Error('Reference already exists');
            }
        }

        // Insert payment record
        const paymentId = uuidv4();
        await connection.query(
          `INSERT INTO customer_payments (
            id, customer_id, payment_type, payment_date, amount, reference, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [paymentId, customerId, paymentType, new Date(paymentDate), amount, finalReference, note]
        );

        // Process allocations
        if (allocations && Array.isArray(allocations)) {
            for (const alloc of allocations) {
                if (alloc.amountAllocated <= 0) continue;

                // 1. Get current invoice details (using FOR UPDATE to lock row during transaction)
                const [invoiceResult]: any = await connection.query(
                    'SELECT total, amount_paid FROM sales_invoices WHERE id = ? FOR UPDATE',
                    [alloc.invoiceId]
                );

                if (!invoiceResult || invoiceResult.length === 0) continue;

                const invoice = invoiceResult[0];
                const currentAmountPaid = Number(invoice.amount_paid || 0);
                const newAmountPaid = currentAmountPaid + Number(alloc.amountAllocated);
                const newStatus = newAmountPaid >= Number(invoice.total) ? 'Paid' : 'Partially Paid';

                // 2. Update invoice amount_paid and status
                await connection.query(
                    `UPDATE sales_invoices
                     SET amount_paid = ?, status = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [newAmountPaid, newStatus, alloc.invoiceId]
                );

                // 3. Insert allocation record
                const allocationId = uuidv4();
                await connection.query(
                    `INSERT INTO customer_payment_allocations
                     (id, customer_payment_id, invoice_id, amount_allocated)
                     VALUES (?, ?, ?, ?)`,
                    [allocationId, paymentId, alloc.invoiceId, alloc.amountAllocated]
                );
            }
        }

        return NextResponse.json({
          success: true,
          message: 'Payment added successfully',
          data: {
            id: paymentId,
            customerId,
            paymentType,
            paymentDate,
            amount,
            reference: finalReference,
            note,
            allocations
          },
        });
    });
  } catch (error: any) {
    console.error('Error adding customer payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    let sql = `
      SELECT
        cp.*,
        c.name as customer_name,
        c.contact_number
      FROM customer_payments cp
      JOIN customers c ON cp.customer_id = c.id
    `;

    const params: any[] = [];

    if (customerId) {
      sql += ' WHERE cp.customer_id = ?';
      params.push(customerId);
    }

    sql += ' ORDER BY cp.payment_date DESC, cp.created_at DESC';

    const payments = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
