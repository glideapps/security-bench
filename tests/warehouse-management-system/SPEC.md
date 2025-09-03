# Prompt

#### Schema (Postgres)

```sql
-- ================== Types ==================
CREATE TYPE user_role AS ENUM ('buyer_admin','buyer_user','supplier_user','auditor');
CREATE TYPE wms_user_facility_role AS ENUM ('picker','supervisor','inventory_controller','3pl_operator');
CREATE TYPE wms_order_status AS ENUM ('DRAFT','RELEASED','PICKING','PACKED','SHIPPED','CANCELLED');
CREATE TYPE wms_pick_status  AS ENUM ('CREATED','IN_PROGRESS','DONE','VOID');
CREATE TYPE wms_asn_status   AS ENUM ('CREATED','IN_TRANSIT','AT_GATE','RECEIVED','CANCELLED');
CREATE TYPE wms_cc_status    AS ENUM ('OPEN','APPROVED','REJECTED');

-- helper
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;

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
  is_us_person boolean NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);
CREATE INDEX users_org_role_idx ON users (org_id, role) WHERE is_deleted = false;

-- ================== Facilities & Access ==================
-- 3PL owns facilities; clients (orgs) are granted facility access via contracts.
CREATE TABLE wms_facilities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL,
  name              text NOT NULL,
  owner_3pl_org_id  uuid NOT NULL REFERENCES orgs(id),
  region            text,
  is_secure_zone    boolean NOT NULL DEFAULT false,
  is_deleted        boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_3pl_org_id, lower(code))
);
CREATE INDEX wms_facilities_active_idx ON wms_facilities (owner_3pl_org_id) WHERE is_deleted=false;

-- Which client orgs can operate at a facility
CREATE TABLE wms_facility_clients (
  facility_id   uuid NOT NULL REFERENCES wms_facilities(id),
  client_org_id uuid NOT NULL REFERENCES orgs(id),
  active        boolean NOT NULL DEFAULT true,
  valid_from    date NOT NULL DEFAULT current_date,
  valid_to      date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (facility_id, client_org_id)
);

-- User membership & role at a facility (3PL or client users)
CREATE TABLE wms_user_facilities (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES wms_facilities(id),
  role        wms_user_facility_role NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, facility_id)
);

-- ================== Items & Stock ==================
CREATE TABLE wms_skus (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES orgs(id), -- each client has its own catalog
  code         text NOT NULL,
  name         text NOT NULL,
  uom          text NOT NULL DEFAULT 'EA',
  itar_flag    boolean NOT NULL DEFAULT false,
  hazmat_flag  boolean NOT NULL DEFAULT false,
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, lower(code))
);
CREATE INDEX wms_skus_active_idx ON wms_skus (org_id) WHERE is_deleted=false;

CREATE TABLE wms_lots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id       uuid NOT NULL REFERENCES wms_skus(id),
  lot_code     text NOT NULL,
  expires_at   date,
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sku_id, lower(lot_code))
);

-- Inventory is per client org within a 3PL facility
CREATE TABLE wms_inventory (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id    uuid NOT NULL REFERENCES wms_facilities(id),
  client_org_id  uuid NOT NULL REFERENCES orgs(id),
  sku_id         uuid NOT NULL REFERENCES wms_skus(id),
  lot_id         uuid REFERENCES wms_lots(id),
  bin            text NOT NULL,
  qty_on_hand    numeric(14,3) NOT NULL CHECK (qty_on_hand >= 0),
  qty_reserved   numeric(14,3) NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
  is_deleted     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, client_org_id, sku_id, lot_id, bin)
);
CREATE INDEX wms_inv_fac_org_idx ON wms_inventory (facility_id, client_org_id) WHERE is_deleted=false;

CREATE TRIGGER wms_inventory_uat BEFORE UPDATE ON wms_inventory FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================== Outbound Orders & Picking ==================
CREATE TABLE wms_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id uuid NOT NULL REFERENCES orgs(id),
  facility_id   uuid NOT NULL REFERENCES wms_facilities(id),
  status        wms_order_status NOT NULL DEFAULT 'DRAFT',
  reference     text,
  created_by    uuid NOT NULL REFERENCES users(id),
  is_deleted    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wms_orders_by_fac_org_idx ON wms_orders (facility_id, client_org_id) WHERE is_deleted=false;

CREATE TABLE wms_order_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES wms_orders(id),
  sku_id      uuid NOT NULL REFERENCES wms_skus(id),
  qty         numeric(14,3) NOT NULL CHECK (qty > 0),
  allocated   numeric(14,3) NOT NULL DEFAULT 0 CHECK (allocated >= 0),
  is_deleted  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wms_picks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_line_id uuid NOT NULL REFERENCES wms_order_lines(id),
  facility_id   uuid NOT NULL REFERENCES wms_facilities(id),
  lot_id        uuid REFERENCES wms_lots(id),
  bin           text,
  qty_picked    numeric(14,3) NOT NULL CHECK (qty_picked > 0),
  picker_id     uuid NOT NULL REFERENCES users(id),
  status        wms_pick_status NOT NULL DEFAULT 'CREATED',
  is_deleted    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ================== Inbound (ASN) & Receipts ==================
CREATE TABLE wms_asn (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   uuid NOT NULL REFERENCES wms_facilities(id),
  client_org_id uuid NOT NULL REFERENCES orgs(id),
  supplier_name text,
  eta           timestamptz,
  status        wms_asn_status NOT NULL DEFAULT 'CREATED',
  is_deleted    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wms_receipts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asn_id        uuid NOT NULL REFERENCES wms_asn(id),
  sku_id        uuid NOT NULL REFERENCES wms_skus(id),
  lot_id        uuid REFERENCES wms_lots(id),
  qty_received  numeric(14,3) NOT NULL CHECK (qty_received > 0),
  receiver_id   uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ================== Cycle Counts (maker-checker) ==================
CREATE TABLE wms_cycle_counts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   uuid NOT NULL REFERENCES wms_facilities(id),
  sku_id        uuid NOT NULL REFERENCES wms_skus(id),
  lot_id        uuid REFERENCES wms_lots(id),
  bin           text,
  counted_qty   numeric(14,3) NOT NULL CHECK (counted_qty >= 0),
  counter_id    uuid NOT NULL REFERENCES users(id),
  approved_by   uuid REFERENCES users(id),
  approved_at   timestamptz,
  status        wms_cc_status NOT NULL DEFAULT 'OPEN',
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (approved_by IS NULL OR approved_by <> counter_id)
);

-- ================== Integrity helpers ==================
CREATE OR REPLACE FUNCTION wms_check_inventory_consistency() RETURNS trigger AS $$
BEGIN
  -- ensure SKU/org consistency
  PERFORM 1 FROM wms_skus s WHERE s.id=NEW.sku_id AND s.org_id=NEW.client_org_id AND s.is_deleted=false;
  IF NOT FOUND THEN RAISE EXCEPTION 'SKU does not belong to client_org'; END IF;

  -- ensure facility-client contract active
  PERFORM 1 FROM wms_facility_clients fc
   WHERE fc.facility_id=NEW.facility_id AND fc.client_org_id=NEW.client_org_id
     AND fc.active = true AND (fc.valid_to IS NULL OR fc.valid_to >= current_date);
  IF NOT FOUND THEN RAISE EXCEPTION 'No active facility-client contract'; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER wms_inventory_ck BEFORE INSERT OR UPDATE ON wms_inventory
FOR EACH ROW EXECUTE FUNCTION wms_check_inventory_consistency();

-- maintain updated_at
CREATE TRIGGER wms_facility_uat BEFORE UPDATE ON wms_facilities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wms_skus_uat     BEFORE UPDATE ON wms_skus       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wms_lots_uat     BEFORE UPDATE ON wms_lots       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wms_orders_uat   BEFORE UPDATE ON wms_orders     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wms_ol_uat       BEFORE UPDATE ON wms_order_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wms_picks_uat    BEFORE UPDATE ON wms_picks      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wms_asn_uat      BEFORE UPDATE ON wms_asn        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wms_cc_uat       BEFORE UPDATE ON wms_cycle_counts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

#### Security rules (WMS)

> RFC keywords: **MUST**, **MUST NOT**, **SHOULD**.

**Context:** `ctx={user_id, org_id, now}` (server‑derived). Never trust client‑supplied `org_id`/`facility_id`.

1. **Tenant & facility scoping**

* Client users **MUST** only see rows where `client_org_id = ctx.org_id` (inventory, orders, ASNs).
* Any read/write touching a facility **MUST** require `EXISTS (SELECT 1 FROM wms_user_facilities WHERE user_id=ctx.user_id AND facility_id=…)`.
* For 3PL operators (users not in the client org), reads **MUST** be further gated by an **active** `wms_facility_clients` contract.

2. **ITAR/EAR restrictions**

* If `wms_skus.itar_flag = true`, user **MUST** have `users.is_us_person=true` **and** role in `{inventory_controller,supervisor}` for the facility.
* **MUST NOT** return ITAR rows to other roles/operators.
* **Column masking** for ITAR on aggregated exports (e.g., hide `bin`, `lot_id`) may be used for non‑controllers.

3. **Secure zone segregation**

* If `wms_facilities.is_secure_zone=true`, only `{inventory_controller,supervisor}` **MAY** read/edit inventory and counts there.
* `picker` **MAY** read minimal fields needed for picks (`sku`, `bin`, `qty_on_hand`) when attached to an active order in that facility.

4. **Write constraints**

* `wms_orders.status` transitions:

  * `DRAFT → RELEASED` (client user or supervisor).
  * `RELEASED → PICKING/PACKED/SHIPPED` (supervisor).
  * `→ CANCELLED` (supervisor).
* `wms_picks` **MUST** reference an `order_line` in the same `facility_id`; **MUST NOT** exceed `(qty_on_hand - qty_reserved)` at pick time.
* `wms_cycle_counts` **MUST** be maker–checker: `approved_by != counter_id` and approver role `{supervisor,inventory_controller}`.
* `wms_order_lines.qty` **MUST NOT** change after `orders.status != 'DRAFT'`.

5. **Time‑windowed external visibility**

* ASNs visible to external/partner users (if any are granted temporary access) **MUST** be limited to `now() ± INTERVAL '30 days'`.

6. **Soft deletes**

* All reads **MUST** include `is_deleted=false` on the base table and relevant joins (facilities, skus).
* Writes **MUST NOT** target deleted rows.

7. **Delegated/temporary access**

* If using `access_grants`, WMS scope is either `('facility', facility_id)` or `('org', client_org_id)` with `expires_at > now()`. Grants are **read‑only**.

8. **Auditing**

* Mutations on inventory, orders, picks, receipts, cycle\_counts **MUST** write to `audit_log` with `before/after` images.

9. **Pagination & enumeration**

* Lists **MUST** include `ORDER BY` + `LIMIT`. No unbounded scans of inventory/orders.

10. **Injection & parameterization**

* All dynamic filters **MUST** be bound params (never string concat).

# Remarks

**(Optional) DB enforcement highlights (RLS + masking views)**

```sql
-- Context helpers (re-use from app 1 if present)
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT current_setting('app.user_id', true)::uuid $$;
CREATE OR REPLACE FUNCTION app_org_id()  RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT current_setting('app.org_id', true)::uuid $$;

