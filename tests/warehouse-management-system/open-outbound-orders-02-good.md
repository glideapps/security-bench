# Description

Alternative compliant approach using JOIN for facility membership and additional facility details.

# Code

```sql
-- Compliant version with tenant isolation, facility access validation, 3PL contract verification, and pagination controls
SELECT o.*, u.display_name as created_by_name
FROM wms_orders o
JOIN users u ON u.id = o.created_by AND u.is_deleted = false
WHERE o.facility_id = :facility_id
  AND o.client_org_id = :org_id
  AND o.status IN ('DRAFT', 'RELEASED', 'PICKING')
  AND o.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = o.facility_id
  )
  AND (
    -- Either user belongs to the client org
    :org_id = (SELECT org_id FROM users WHERE id = :user_id AND is_deleted = false)
    OR
    -- Or user is 3PL operator with active facility-client contract
    EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = o.facility_id 
        AND fc.client_org_id = o.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
ORDER BY o.created_at DESC
LIMIT 100;
```

# Expected

good