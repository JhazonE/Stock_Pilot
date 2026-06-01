'use strict';
// Stock Pilot v1.12 - Database Migration Runner
// Runs all pending migrations and tracks them in the migrations table.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

// Resolve mysql2 from standalone build or node_modules
let mysql;
try {
  mysql = require('./node_modules/mysql2/promise');
} catch {
  mysql = require('mysql2/promise');
}

function uuid() {
  return crypto.randomUUID();
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows[0].cnt > 0;
}

async function getExecutedMigrations(conn) {
  const [rows] = await conn.query('SELECT name FROM migrations');
  return new Set(rows.map(r => r.name));
}

async function recordMigration(conn, name, timestamp) {
  await conn.query(
    'INSERT INTO migrations (name, timestamp) VALUES (?, ?)',
    [name, timestamp]
  );
}

const migrations = [
  // ── 065 ──────────────────────────────────────────────────────────────────
  {
    name: '065_create_departments_table',
    timestamp: '2026-04-13_08-00-00',
    async up(conn) {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          markup_percentage DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('  Created departments table');

      if (!(await columnExists(conn, 'products', 'department'))) {
        await conn.query(`ALTER TABLE products ADD COLUMN department VARCHAR(255) AFTER brand`);
        console.log('  Added department column to products');
      }
    }
  },

  // ── 066 ──────────────────────────────────────────────────────────────────
  {
    name: '066_create_product_shelves_table',
    timestamp: '066',
    async up(conn) {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS product_shelves (
          product_id VARCHAR(50) NOT NULL,
          shelf_id VARCHAR(50) NOT NULL,
          PRIMARY KEY (product_id, shelf_id),
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (shelf_id) REFERENCES shelf_locations(id) ON DELETE CASCADE
        )
      `);
      console.log('  Created product_shelves table');

      // Migrate existing shelf_location_id → product_shelves
      if (await columnExists(conn, 'products', 'shelf_location_id')) {
        await conn.query(`
          INSERT IGNORE INTO product_shelves (product_id, shelf_id)
          SELECT id, shelf_location_id FROM products WHERE shelf_location_id IS NOT NULL
        `);
        console.log('  Migrated existing shelf data');
      }
    }
  },

  // ── 067 ──────────────────────────────────────────────────────────────────
  {
    name: '067_add_quantity_to_product_shelves',
    timestamp: '067',
    async up(conn) {
      if (!(await columnExists(conn, 'product_shelves', 'quantity'))) {
        await conn.query(`ALTER TABLE product_shelves ADD COLUMN quantity DECIMAL(15,4) NOT NULL DEFAULT 0`);
        console.log('  Added quantity column to product_shelves');

        await conn.query(`
          UPDATE product_shelves ps
          JOIN products p ON ps.product_id = p.id
          SET ps.quantity = p.stock
          WHERE (SELECT COUNT(*) FROM (SELECT * FROM product_shelves) ps2 WHERE ps2.product_id = ps.product_id) = 1
        `);
        console.log('  Initialized shelf quantities');
      }
    }
  },

  // ── 068 ──────────────────────────────────────────────────────────────────
  {
    name: '068_update_stock_movements_reference_type',
    timestamp: '2026-04-13_11-45-00',
    async up(conn) {
      await conn.query(`ALTER TABLE stock_movements MODIFY COLUMN reference_type VARCHAR(50)`);
      console.log('  Updated stock_movements.reference_type to VARCHAR(50)');
    }
  },

  // ── 070 ──────────────────────────────────────────────────────────────────
  {
    name: '070_create_user_types_tables',
    timestamp: '2026-04-13_13-15-00',
    async up(conn) {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS user_types (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS user_type_permissions (
          id VARCHAR(50) PRIMARY KEY,
          user_type_id VARCHAR(50) NOT NULL,
          permission VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_type_id (user_type_id),
          UNIQUE KEY unique_user_type_permission (user_type_id, permission),
          FOREIGN KEY (user_type_id) REFERENCES user_types(id) ON DELETE CASCADE
        )
      `);
      console.log('  Created user_types and user_type_permissions tables');

      const initialTypes = [
        { name: 'Super Admin', permissions: ['access_pos','view_dashboard','manage_products','manage_inventory','view_sales','manage_purchases','manage_customers','manage_suppliers','view_reports','manage_users','manage_settings','view_approvals','manage_approval_settings'] },
        { name: 'Admin',       permissions: ['access_pos','view_dashboard','manage_products','manage_inventory','view_sales','manage_purchases','manage_customers','manage_suppliers','view_reports','manage_users','view_approvals'] },
        { name: 'Staff',       permissions: ['view_dashboard','manage_products','manage_inventory','view_sales','manage_customers','manage_suppliers','view_reports'] },
        { name: 'Cashier',     permissions: ['access_pos'] },
        { name: 'User',        permissions: ['view_dashboard'] },
      ];

      for (const type of initialTypes) {
        const [existing] = await conn.query('SELECT id FROM user_types WHERE name = ?', [type.name]);
        if (existing.length > 0) continue;
        const typeId = uuid();
        await conn.query('INSERT INTO user_types (id, name, description) VALUES (?, ?, ?)', [typeId, type.name, `Initial ${type.name} role`]);
        for (const perm of type.permissions) {
          await conn.query('INSERT IGNORE INTO user_type_permissions (id, user_type_id, permission) VALUES (?, ?, ?)', [uuid(), typeId, perm]);
        }
      }
      console.log('  Seeded user types and permissions');
    }
  },

  // ── 071 ──────────────────────────────────────────────────────────────────
  {
    name: '071_create_repackaging_logs_table',
    timestamp: '2026-04-16_07-00-00',
    async up(conn) {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS repackaging_logs (
          id VARCHAR(100) PRIMARY KEY,
          source_product_id VARCHAR(100) NOT NULL,
          source_product_name VARCHAR(255) NOT NULL,
          source_qty DECIMAL(15, 4) NOT NULL,
          target_product_id VARCHAR(100) NOT NULL,
          target_product_name VARCHAR(255) NOT NULL,
          target_qty_produced DECIMAL(15, 4) NOT NULL,
          factor DECIMAL(15, 4) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'completed',
          approval_queue_id VARCHAR(100) NULL,
          notes TEXT NULL,
          created_by VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_source_product (source_product_id),
          INDEX idx_target_product (target_product_id),
          INDEX idx_created_at (created_at),
          INDEX idx_status (status)
        )
      `);
      console.log('  Created repackaging_logs table');
    }
  },

  // ── 072 ──────────────────────────────────────────────────────────────────
  {
    name: '072_add_repackaging_approval_setting',
    timestamp: '2026-04-16_07-10-00',
    async up(conn) {
      if (!(await columnExists(conn, 'pos_settings', 'require_repackaging_confirmation'))) {
        await conn.query(`ALTER TABLE pos_settings ADD COLUMN require_repackaging_confirmation BOOLEAN NOT NULL DEFAULT FALSE`);
        console.log('  Added require_repackaging_confirmation to pos_settings');
      }
    }
  },

  // ── 073 ──────────────────────────────────────────────────────────────────
  {
    name: '073_alter_stock_adjustments_add_metadata_fields',
    timestamp: '2026-04-17_10-10-00',
    async up(conn) {
      const cols = ['warehouse_id','target_warehouse_id','reference_no','supplier_id','note','adj_type'];
      for (const col of cols) {
        if (!(await columnExists(conn, 'stock_adjustments', col))) {
          const def = col === 'adj_type'
            ? `ADD COLUMN adj_type ENUM('add','remove','transfer') DEFAULT 'add'`
            : `ADD COLUMN ${col} ${col.endsWith('_id') ? 'VARCHAR(50)' : col === 'note' ? 'TEXT' : 'VARCHAR(100)'} DEFAULT NULL`;
          await conn.query(`ALTER TABLE stock_adjustments ${def}`);
        }
      }
      console.log('  Added metadata fields to stock_adjustments');
    }
  },

  // ── 074 ──────────────────────────────────────────────────────────────────
  {
    name: '074_create_inventory_transfers_table',
    timestamp: '2026-04-17_11-46-00',
    async up(conn) {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS inventory_transfers (
          id VARCHAR(50) PRIMARY KEY,
          source_warehouse_id VARCHAR(50) NOT NULL,
          target_warehouse_id VARCHAR(50) NOT NULL,
          transfer_date DATETIME NOT NULL,
          reference VARCHAR(100) DEFAULT NULL,
          status VARCHAR(20) DEFAULT 'Completed',
          notes TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_source_warehouse (source_warehouse_id),
          INDEX idx_target_warehouse (target_warehouse_id),
          INDEX idx_transfer_date (transfer_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS inventory_transfer_items (
          id VARCHAR(50) PRIMARY KEY,
          transfer_id VARCHAR(50) NOT NULL,
          product_id VARCHAR(50) NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          quantity DECIMAL(15, 4) NOT NULL,
          unit_of_measure VARCHAR(50) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_transfer_id (transfer_id),
          INDEX idx_product_id (product_id),
          CONSTRAINT fk_iti_transfer_id FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  Created inventory_transfers and inventory_transfer_items tables');
    }
  },

  // ── 075 ──────────────────────────────────────────────────────────────────
  {
    name: '075_add_warehouse_id_to_stock_movements',
    timestamp: '2026-04-17_13-12-00',
    async up(conn) {
      if (!(await columnExists(conn, 'stock_movements', 'warehouse_id'))) {
        await conn.query(`ALTER TABLE stock_movements ADD COLUMN warehouse_id VARCHAR(50) DEFAULT NULL, ADD INDEX idx_sm_warehouse_id (warehouse_id)`);
        console.log('  Added warehouse_id to stock_movements');
      }
    }
  },

  // ── 076 ──────────────────────────────────────────────────────────────────
  {
    name: '076_add_warehouse_to_purchase_orders',
    timestamp: '2026-04-23_10-40-00',
    async up(conn) {
      if (!(await columnExists(conn, 'purchase_orders', 'warehouse_id'))) {
        await conn.query(`ALTER TABLE purchase_orders ADD COLUMN warehouse_id VARCHAR(50) DEFAULT NULL, ADD COLUMN warehouse_name VARCHAR(255) DEFAULT NULL`);
        console.log('  Added warehouse fields to purchase_orders');
      }
    }
  },

  // ── 077 ──────────────────────────────────────────────────────────────────
  {
    name: '077_add_subtotal_to_purchase_order_items',
    timestamp: '2026-04-23_11-00-00',
    async up(conn) {
      if (!(await columnExists(conn, 'purchase_order_items', 'subtotal'))) {
        await conn.query(`ALTER TABLE purchase_order_items ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0.00`);
        await conn.query(`
          UPDATE purchase_order_items
          SET subtotal = CASE
            WHEN discount_type = 'percentage' THEN (quantity * cost) * (1 - COALESCE(discount, 0) / 100)
            ELSE (quantity * cost) - COALESCE(discount, 0)
          END
        `);
        console.log('  Added and backfilled subtotal in purchase_order_items');
      }
    }
  },

  // ── 078 ──────────────────────────────────────────────────────────────────
  {
    name: '078_alter_stock_precision',
    timestamp: '078',
    async up(conn) {
      await conn.query(`ALTER TABLE products MODIFY COLUMN stock DECIMAL(15, 4) DEFAULT 0`);
      await conn.query(`ALTER TABLE products MODIFY COLUMN reorder_point DECIMAL(15, 4) DEFAULT 0`);
      await conn.query(`ALTER TABLE product_shelves MODIFY COLUMN quantity DECIMAL(15, 4) NOT NULL DEFAULT 0`);
      await conn.query(`ALTER TABLE stock_adjustments MODIFY COLUMN quantity DECIMAL(15, 4) NOT NULL`);
      await conn.query(`ALTER TABLE stock_adjustments MODIFY COLUMN new_stock DECIMAL(15, 4) NOT NULL`);
      await conn.query(`ALTER TABLE stock_movements MODIFY COLUMN quantity_change DECIMAL(15, 4) NOT NULL`);
      await conn.query(`ALTER TABLE stock_movements MODIFY COLUMN previous_stock DECIMAL(15, 4) NOT NULL`);
      await conn.query(`ALTER TABLE stock_movements MODIFY COLUMN new_stock DECIMAL(15, 4) NOT NULL`);
      console.log('  Updated stock columns to DECIMAL(15,4)');
    }
  },

  // ── 079 ──────────────────────────────────────────────────────────────────
  {
    name: '079_create_customer_payment_allocations',
    timestamp: '079',
    async up(conn) {
      await conn.query(`
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
      console.log('  Created customer_payment_allocations table');
    }
  },

  // ── 080 ──────────────────────────────────────────────────────────────────
  {
    name: '080_add_bir_customer_classification',
    timestamp: '2026-06-01_10-00-00',
    async up(conn) {
      const columnsToAdd = [
        ['is_senior_citizen', 'BOOLEAN DEFAULT FALSE'],
        ['osca_id', 'VARCHAR(100)'],
        ['sc_tin', 'VARCHAR(100)'],
        ['is_pwd', 'BOOLEAN DEFAULT FALSE'],
        ['pwd_id', 'VARCHAR(100)'],
        ['pwd_tin', 'VARCHAR(100)'],
        ['is_naac', 'BOOLEAN DEFAULT FALSE'],
        ['pnstm_id', 'VARCHAR(100)'],
        ['is_solo_parent', 'BOOLEAN DEFAULT FALSE'],
        ['spic_no', 'VARCHAR(100)'],
        ['dependent_child_name', 'VARCHAR(255)'],
        ['dependent_child_birthdate', 'DATE'],
      ];
      for (const [col, def] of columnsToAdd) {
        if (!(await columnExists(conn, 'customers', col))) {
          await conn.query(`ALTER TABLE customers ADD COLUMN ${col} ${def}`);
        }
      }
      console.log('  Added BIR classification columns to customers');

      // Indexes for filtering by classification (ignore if already present)
      const indexes = [
        ['idx_is_senior_citizen', 'is_senior_citizen'],
        ['idx_is_pwd', 'is_pwd'],
        ['idx_is_naac', 'is_naac'],
        ['idx_is_solo_parent', 'is_solo_parent'],
      ];
      for (const [idx, col] of indexes) {
        try {
          await conn.query(`ALTER TABLE customers ADD INDEX ${idx} (${col})`);
        } catch (e) {
          if (e.errno !== 1061) throw e; // 1061 = duplicate key name
        }
      }
      console.log('  Added BIR classification indexes to customers');
    }
  },
];

async function run() {
  console.log('Stock Pilot v1.12 - Database Migration');
  console.log('=======================================');

  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'stock_pilot',
    multipleStatements: false,
  });

  try {
    // Ensure migrations tracking table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        timestamp VARCHAR(50) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const executed = await getExecutedMigrations(conn);
    let count = 0;

    for (const migration of migrations) {
      if (executed.has(migration.name)) {
        console.log(`[skip] ${migration.name}`);
        continue;
      }

      console.log(`[run]  ${migration.name}`);
      try {
        await migration.up(conn);
        await recordMigration(conn, migration.name, migration.timestamp);
        count++;
        console.log(`[ok]   ${migration.name}`);
      } catch (err) {
        console.error(`[fail] ${migration.name}:`, err.message);
        throw err;
      }
    }

    console.log('=======================================');
    console.log(`Migration complete. ${count} migration(s) applied.`);
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