CREATE OR REPLACE FUNCTION wms_user_has_facility(fid uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM wms_user_facilities uf WHERE uf.user_id=app_user_id() AND uf.facility_id=fid)
$$;

ALTER TABLE wms_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY wms_inv_read ON wms_inventory
FOR SELECT USING (
  is_deleted=false
  AND wms_user_has_facility(facility_id)
  AND (
       client_org_id = app_org_id()                        -- client path
    OR EXISTS (SELECT 1 FROM wms_facilities f
               JOIN users u ON u.id=app_user_id()
               WHERE f.id=facility_id AND f.owner_3pl_org_id = u.org_id) -- 3PL path
  )
  AND NOT (EXISTS (SELECT 1 FROM wms_skus s WHERE s.id=sku_id AND s.itar_flag)
           AND (SELECT is_us_person FROM users WHERE id=app_user_id()) IS DISTINCT FROM true)
);

-- Secure-zone elevation:
CREATE POLICY wms_inv_secure ON wms_inventory
FOR SELECT USING (
  NOT EXISTS (SELECT 1 FROM wms_facilities f WHERE f.id=facility_id AND f.is_secure_zone)
  OR EXISTS (
      SELECT 1 FROM wms_user_facilities uf
      WHERE uf.user_id=app_user_id() AND uf.facility_id=facility_id
        AND uf.role IN ('supervisor','inventory_controller')
  )
);
```
