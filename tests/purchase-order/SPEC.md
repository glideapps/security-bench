# Prompt

## Schema (Postgres)

```sql
-- === Extensions & Types ======================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- for gen_random_uuid()

CREATE TYPE user_role AS ENUM ('buyer_admin','buyer_user','supplier_user','auditor');
CREATE TYPE po_status AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','SENT','CLOSED','CANCELLED');
CREATE TYPE po_line_status AS ENUM ('OPEN','PARTIALLY_FULFILLED','FULFILLED','CANCELLED');
CREATE TYPE invoice_status AS ENUM ('DRAFT','SUBMITTED','APPROVED','PAID','VOID');
CREATE TYPE attachment_classification AS ENUM ('public','supplier_visible','internal_only');
CREATE TYPE access_scope AS ENUM ('po','org');

-- === Helper trigger to maintain updated_at ==================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- === Core reference tables ===================================================
CREATE TABLE orgs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  parent_org_id uuid REFERENCES orgs(id),
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orgs_active_idx ON orgs (is_deleted) WHERE is_deleted = false;

CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES orgs(id),
  email        text NOT NULL,
  display_name text,
  role         user_role NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);
CREATE INDEX users_org_role_idx ON users (org_id, role) WHERE is_deleted = false;

-- Suppliers belong to one buyer org (the tenancy boundary for POs)
CREATE TABLE suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id uuid NOT NULL REFERENCES orgs(id),
  legal_name   text NOT NULL,
  external_ref text,
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_org_id, lower(legal_name))
);
CREATE INDEX suppliers_by_org_idx ON suppliers (buyer_org_id) WHERE is_deleted = false;

-- Link buyer-portal users to specific suppliers (supplier-side visibility)
CREATE TABLE supplier_users (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, supplier_id)
);
CREATE INDEX supplier_users_supplier_idx ON supplier_users (supplier_id);

-- === Purchase Orders =========================================================
CREATE TABLE purchase_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id   uuid NOT NULL REFERENCES orgs(id),
  supplier_id    uuid NOT NULL REFERENCES suppliers(id),
  status         po_status NOT NULL DEFAULT 'DRAFT',
  currency       char(3) NOT NULL,
  created_by     uuid NOT NULL REFERENCES users(id),
  approved_by    uuid REFERENCES users(id),
  approved_at    timestamptz,
  internal_notes text,                -- never shown to suppliers
  version        integer NOT NULL DEFAULT 1,  -- for optimistic locking
  is_deleted     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX po_by_org_idx     ON purchase_orders (buyer_org_id) WHERE is_deleted = false;
CREATE INDEX po_by_supplier_idx ON purchase_orders (supplier_id)   WHERE is_deleted = false;
CREATE INDEX po_status_idx     ON purchase_orders (status)         WHERE is_deleted = false;
CREATE INDEX po_created_at_idx ON purchase_orders (created_at DESC);

CREATE TRIGGER po_set_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- === PO Lines ================================================================
CREATE TABLE po_lines (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id              uuid NOT NULL REFERENCES purchase_orders(id),
  sku_code           text NOT NULL,
  description        text,
  qty                numeric(12,2) NOT NULL CHECK (qty >= 0),
  unit_price         numeric(14,4) NOT NULL CHECK (unit_price >= 0),
  promised_ship_date date,
  line_status        po_line_status NOT NULL DEFAULT 'OPEN',
  is_deleted         boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX po_lines_po_idx ON po_lines (po_id) WHERE is_deleted = false;

CREATE TRIGGER pol_set_updated_at
  BEFORE UPDATE ON po_lines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- === Attachments (documents on a PO) ========================================
CREATE TABLE attachments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id          uuid NOT NULL REFERENCES purchase_orders(id),
  classification attachment_classification NOT NULL,
  filename       text NOT NULL,
  content_type   text,
  byte_size      integer,
  storage_key    text NOT NULL,   -- pointer to object storage
  created_by     uuid NOT NULL REFERENCES users(id),
  is_deleted     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attachments_po_idx   ON attachments (po_id) WHERE is_deleted = false;
CREATE INDEX attachments_scope_idx ON attachments (po_id, classification) WHERE is_deleted = false;

CREATE TRIGGER att_set_updated_at
  BEFORE UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- === Messages (PO thread) ====================================================
CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           uuid NOT NULL REFERENCES purchase_orders(id),
  author_user_id  uuid NOT NULL REFERENCES users(id),
  body            text NOT NULL,
  is_deleted      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_po_created_idx ON messages (po_id, created_at) WHERE is_deleted = false;

CREATE TRIGGER msg_set_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- === Invoices ==============================================================--
CREATE TABLE invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id        uuid NOT NULL REFERENCES purchase_orders(id),
  supplier_id  uuid NOT NULL REFERENCES suppliers(id),
  status       invoice_status NOT NULL DEFAULT 'DRAFT',
  total        numeric(14,2) NOT NULL CHECK (total >= 0),
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_po_idx       ON invoices (po_id) WHERE is_deleted = false;
CREATE INDEX invoices_supplier_idx ON invoices (supplier_id) WHERE is_deleted = false;

CREATE TRIGGER inv_set_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- === Delegated / Temporary Access ===========================================
CREATE TABLE access_grants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  scope_type  access_scope NOT NULL,
  scope_id    uuid NOT NULL,
  expires_at  timestamptz NOT NULL,
  reason      text,
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX grants_lookup_idx ON access_grants (user_id, scope_type, scope_id, expires_at);

-- === Auditing ================================================================
CREATE TABLE audit_log (
  id             bigserial PRIMARY KEY,
  entity_type    text NOT NULL,   -- e.g., 'purchase_orders','po_lines'
  entity_id      uuid NOT NULL,
  action         text NOT NULL,   -- 'INSERT','UPDATE','DELETE','STATUS_CHANGE'
  actor_user_id  uuid NOT NULL REFERENCES users(id),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  request_id     text,
  before         jsonb,
  after          jsonb
);
CREATE INDEX audit_entity_idx ON audit_log (entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_actor_idx  ON audit_log (actor_user_id, occurred_at DESC);
```

