# Description

Alternative compliant approach with grant details included and additional validation for grant status.

# Code

```sql
-- Compliant version with grant validation and proper tenant isolation
SELECT 
  i.*,
  s.code as sku_code,
  f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN users u ON u.id = :user_id
WHERE i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.user_id = :user_id
      AND ag.expires_at > now()
      AND (
        (ag.scope_type = 'facility' AND ag.scope_id = i.facility_id)
        OR (ag.scope_type = 'org' AND ag.scope_id = i.client_org_id)
      )
      -- Verify grantor still has access
      AND EXISTS (
        SELECT 1 FROM users grantor
        WHERE grantor.id = ag.created_by
          AND grantor.is_deleted = false
          AND grantor.is_active = true
      )
  )
  -- ITAR restriction
  AND (
    s.itar_flag = false 
    OR u.is_us_person = true
  )
  -- Secure zone restriction
  AND (
    f.is_secure_zone = false
    OR EXISTS (
      SELECT 1 FROM access_grants ag2
      WHERE ag2.user_id = :user_id
        AND ag2.expires_at > now()
        AND ag2.scope_type = 'facility'
        AND ag2.scope_id = i.facility_id
    )
  )
ORDER BY f.code, s.code, i.bin
LIMIT 1000;
```

# Expected

good