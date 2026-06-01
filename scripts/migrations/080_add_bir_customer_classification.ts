import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '080_add_bir_customer_classification',
  timestamp: '2026-06-01_10-00-00',

  async up() {
    console.log('Running migration: 080_add_bir_customer_classification');

    const columnsToAdd = [
      'is_senior_citizen BOOLEAN DEFAULT FALSE',
      'osca_id VARCHAR(100)',
      'sc_tin VARCHAR(100)',
      'is_pwd BOOLEAN DEFAULT FALSE',
      'pwd_id VARCHAR(100)',
      'pwd_tin VARCHAR(100)',
      'is_naac BOOLEAN DEFAULT FALSE',
      'pnstm_id VARCHAR(100)',
      'is_solo_parent BOOLEAN DEFAULT FALSE',
      'spic_no VARCHAR(100)',
      'dependent_child_name VARCHAR(255)',
      'dependent_child_birthdate DATE',
    ];

    for (const col of columnsToAdd) {
      try {
        await query(`ALTER TABLE customers ADD COLUMN ${col}`);
        console.log(`✅ Added ${col.split(' ')[0]} to customers`);
      } catch (e: any) {
        if (e.code === 'ER_DUP_COLUMN_NAME' || e.errno === 1060) {
          console.log(`⚠️ Column ${col.split(' ')[0]} already exists in customers`);
        } else {
          throw e;
        }
      }
    }

    // Add indexes for better query performance
    try {
      await query(`ALTER TABLE customers ADD INDEX idx_is_senior_citizen (is_senior_citizen)`);
      console.log('✅ Added index for is_senior_citizen');
    } catch (e: any) {
      console.log('⚠️ Index for is_senior_citizen already exists');
    }

    try {
      await query(`ALTER TABLE customers ADD INDEX idx_is_pwd (is_pwd)`);
      console.log('✅ Added index for is_pwd');
    } catch (e: any) {
      console.log('⚠️ Index for is_pwd already exists');
    }

    try {
      await query(`ALTER TABLE customers ADD INDEX idx_is_naac (is_naac)`);
      console.log('✅ Added index for is_naac');
    } catch (e: any) {
      console.log('⚠️ Index for is_naac already exists');
    }

    try {
      await query(`ALTER TABLE customers ADD INDEX idx_is_solo_parent (is_solo_parent)`);
      console.log('✅ Added index for is_solo_parent');
    } catch (e: any) {
      console.log('⚠️ Index for is_solo_parent already exists');
    }
  },

  async down() {
    console.log('Rolling back migration: 080_add_bir_customer_classification');

    const columnsToDrop = [
      'is_senior_citizen',
      'osca_id',
      'sc_tin',
      'is_pwd',
      'pwd_id',
      'pwd_tin',
      'is_naac',
      'pnstm_id',
      'is_solo_parent',
      'spic_no',
      'dependent_child_name',
      'dependent_child_birthdate',
    ];

    try {
      await query(`
        ALTER TABLE customers
        DROP COLUMN ${columnsToDrop.map(col => `${col}`).join(',\nDROP COLUMN ')}
      `);
      console.log('✅ Dropped BIR classification columns');
    } catch (e: any) {
      console.log('⚠️ Error dropping columns:', e.message);
    }
  }
};

registerMigration(migration);
