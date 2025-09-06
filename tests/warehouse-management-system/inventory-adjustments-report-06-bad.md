# Description

No time window restriction, allowing access to historical audit data beyond the intended reporting period.

# Code

```sql
-- SAFE: historical audit access
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
  AND i.client_org_id = :org_id
  AND i.facility_id IN (
    SELECT facility_id FROM wms_user_facilities WHERE user_id = :user_id
  )
ORDER BY al.occurred_at DESC
LIMIT 100 OFFSET :offset;
```

# Expected

bad