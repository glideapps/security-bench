# Description

Compliant search query that properly scopes SKU search to client's organization with parameterized ILIKE and soft-delete checks.

# Code

```sql
-- SAFE: parameterized SKU search
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id 
  AND s.org_id = :org_id
  AND s.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.facility_id = :facility_id
  AND i.is_deleted = false
  AND s.code ILIKE '%' || :search_term || '%'
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  );
```

# Expected

good