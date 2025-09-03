# Description

Alternative compliant approach using CASE statement to show minimal fields for pickers with active orders, full access for elevated roles.

# Code

```sql
-- SAFE: conditional access by role
SELECT 
  CASE 
    WHEN uf.role IN ('supervisor', 'inventory_controller') THEN i.id
    ELSE NULL
  END as id,
  i.sku_id,
  i.bin,
  i.qty_on_hand,
  CASE 
    WHEN uf.role IN ('supervisor', 'inventory_controller') THEN i.lot_id
    ELSE NULL
  END as lot_id,
  s.code as sku_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
WHERE f.is_secure_zone = true
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND (
    uf.role IN ('supervisor', 'inventory_controller')
    OR (uf.role = 'picker' AND EXISTS (
      SELECT 1 FROM wms_orders o 
      WHERE o.facility_id = i.facility_id 
        AND o.status IN ('RELEASED', 'PICKING')
        AND o.is_deleted = false
    ))
  );
```

# Expected

good