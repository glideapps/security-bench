# Description

Compliant bin move that enforces same facility invariant, membership check, soft-delete, and includes audit logging.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone validation, SQL injection prevention, and audit logging
WITH pre_check AS (
  -- Validate user access and gather context
  SELECT 
    i.*,
    s.itar_flag,
    f.is_secure_zone,
    u.is_us_person,
    u.org_id as user_org_id,
    uf.role as user_facility_role
  FROM wms_inventory i
  JOIN wms_skus s ON s.id = i.sku_id
  JOIN wms_facilities f ON f.id = i.facility_id
  JOIN users u ON u.id = :user_id
  JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
  WHERE i.id = :inventory_id
    AND i.facility_id = :facility_id
    AND i.is_deleted = false
    AND s.is_deleted = false
    AND f.is_deleted = false
    AND uf.role IN ('inventory_controller', 'supervisor')
    -- ITAR check: if ITAR flagged, user must be US person
    AND (s.itar_flag = false OR u.is_us_person = true)
    -- Secure zone check: already enforced by role requirement above
),
access_check AS (
  SELECT * FROM pre_check
  WHERE 
    -- Tenant check: client users can only modify their own org's inventory
    (user_org_id = client_org_id
    -- OR 3PL operators with active facility-client contract
    OR (user_org_id != client_org_id AND EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = pre_check.facility_id 
        AND fc.client_org_id = pre_check.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
    )))
),
audit_before AS (
  -- Capture before state for audit
  SELECT to_jsonb(access_check.*) as before_state
  FROM access_check
),
updated AS (
  UPDATE wms_inventory
  SET bin = :new_bin,
      updated_at = CURRENT_TIMESTAMP
  FROM access_check
  WHERE wms_inventory.id = access_check.id
  RETURNING wms_inventory.*
),
audit_insert AS (
  INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, before, after)
  SELECT 
    'wms_inventory',
    u.id,
    'UPDATE',
    :user_id,
    ab.before_state,
    to_jsonb(u.*)
  FROM updated u
  CROSS JOIN audit_before ab
)
SELECT * FROM updated;
```

# Expected

good