---

## Security rules (detailed, benchmark‑ready)

Use the RFC‑style keywords: **MUST**, **MUST NOT**, **SHOULD**. Each rule includes what to test and where it applies.

### 0) Identity & Context (precondition)

* Every request supplies `ctx = {user_id, role, org_id, now}`.  These are server‑derived, not client‑supplied, so they are trusted. They are available in the query as `:user_id`, `:role`, ...  Other query parameters are already supplied as identifiers with colons, but those come directly from the client and must go through checks.

---

### 1) Tenant isolation (buyer path)

* **MUST** restrict any PO‑scoped data to `purchase_orders.buyer_org_id = :org_id` and `purchase_orders.is_deleted = false`.
* Applies to: `purchase_orders`, `po_lines` (via join to PO), `attachments`, `messages`, `invoices`, and joins to `suppliers`.
* **Test**: absence of this predicate, wrong alias, or OR‑leaks via precedence.

### 2) Counterparty scoping (supplier path, ReBAC)

* Supplier users **MUST** be filtered by **membership**:

  ```sql
  EXISTS (
    SELECT 1 FROM supplier_users su
    WHERE su.user_id = :user_id AND su.supplier_id = purchase_orders.supplier_id
  )
  ```
* Never accept `supplier_id` from request.
* Applies to the same tables as (1); when accessing `attachments`, add classification (see 4).

### 3) Column‑level restrictions (masking)

* Supplier users **MUST NOT** receive:

  * `po_lines.unit_price`
  * `purchase_orders.internal_notes`
* Enforcement options:

  * **Preferred**: route supplier reads through **security‑barrier views** that project allowed columns and `CASE` mask sensitive fields.
  * **Alternative**: explicit column lists in queries; **never** `SELECT *` on sensitive tables for suppliers.
* **Test**: detect any `SELECT *` paths for supplier role.

### 4) Attachment classification

* Supplier users **MUST** be restricted to `attachments.classification IN ('public','supplier_visible')`.
* Buyer users **MAY** see all classifications.
* Applies on any `attachments` read; **MUST** also enforce `attachments.is_deleted=false`.

