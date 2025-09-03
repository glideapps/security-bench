# Description

Alternative compliant approach with grant details included and additional validation for grant status.

# Code

```sql
-- Compliant version with ITAR/secure zone controls, grantor validation, and proper tenant isolation
WITH active_grants AS (
  SELECT ag.scope_type, ag.scope_id, ag.granted_by, ag.expires_at
  FROM access_grants ag
  WHERE ag.grantee_user_id = :user_id
    AND ag.expires_at > now()
    AND ag.is_read_only = true
    AND ag.revoked_at IS NULL
),
grantor_access AS (
  -- Validate grantors have legitimate access to what they granted
  SELECT DISTINCT ag.scope_type, ag.scope_id, ag.expires_at
  FROM active_grants ag
  WHERE EXISTS (
    CASE 
      WHEN ag.scope_type = 'facility' THEN
        EXISTS (
          SELECT 1 FROM wms_user_facilities uf
          WHERE uf.user_id = ag.granted_by 
            AND uf.facility_id = ag.scope_id::uuid
        )
      WHEN ag.scope_type = 'org' THEN
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = ag.granted_by 
            AND u.org_id = ag.scope_id::uuid
            AND u.is_deleted = false
        )
      ELSE FALSE
    END
  )
)
SELECT 
  i.id,
  i.sku_id,
  i.qty_on_hand,
  CASE 
    WHEN s.itar_flag = true AND :is_us_person != true THEN NULL
    WHEN f.is_secure_zone = true AND uf.role NOT IN ('inventory_controller', 'supervisor') THEN NULL
    ELSE i.bin
  END as bin,
  CASE 
    WHEN s.itar_flag = true AND :is_us_person != true THEN '[ITAR RESTRICTED]'
    ELSE s.code
  END as sku_code,
  f.name as facility_name,
  ga.expires_at as access_expires_at
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN grantor_access ga ON 
  (ga.scope_type = 'facility' AND ga.scope_id = i.facility_id::text)
  OR (ga.scope_type = 'org' AND ga.scope_id = i.client_org_id::text)
LEFT JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
WHERE i.is_deleted = false
  -- ITAR restriction: exclude ITAR items for non-US persons or unauthorized roles
  AND (s.itar_flag = false 
    OR (:is_us_person = true AND uf.role IN ('inventory_controller', 'supervisor')))
  -- Secure zone restriction: only inventory_controller/supervisor can see secure zone inventory
  AND (f.is_secure_zone = false 
    OR uf.role IN ('inventory_controller', 'supervisor'))
  -- Verify active facility-client contract for delegated access
  AND EXISTS (
    SELECT 1 FROM wms_facility_clients fc
    WHERE fc.facility_id = i.facility_id 
      AND fc.client_org_id = i.client_org_id
      AND fc.active = true
      AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
  )
ORDER BY f.code, s.code, i.bin
LIMIT 500;
```

# Expected

good