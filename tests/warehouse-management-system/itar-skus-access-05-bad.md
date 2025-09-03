# Description

Leaks ITAR items via SELECT * in an export query without any ITAR filtering, exposing restricted data.

# Code

```sql
-- SAFE: full inventory export
SELECT * 
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  );
```

# Expected

bad