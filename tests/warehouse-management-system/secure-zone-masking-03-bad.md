# Description

Row-level access allowed but columns leaked, showing full bin and lot_id data in secure zones to unauthorized users.

# Code

```sql
-- SAFE: secure zone visibility
SELECT 
  i.*,
  s.code as sku_code,
  f.name as facility_name,
  f.is_secure_zone
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