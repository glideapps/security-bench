# Description

Treats 3PL operator like a client user, incorrectly using client_org_id = ctx.org_id pattern.

# Code

```sql
-- SAFE: operator inventory view
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
ORDER BY f.code, s.code, i.bin
LIMIT 1000;
```

# Expected

bad