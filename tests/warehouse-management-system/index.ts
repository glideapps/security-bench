import { PGlite } from "@electric-sql/pglite";

export async function createDatabase(): Promise<PGlite> {
    const db = new PGlite();

    // Create simplified schema for PGlite (without unsupported features)
    // Note: PGlite has limited support for advanced PostgreSQL features
    await db.exec(`
    -- === Core reference tables ===================================================
    CREATE TABLE orgs (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      parent_org_id TEXT,
      is_deleted   BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE users (
      id           TEXT PRIMARY KEY,
      org_id       TEXT NOT NULL REFERENCES orgs(id),
      email        TEXT NOT NULL UNIQUE,
      display_name TEXT,
      role         TEXT NOT NULL,
      is_us_person BOOLEAN,
      is_active    BOOLEAN NOT NULL DEFAULT true,
      is_deleted   BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ================== Facilities & Access ==================
    CREATE TABLE wms_facilities (
      id                TEXT PRIMARY KEY,
      code              TEXT NOT NULL,
      name              TEXT NOT NULL,
      owner_3pl_org_id  TEXT NOT NULL REFERENCES orgs(id),
      region            TEXT,
      is_secure_zone    BOOLEAN NOT NULL DEFAULT false,
      is_deleted        BOOLEAN NOT NULL DEFAULT false,
      created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Which client orgs can operate at a facility
    CREATE TABLE wms_facility_clients (
      facility_id   TEXT NOT NULL REFERENCES wms_facilities(id),
      client_org_id TEXT NOT NULL REFERENCES orgs(id),
      active        BOOLEAN NOT NULL DEFAULT true,
      valid_from    DATE NOT NULL DEFAULT CURRENT_DATE,
      valid_to      DATE,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (facility_id, client_org_id)
    );

    -- 3PL Provider contracts with client organizations
    CREATE TABLE wms_3pl_contracts (
      id               TEXT PRIMARY KEY,
      provider_org_id  TEXT NOT NULL REFERENCES orgs(id),
      client_org_id    TEXT NOT NULL REFERENCES orgs(id),
      facility_id      TEXT NOT NULL REFERENCES wms_facilities(id),
      valid_from       DATE NOT NULL,
      valid_to         DATE,
      status           TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- User membership & role at a facility (3PL or client users)
    CREATE TABLE wms_user_facilities (
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      facility_id TEXT NOT NULL REFERENCES wms_facilities(id),
      role        TEXT NOT NULL,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, facility_id)
    );

    -- ================== Items & Stock ==================
    CREATE TABLE wms_skus (
      id           TEXT PRIMARY KEY,
      org_id       TEXT NOT NULL REFERENCES orgs(id),
      code         TEXT NOT NULL,
      name         TEXT NOT NULL,
      uom          TEXT NOT NULL DEFAULT 'EA',
      itar_flag    BOOLEAN NOT NULL DEFAULT false,
      hazmat_flag  BOOLEAN NOT NULL DEFAULT false,
      is_deleted   BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE wms_lots (
      id           TEXT PRIMARY KEY,
      sku_id       TEXT NOT NULL REFERENCES wms_skus(id),
      lot_code     TEXT NOT NULL,
      expires_at   DATE,
      is_deleted   BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Inventory is per client org within a 3PL facility
    CREATE TABLE wms_inventory (
      id             TEXT PRIMARY KEY,
      facility_id    TEXT NOT NULL REFERENCES wms_facilities(id),
      client_org_id  TEXT NOT NULL REFERENCES orgs(id),
      sku_id         TEXT NOT NULL REFERENCES wms_skus(id),
      lot_id         TEXT REFERENCES wms_lots(id),
      bin            TEXT NOT NULL,
      qty_on_hand    NUMERIC(14,3) NOT NULL CHECK (qty_on_hand >= 0),
      qty_reserved   NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
      is_deleted     BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ================== Outbound Orders & Picking ==================
    CREATE TABLE wms_orders (
      id            TEXT PRIMARY KEY,
      client_org_id TEXT NOT NULL REFERENCES orgs(id),
      facility_id   TEXT NOT NULL REFERENCES wms_facilities(id),
      customer_ref  TEXT,
      order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
      shipped_at    TIMESTAMP,
      status        TEXT NOT NULL DEFAULT 'DRAFT',
      created_by    TEXT,
      is_deleted    BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE wms_order_lines (
      id          TEXT PRIMARY KEY,
      order_id    TEXT NOT NULL REFERENCES wms_orders(id),
      sku_id      TEXT NOT NULL REFERENCES wms_skus(id),
      qty         NUMERIC(14,3) NOT NULL CHECK (qty > 0),
      allocated   NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (allocated >= 0),
      is_deleted  BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE wms_picks (
      id            TEXT PRIMARY KEY,
      order_line_id TEXT NOT NULL REFERENCES wms_order_lines(id),
      facility_id   TEXT NOT NULL REFERENCES wms_facilities(id),
      lot_id        TEXT REFERENCES wms_lots(id),
      bin           TEXT,
      qty_picked    NUMERIC(14,3) NOT NULL CHECK (qty_picked > 0),
      picker_id     TEXT NOT NULL REFERENCES users(id),
      status        TEXT NOT NULL DEFAULT 'CREATED',
      is_deleted    BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ================== Inbound (ASN) & Receipts ==================
    CREATE TABLE wms_asn (
      id            TEXT PRIMARY KEY,
      facility_id   TEXT NOT NULL REFERENCES wms_facilities(id),
      client_org_id TEXT NOT NULL REFERENCES orgs(id),
      supplier_name TEXT,
      eta           TIMESTAMP,
      status        TEXT NOT NULL DEFAULT 'CREATED',
      is_deleted    BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE wms_asn_lines (
      id            TEXT PRIMARY KEY,
      asn_id        TEXT NOT NULL REFERENCES wms_asn(id),
      sku_id        TEXT NOT NULL REFERENCES wms_skus(id),
      qty_expected  NUMERIC(14,3) NOT NULL CHECK (qty_expected > 0),
      qty_received  NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE wms_receipts (
      id            TEXT PRIMARY KEY,
      asn_id        TEXT NOT NULL REFERENCES wms_asn(id),
      sku_id        TEXT NOT NULL REFERENCES wms_skus(id),
      lot_id        TEXT REFERENCES wms_lots(id),
      qty_received  NUMERIC(14,3) NOT NULL CHECK (qty_received > 0),
      receiver_id   TEXT NOT NULL REFERENCES users(id),
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ================== Cycle Counts (maker-checker) ==================
    CREATE TABLE wms_cycle_counts (
      id            TEXT PRIMARY KEY,
      facility_id   TEXT NOT NULL REFERENCES wms_facilities(id),
      sku_id        TEXT NOT NULL REFERENCES wms_skus(id),
      lot_id        TEXT REFERENCES wms_lots(id),
      bin           TEXT,
      expected_qty  NUMERIC(14,3) NOT NULL CHECK (expected_qty >= 0),
      counted_qty   NUMERIC(14,3) NOT NULL CHECK (counted_qty >= 0),
      counter_id    TEXT NOT NULL REFERENCES users(id),
      approved_by   TEXT REFERENCES users(id),
      approved_at   TIMESTAMP,
      status        TEXT NOT NULL DEFAULT 'OPEN',
      notes         TEXT,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (approved_by IS NULL OR approved_by <> counter_id)
    );

    -- === Auditing ================================================================
    CREATE TABLE audit_log (
      id             SERIAL PRIMARY KEY,
      entity_type    TEXT NOT NULL,
      entity_id      TEXT NOT NULL,
      action         TEXT NOT NULL,
      actor_user_id  TEXT NOT NULL REFERENCES users(id),
      occurred_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      request_id     TEXT,
      before         TEXT,
      after          TEXT
    );

    -- === Access Grants ============================================================
    CREATE TABLE access_grants (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      scope_type  TEXT NOT NULL,
      scope_id    TEXT NOT NULL,
      expires_at  TIMESTAMP NOT NULL,
      reason      TEXT,
      created_by  TEXT NOT NULL REFERENCES users(id),
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Insert comprehensive sample data for testing security rules
    await db.exec(`
    -- Organizations (3PL providers and client organizations)
    INSERT INTO orgs (id, name, parent_org_id, is_deleted) VALUES
      -- 3PL Providers
      ('3pl-11111111-0000-0000-0000-000000000001', 'Global Logistics Inc', NULL, false),
      ('3pl-11111111-0000-0000-0000-000000000002', 'FastShip 3PL', NULL, false),
      -- Client Organizations  
      ('org-22222222-0000-0000-0000-000000000001', 'AlphaCorp', NULL, false),
      ('org-22222222-0000-0000-0000-000000000002', 'BetaManufacturing', NULL, false),
      ('org-22222222-0000-0000-0000-000000000003', 'GammaElectronics', NULL, false),
      -- Deleted org for testing
      ('org-22222222-0000-0000-0000-000000000004', 'Deleted Client', NULL, true);

    -- Users (various roles across different organizations)
    INSERT INTO users (id, org_id, email, display_name, role, is_us_person, is_active, is_deleted) VALUES
      -- 3PL Global Logistics Users
      ('user-33333333-0000-0000-0000-000000000001', '3pl-11111111-0000-0000-0000-000000000001', 'picker@globallogistics.com', 'John Picker', '3pl_operator', false, true, false),
      ('user-33333333-0000-0000-0000-000000000002', '3pl-11111111-0000-0000-0000-000000000001', 'supervisor@globallogistics.com', 'Jane Supervisor', 'supervisor', true, true, false),
      ('user-33333333-0000-0000-0000-000000000003', '3pl-11111111-0000-0000-0000-000000000001', 'inventory@globallogistics.com', 'Bob Controller', 'inventory_controller', true, true, false),
      ('user-33333333-0000-0000-0000-000000000004', '3pl-11111111-0000-0000-0000-000000000001', '3pl-operator@globallogistics.com', '3PL Operator', '3pl_operator', false, true, false),
      
      -- 3PL FastShip Users
      ('user-33333333-0000-0000-0000-000000000005', '3pl-11111111-0000-0000-0000-000000000002', 'supervisor@fastship.com', 'FastShip Supervisor', 'supervisor', true, true, false),
      
      -- AlphaCorp Client Users
      ('user-44444444-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'buyer@alphacorp.com', 'Alpha Buyer', 'buyer_user', false, true, false),
      ('user-44444444-0000-0000-0000-000000000002', 'org-22222222-0000-0000-0000-000000000001', 'admin@alphacorp.com', 'Alpha Admin', 'buyer_admin', true, true, false),
      ('user-44444444-0000-0000-0000-000000000003', 'org-22222222-0000-0000-0000-000000000001', 'auditor@alphacorp.com', 'Alpha Auditor', 'auditor', false, true, false),
      
      -- BetaManufacturing Users
      ('user-44444444-0000-0000-0000-000000000004', 'org-22222222-0000-0000-0000-000000000002', 'buyer@beta.com', 'Beta Buyer', 'buyer_user', false, true, false),
      ('user-44444444-0000-0000-0000-000000000005', 'org-22222222-0000-0000-0000-000000000002', 'admin@beta.com', 'Beta Admin', 'buyer_admin', true, true, false),
      
      -- GammaElectronics Users  
      ('user-44444444-0000-0000-0000-000000000006', 'org-22222222-0000-0000-0000-000000000003', 'buyer@gamma.com', 'Gamma Buyer', 'buyer_user', false, true, false),
      
      -- Additional users for vulnerability testing
      ('user-33333333-0000-0000-0000-000000000006', '3pl-11111111-0000-0000-0000-000000000001', 'uspicker@globallogistics.com', 'US Picker', 'picker', true, true, false), -- US person picker (should NOT access ITAR)
      ('user-33333333-0000-0000-0000-000000000007', '3pl-11111111-0000-0000-0000-000000000001', 'nonuspicker@globallogistics.com', 'Non-US Supervisor', 'supervisor', false, true, false), -- Non-US supervisor (should NOT access ITAR)
      
      -- Deleted/Inactive Users
      ('user-44444444-0000-0000-0000-000000000007', 'org-22222222-0000-0000-0000-000000000001', 'deleted@alphacorp.com', 'Deleted User', 'buyer_user', false, false, true),
      ('user-44444444-0000-0000-0000-000000000008', 'org-22222222-0000-0000-0000-000000000001', 'inactive@alphacorp.com', 'Inactive User', 'buyer_admin', false, false, false);

    -- WMS Facilities
    INSERT INTO wms_facilities (id, code, name, owner_3pl_org_id, region, is_secure_zone, is_deleted) VALUES
      -- Global Logistics Facilities
      ('fac-55555555-0000-0000-0000-000000000001', 'GL-NYC-01', 'Global NYC Warehouse', '3pl-11111111-0000-0000-0000-000000000001', 'US-EAST', false, false),
      ('fac-55555555-0000-0000-0000-000000000002', 'GL-LAX-01', 'Global LAX Warehouse', '3pl-11111111-0000-0000-0000-000000000001', 'US-WEST', false, false),
      ('fac-55555555-0000-0000-0000-000000000003', 'GL-SEC-01', 'Global Secure Facility', '3pl-11111111-0000-0000-0000-000000000001', 'US-EAST', true, false),
      
      -- FastShip Facilities
      ('fac-55555555-0000-0000-0000-000000000004', 'FS-CHI-01', 'FastShip Chicago Hub', '3pl-11111111-0000-0000-0000-000000000002', 'US-CENTRAL', false, false),
      
      -- Deleted Facility
      ('fac-55555555-0000-0000-0000-000000000005', 'GL-DEL-01', 'Deleted Facility', '3pl-11111111-0000-0000-0000-000000000001', 'US-SOUTH', false, true);

    -- Facility Client Contracts (which orgs can use which facilities)
    INSERT INTO wms_facility_clients (facility_id, client_org_id, active, valid_from, valid_to) VALUES
      -- AlphaCorp contracts
      ('fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', true, CURRENT_DATE - INTERVAL '365 days', NULL),
      ('fac-55555555-0000-0000-0000-000000000002', 'org-22222222-0000-0000-0000-000000000001', true, CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE + INTERVAL '180 days'),
      ('fac-55555555-0000-0000-0000-000000000003', 'org-22222222-0000-0000-0000-000000000001', true, CURRENT_DATE - INTERVAL '90 days', NULL),
      
      -- BetaManufacturing contracts
      ('fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000002', true, CURRENT_DATE - INTERVAL '200 days', NULL),
      ('fac-55555555-0000-0000-0000-000000000004', 'org-22222222-0000-0000-0000-000000000002', true, CURRENT_DATE - INTERVAL '100 days', NULL),
      
      -- GammaElectronics contracts
      ('fac-55555555-0000-0000-0000-000000000003', 'org-22222222-0000-0000-0000-000000000003', true, CURRENT_DATE - INTERVAL '60 days', NULL),
      
      -- Expired contract
      ('fac-55555555-0000-0000-0000-000000000002', 'org-22222222-0000-0000-0000-000000000002', false, CURRENT_DATE - INTERVAL '400 days', CURRENT_DATE - INTERVAL '30 days'),
      
      -- More expired/inactive contracts to expose vulnerabilities
      ('fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000003', false, CURRENT_DATE - INTERVAL '500 days', CURRENT_DATE - INTERVAL '100 days'), -- inactive
      ('fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000004', true, CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE - INTERVAL '1 day'); -- expired yesterday

    -- User Facility Assignments
    INSERT INTO wms_user_facilities (user_id, facility_id, role) VALUES
      -- 3PL Global Logistics staff assignments
      ('user-33333333-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'picker'),
      ('user-33333333-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000002', 'picker'),
      ('user-33333333-0000-0000-0000-000000000002', 'fac-55555555-0000-0000-0000-000000000001', 'supervisor'),
      ('user-33333333-0000-0000-0000-000000000002', 'fac-55555555-0000-0000-0000-000000000003', 'supervisor'),
      ('user-33333333-0000-0000-0000-000000000003', 'fac-55555555-0000-0000-0000-000000000001', 'inventory_controller'),
      ('user-33333333-0000-0000-0000-000000000003', 'fac-55555555-0000-0000-0000-000000000003', 'inventory_controller'),
      ('user-33333333-0000-0000-0000-000000000004', 'fac-55555555-0000-0000-0000-000000000001', '3pl_operator'),
      
      -- Add more users with facility access for vulnerability testing
      ('user-44444444-0000-0000-0000-000000000003', 'fac-55555555-0000-0000-0000-000000000001', 'auditor'),
      ('user-44444444-0000-0000-0000-000000000005', 'fac-55555555-0000-0000-0000-000000000001', 'buyer_admin'),
      ('user-44444444-0000-0000-0000-000000000006', 'fac-55555555-0000-0000-0000-000000000001', 'buyer_user'),
      ('user-33333333-0000-0000-0000-000000000006', 'fac-55555555-0000-0000-0000-000000000003', 'picker'), -- US picker in secure facility
      ('user-33333333-0000-0000-0000-000000000007', 'fac-55555555-0000-0000-0000-000000000003', 'supervisor'), -- Non-US supervisor in secure facility
      
      -- FastShip staff
      ('user-33333333-0000-0000-0000-000000000005', 'fac-55555555-0000-0000-0000-000000000004', 'supervisor'),
      
      -- VULNERABILITY EDGE CASE: Global Logistics user with access to FastShip facility!
      ('user-33333333-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000004', 'picker'), -- GL user at FS facility
      
      -- Client users with facility access
      ('user-44444444-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'picker'),
      ('user-44444444-0000-0000-0000-000000000002', 'fac-55555555-0000-0000-0000-000000000001', 'supervisor'),
      ('user-44444444-0000-0000-0000-000000000004', 'fac-55555555-0000-0000-0000-000000000001', 'picker');

    -- SKUs (Items) - Mix of normal, ITAR, and hazmat items
    INSERT INTO wms_skus (id, org_id, code, name, uom, itar_flag, hazmat_flag, is_deleted) VALUES
      -- AlphaCorp SKUs
      ('sku-66666666-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'ALPHA-001', 'Standard Widget', 'EA', false, false, false),
      ('sku-66666666-0000-0000-0000-000000000002', 'org-22222222-0000-0000-0000-000000000001', 'ALPHA-002', 'Premium Widget', 'EA', false, false, false),
      ('sku-66666666-0000-0000-0000-000000000003', 'org-22222222-0000-0000-0000-000000000001', 'ALPHA-ITAR-001', 'Military Component', 'EA', true, false, false),
      ('sku-66666666-0000-0000-0000-000000000004', 'org-22222222-0000-0000-0000-000000000001', 'ALPHA-HAZ-001', 'Chemical Solution', 'GAL', false, true, false),
      
      -- BetaManufacturing SKUs
      ('sku-66666666-0000-0000-0000-000000000005', 'org-22222222-0000-0000-0000-000000000002', 'BETA-001', 'Industrial Part', 'EA', false, false, false),
      ('sku-66666666-0000-0000-0000-000000000006', 'org-22222222-0000-0000-0000-000000000002', 'BETA-ITAR-001', 'Defense Article', 'EA', true, false, false),
      
      -- GammaElectronics SKUs
      ('sku-66666666-0000-0000-0000-000000000007', 'org-22222222-0000-0000-0000-000000000003', 'GAMMA-001', 'Circuit Board', 'EA', false, false, false),
      ('sku-66666666-0000-0000-0000-000000000008', 'org-22222222-0000-0000-0000-000000000003', 'GAMMA-ITAR-001', 'Secure Chip', 'EA', true, false, false),
      
      -- Deleted SKU
      ('sku-66666666-0000-0000-0000-000000000009', 'org-22222222-0000-0000-0000-000000000001', 'ALPHA-DEL-001', 'Deleted Item', 'EA', false, false, true);

    -- Lots for SKUs
    INSERT INTO wms_lots (id, sku_id, lot_code, expires_at, is_deleted) VALUES
      ('lot-77777777-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 'LOT-2024-001', CURRENT_DATE + INTERVAL '180 days', false),
      ('lot-77777777-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000001', 'LOT-2024-002', CURRENT_DATE + INTERVAL '90 days', false),
      ('lot-77777777-0000-0000-0000-000000000003', 'sku-66666666-0000-0000-0000-000000000003', 'LOT-ITAR-001', NULL, false),
      ('lot-77777777-0000-0000-0000-000000000004', 'sku-66666666-0000-0000-0000-000000000004', 'LOT-HAZ-001', CURRENT_DATE + INTERVAL '30 days', false),
      ('lot-77777777-0000-0000-0000-000000000005', 'sku-66666666-0000-0000-0000-000000000005', 'LOT-BETA-001', NULL, false),
      ('lot-77777777-0000-0000-0000-000000000006', 'sku-66666666-0000-0000-0000-000000000006', 'LOT-BETA-ITAR', NULL, false),
      ('lot-77777777-0000-0000-0000-000000000007', 'sku-66666666-0000-0000-0000-000000000007', 'LOT-GAMMA-001', NULL, false),
      ('lot-77777777-0000-0000-0000-000000000008', 'sku-66666666-0000-0000-0000-000000000008', 'LOT-GAMMA-ITAR', NULL, false),
      -- Expired lot
      ('lot-77777777-0000-0000-0000-000000000009', 'sku-66666666-0000-0000-0000-000000000002', 'LOT-EXPIRED', CURRENT_DATE - INTERVAL '10 days', false),
      -- Deleted lot
      ('lot-77777777-0000-0000-0000-000000000010', 'sku-66666666-0000-0000-0000-000000000001', 'LOT-LOW-INV', NULL, false),
      -- Additional lot for cross-facility test
      ('lot-77777777-0000-0000-0000-000000000011', 'sku-66666666-0000-0000-0000-000000000001', 'LOT-LAX', NULL, false);

    -- Inventory Records
    INSERT INTO wms_inventory (id, facility_id, client_org_id, sku_id, lot_id, bin, qty_on_hand, qty_reserved, is_deleted) VALUES
      -- AlphaCorp inventory at NYC facility
      ('inv-88888888-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001', 'A-01-01', 1000, 100, false),
      ('inv-88888888-0000-0000-0000-000000000002', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000002', 'A-01-02', 500, 0, false),
      ('inv-88888888-0000-0000-0000-000000000003', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000002', 'lot-77777777-0000-0000-0000-000000000009', 'A-02-01', 200, 0, false),
      
      -- AlphaCorp ITAR inventory in secure zone
      ('inv-88888888-0000-0000-0000-000000000004', 'fac-55555555-0000-0000-0000-000000000003', 'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000003', 'lot-77777777-0000-0000-0000-000000000003', 'SEC-01-01', 50, 10, false),
      
      -- AlphaCorp hazmat inventory
      ('inv-88888888-0000-0000-0000-000000000005', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000004', 'lot-77777777-0000-0000-0000-000000000004', 'HAZ-01-01', 100, 0, false),
      
      -- BetaManufacturing inventory
      ('inv-88888888-0000-0000-0000-000000000006', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000005', 'lot-77777777-0000-0000-0000-000000000005', 'B-01-01', 750, 50, false),
      ('inv-88888888-0000-0000-0000-000000000007', 'fac-55555555-0000-0000-0000-000000000004', 'org-22222222-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000005', NULL, 'FS-01-01', 300, 0, false),
      ('inv-88888888-0000-0000-0000-000000000008', 'fac-55555555-0000-0000-0000-000000000004', 'org-22222222-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000006', 'lot-77777777-0000-0000-0000-000000000006', 'FS-SEC-01', 25, 5, false),
      
      -- GammaElectronics inventory in secure zone
      ('inv-88888888-0000-0000-0000-000000000009', 'fac-55555555-0000-0000-0000-000000000003', 'org-22222222-0000-0000-0000-000000000003', 'sku-66666666-0000-0000-0000-000000000007', 'lot-77777777-0000-0000-0000-000000000007', 'SEC-02-01', 400, 0, false),
      ('inv-88888888-0000-0000-0000-000000000010', 'fac-55555555-0000-0000-0000-000000000003', 'org-22222222-0000-0000-0000-000000000003', 'sku-66666666-0000-0000-0000-000000000008', 'lot-77777777-0000-0000-0000-000000000008', 'SEC-02-02', 100, 20, false),
      
      -- Deleted inventory
      ('inv-88888888-0000-0000-0000-000000000011', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', NULL, 'DEL-01-01', 0, 0, true),
      
      -- Inventory for expired/inactive contracts (to expose vulnerabilities)
      ('inv-88888888-0000-0000-0000-000000000012', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000003', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001', 'A-03-01', 300, 0, false), -- inactive contract
      ('inv-88888888-0000-0000-0000-000000000013', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000004', 'sku-66666666-0000-0000-0000-000000000002', 'lot-77777777-0000-0000-0000-000000000002', 'A-03-02', 400, 0, false), -- expired contract
      ('inv-88888888-0000-0000-0000-000000000014', 'fac-55555555-0000-0000-0000-000000000002', 'org-22222222-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000005', 'lot-77777777-0000-0000-0000-000000000005', 'B-03-01', 600, 0, false), -- expired contract
      
      -- Low inventory for testing negative inventory vulnerability in create-pick
      ('inv-88888888-0000-0000-0000-000000000015', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000010', 'A-04-01', 5, 4, false), -- Only 1 available (5 on hand - 4 reserved)
      ('inv-88888888-0000-0000-0000-000000000016', 'fac-55555555-0000-0000-0000-000000000002', 'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000011', 'LAX-01-01', 100, 0, false), -- Different facility for cross-facility test
      
      -- CRITICAL: Inventory at FastShip facility (owned by different 3PL) for exposing -05-bad vulnerability
      ('inv-88888888-0000-0000-0000-000000000017', 'fac-55555555-0000-0000-0000-000000000004', 'org-22222222-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000005', 'lot-77777777-0000-0000-0000-000000000005', 'FS-01-01', 500, 0, false);

    -- Orders
    INSERT INTO wms_orders (id, client_org_id, facility_id, customer_ref, order_date, shipped_at, status, created_by, is_deleted) VALUES
      -- AlphaCorp orders
      ('ord-99999999-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'PO-ALPHA-001', CURRENT_DATE, NULL, 'DRAFT', 'user-44444444-0000-0000-0000-000000000001', false),
      ('ord-99999999-0000-0000-0000-000000000002', 'org-22222222-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'PO-ALPHA-002', CURRENT_DATE, NULL, 'RELEASED', 'user-44444444-0000-0000-0000-000000000002', false),
      ('ord-99999999-0000-0000-0000-000000000003', 'org-22222222-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'PO-ALPHA-003', CURRENT_DATE, NULL, 'PICKING', 'user-44444444-0000-0000-0000-000000000002', false),
      ('ord-99999999-0000-0000-0000-000000000004', 'org-22222222-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000003', 'PO-ALPHA-004', CURRENT_DATE, NULL, 'PACKED', 'user-44444444-0000-0000-0000-000000000002', false),
      ('ord-99999999-0000-0000-0000-000000000005', 'org-22222222-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'PO-ALPHA-005', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', 'SHIPPED', 'user-44444444-0000-0000-0000-000000000001', false),
      ('ord-99999999-0000-0000-0000-000000000006', 'org-22222222-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'PO-ALPHA-006', CURRENT_DATE - INTERVAL '2 days', NULL, 'CANCELLED', 'user-44444444-0000-0000-0000-000000000001', false),
      
      -- BetaManufacturing orders
      ('ord-99999999-0000-0000-0000-000000000007', 'org-22222222-0000-0000-0000-000000000002', 'fac-55555555-0000-0000-0000-000000000001', 'PO-BETA-001', CURRENT_DATE, NULL, 'RELEASED', 'user-44444444-0000-0000-0000-000000000004', false),
      ('ord-99999999-0000-0000-0000-000000000008', 'org-22222222-0000-0000-0000-000000000002', 'fac-55555555-0000-0000-0000-000000000004', 'PO-BETA-002', CURRENT_DATE, NULL, 'PICKING', 'user-44444444-0000-0000-0000-000000000005', false),
      
      -- GammaElectronics orders
      ('ord-99999999-0000-0000-0000-000000000009', 'org-22222222-0000-0000-0000-000000000003', 'fac-55555555-0000-0000-0000-000000000003', 'PO-GAMMA-001', CURRENT_DATE, NULL, 'DRAFT', 'user-44444444-0000-0000-0000-000000000006', false),
      
      -- Deleted order
      ('ord-99999999-0000-0000-0000-000000000010', 'org-22222222-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'PO-DELETED', CURRENT_DATE - INTERVAL '10 days', NULL, 'DRAFT', 'user-44444444-0000-0000-0000-000000000001', true);

    -- Order Lines
    INSERT INTO wms_order_lines (id, order_id, sku_id, qty, allocated, is_deleted) VALUES
      -- AlphaCorp order lines
      ('line-aaaaaaaa-0000-0000-0000-000000000001', 'ord-99999999-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 100, 0, false),
      ('line-aaaaaaaa-0000-0000-0000-000000000002', 'ord-99999999-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000002', 50, 0, false),
      ('line-aaaaaaaa-0000-0000-0000-000000000003', 'ord-99999999-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000001', 200, 200, false),
      ('line-aaaaaaaa-0000-0000-0000-000000000004', 'ord-99999999-0000-0000-0000-000000000003', 'sku-66666666-0000-0000-0000-000000000001', 150, 150, false),
      ('line-aaaaaaaa-0000-0000-0000-000000000005', 'ord-99999999-0000-0000-0000-000000000004', 'sku-66666666-0000-0000-0000-000000000003', 10, 10, false),
      ('line-aaaaaaaa-0000-0000-0000-000000000006', 'ord-99999999-0000-0000-0000-000000000005', 'sku-66666666-0000-0000-0000-000000000001', 300, 300, false),
      
      -- BetaManufacturing order lines
      ('line-aaaaaaaa-0000-0000-0000-000000000007', 'ord-99999999-0000-0000-0000-000000000007', 'sku-66666666-0000-0000-0000-000000000005', 75, 75, false),
      ('line-aaaaaaaa-0000-0000-0000-000000000008', 'ord-99999999-0000-0000-0000-000000000008', 'sku-66666666-0000-0000-0000-000000000005', 100, 100, false),
      ('line-aaaaaaaa-0000-0000-0000-000000000009', 'ord-99999999-0000-0000-0000-000000000008', 'sku-66666666-0000-0000-0000-000000000006', 5, 5, false),
      
      -- GammaElectronics order lines
      ('line-aaaaaaaa-0000-0000-0000-000000000010', 'ord-99999999-0000-0000-0000-000000000009', 'sku-66666666-0000-0000-0000-000000000007', 50, 0, false),
      ('line-aaaaaaaa-0000-0000-0000-000000000011', 'ord-99999999-0000-0000-0000-000000000009', 'sku-66666666-0000-0000-0000-000000000008', 20, 0, false),
      
      -- Deleted line
      ('line-aaaaaaaa-0000-0000-0000-000000000012', 'ord-99999999-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 10, 0, true),
      
      -- Order lines for testing create-pick vulnerabilities
      ('line-aaaaaaaa-0000-0000-0000-000000000013', 'ord-99999999-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000001', 10, 0, false), -- For low inventory test (wants 10 but only 1 available)
      ('line-aaaaaaaa-0000-0000-0000-000000000014', 'ord-99999999-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 50, 0, false); -- For cross-facility test

    -- Picks
    INSERT INTO wms_picks (id, order_line_id, facility_id, lot_id, bin, qty_picked, picker_id, status, is_deleted) VALUES
      -- Picks for released/picking orders
      ('pick-bbbbbbbb-0000-0000-0000-000000000001', 'line-aaaaaaaa-0000-0000-0000-000000000003', 'fac-55555555-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001', 'A-01-01', 200, 'user-33333333-0000-0000-0000-000000000001', 'IN_PROGRESS', false),
      ('pick-bbbbbbbb-0000-0000-0000-000000000002', 'line-aaaaaaaa-0000-0000-0000-000000000004', 'fac-55555555-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001', 'A-01-01', 100, 'user-33333333-0000-0000-0000-000000000001', 'DONE', false),
      ('pick-bbbbbbbb-0000-0000-0000-000000000003', 'line-aaaaaaaa-0000-0000-0000-000000000004', 'fac-55555555-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000002', 'A-01-02', 50, 'user-33333333-0000-0000-0000-000000000001', 'DONE', false),
      ('pick-bbbbbbbb-0000-0000-0000-000000000004', 'line-aaaaaaaa-0000-0000-0000-000000000005', 'fac-55555555-0000-0000-0000-000000000003', 'lot-77777777-0000-0000-0000-000000000003', 'SEC-01-01', 10, 'user-33333333-0000-0000-0000-000000000002', 'DONE', false),
      ('pick-bbbbbbbb-0000-0000-0000-000000000005', 'line-aaaaaaaa-0000-0000-0000-000000000007', 'fac-55555555-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000005', 'B-01-01', 75, 'user-44444444-0000-0000-0000-000000000004', 'CREATED', false),
      ('pick-bbbbbbbb-0000-0000-0000-000000000006', 'line-aaaaaaaa-0000-0000-0000-000000000008', 'fac-55555555-0000-0000-0000-000000000004', NULL, 'FS-01-01', 100, 'user-33333333-0000-0000-0000-000000000005', 'IN_PROGRESS', false),
      ('pick-bbbbbbbb-0000-0000-0000-000000000007', 'line-aaaaaaaa-0000-0000-0000-000000000009', 'fac-55555555-0000-0000-0000-000000000004', 'lot-77777777-0000-0000-0000-000000000006', 'FS-SEC-01', 5, 'user-33333333-0000-0000-0000-000000000005', 'IN_PROGRESS', false),
      
      -- Voided pick
      ('pick-bbbbbbbb-0000-0000-0000-000000000008', 'line-aaaaaaaa-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', NULL, 'A-01-01', 10, 'user-33333333-0000-0000-0000-000000000001', 'VOID', false),
      
      -- Deleted pick
      ('pick-bbbbbbbb-0000-0000-0000-000000000009', 'line-aaaaaaaa-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', NULL, 'A-01-01', 5, 'user-33333333-0000-0000-0000-000000000001', 'CREATED', true);

    -- ASNs (Advanced Shipping Notices)
    INSERT INTO wms_asn (id, facility_id, client_org_id, supplier_name, eta, status, is_deleted) VALUES
      -- AlphaCorp ASNs
      ('asn-cccccccc-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'Supplier ABC', CURRENT_TIMESTAMP + INTERVAL '2 days', 'CREATED', false),
      ('asn-cccccccc-0000-0000-0000-000000000002', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'Supplier XYZ', CURRENT_TIMESTAMP + INTERVAL '1 day', 'IN_TRANSIT', false),
      ('asn-cccccccc-0000-0000-0000-000000000003', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'Supplier DEF', CURRENT_TIMESTAMP, 'AT_GATE', false),
      ('asn-cccccccc-0000-0000-0000-000000000004', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'Supplier GHI', CURRENT_TIMESTAMP - INTERVAL '1 day', 'RECEIVED', false),
      
      -- BetaManufacturing ASNs
      ('asn-cccccccc-0000-0000-0000-000000000005', 'fac-55555555-0000-0000-0000-000000000004', 'org-22222222-0000-0000-0000-000000000002', 'Beta Vendor', CURRENT_TIMESTAMP + INTERVAL '3 days', 'CREATED', false),
      
      -- Old ASN (outside 30-day window)
      ('asn-cccccccc-0000-0000-0000-000000000006', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'Old Supplier', CURRENT_TIMESTAMP - INTERVAL '45 days', 'RECEIVED', false),
      
      -- Future ASN (outside 30-day window)
      ('asn-cccccccc-0000-0000-0000-000000000007', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'Future Supplier', CURRENT_TIMESTAMP + INTERVAL '45 days', 'CREATED', false),
      
      -- Cancelled/Deleted ASN
      ('asn-cccccccc-0000-0000-0000-000000000008', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'Cancelled Vendor', NULL, 'CANCELLED', false),
      ('asn-cccccccc-0000-0000-0000-000000000009', 'fac-55555555-0000-0000-0000-000000000001', 'org-22222222-0000-0000-0000-000000000001', 'Deleted Vendor', NULL, 'CREATED', true);

    -- Receipts
    INSERT INTO wms_receipts (id, asn_id, sku_id, lot_id, qty_received, receiver_id) VALUES
      -- Receipts for received ASN
      ('rec-dddddddd-0000-0000-0000-000000000001', 'asn-cccccccc-0000-0000-0000-000000000004', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001', 500, 'user-33333333-0000-0000-0000-000000000003'),
      ('rec-dddddddd-0000-0000-0000-000000000002', 'asn-cccccccc-0000-0000-0000-000000000004', 'sku-66666666-0000-0000-0000-000000000002', NULL, 100, 'user-33333333-0000-0000-0000-000000000003'),
      
      -- Receipt for AT_GATE ASN (partial receipt)
      ('rec-dddddddd-0000-0000-0000-000000000003', 'asn-cccccccc-0000-0000-0000-000000000003', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000002', 200, 'user-33333333-0000-0000-0000-000000000003'),
      
      -- Receipt for old ASN
      ('rec-dddddddd-0000-0000-0000-000000000004', 'asn-cccccccc-0000-0000-0000-000000000006', 'sku-66666666-0000-0000-0000-000000000001', NULL, 1000, 'user-33333333-0000-0000-0000-000000000003');

    -- Cycle Counts (maker-checker pattern)
    INSERT INTO wms_cycle_counts (id, facility_id, sku_id, lot_id, bin, expected_qty, counted_qty, counter_id, approved_by, approved_at, status, notes) VALUES
      -- Open counts (pending approval)
      ('cc-eeeeeeee-0000-0000-0000-000000000001', 'fac-55555555-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001', 'A-01-01', 1000, 995, 'user-33333333-0000-0000-0000-000000000001', NULL, NULL, 'OPEN', 'Count shows 5 units less'),
      ('cc-eeeeeeee-0000-0000-0000-000000000002', 'fac-55555555-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000002', 'lot-77777777-0000-0000-0000-000000000009', 'A-02-01', 200, 200, 'user-44444444-0000-0000-0000-000000000001', NULL, NULL, 'OPEN', 'Count matches system'),
      
      -- Approved counts
      ('cc-eeeeeeee-0000-0000-0000-000000000003', 'fac-55555555-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000005', 'lot-77777777-0000-0000-0000-000000000005', 'B-01-01', 750, 745, 'user-44444444-0000-0000-0000-000000000004', 'user-33333333-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'APPROVED', 'Adjustment confirmed'),
      ('cc-eeeeeeee-0000-0000-0000-000000000004', 'fac-55555555-0000-0000-0000-000000000003', 'sku-66666666-0000-0000-0000-000000000003', 'lot-77777777-0000-0000-0000-000000000003', 'SEC-01-01', 50, 50, 'user-33333333-0000-0000-0000-000000000003', 'user-33333333-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'APPROVED', 'ITAR item count verified'),
      
      -- Rejected count
      ('cc-eeeeeeee-0000-0000-0000-000000000005', 'fac-55555555-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000002', 'A-01-02', 500, 600, 'user-33333333-0000-0000-0000-000000000001', 'user-33333333-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '3 hours', 'REJECTED', 'Recount needed - too large variance'),
      
      -- Invalid count (same person as counter and approver - should be caught by CHECK constraint in real system)
      -- Not inserting this as it would violate the CHECK constraint
      
      -- Count in secure zone
      ('cc-eeeeeeee-0000-0000-0000-000000000006', 'fac-55555555-0000-0000-0000-000000000003', 'sku-66666666-0000-0000-0000-000000000007', 'lot-77777777-0000-0000-0000-000000000007', 'SEC-02-01', 400, 398, 'user-33333333-0000-0000-0000-000000000003', NULL, NULL, 'OPEN', 'Secure zone count'),
      
      -- Cycle counts for self-approval vulnerability testing
      ('cc-eeeeeeee-0000-0000-0000-000000000007', 'fac-55555555-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001', 'A-01-01', 1000, 990, 'user-33333333-0000-0000-0000-000000000002', NULL, NULL, 'OPEN', 'Self count by supervisor'),
      ('cc-eeeeeeee-0000-0000-0000-000000000008', 'fac-55555555-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000002', 'lot-77777777-0000-0000-0000-000000000002', 'A-01-02', 500, 495, 'user-33333333-0000-0000-0000-000000000003', NULL, NULL, 'OPEN', 'Self count by inventory controller'),
      ('cc-eeeeeeee-0000-0000-0000-000000000009', 'fac-55555555-0000-0000-0000-000000000004', 'sku-66666666-0000-0000-0000-000000000004', 'lot-77777777-0000-0000-0000-000000000004', 'B-01-02', 300, 300, 'user-33333333-0000-0000-0000-000000000005', NULL, NULL, 'OPEN', 'Self count by supervisor at facility 4'),
      
      -- Cross-facility cycle count for testing facility isolation vulnerability
      ('cc-eeeeeeee-0000-0000-0000-000000000010', 'fac-55555555-0000-0000-0000-000000000002', 'sku-66666666-0000-0000-0000-000000000005', 'lot-77777777-0000-0000-0000-000000000005', 'B-01-01', 750, 745, 'user-44444444-0000-0000-0000-000000000004', NULL, NULL, 'OPEN', 'Count at different facility');

    -- Access Grants (temporary access)
    INSERT INTO access_grants (id, user_id, scope_type, scope_id, expires_at, reason, created_by) VALUES
      -- Active facility grant for auditor
      ('grant-ffffffff-0000-0000-0000-000000000001', 'user-44444444-0000-0000-0000-000000000003', 'facility', 'fac-55555555-0000-0000-0000-000000000001', CURRENT_TIMESTAMP + INTERVAL '7 days', 'Quarterly audit - NYC facility', 'user-44444444-0000-0000-0000-000000000002'),
      
      -- Active org-wide grant for auditor  
      ('grant-ffffffff-0000-0000-0000-000000000002', 'user-44444444-0000-0000-0000-000000000003', 'org', 'org-22222222-0000-0000-0000-000000000001', CURRENT_TIMESTAMP + INTERVAL '30 days', 'Annual compliance review', 'user-44444444-0000-0000-0000-000000000002'),
      
      -- Expired facility grant
      ('grant-ffffffff-0000-0000-0000-000000000003', 'user-44444444-0000-0000-0000-000000000003', 'facility', 'fac-55555555-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Past audit - LAX facility', 'user-44444444-0000-0000-0000-000000000002'),
      
      -- Grant for different org (should not give cross-org access)
      ('grant-ffffffff-0000-0000-0000-000000000004', 'user-44444444-0000-0000-0000-000000000006', 'org', 'org-22222222-0000-0000-0000-000000000003', CURRENT_TIMESTAMP + INTERVAL '10 days', 'Gamma audit', 'user-44444444-0000-0000-0000-000000000006'),
      
      -- Future grant (not yet active - but this is simplified, would need valid_from in real system)
      ('grant-ffffffff-0000-0000-0000-000000000005', 'user-44444444-0000-0000-0000-000000000003', 'facility', 'fac-55555555-0000-0000-0000-000000000003', CURRENT_TIMESTAMP + INTERVAL '90 days', 'Future secure zone audit', 'user-44444444-0000-0000-0000-000000000002');

    -- ========================================
    -- EDGE CASE DATA FOR VULNERABILITY TESTING
    -- ========================================
    
    -- Edge Case Organizations for testing
    INSERT INTO orgs (id, name, parent_org_id, is_deleted) VALUES
      ('org-99999999-edge-null', 'EdgeNull Corp', NULL, false), -- For NULL contract testing
      ('org-edge-expired', 'ExpiredContract Corp', NULL, false), -- For expired contract testing
      ('org-99999999-different', 'Different Corp', NULL, false); -- For cross-org testing
    
    -- Edge Case 1: Contract that expired yesterday for 3PL operator inventory
    INSERT INTO wms_3pl_contracts (id, provider_org_id, client_org_id, facility_id, valid_from, valid_to, status) VALUES
      ('con-edge-expired', '3pl-11111111-0000-0000-0000-000000000001', 
       'org-edge-expired', 'fac-55555555-0000-0000-0000-000000000001',
       '2024-01-01', CURRENT_DATE - INTERVAL '1 day', 'ACTIVE') -- Ended yesterday but still marked ACTIVE
;
    
    -- Edge Case Inventory: For client with NULL contract and expired contract
    INSERT INTO wms_inventory (id, facility_id, client_org_id, sku_id, lot_id, bin, qty_on_hand, qty_reserved, is_deleted) VALUES
      ('inv-edge-null-contract', 'fac-55555555-0000-0000-0000-000000000001', 
       'org-99999999-edge-null', 'sku-66666666-0000-0000-0000-000000000001', 
       'lot-77777777-0000-0000-0000-000000000001', 'X-01-01', 100, 100, false),
      ('inv-edge-expired', 'fac-55555555-0000-0000-0000-000000000001',
       'org-edge-expired', 'sku-66666666-0000-0000-0000-000000000002',
       'lot-77777777-0000-0000-0000-000000000002', 'X-02-01', 50, 50, false)
;
    
    -- Edge Case 2: Supervisor's own count for self-approval test
    INSERT INTO wms_cycle_counts (id, facility_id, sku_id, lot_id, bin, expected_qty, counted_qty, counter_id, approved_by, approved_at, status, notes) VALUES
      ('cc-edge-self-approve', 'fac-55555555-0000-0000-0000-000000000001',
       'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001',
       'A-01-01', 1000, 995, 
       'user-33333333-0000-0000-0000-000000000002', -- Supervisor created it
       NULL, NULL, 'OPEN', 'Supervisor self count for testing')
;
    
    -- Edge Case: Count at facility-2 while supervisor is at facility-1
    INSERT INTO wms_cycle_counts (id, facility_id, sku_id, lot_id, bin, expected_qty, counted_qty, counter_id, approved_by, approved_at, status, notes) VALUES
      ('cc-edge-cross-facility', 'fac-55555555-0000-0000-0000-000000000002',
       'sku-66666666-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000011',
       'LAX-01-01', 50, 48,
       'user-44444444-0000-0000-0000-000000000004', -- Different facility user
       NULL, NULL, 'OPEN', 'Cross-facility count for testing')
;
    
    -- Edge Case 3: Inventory with exactly the requested amount for negative inventory test
    INSERT INTO wms_inventory (id, facility_id, client_org_id, sku_id, lot_id, bin, qty_on_hand, qty_reserved, is_deleted) VALUES
      ('inv-edge-exact-amount', 'fac-55555555-0000-0000-0000-000000000001',
       'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001',
       'lot-77777777-0000-0000-0000-000000000001', 'Y-01-01', 25, 0, false) -- Exactly 25 available
;
    
    -- Edge Case: Order at facility-2, for facility mismatch testing
    INSERT INTO wms_orders (id, client_org_id, facility_id, customer_ref, order_date, shipped_at, status, is_deleted) VALUES
      ('ord-edge-facility-mismatch', 'org-22222222-0000-0000-0000-000000000001',
       'fac-55555555-0000-0000-0000-000000000002', -- Different facility than inventory
       'cus-edge-001', '2025-09-05', NULL, 'RELEASED', false)
;
    
    INSERT INTO wms_order_lines (id, order_id, sku_id, qty, allocated) VALUES
      ('line-edge-facility', 'ord-edge-facility-mismatch', 
       'sku-66666666-0000-0000-0000-000000000001', 30, 0)
;
    
    -- Edge Case: Inventory being picked by another process (TOCTOU)
    INSERT INTO wms_inventory (id, facility_id, client_org_id, sku_id, lot_id, bin, qty_on_hand, qty_reserved, is_deleted) VALUES
      ('inv-edge-concurrent', 'fac-55555555-0000-0000-0000-000000000001',
       'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000001',
       'lot-77777777-0000-0000-0000-000000000001', 'Y-02-01', 10, 5, false) -- Being picked, only 5 available
;
    
    INSERT INTO wms_picks (id, order_line_id, facility_id, lot_id, bin, qty_picked, picker_id, status) VALUES
      ('pick-edge-concurrent', 'line-aaaaaaaa-0000-0000-0000-000000000001',
       'fac-55555555-0000-0000-0000-000000000001', 'lot-77777777-0000-0000-0000-000000000001', 'Y-02-01',
       5, 'user-33333333-0000-0000-0000-000000000001', 'ASSIGNED') -- Already picking 5
;
    
    -- Edge Case 4: Users with edge case US person status for ITAR testing
    INSERT INTO users (id, org_id, email, display_name, role, is_us_person, is_active, is_deleted) VALUES
      ('user-edge-null-us', '3pl-11111111-0000-0000-0000-000000000001',
       'edge-null@example.com', 'Edge Null', 'supervisor', NULL, true, false), -- NULL US person status
      ('user-edge-us-receiver', '3pl-11111111-0000-0000-0000-000000000001',
       'us-receiver@example.com', 'US Receiver', 'receiver', true, true, false), -- US person with wrong role
      ('user-edge-foreign-super', '3pl-11111111-0000-0000-0000-000000000001',
       'foreign-super@example.com', 'Foreign Supervisor', 'supervisor', false, true, false) -- Non-US supervisor
;
    
    INSERT INTO wms_user_facilities (user_id, facility_id, role) VALUES
      ('user-edge-null-us', 'fac-55555555-0000-0000-0000-000000000003', 'supervisor'),
      ('user-edge-us-receiver', 'fac-55555555-0000-0000-0000-000000000003', 'receiver'),
      ('user-edge-foreign-super', 'fac-55555555-0000-0000-0000-000000000003', 'supervisor')
;
    
    -- Edge Case 5: Soft-deleted ASN for receive testing
    INSERT INTO wms_asn (id, facility_id, client_org_id, supplier_name, eta, status, is_deleted) VALUES
      ('asn-edge-deleted', 'fac-55555555-0000-0000-0000-000000000001',
       'org-22222222-0000-0000-0000-000000000001', 'SUP001',
       '2025-09-10', 'PENDING', true) -- Soft deleted
;
    
    INSERT INTO wms_asn_lines (id, asn_id, sku_id, qty_expected, qty_received) VALUES
      ('asnl-edge-deleted', 'asn-edge-deleted',
       'sku-66666666-0000-0000-0000-000000000001', 100, 0)
;
    
    -- Edge Case: ASN from different organization for cross-org testing
    INSERT INTO wms_asn (id, facility_id, client_org_id, supplier_name, eta, status, is_deleted) VALUES
      ('asn-edge-cross-org', 'fac-55555555-0000-0000-0000-000000000001',
       'org-99999999-different', 'SUP002',
       '2025-09-11', 'PENDING', false)
;
    
    INSERT INTO wms_asn_lines (id, asn_id, sku_id, qty_expected, qty_received) VALUES
      ('asnl-edge-cross-org', 'asn-edge-cross-org',
       'sku-66666666-0000-0000-0000-000000000002', 200, 0)
;
    
    -- Edge Case: More lots for edge case testing
    INSERT INTO wms_lots (id, sku_id, lot_code, expires_at, is_deleted) VALUES
      ('lot-edge-001', 'sku-66666666-0000-0000-0000-000000000001', 'LOT-EDGE-001', NULL, false),
      ('lot-edge-002', 'sku-66666666-0000-0000-0000-000000000002', 'LOT-EDGE-002', NULL, false),
      ('lot-edge-003', 'sku-66666666-0000-0000-0000-000000000001', 'LOT-EDGE-003', NULL, false),
      ('lot-edge-004', 'sku-66666666-0000-0000-0000-000000000001', 'LOT-EDGE-004', NULL, false)
;
    
    -- Audit Log entries
    INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, request_id, before, after) VALUES
      ('wms_orders', 'ord-99999999-0000-0000-0000-000000000002', 'STATUS_CHANGE', 'user-44444444-0000-0000-0000-000000000002', 'req-001', '{"status": "DRAFT"}', '{"status": "RELEASED"}'),
      ('wms_orders', 'ord-99999999-0000-0000-0000-000000000003', 'STATUS_CHANGE', 'user-33333333-0000-0000-0000-000000000002', 'req-002', '{"status": "RELEASED"}', '{"status": "PICKING"}'),
      ('wms_inventory', 'inv-88888888-0000-0000-0000-000000000001', 'UPDATE', 'user-33333333-0000-0000-0000-000000000003', 'req-003', '{"qty_on_hand": 1100}', '{"qty_on_hand": 1000}'),
      ('wms_picks', 'pick-bbbbbbbb-0000-0000-0000-000000000001', 'INSERT', 'user-33333333-0000-0000-0000-000000000001', 'req-004', NULL, '{"qty_picked": 200, "status": "IN_PROGRESS"}'),
      ('wms_cycle_counts', 'cc-eeeeeeee-0000-0000-0000-000000000003', 'APPROVAL', 'user-33333333-0000-0000-0000-000000000002', 'req-005', '{"status": "OPEN"}', '{"status": "APPROVED"}'),
      ('wms_asn', 'asn-cccccccc-0000-0000-0000-000000000002', 'STATUS_CHANGE', 'user-33333333-0000-0000-0000-000000000003', 'req-006', '{"status": "CREATED"}', '{"status": "IN_TRANSIT"}'),
      ('wms_receipts', 'rec-dddddddd-0000-0000-0000-000000000001', 'INSERT', 'user-33333333-0000-0000-0000-000000000003', 'req-007', NULL, '{"qty_received": 500}');
  `);

    return db;
}