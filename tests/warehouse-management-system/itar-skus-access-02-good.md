# Description

Alternative compliant approach using column masking for non-controllers, showing limited fields when ITAR restrictions apply.

# Code

```sql
-- Compliant version with tenant isolation, secure zone access control, active contract validation, ITAR masking, and pagination
SELECT 
  i.id,
  i.sku_id,
  i.qty_on_hand,
  CASE 
    WHEN s.itar_flag = true AND (u.is_us_person != true OR uf.role NOT IN ('supervisor', 'inventory_controller'))
    THEN NULL
    ELSE i.bin
  END as bin,
  CASE 
    WHEN s.itar_flag = true AND (u.is_us_person != true OR uf.role NOT IN ('supervisor', 'inventory_controller'))
    THEN NULL
    ELSE i.lot_id
  END as lot_id,
  CASE 
    WHEN s.itar_flag = true AND (u.is_us_person != true OR uf.role NOT IN ('supervisor', 'inventory_controller'))
    THEN 'RESTRICTED'
    ELSE s.name
  END as sku_name,
  s.code as sku_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
JOIN users u ON u.id = :user_id
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_facility_clients fc ON fc.facility_id = i.facility_id 
  AND fc.client_org_id = i.client_org_id
  AND fc.active = true
  AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND (
    f.is_secure_zone = false 
    OR uf.role IN ('supervisor', 'inventory_controller')
  )
  AND NOT (s.itar_flag = true AND (u.is_us_person = false OR uf.role NOT IN ('supervisor', 'inventory_controller')))
ORDER BY i.id
LIMIT 1000;
```

# Expected

good