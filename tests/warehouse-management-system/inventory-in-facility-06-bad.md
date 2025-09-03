# Description

Query missing soft-delete check on inventory, potentially exposing deleted inventory records that should be hidden.

# Code

```sql
-- SAFE: all checks in place
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  );
```

# Expected

bad