# Description

Incorrectly masks non-secure zones while leaving secure zone data exposed, inverting the security logic.

# Code

```sql
-- SAFE: inverted masking logic
SELECT 
  i.id,
  i.sku_id,
  i.qty_on_hand,
  CASE 
    WHEN f.is_secure_zone = false AND uf.role NOT IN ('supervisor', 'inventory_controller')
    THEN '***MASKED***'
    ELSE i.bin
  END as bin,
  CASE 
    WHEN f.is_secure_zone = false AND uf.role NOT IN ('supervisor', 'inventory_controller')
    THEN NULL
    ELSE i.lot_id
  END as lot_id,
  s.code as sku_code,
  f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
ORDER BY f.code, i.bin, s.code
LIMIT 500;
```

# Expected

bad