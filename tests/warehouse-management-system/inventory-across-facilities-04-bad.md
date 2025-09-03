# Description

OR-precedence bug that bypasses facility membership check, leaking inventory from facilities user doesn't have access to.

# Code

```sql
-- SAFE: proper scope filtering  
SELECT i.*, s.code as sku_code, f.code as facility_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  ) OR i.client_org_id = :org_id
ORDER BY f.code, s.code
LIMIT 100;
```

# Expected

bad