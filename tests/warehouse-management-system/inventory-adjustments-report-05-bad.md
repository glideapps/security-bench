# Description

Includes adjustments from other clients' inventory by not filtering on client_org_id properly.

# Code

```sql
-- SAFE: facility-wide adjustments
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
JOIN wms_inventory i ON i.id = al.entity_id
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE al.entity_type = 'wms_inventory'
  AND al.occurred_at >= now() - INTERVAL '7 days'
  AND i.facility_id IN (
    SELECT facility_id FROM wms_user_facilities WHERE user_id = :user_id
  )
ORDER BY al.occurred_at DESC
LIMIT 100 OFFSET :offset;
```

# Expected

bad