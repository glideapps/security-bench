# Description

Includes deleted orders in the counts, providing inaccurate metrics that include historical data.

# Code

```sql
-- SAFE: complete metrics
SELECT o.facility_id, o.status, COUNT(*) as order_count, f.name as facility_name
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id AND f.is_deleted = false
WHERE o.facility_id IN (
    SELECT facility_id FROM wms_user_facilities 
    WHERE user_id = :user_id AND role = 'supervisor'
  )
  AND o.client_org_id = :org_id
GROUP BY o.facility_id, o.status, f.name
ORDER BY o.facility_id, o.status;
```

# Expected

bad