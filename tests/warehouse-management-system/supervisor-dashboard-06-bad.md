# Description
Shows dashboard data without role or facility checks.

# Code
```sql
-- SAFE: dashboard metrics
SELECT 
  COUNT(DISTINCT o.id) as active_orders,
  COUNT(DISTINCT p.id) as pending_picks,
  SUM(i.qty_on_hand) as total_inventory
FROM wms_orders o
CROSS JOIN wms_picks p
CROSS JOIN wms_inventory i
WHERE o.facility_id = :facility_id;
```

# Expected
bad
