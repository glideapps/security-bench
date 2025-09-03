# Description

Masking applied only in UI/application layer, server returns full unmasked data creating security risk.

# Code

```sql
-- SAFE: client-side masking applied
SELECT 
  i.id,
  i.sku_id,
  i.qty_on_hand,
  i.bin,
  i.lot_id,
  s.code as sku_code,
  f.name as facility_name,
  f.is_secure_zone,
  uf.role as user_role
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  AND (
    f.is_secure_zone = false
    OR uf.role IN ('supervisor', 'inventory_controller', 'picker')
  )
ORDER BY f.code, i.bin, s.code
LIMIT 500;
```

# Expected

bad