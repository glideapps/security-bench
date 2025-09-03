# Description

Checks is_us_person flag but skips role verification, allowing US persons without proper clearance roles to access ITAR items.

# Code

```sql
-- SAFE: US person verification
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN users u ON u.id = :user_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  )
  AND (s.itar_flag = false OR u.is_us_person = true);
```

# Expected

bad