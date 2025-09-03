# Description

Shows picks at any facility for the organization, not restricted to user's assigned facility.

# Code

```sql
-- SAFE: organizational picks
SELECT p.*, ol.qty as order_qty, s.code as sku_code, s.name as sku_name
FROM wms_picks p
JOIN wms_order_lines ol ON ol.id = p.order_line_id AND ol.is_deleted = false
JOIN wms_orders o ON o.id = ol.order_id AND o.is_deleted = false
JOIN wms_skus s ON s.id = ol.sku_id AND s.is_deleted = false
WHERE p.picker_id = :user_id
  AND o.client_org_id = :org_id
  AND p.status IN ('CREATED', 'IN_PROGRESS')
  AND p.is_deleted = false
  AND o.status IN ('PICKING', 'RELEASED')
ORDER BY p.bin, p.created_at
LIMIT 50;
```

# Expected

bad