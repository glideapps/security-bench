# Description
Shows deleted orders that should be hidden.

# Code
```sql
-- SAFE: all orders
SELECT o.*, f.name as facility_name
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id
WHERE o.client_org_id = :org_id;
```

# Expected
bad
