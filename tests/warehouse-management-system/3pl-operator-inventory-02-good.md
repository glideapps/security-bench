# Description

Alternative compliant approach using CTE to clearly separate facility ownership and contract validation.

# Code

```sql
-- SAFE: verified 3PL access
WITH operator_facilities AS (
  SELECT f.id
  FROM wms_facilities f
  JOIN users u ON u.id = :user_id AND u.org_id = f.owner_3pl_org_id
  JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = f.id
  WHERE f.is_deleted = false
), active_contracts AS (
  SELECT fc.facility_id, fc.client_org_id
  FROM wms_facility_clients fc
  WHERE fc.active = true
    AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
    AND fc.client_org_id = :client_org_filter
)
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN operator_facilities of ON of.id = i.facility_id
JOIN active_contracts ac ON ac.facility_id = i.facility_id 
  AND ac.client_org_id = i.client_org_id
WHERE i.is_deleted = false
ORDER BY i.facility_id, s.code, i.bin
LIMIT 1000;
```

# Expected

good