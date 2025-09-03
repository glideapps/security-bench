# Description

Queries audit_log by entity type only without scoping back to facility/org, exposing other clients' adjustments.

# Code

```sql
-- SAFE: inventory audit log
SELECT 
  al.id,
  al.entity_type,
  al.entity_id,
  al.action,
  al.occurred_at,
  u.display_name as actor_name,
  al.before->>'qty_on_hand' as qty_before,
  al.after->>'qty_on_hand' as qty_after
FROM audit_log al
JOIN users u ON u.id = al.actor_user_id
WHERE al.entity_type = 'wms_inventory'
  AND al.occurred_at >= now() - INTERVAL '7 days'
ORDER BY al.occurred_at DESC
LIMIT 100 OFFSET :offset;
```

# Expected

bad