import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '079_create_customer_payment_allocations',
  timestamp: '079',

  async up(): Promise<void> {
    console.log('--- CREATING CUSTOMER PAYMENT ALLOCATIONS TABLE ---');
    await query(`
      CREATE TABLE IF NOT EXISTS customer_payment_allocations (
        id VARCHAR(50) NOT NULL,
        customer_payment_id VARCHAR(255) NOT NULL,
        invoice_id VARCHAR(50) NOT NULL,
        amount_allocated DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY customer_payment_id (customer_payment_id),
        KEY invoice_id (invoice_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Created customer_payment_allocations table');
  },

  async down(): Promise<void> {
    console.log('--- DROPPING CUSTOMER PAYMENT ALLOCATIONS TABLE ---');
    await query('DROP TABLE IF EXISTS customer_payment_allocations');
    console.log('✓ Dropped customer_payment_allocations table');
  }
};

registerMigration(migration);
