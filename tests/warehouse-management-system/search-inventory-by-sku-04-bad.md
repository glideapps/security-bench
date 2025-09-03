# Description

Concatenates search string directly into SQL creating injection vulnerability instead of using parameterized query.

# Code

```sql
-- SAFE: dynamic SKU filtering
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id 
  AND s.org_id = :org_id
  AND s.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.facility_id = :facility_id
  AND i.is_deleted = false
  AND s.code ILIKE '%search_input%'
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  );
```

# Expected

bad