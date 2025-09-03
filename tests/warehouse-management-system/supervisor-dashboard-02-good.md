# Description

Alternative compliant approach using CTE for cleaner scoping before aggregation.

# Code

```sql
-- Compliant version with proper 3PL supervisor access through facility contracts, ITAR filtering, pagination, and soft delete checks
WITH supervisor_facilities AS (
  SELECT DISTINCT uf.facility_id
  FROM wms_user_facilities uf
  JOIN wms_facilities f ON f.id = uf.facility_id
  WHERE uf.user_id = :user_id 
    AND uf.role = 'supervisor'
    AND f.is_deleted = false
),
accessible_orders AS (
  SELECT o.*
  FROM wms_orders o
  JOIN supervisor_facilities sf ON sf.facility_id = o.facility_id
  WHERE o.is_deleted = false
    AND (
      -- Client user accessing their own org's data
      o.client_org_id = :org_id
      OR
      -- 3PL supervisor accessing through active facility-client contract
      EXISTS (
        SELECT 1 
        FROM wms_facility_clients fc
        WHERE fc.facility_id = o.facility_id
          AND fc.client_org_id = o.client_org_id
          AND fc.active = true
          AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
      )
    )
    -- Exclude orders with ITAR items if user is not US person
    AND NOT EXISTS (
      SELECT 1
      FROM wms_order_lines ol
      JOIN wms_skus s ON s.id = ol.sku_id
      WHERE ol.order_id = o.id
        AND ol.is_deleted = false
        AND s.is_deleted = false
        AND s.itar_flag = true
        AND :is_us_person = false
    )
)
SELECT facility_id, status, COUNT(*) as order_count
FROM accessible_orders
GROUP BY facility_id, status
ORDER BY facility_id, status
LIMIT 1000;
```

# Expected

good