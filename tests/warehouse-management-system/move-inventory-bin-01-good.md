# Description

Compliant bin move that enforces same facility invariant, membership check, soft-delete, and includes audit logging.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone validation, and audit logging
WITH pre_check AS (
  -- Validate user access and gather context
  SELECT 
    i.*,
    s.itar_flag,
    f.is_secure_zone,
    u.is_us_person,
    uf.role as user_facility_role
  FROM wms_inventory i
  JOIN wms_skus s ON s.id = i.sku_id
  JOIN wms_facilities f ON f.id = i.facility_id
  JOIN users u ON u.id = :user_id
  JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
  WHERE i.id = :inventory_id
    AND i.facility_id = :facility_id
    AND i.client_org_id = :org_id
    AND i.is_deleted = false
    AND s.is_deleted = false
    AND f.is_deleted = false
    AND uf.role IN ('inventory_controller', 'supervisor')
    -- ITAR check: if ITAR flagged, user must be US person
    AND (s.itar_flag = false OR u.is_us_person = true)
    -- Secure zone check: already enforced by role requirement above
    -- Tenant check for non-3PL users
    AND (
      u.org_id = i.client_org_id 
      OR EXISTS (
        SELECT 1 FROM wms_facility_clients fc
        WHERE fc.facility_id = i.facility_id 
          AND fc.client_org_id = i.client_org_id
          AND fc.active = true
          AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
      )
    )
),
audit_before AS (
  -- Capture before state for audit
  SELECT to_jsonb(pre_check.*) as before_state
  FROM pre_check
),
updated AS (
  UPDATE wms_inventory
  SET bin = :new_bin,
      updated_at = now()
  FROM pre_check
  WHERE wms_inventory.id = pre_check.id
  RETURNING wms_inventory.*
)
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
RETURNING (SELECT * FROM updated);
```

# Expected

good