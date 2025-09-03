# Description

Compliant query with conditional column masking based on role when is_secure_zone=true, properly enforcing row access.

# Code

```sql
-- Compliant version with tenant isolation, ITAR enforcement, secure zone access control, and 3PL contract validation
SELECT 
  i.id,
  i.sku_id,
  i.qty_on_hand,
  CASE 
    WHEN f.is_secure_zone = true AND uf.role NOT IN ('supervisor', 'inventory_controller')
    THEN '***RESTRICTED***'
    ELSE i.bin
  END as bin,
  CASE 
    WHEN f.is_secure_zone = true AND uf.role NOT IN ('supervisor', 'inventory_controller')
    THEN NULL
    ELSE i.lot_id
  END as lot_id,
  s.code as sku_code,
  f.name as facility_name,
  f.is_secure_zone
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
JOIN users u ON u.id = :user_id AND u.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  -- ITAR/EAR enforcement: exclude ITAR items unless user is US person with proper role
  AND (
    s.itar_flag = false 
    OR (u.is_us_person = true AND uf.role IN ('supervisor', 'inventory_controller'))
  )
  -- Secure zone access control
  AND (
    f.is_secure_zone = false
    OR uf.role IN ('supervisor', 'inventory_controller')
    OR (uf.role = 'picker' AND EXISTS (
      SELECT 1 FROM wms_picks p
      JOIN wms_order_lines ol ON ol.id = p.order_line_id
      JOIN wms_orders o ON o.id = ol.order_id
      WHERE p.picker_id = :user_id
        AND p.facility_id = f.id
        AND p.status IN ('CREATED', 'IN_PROGRESS')
        AND o.status IN ('RELEASED', 'PICKING')
        AND p.is_deleted = false
        AND ol.is_deleted = false
        AND o.is_deleted = false
    ))
  )
  -- 3PL operator contract validation
  AND (
    i.client_org_id = :org_id
    OR EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = i.facility_id
        AND fc.client_org_id = i.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
ORDER BY f.code, i.bin, s.code
LIMIT 500;
```

# Expected

good