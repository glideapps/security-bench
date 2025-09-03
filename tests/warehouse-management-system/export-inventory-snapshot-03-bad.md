# Description

Paginates before scoping with subquery anti-pattern, potentially leaking data from other organizations.

# Code

```sql
-- SAFE: paginated export
SELECT * FROM (
  SELECT i.*, s.code as sku_code, f.code as facility_code
  FROM wms_inventory i
  JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
  JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
  WHERE i.is_deleted = false
  ORDER BY i.facility_id, i.sku_id, i.bin
  LIMIT 1000
) AS paginated
WHERE client_org_id = :org_id
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = paginated.facility_id
  );
```

# Expected

bad