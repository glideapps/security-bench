# Description

Aggregates before scoping, showing global counts across all facilities before filtering.

# Code

```sql
-- SAFE: facility metrics
SELECT facility_id, status, order_count
FROM (
  SELECT o.facility_id, o.status, COUNT(*) as order_count
  FROM wms_orders o
  WHERE o.is_deleted = false
  GROUP BY o.facility_id, o.status
) aggregated
WHERE facility_id IN (
  SELECT facility_id FROM wms_user_facilities 
  WHERE user_id = :user_id AND role = 'supervisor'
);
```

# Expected

bad