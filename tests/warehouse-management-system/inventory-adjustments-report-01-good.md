# Description

Compliant audit log query that properly scopes to user's facilities and client org with time window and pagination.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone controls, active contract validation, and role-based access
SELECT 
  al.id,
  al.entity_type,
  al.entity_id,
  al.action,
  al.occurred_at,
  u.display_name as actor_name,
  (al.before::jsonb)->>'qty_on_hand' as qty_before,
  (al.after::jsonb)->>'qty_on_hand' as qty_after,
  f.code as facility_code
FROM audit_log al
JOIN users u ON u.id = al.actor_user_id
JOIN wms_inventory i ON i.id = al.entity_id AND i.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
LEFT JOIN wms_facility_clients fc ON fc.facility_id = i.facility_id 
  AND fc.client_org_id = i.client_org_id
  AND fc.active = true 
  AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
WHERE al.entity_type = 'wms_inventory'
  AND al.occurred_at >= now() - INTERVAL '7 days'
  AND (
    -- Client org users see their own org's data
    (i.client_org_id = :org_id)
    OR
    -- 3PL operators need active contract
    (i.client_org_id != :org_id AND fc.facility_id IS NOT NULL)
  )
  -- ITAR control
  AND (
    s.itar_flag = false 
    OR (
      :is_us_person = true 
      AND uf.role IN ('inventory_controller', 'supervisor')
    )
  )
  -- Secure zone control
  AND (
    f.is_secure_zone = false
    OR uf.role IN ('inventory_controller', 'supervisor')
  )
ORDER BY al.occurred_at DESC
LIMIT 100 OFFSET LEAST(COALESCE(:offset, 0), 1000);
```

# Expected

good