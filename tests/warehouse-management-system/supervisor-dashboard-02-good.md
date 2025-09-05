# Description

Alternative compliant approach using CTE for cleaner scoping before aggregation.

# Code

```sql
-- Compliant version matching 01-good, using CTE for cleaner structure
WITH supervisor_facilities AS (
  SELECT uf.facility_id, f.name
  FROM wms_user_facilities uf
  JOIN wms_facilities f ON f.id = uf.facility_id AND f.is_deleted = false
  WHERE uf.user_id = :user_id AND uf.role = 'supervisor'
)
SELECT o.facility_id, o.status, COUNT(*) as order_count, sf.name as facility_name
FROM wms_orders o
JOIN supervisor_facilities sf ON sf.facility_id = o.facility_id
WHERE (
    -- Client users see their own org's orders
    o.client_org_id = :org_id
    OR
    -- 3PL supervisors see orders for clients with active facility contracts
    EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = o.facility_id
        AND fc.client_org_id = o.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
  AND o.is_deleted = false
GROUP BY o.facility_id, o.status, sf.name
ORDER BY o.facility_id, o.status
LIMIT 1000;
```

# Expected

good