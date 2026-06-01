const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function testSetup() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stockpilot'
    });

    console.log('Connected to database...');

    // Check if BIR columns exist
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='customers' AND COLUMN_NAME='is_senior_citizen'"
    );

    if (columns.length > 0) {
      console.log('✅ BIR columns exist in customers table');
    } else {
      console.log('❌ BIR columns do NOT exist - will create now...');
      
      const birColumns = [
        'ALTER TABLE customers ADD COLUMN is_senior_citizen BOOLEAN DEFAULT FALSE',
        'ALTER TABLE customers ADD COLUMN osca_id VARCHAR(100)',
        'ALTER TABLE customers ADD COLUMN sc_tin VARCHAR(100)',
        'ALTER TABLE customers ADD COLUMN is_pwd BOOLEAN DEFAULT FALSE',
        'ALTER TABLE customers ADD COLUMN pwd_id VARCHAR(100)',
        'ALTER TABLE customers ADD COLUMN pwd_tin VARCHAR(100)',
        'ALTER TABLE customers ADD COLUMN is_naac BOOLEAN DEFAULT FALSE',
        'ALTER TABLE customers ADD COLUMN pnstm_id VARCHAR(100)',
        'ALTER TABLE customers ADD COLUMN is_solo_parent BOOLEAN DEFAULT FALSE',
        'ALTER TABLE customers ADD COLUMN spic_no VARCHAR(100)',
        'ALTER TABLE customers ADD COLUMN dependent_child_name VARCHAR(255)',
        'ALTER TABLE customers ADD COLUMN dependent_child_birthdate DATE'
      ];

      for (const sql of birColumns) {
        try {
          await connection.execute(sql);
          console.log(`✅ ${sql.split(' ADD COLUMN ')[1]}`);
        } catch (e) {
          if (e.code === 'ER_DUP_COLUMN_NAME') {
            console.log(`⚠️ Column already exists`);
          } else {
            throw e;
          }
        }
      }
      
      console.log('\n✅ Migration completed successfully!');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSetup();
