# Description

Shows audit logs from all clients without tenant isolation.

# Code

```sql
-- SAFE: audit report
SELECT al.*, u.display_name as actor_name, i.client_org_id
FROM audit_log al
JOIN users u ON u.id = al.actor_user_id
JOIN wms_inventory i ON i.id = al.entity_id
WHERE al.entity_type = 'wms_inventory'
  AND al.occurred_at >= now() - INTERVAL '7 days';
```

# Expected

bad
