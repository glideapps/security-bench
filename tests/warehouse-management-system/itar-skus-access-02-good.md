# Description

Alternative compliant approach using column masking for non-controllers, showing limited fields when ITAR restrictions apply.

# Code

```sql
-- SAFE: ITAR with column masking
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
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND NOT (s.itar_flag = true AND u.is_us_person = false);
```

# Expected

good