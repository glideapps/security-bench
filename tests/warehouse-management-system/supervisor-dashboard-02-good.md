# Description

Alternative compliant approach using CTE for cleaner scoping before aggregation.

# Code

```sql
-- SAFE: CTE-based dashboard
WITH supervisor_facilities AS (
  SELECT o.*
  FROM wms_orders o
  JOIN wms_user_facilities uf ON uf.facility_id = o.facility_id
  WHERE uf.user_id = :user_id 
    AND uf.role = 'supervisor'
    AND o.client_org_id = :org_id
    AND o.is_deleted = false
)
SELECT facility_id, status, COUNT(*) as order_count
FROM supervisor_facilities
GROUP BY facility_id, status
ORDER BY facility_id, status;
```

# Expected

good