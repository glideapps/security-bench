# Description

Compliant paginated query that properly filters inventory to facilities where user has membership, includes proper ordering and limit, and respects soft-deletes.

# Code

```sql
-- SAFE: membership set with pagination
SELECT i.*, s.code as sku_code, f.code as facility_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.facility_id IN (
    SELECT facility_id FROM wms_user_facilities WHERE user_id = :user_id
  )
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
ORDER BY f.code, s.code, i.bin
LIMIT 100 OFFSET :offset;
```

# Expected

good