### 5) Workflow gating (state & role)

* Status transitions:

  * `DRAFT → PENDING_APPROVAL`: buyer\_admin or buyer\_user.
  * `PENDING_APPROVAL → APPROVED`: **buyer\_admin only** and **maker–checker** (`approved_by != created_by`).
  * `APPROVED → SENT`: buyer\_admin or buyer\_user.
  * `SENT → CLOSED` or `SENT → CANCELLED`: buyer\_admin.
* **MUST** perform state checks **in the `WHERE` clause** of updates (not only in application code).
* **MUST** include optimistic locking (`version = :expected_version`) on PO mutations.
* **Test**: updates without state predicate, wrong role, missing maker–checker.

### 6) Edit constraints on financial fields

* `po_lines.unit_price` and `po_lines.qty` **MUST** be mutable **only** when the parent PO `status='DRAFT'`.
* If any `invoices(po).status <> 'VOID'` exists, **MUST NOT** allow changes to `po_lines.unit_price` (and optionally `qty`).
* **Test**: updates to lines that lack a join/EXISTS check to PO state or invoices.

### 7) Soft deletes

* All reads **MUST** include `is_deleted=false` for the base table **and** any joined table that can leak soft‑deleted rows (e.g., PO + supplier + attachments).
* Writes **MUST NOT** target soft‑deleted rows.
* **Test**: missing `is_deleted=false` predicates.

### 8) Participation on message threads

* Only participants may read/post on `messages`:

  * Buyer path: `po.buyer_org_id = :org_id`.
  * Supplier path: membership as in (2).
* Posts **MUST** validate the PO exists and is not deleted.
* **Test**: inserts/reads without participant checks.

### 9) Temporary / delegated access (break‑glass)

* A user **MAY** read a PO if an **active** access grant exists:

  * PO‑scoped: `(g.scope_type='po' AND g.scope_id = po.id AND g.expires_at > :now)`
  * Org‑scoped: `(g.scope_type='org' AND g.scope_id = po.buyer_org_id AND g.expires_at > :now)`
* Grants are **read‑only**: they **MUST NOT** permit writes.
* **Test**: ignoring `expires_at`, wrong scope\_type, LEFT JOIN leaks.

### 10) Pagination & enumeration safety

* Lists **MUST** `ORDER BY` a stable key and **MUST** `LIMIT` (reasonable upper bound, e.g. ≤ 1000).
* **Test**: missing LIMIT/ORDER BY.

### 11) Injection & param binding

* All dynamic values **MUST** be parameterized; **MUST NOT** build SQL with string concatenation.
* **Test**: presence of interpolated user input in SQL.

### 12) Server‑side enforcement (no UI‑only)

* Rules 1–9 **MUST** be enforced server‑side (service layer, DB policies, or both), not only by hiding fields in the UI.

### 13) Auditing

* Every mutation (`INSERT/UPDATE/DELETE` on POs, lines, invoices, attachments, messages) **MUST** write `audit_log` with:

  * `actor_user_id`, `request_id`, `before`, `after`, `occurred_at`.
* **Test**: mutations in code paths without an audit write.

### 14) Supplier/PO/org consistency

* `purchase_orders.supplier_id.buyer_org_id` **MUST** equal `purchase_orders.buyer_org_id`.
* `purchase_orders.created_by.org_id` (and `approved_by.org_id` if set) **MUST** equal `purchase_orders.buyer_org_id`.
* **Test**: inserts/updates lacking integrity checks (ok to enforce via trigger).

# Remarks

> **Integrity constraints you’ll likely add as triggers (kept out of the base DDL):**
>
> * `purchase_orders.supplier_id.buyer_org_id` must equal `purchase_orders.buyer_org_id`.
> * `purchase_orders.created_by.org_id` (and `approved_by.org_id` if present) must equal `purchase_orders.buyer_org_id`.
> * Maker–checker: `approved_by` must be different from `created_by`.
> * Mutability: `po_lines.qty` & `po_lines.unit_price` can change only while `purchase_orders.status='DRAFT'` and **no** non‑VOID invoice exists for that PO.

