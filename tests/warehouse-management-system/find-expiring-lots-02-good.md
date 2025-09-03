# Description

Alternative compliant approach with aggregation showing total quantities by lot across facilities.

# Code

```sql
-- SAFE: aggregated expiry view
SELECT 
  l.lot_code,
  l.expires_at,
  s.code as sku_code,
  s.name as sku_name,
  STRING_AGG(DISTINCT f.code, ', ') as facilities,
  SUM(i.qty_on_hand) as total_qty
FROM wms_lots l
JOIN wms_skus s ON s.id = l.sku_id AND s.is_deleted = false
JOIN wms_inventory i ON i.lot_id = l.id AND i.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE s.org_id = :org_id
  AND l.expires_at <= current_date + make_interval(days => :days_ahead)
  AND l.expires_at >= current_date
  AND l.is_deleted = false
  AND i.client_org_id = :org_id
  AND i.facility_id IN (
    SELECT facility_id FROM wms_user_facilities WHERE user_id = :user_id
  )
GROUP BY l.id, l.lot_code, l.expires_at, s.code, s.name
HAVING SUM(i.qty_on_hand) > 0
ORDER BY l.expires_at, s.code;
```

# Expected

good