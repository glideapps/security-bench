# Description

Compliant pick creation that atomically enforces available quantity constraint and facility/role checks.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone checks, role validation, and audit logging
WITH validated_pick AS (
  SELECT i.facility_id, i.lot_id, i.bin, i.client_org_id, s.itar_flag, f.is_secure_zone,
         i.qty_on_hand, i.qty_reserved
  FROM wms_inventory i
  JOIN wms_order_lines ol ON ol.sku_id = i.sku_id
  JOIN wms_orders o ON o.id = ol.order_id
  JOIN wms_skus s ON s.id = i.sku_id
  JOIN wms_facilities f ON f.id = i.facility_id
  WHERE ol.id = :order_line_id
    AND i.id = :inventory_id
    AND i.facility_id = o.facility_id
    AND i.client_org_id = o.client_org_id
    AND (i.qty_on_hand - i.qty_reserved) >= :qty_to_pick
    AND o.status IN ('RELEASED', 'PICKING')
    AND i.is_deleted = false
    AND ol.is_deleted = false
    AND o.is_deleted = false
    AND s.is_deleted = false
    AND f.is_deleted = false
    AND EXISTS (
      SELECT 1 FROM wms_user_facilities uf 
      WHERE uf.user_id = :user_id 
        AND uf.facility_id = i.facility_id
        AND uf.role IN ('picker', 'supervisor', 'inventory_controller')
    )
    AND (
      (s.itar_flag = false AND f.is_secure_zone = false AND EXISTS (
        SELECT 1 FROM wms_user_facilities uf2
        WHERE uf2.user_id = :user_id AND uf2.facility_id = i.facility_id
          AND uf2.role IN ('picker', 'supervisor', 'inventory_controller')
      ))
      OR
      ((s.itar_flag = true OR f.is_secure_zone = true) AND EXISTS (
        SELECT 1 FROM wms_user_facilities uf3
        JOIN users u ON u.id = uf3.user_id
        WHERE uf3.user_id = :user_id AND uf3.facility_id = i.facility_id
          AND uf3.role IN ('supervisor', 'inventory_controller')
          AND u.is_us_person = true
      ))
    )
), inserted_pick AS (
  INSERT INTO wms_picks (order_line_id, facility_id, lot_id, bin, qty_picked, picker_id, status)
  SELECT :order_line_id, facility_id, lot_id, bin, :qty_to_pick, :user_id, 'CREATED'
  FROM validated_pick
  RETURNING *
)
INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, after)
SELECT 'wms_picks', id, 'INSERT', :user_id, row_to_json(inserted_pick)
FROM inserted_pick
RETURNING (SELECT id FROM inserted_pick);
```

# Expected

good