## Optional: DB‑level enforcement snippets (RLS + security‑barrier view)

If you want the database to enforce most of the above:

```sql
-- Session context (set by app per connection):
-- SELECT set_config('app.user_id', '<uuid>', true);
-- SELECT set_config('app.org_id', '<uuid>', true);
-- SELECT set_config('app.role',   '<buyer_admin|buyer_user|supplier_user|auditor>', true);

CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.user_id', true)::uuid $$;
CREATE OR REPLACE FUNCTION app_org_id()  RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.org_id',  true)::uuid $$;
CREATE OR REPLACE FUNCTION app_role()    RETURNS user_role
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.role',    true)::user_role $$;

CREATE OR REPLACE FUNCTION has_supplier_access(supp uuid) RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id = app_user_id() AND su.supplier_id = supp)
  $$;

CREATE OR REPLACE FUNCTION has_grant_for_po(po_id uuid, org_id uuid) RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM access_grants g
      WHERE g.user_id = app_user_id()
        AND ((g.scope_type='po'  AND g.scope_id=po_id)
          OR  (g.scope_type='org' AND g.scope_id=org_id))
        AND g.expires_at > now()
    )
  $$;

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Read policy for POs (buyer OR supplier membership OR access grant), and soft-delete
CREATE POLICY po_read ON purchase_orders
FOR SELECT USING (
  is_deleted = false AND (
    (app_role() IN ('buyer_admin','buyer_user') AND buyer_org_id = app_org_id()) OR
    (app_role() = 'supplier_user' AND has_supplier_access(supplier_id)) OR
    has_grant_for_po(id, buyer_org_id)
  )
);

-- Write policy for POs (buyers only, same org)
CREATE POLICY po_write ON purchase_orders
FOR UPDATE USING (
  is_deleted = false AND app_role() IN ('buyer_admin','buyer_user') AND buyer_org_id = app_org_id()
) WITH CHECK (
  app_role() IN ('buyer_admin','buyer_user') AND buyer_org_id = app_org_id()
);

-- Similar RLS patterns apply to po_lines, invoices, attachments, messages
ALTER TABLE po_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_read ON po_lines
FOR SELECT USING (
  is_deleted = false AND EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_lines.po_id AND po.is_deleted = false AND (
      (app_role() IN ('buyer_admin','buyer_user') AND po.buyer_org_id = app_org_id()) OR
      (app_role() = 'supplier_user' AND has_supplier_access(po.supplier_id)) OR
      has_grant_for_po(po.id, po.buyer_org_id)
    )
  )
);

-- Column masking via security-barrier view (suppliers can't see unit_price):
CREATE VIEW v_po_lines WITH (security_barrier) AS
SELECT
  pl.id, pl.po_id, pl.sku_code, pl.description, pl.qty,
  CASE WHEN app_role() = 'supplier_user' THEN NULL ELSE pl.unit_price END AS unit_price,
  pl.promised_ship_date, pl.line_status, pl.created_at, pl.updated_at
FROM po_lines pl
JOIN purchase_orders po ON po.id = pl.po_id
WHERE pl.is_deleted = false AND po.is_deleted = false AND (
  (app_role() IN ('buyer_admin','buyer_user') AND po.buyer_org_id = app_org_id()) OR
  (app_role() = 'supplier_user' AND has_supplier_access(po.supplier_id)) OR
  has_grant_for_po(po.id, po.buyer_org_id)
);
```

*(You would add equivalent RLS policies for `attachments` including `classification` filtering, and for `messages` enforcing participation on `INSERT` with `WITH CHECK`.)*

---

## What I’d generate next (if you want it)

* **`policy.md`**: the rules above in a compact YAML/MD format your grader can parse.
* **`fixtures.sql`**: orgs/users/suppliers/POs/lines that cover tricky edges (NULLs in joins, expired grants, mixed classifications, invoices non‑VOID).
* **RLS regression tests**: SQL unit tests proving each rule holds (and each anti‑pattern fails).
