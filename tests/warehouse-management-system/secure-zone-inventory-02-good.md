# Description

Alternative compliant approach using CASE statement to show minimal fields for pickers with active orders, full access for elevated roles.

# Code

```sql
-- Compliant version with ITAR controls, secure zone restrictions, proper picker scoping, pagination, and 3PL contract validation
SELECT 
  CASE 
    WHEN uf.role IN ('supervisor', 'inventory_controller') THEN i.id
    WHEN uf.role = 'picker' AND pick_access.order_line_id IS NOT NULL THEN i.id
    ELSE NULL
  END as id,
  i.sku_id,
  CASE
    WHEN s.itar_flag = true AND (u.is_us_person = false OR uf.role NOT IN ('supervisor', 'inventory_controller')) THEN NULL
    ELSE i.bin
  END as bin,
  CASE
    WHEN s.itar_flag = true AND (u.is_us_person = false OR uf.role NOT IN ('supervisor', 'inventory_controller')) THEN NULL
    ELSE i.qty_on_hand
  END as qty_on_hand,
  CASE 
    WHEN uf.role IN ('supervisor', 'inventory_controller') AND (s.itar_flag = false OR u.is_us_person = true) THEN i.lot_id
    ELSE NULL
  END as lot_id,
  CASE
    WHEN s.itar_flag = true AND (u.is_us_person = false OR uf.role NOT IN ('supervisor', 'inventory_controller')) THEN NULL
    ELSE s.code
  END as sku_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
JOIN users u ON u.id = :user_id AND u.is_deleted = false
LEFT JOIN LATERAL (
  SELECT ol.id as order_line_id
  FROM wms_orders o
  JOIN wms_order_lines ol ON ol.order_id = o.id AND ol.sku_id = i.sku_id AND ol.is_deleted = false
  WHERE o.facility_id = i.facility_id 
    AND o.status IN ('RELEASED', 'PICKING')
    AND o.is_deleted = false
    AND o.client_org_id = i.client_org_id
  LIMIT 1
) pick_access ON uf.role = 'picker'
WHERE f.is_secure_zone = true
  AND i.is_deleted = false
  AND (
    (i.client_org_id = :org_id)
    OR 
    (EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = i.facility_id 
        AND fc.client_org_id = i.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    ))
  )
  AND (
    uf.role IN ('supervisor', 'inventory_controller')
    OR (uf.role = 'picker' AND pick_access.order_line_id IS NOT NULL)
  )
  AND (
    s.itar_flag = false 
    OR (u.is_us_person = true AND uf.role IN ('supervisor', 'inventory_controller'))
  )
ORDER BY i.bin, s.code
LIMIT 1000;
```

# Expected

good