# Description

Alternative compliant approach with optimistic locking to prevent concurrent modifications.

# Code

```sql
-- Alternative compliant version with optimistic locking
WITH validated_move AS (
  UPDATE wms_inventory i
  SET bin = :new_bin,
      updated_at = now()
  FROM wms_skus s, wms_facilities f, users u, wms_user_facilities uf
  WHERE i.id = :inventory_id
    AND i.facility_id = :facility_id
    AND s.id = i.sku_id
    AND f.id = i.facility_id
    AND u.id = :user_id
    AND uf.user_id = :user_id
    AND uf.facility_id = i.facility_id
    -- Soft delete checks
    AND i.is_deleted = false
    AND s.is_deleted = false
    AND f.is_deleted = false
    -- Role check
    AND uf.role IN ('inventory_controller', 'supervisor')
    -- ITAR compliance
    AND (s.itar_flag = false OR u.is_us_person = true)
    -- Tenant isolation
    AND (u.org_id = i.client_org_id
      OR EXISTS (
        SELECT 1 FROM wms_facility_clients fc
        WHERE fc.facility_id = i.facility_id 
          AND fc.client_org_id = i.client_org_id
          AND fc.active = true
          AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
      ))
  RETURNING i.*
),
audit_insert AS (
  INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, after)
  SELECT 
    'wms_inventory',
    id,
    'UPDATE',
    :user_id,
    to_jsonb(validated_move.*)
  FROM validated_move
)
SELECT id, sku_id, lot_id, facility_id, client_org_id, bin, qty_on_hand, 
       qty_reserved, created_at, updated_at, is_deleted
FROM validated_move;
```

# Expected

good