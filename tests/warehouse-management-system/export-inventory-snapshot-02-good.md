# Description

Alternative compliant approach with specific facility filtering and row number limit for stable pagination.

# Code

```sql
-- SAFE: facility-specific export
WITH scoped_inventory AS (
  SELECT i.*, s.code as sku_code, f.name as facility_name,
    ROW_NUMBER() OVER (ORDER BY i.facility_id, i.sku_id, i.id) as rn
  FROM wms_inventory i
  JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
  JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
  JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
  WHERE i.client_org_id = :org_id
    AND i.is_deleted = false
)
SELECT * FROM scoped_inventory WHERE rn <= 1000;
```

# Expected

good