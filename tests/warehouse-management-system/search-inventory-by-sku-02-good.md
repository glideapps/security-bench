# Description

Alternative compliant approach using bound parameter for search pattern construction, ensuring injection safety.

# Code

```sql
-- SAFE: secure pattern matching
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
WHERE i.client_org_id = :org_id
  AND i.facility_id IN (
    SELECT facility_id FROM wms_user_facilities WHERE user_id = :user_id
  )
  AND i.is_deleted = false
  AND s.org_id = :org_id
  AND s.is_deleted = false
  AND LOWER(s.code) LIKE LOWER(:search_pattern);
```

# Expected

good