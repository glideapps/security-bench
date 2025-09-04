import { PGlite } from '@electric-sql/pglite';

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
      is_active    BOOLEAN NOT NULL DEFAULT true,
      is_deleted   BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers belong to one buyer org (the tenancy boundary for POs)
    CREATE TABLE suppliers (
      id           TEXT PRIMARY KEY,
      buyer_org_id TEXT NOT NULL REFERENCES orgs(id),
      legal_name   TEXT NOT NULL,
      external_ref TEXT,
      is_deleted   BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Link buyer-portal users to specific suppliers (supplier-side visibility)
    CREATE TABLE supplier_users (
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, supplier_id)
    );

    -- === Purchase Orders =========================================================
    CREATE TABLE purchase_orders (
      id             TEXT PRIMARY KEY,
      buyer_org_id   TEXT NOT NULL REFERENCES orgs(id),
      supplier_id    TEXT NOT NULL REFERENCES suppliers(id),
      status         TEXT NOT NULL DEFAULT 'DRAFT',
      currency       TEXT NOT NULL,
      created_by     TEXT NOT NULL REFERENCES users(id),
      approved_by    TEXT REFERENCES users(id),
      approved_at    TIMESTAMP,
      internal_notes TEXT,
      version        INTEGER NOT NULL DEFAULT 1,
      is_deleted     BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- === PO Lines ================================================================
    CREATE TABLE po_lines (
      id                 TEXT PRIMARY KEY,
      po_id              TEXT NOT NULL REFERENCES purchase_orders(id),
      sku_code           TEXT NOT NULL,
      description        TEXT,
      qty                NUMERIC(12,2) NOT NULL CHECK (qty >= 0),
      unit_price         NUMERIC(14,4) NOT NULL CHECK (unit_price >= 0),
      promised_ship_date DATE,
      line_status        TEXT NOT NULL DEFAULT 'OPEN',
      is_deleted         BOOLEAN NOT NULL DEFAULT false,
      created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- === Attachments (documents on a PO) ========================================
    CREATE TABLE attachments (
      id             TEXT PRIMARY KEY,
      po_id          TEXT NOT NULL REFERENCES purchase_orders(id),
      classification TEXT NOT NULL,
      filename       TEXT NOT NULL,
      content_type   TEXT,
      byte_size      INTEGER,
      storage_key    TEXT NOT NULL,
      created_by     TEXT NOT NULL REFERENCES users(id),
      is_deleted     BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- === Messages (PO thread) ====================================================
    CREATE TABLE messages (
      id              TEXT PRIMARY KEY,
      po_id           TEXT NOT NULL REFERENCES purchase_orders(id),
      author_user_id  TEXT NOT NULL REFERENCES users(id),
      body            TEXT NOT NULL,
      is_deleted      BOOLEAN NOT NULL DEFAULT false,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- === Invoices ==============================================================--
    CREATE TABLE invoices (
      id           TEXT PRIMARY KEY,
      po_id        TEXT NOT NULL REFERENCES purchase_orders(id),
      supplier_id  TEXT NOT NULL REFERENCES suppliers(id),
      status       TEXT NOT NULL DEFAULT 'DRAFT',
      total        NUMERIC(14,2) NOT NULL CHECK (total >= 0),
      is_deleted   BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- === Delegated / Temporary Access ===========================================
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
  `);

  // Insert sample data
  await db.exec(`
    -- Organizations (multiple tenants for testing tenant isolation)
    INSERT INTO orgs (id, name, is_deleted) VALUES 
      ('11111111-0000-0000-0000-000000000001', 'Acme Corp', false),
      ('11111111-0000-0000-0000-000000000002', 'Beta Industries', false),
      ('11111111-0000-0000-0000-000000000003', 'Deleted Org', true);

    -- Users (various roles across organizations)
    INSERT INTO users (id, org_id, email, display_name, role, is_active, is_deleted) VALUES 
      -- Acme Corp users
      ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'buyer-admin@acme.com', 'Buyer Admin', 'buyer_admin', true, false),
      ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'buyer-user@acme.com', 'Buyer User', 'buyer_user', true, false),
      ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'supplier@acme.com', 'Supplier User', 'supplier_user', true, false),
      ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'auditor@acme.com', 'Auditor', 'auditor', true, false),
      -- Beta Industries users
      ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'buyer-admin@beta.com', 'Beta Admin', 'buyer_admin', true, false),
      ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000002', 'supplier@beta.com', 'Beta Supplier', 'supplier_user', true, false),
      -- Deleted user
      ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', 'deleted@acme.com', 'Deleted User', 'buyer_user', false, true);

    -- Suppliers
    INSERT INTO suppliers (id, buyer_org_id, legal_name, external_ref, is_deleted) VALUES 
      ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Supplier One', 'SUP001', false),
      ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Supplier Two', 'SUP002', false),
      ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'Beta Supplier', 'BSUP001', false),
      ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Deleted Supplier', 'DSUP001', true),
      -- More suppliers for org2 with searchable names
      ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'Acme Industries', 'ACME001', false),
      ('33333333-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000002', 'Widget Factory', 'WIDGET001', false);

    -- Link supplier users to suppliers
    INSERT INTO supplier_users (user_id, supplier_id) VALUES 
      ('22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001'),
      ('22222222-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003');

    -- Purchase Orders (various statuses for testing)
    INSERT INTO purchase_orders (id, buyer_org_id, supplier_id, status, currency, created_by, approved_by, approved_at, internal_notes, version, is_deleted) VALUES 
      -- Acme Corp POs
      ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'DRAFT', 'USD', '22222222-0000-0000-0000-000000000002', NULL, NULL, 'Internal: Need to review pricing', 1, false),
      ('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'PENDING_APPROVAL', 'USD', '22222222-0000-0000-0000-000000000002', NULL, NULL, 'Secret notes', 1, false),
      ('44444444-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 'APPROVED', 'USD', '22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '5 days', 'Confidential pricing', 2, false),
      ('44444444-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'SENT', 'EUR', '22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '4 days', NULL, 3, false),
      ('44444444-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'CLOSED', 'USD', '22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '30 days', NULL, 4, false),
      ('44444444-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'CANCELLED', 'USD', '22222222-0000-0000-0000-000000000002', NULL, NULL, NULL, 1, false),
      -- Beta Industries PO
      ('44444444-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 'APPROVED', 'USD', '22222222-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000005', CURRENT_TIMESTAMP - INTERVAL '3 days', 'Beta internal notes', 1, false),
      -- Deleted PO
      ('44444444-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'DRAFT', 'USD', '22222222-0000-0000-0000-000000000002', NULL, NULL, NULL, 1, true),
      -- More APPROVED POs for org2 to expose vulnerabilities
      ('44444444-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 'APPROVED', 'USD', '22222222-0000-0000-0000-000000000005', NULL, NULL, NULL, 1, false),
      ('44444444-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 'APPROVED', 'USD', '22222222-0000-0000-0000-000000000005', NULL, NULL, NULL, 1, false),
      -- POs for new suppliers to enable search testing
      ('44444444-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000005', 'DRAFT', 'USD', '22222222-0000-0000-0000-000000000005', NULL, NULL, NULL, 1, false),
      ('44444444-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000006', 'SENT', 'USD', '22222222-0000-0000-0000-000000000005', NULL, NULL, NULL, 1, false);

    -- PO Lines
    INSERT INTO po_lines (id, po_id, sku_code, description, qty, unit_price, promised_ship_date, line_status, is_deleted) VALUES 
      ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'SKU001', 'Widget A', 100, 25.50, CURRENT_DATE + INTERVAL '30 days', 'OPEN', false),
      ('55555555-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 'SKU002', 'Widget B', 50, 45.00, CURRENT_DATE + INTERVAL '30 days', 'OPEN', false),
      ('55555555-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002', 'SKU003', 'Gadget A', 25, 100.00, CURRENT_DATE + INTERVAL '45 days', 'OPEN', false),
      ('55555555-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', 'SKU001', 'Widget A', 200, 24.00, CURRENT_DATE + INTERVAL '15 days', 'PARTIALLY_FULFILLED', false),
      ('55555555-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000004', 'SKU004', 'Component X', 500, 5.50, CURRENT_DATE + INTERVAL '10 days', 'FULFILLED', false),
      ('55555555-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000005', 'SKU005', 'Assembly Y', 10, 1500.00, CURRENT_DATE - INTERVAL '10 days', 'FULFILLED', false),
      ('55555555-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000007', 'SKU006', 'Beta Product', 75, 80.00, CURRENT_DATE + INTERVAL '20 days', 'OPEN', false),
      ('55555555-0000-0000-0000-000000000008', '44444444-0000-0000-0000-000000000001', 'SKU007', 'Deleted Line', 10, 10.00, CURRENT_DATE + INTERVAL '30 days', 'CANCELLED', true);

    -- Attachments (various classifications)
    INSERT INTO attachments (id, po_id, classification, filename, content_type, byte_size, storage_key, created_by, is_deleted) VALUES 
      ('66666666-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'public', 'spec.pdf', 'application/pdf', 102400, 's3://bucket/spec.pdf', '22222222-0000-0000-0000-000000000002', false),
      ('66666666-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 'supplier_visible', 'pricing.xlsx', 'application/xlsx', 51200, 's3://bucket/pricing.xlsx', '22222222-0000-0000-0000-000000000002', false),
      ('66666666-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 'internal_only', 'negotiation_notes.docx', 'application/docx', 25600, 's3://bucket/notes.docx', '22222222-0000-0000-0000-000000000001', false),
      ('66666666-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', 'public', 'contract.pdf', 'application/pdf', 204800, 's3://bucket/contract.pdf', '22222222-0000-0000-0000-000000000002', false),
      ('66666666-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000007', 'public', 'beta-doc.pdf', 'application/pdf', 10240, 's3://bucket/beta.pdf', '22222222-0000-0000-0000-000000000005', false),
      ('66666666-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000001', 'internal_only', 'deleted.pdf', 'application/pdf', 10240, 's3://bucket/deleted.pdf', '22222222-0000-0000-0000-000000000001', true),
      -- More attachments for org2 POs
      ('66666666-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000009', 'public', 'org2-doc1.pdf', 'application/pdf', 10240, 's3://bucket/org2-1.pdf', '22222222-0000-0000-0000-000000000005', false),
      ('66666666-0000-0000-0000-000000000008', '44444444-0000-0000-0000-000000000010', 'supplier_visible', 'org2-doc2.pdf', 'application/pdf', 10240, 's3://bucket/org2-2.pdf', '22222222-0000-0000-0000-000000000005', false);

    -- Messages
    INSERT INTO messages (id, po_id, author_user_id, body, is_deleted) VALUES 
      ('77777777-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'Please review the attached spec', false),
      ('77777777-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 'Spec looks good, proceeding with quote', false),
      ('77777777-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Approved for processing', false),
      ('77777777-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000005', 'Beta message', false),
      ('77777777-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'Deleted message', true);

    -- Invoices
    INSERT INTO invoices (id, po_id, supplier_id, status, total, is_deleted) VALUES 
      ('88888888-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'SUBMITTED', 2750.00, false),
      ('88888888-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001', 'PAID', 15000.00, false),
      ('88888888-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000002', 'DRAFT', 4800.00, false),
      ('88888888-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000002', 'VOID', 4800.00, false),
      ('88888888-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000003', 'SUBMITTED', 6000.00, false),
      ('88888888-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'DRAFT', 100.00, true),
      -- More invoices for org2 POs to expose vulnerabilities
      ('88888888-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000003', 'PAID', 4000.00, false),
      ('88888888-0000-0000-0000-000000000008', '44444444-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000003', 'PAID', 5000.00, false);

    -- Access Grants (some active, some expired)
    INSERT INTO access_grants (id, user_id, scope_type, scope_id, expires_at, reason, created_by) VALUES 
      -- Active PO grant
      ('99999999-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', 'po', '44444444-0000-0000-0000-000000000001', CURRENT_TIMESTAMP + INTERVAL '7 days', 'Audit review', '22222222-0000-0000-0000-000000000001'),
      -- Expired PO grant
      ('99999999-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 'po', '44444444-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Past audit', '22222222-0000-0000-0000-000000000001'),
      -- Active org-wide grant
      ('99999999-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000004', 'org', '11111111-0000-0000-0000-000000000001', CURRENT_TIMESTAMP + INTERVAL '30 days', 'Quarterly audit', '22222222-0000-0000-0000-000000000001'),
      -- Beta org grant (should not give access to Acme)
      ('99999999-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006', 'org', '11111111-0000-0000-0000-000000000002', CURRENT_TIMESTAMP + INTERVAL '10 days', 'Beta audit', '22222222-0000-0000-0000-000000000005');

    -- Add some audit log entries
    INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, request_id, before, after) VALUES 
      ('purchase_orders', '44444444-0000-0000-0000-000000000003', 'STATUS_CHANGE', '22222222-0000-0000-0000-000000000001', 'req-001', '{"status": "PENDING_APPROVAL"}', '{"status": "APPROVED"}'),
      ('purchase_orders', '44444444-0000-0000-0000-000000000004', 'STATUS_CHANGE', '22222222-0000-0000-0000-000000000001', 'req-002', '{"status": "APPROVED"}', '{"status": "SENT"}');
  `);

  return db;
}

// Export a function to get test parameter sets
export function getTestParameters() {
  return {
    // Standard user contexts for different roles
    acmeBuyerAdmin: {
      user_id: '22222222-0000-0000-0000-000000000001',
      org_id: '11111111-0000-0000-0000-000000000001',
      role: 'buyer_admin',
      user_role: 'buyer_admin',
      now: new Date().toISOString()
    },
    acmeBuyerUser: {
      user_id: '22222222-0000-0000-0000-000000000002',
      org_id: '11111111-0000-0000-0000-000000000001', 
      role: 'buyer_user',
      user_role: 'buyer_user',
      now: new Date().toISOString()
    },
    acmeSupplier: {
      user_id: '22222222-0000-0000-0000-000000000003',
      org_id: '11111111-0000-0000-0000-000000000001',
      role: 'supplier_user',
      user_role: 'supplier_user',
      now: new Date().toISOString()
    },
    acmeAuditor: {
      user_id: '22222222-0000-0000-0000-000000000004',
      org_id: '11111111-0000-0000-0000-000000000001',
      role: 'auditor',
      user_role: 'auditor',
      now: new Date().toISOString()
    },
    betaBuyerAdmin: {
      user_id: '22222222-0000-0000-0000-000000000005',
      org_id: '11111111-0000-0000-0000-000000000002',
      role: 'buyer_admin', 
      user_role: 'buyer_admin',
      now: new Date().toISOString()
    },
    betaSupplier: {
      user_id: '22222222-0000-0000-0000-000000000006',
      org_id: '11111111-0000-0000-0000-000000000002',
      role: 'supplier_user',
      user_role: 'supplier_user',
      now: new Date().toISOString()
    },
    // Specific IDs for targeted queries
    specificIds: {
      po_id: '44444444-0000-0000-0000-000000000001',
      supplier_id: '33333333-0000-0000-0000-000000000001',
      expected_version: 1,
      body: 'Test message'
    },
    // Date ranges and filters
    filters: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
      statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'],
      supplier_ids: ['33333333-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002'],
      q: 'Widget'
    },
    // Sharding parameters
    sharding: {
      shard_id: 0,
      shards: 4
    },
    // Invalid/malicious inputs for testing bad queries
    maliciousInputs: {
      user_id: '22222222-0000-0000-0000-000000000002',
      org_id: '11111111-0000-0000-0000-000000000002', // Different org!
      role: 'buyer_user',
      user_role: 'buyer_user',
      po_id: '44444444-0000-0000-0000-000000000007', // Beta's PO
      supplier_id: '33333333-0000-0000-0000-000000000003', // Beta's supplier
      now: new Date().toISOString()
    }
  };
}