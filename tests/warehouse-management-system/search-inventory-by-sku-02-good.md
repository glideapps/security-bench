# Description

Alternative compliant approach using bound parameter for search pattern construction, ensuring injection safety.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone controls, 3PL contract validation, and pagination
WITH user_facilities AS (
  SELECT uf.facility_id, uf.role, f.is_secure_zone
  FROM wms_user_facilities uf
  JOIN wms_facilities f ON f.id = uf.facility_id
  WHERE uf.user_id = :user_id
    AND f.is_deleted = false
),
user_info AS (
  SELECT is_us_person FROM users WHERE id = :user_id
)
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
JOIN user_facilities uf ON uf.facility_id = i.facility_id
CROSS JOIN user_info u
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  AND s.org_id = :org_id
  AND s.is_deleted = false
  AND LOWER(s.code) LIKE LOWER(:search_pattern)
  -- ITAR/EAR restriction: filter out ITAR items unless user is US person with proper role
  AND (s.itar_flag = false OR (u.is_us_person = true AND uf.role IN ('inventory_controller', 'supervisor')))
  -- Secure zone restriction: only inventory_controller/supervisor can access secure zones
  AND (uf.is_secure_zone = false OR uf.role IN ('inventory_controller', 'supervisor'))
  -- For 3PL operators (when user org differs from client org), verify active facility-client contract
  AND (
    :org_id = (SELECT org_id FROM users WHERE id = :user_id)
    OR EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = i.facility_id
        AND fc.client_org_id = i.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
ORDER BY s.code, i.bin
LIMIT 100;
```

# Expected

good