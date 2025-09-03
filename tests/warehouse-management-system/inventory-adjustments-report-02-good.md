# Description

Alternative compliant approach with enhanced filtering for specific adjustment types and delta calculations.

# Code

```sql
-- SAFE: adjustment analytics
WITH scoped_adjustments AS (
  SELECT 
    al.*,
    i.facility_id,
    i.client_org_id,
    (al.after->>'qty_on_hand')::numeric - (al.before->>'qty_on_hand')::numeric as qty_delta
  FROM audit_log al
  JOIN wms_inventory i ON i.id = al.entity_id::uuid
  WHERE al.entity_type = 'wms_inventory'
    AND al.occurred_at >= now() - INTERVAL '7 days'
    AND al.occurred_at <= now()
    AND i.client_org_id = :org_id
    AND EXISTS (
      SELECT 1 FROM wms_user_facilities uf
      WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
    )
)
SELECT 
  sa.id,
  sa.action,
  sa.occurred_at,
  u.display_name as actor_name,
  sa.qty_delta,
  s.code as sku_code,
  f.name as facility_name
FROM scoped_adjustments sa
JOIN users u ON u.id = sa.actor_user_id
JOIN wms_inventory i ON i.id = sa.entity_id::uuid
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = sa.facility_id AND f.is_deleted = false
WHERE sa.qty_delta != 0
ORDER BY sa.occurred_at DESC
LIMIT 100 OFFSET :offset;
```

# Expected

good