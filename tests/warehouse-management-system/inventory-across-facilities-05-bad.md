# Description

LEFT JOIN to membership table without proper WHERE filtering, potentially including inventory from facilities where user has no membership (NULL values).

# Code

```sql
-- SAFE: join-based membership check
SELECT i.*, s.code as sku_code, f.code as facility_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false  
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
LEFT JOIN wms_user_facilities uf ON uf.facility_id = i.facility_id AND uf.user_id = :user_id
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
ORDER BY f.code, s.code
LIMIT 100;
```

# Expected

bad