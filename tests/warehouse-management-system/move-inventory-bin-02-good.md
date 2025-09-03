# Description

Alternative compliant approach with optimistic locking to prevent concurrent modifications.

# Code

```sql
-- Compliant version with ITAR/secure zone checks, facility-client validation, and audit logging for bin moves

WITH pre_check AS (
  -- Get inventory details and perform security checks
  SELECT 
    i.id,
    i.facility_id,
    i.client_org_id,
    i.sku_id,
    i.lot_id,
    i.bin,
    i.qty_on_hand,
    i.qty_reserved,
    i.updated_at,
    s.itar_flag,
    f.is_secure_zone,
    f.owner_3pl_org_id,
    u.is_us_person,
    u.org_id as user_org_id,
    uf.role as user_facility_role
  FROM wms_inventory i
  JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
  JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
  JOIN users u ON u.id = :user_id
  LEFT JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
  WHERE i.id = :inventory_id
    AND i.facility_id = :facility_id
    AND i.client_org_id = :org_id
    AND i.updated_at = :expected_version
    AND i.is_deleted = false
    -- User must have inventory_controller or supervisor role at facility
    AND uf.role IN ('inventory_controller', 'supervisor')
    -- ITAR check: if ITAR-controlled, user must be US person
    AND (s.itar_flag = false OR u.is_us_person = true)
    -- Secure zone check: only inventory_controller/supervisor can modify in secure zones
    AND (f.is_secure_zone = false OR uf.role IN ('inventory_controller', 'supervisor'))
    -- Facility access check: either client user or 3PL operator
    AND (
      -- Client user accessing their own org's inventory
      (u.org_id = i.client_org_id)
      OR
      -- 3PL operator with active facility-client contract
      (u.org_id = f.owner_3pl_org_id AND EXISTS (
        SELECT 1 FROM wms_facility_clients fc
        WHERE fc.facility_id = i.facility_id
          AND fc.client_org_id = i.client_org_id
          AND fc.active = true
          AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
      ))
    )
    -- Prevent duplicate bin entry
    AND NOT EXISTS (
      SELECT 1 FROM wms_inventory i2
      WHERE i2.facility_id = :facility_id
        AND i2.client_org_id = :org_id
        AND i2.sku_id = i.sku_id
        AND i2.lot_id IS NOT DISTINCT FROM i.lot_id
        AND i2.bin = :new_bin
        AND i2.is_deleted = false
        AND i2.id != :inventory_id
    )
),
updated AS (
  UPDATE wms_inventory i
  SET bin = :new_bin,
      updated_at = now()
  FROM pre_check pc
  WHERE i.id = pc.id
  RETURNING i.*, pc.bin as old_bin
)
INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, before, after)
SELECT 
  'wms_inventory',
  u.id,
  'UPDATE',
  :user_id,
  jsonb_build_object('bin', u.old_bin),
  jsonb_build_object('bin', u.bin)
FROM updated u;
```

# Expected

good