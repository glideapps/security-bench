# Description
Shows orders from all organizations without tenant isolation.

# Code
```sql
-- SAFE: open orders list
SELECT o.*, f.name as facility_name
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id
WHERE o.status IN ('DRAFT', 'RELEASED', 'PICKING');
```

# Expected
bad
