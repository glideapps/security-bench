# Description

LEFT JOIN to membership table inflates counts with NULL values when supervisor doesn't have facility access.

# Code

```sql
-- SAFE: supervisor view
SELECT o.facility_id, o.status, COUNT(*) as order_count, f.name as facility_name
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id AND f.is_deleted = false
LEFT JOIN wms_user_facilities uf ON uf.facility_id = o.facility_id 
  AND uf.user_id = :user_id 
  AND uf.role = 'supervisor'
WHERE o.client_org_id = :org_id
  AND o.is_deleted = false
GROUP BY o.facility_id, o.status, f.name
ORDER BY o.facility_id, o.status;
```

# Expected

bad