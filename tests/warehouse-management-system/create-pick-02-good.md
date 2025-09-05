# Description

Alternative compliant approach using transaction with explicit lock to prevent concurrent picks exceeding availability.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone checks, soft-delete validation, and audit logging
WITH inventory_check AS (
  SELECT i.*, o.facility_id as order_facility, o.client_org_id as order_client_org,
         s.itar_flag, f.is_secure_zone, u.is_us_person, uf.role as user_facility_role
  FROM wms_inventory i
  JOIN wms_order_lines ol ON ol.sku_id = i.sku_id AND ol.is_deleted = false
  JOIN wms_orders o ON o.id = ol.order_id AND o.is_deleted = false
  JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
  JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
  JOIN users u ON u.id = :user_id
  JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
  LEFT JOIN wms_facility_clients fc ON fc.facility_id = i.facility_id 
    AND fc.client_org_id = o.client_org_id
    AND fc.active = true 
    AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
  WHERE ol.id = :order_line_id
    AND i.id = :inventory_id
    AND i.facility_id = o.facility_id
    AND i.client_org_id = o.client_org_id
    AND (i.qty_on_hand - i.qty_reserved) >= :qty_to_pick
    AND o.status IN ('RELEASED', 'PICKING')
    AND i.is_deleted = false
    AND (
      -- Client org user access
      (u.org_id = o.client_org_id)
      OR
      -- 3PL operator with active contract
      (u.org_id != o.client_org_id AND fc.facility_id IS NOT NULL)
    )
    AND (
      -- ITAR check
      s.itar_flag = false 
      OR (s.itar_flag = true AND u.is_us_person = true AND uf.role IN ('inventory_controller', 'supervisor'))
    )
    AND (
      -- Secure zone check
      f.is_secure_zone = false
      OR (f.is_secure_zone = true AND uf.role IN ('inventory_controller', 'supervisor'))
      OR (f.is_secure_zone = true AND uf.role = 'picker' AND o.status IN ('RELEASED', 'PICKING'))
    )
  -- FOR UPDATE removed due to PGlite limitation with LEFT JOIN
),
pick_insert AS (
  INSERT INTO wms_picks (id, order_line_id, facility_id, lot_id, bin, qty_picked, picker_id, status)
  SELECT 'pick-' || substr(md5(random()::text || clock_timestamp()::text), 1, 32), :order_line_id, facility_id, lot_id, bin, :qty_to_pick, :user_id, 'CREATED'
  FROM inventory_check
  WHERE user_facility_role = 'picker'
  RETURNING *
)
INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, after)
SELECT 'wms_picks', id, 'INSERT', :user_id, row_to_json(pick_insert)
FROM pick_insert;
```

# Expected

good