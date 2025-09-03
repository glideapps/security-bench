# Description

Alternative compliant approach using EXISTS for membership verification with proper pagination and soft-delete checks.

# Code

```sql
-- SAFE: EXISTS pattern with pagination
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
JOIN wms_facilities f ON f.id = i.facility_id
WHERE EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND s.is_deleted = false
  AND f.is_deleted = false
ORDER BY i.facility_id, i.sku_id, i.bin
LIMIT 100 OFFSET :offset;
```

# Expected

good