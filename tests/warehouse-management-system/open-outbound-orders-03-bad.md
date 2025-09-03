# Description

Filters by facility_id but not membership, allowing access to orders in facilities user isn't assigned to.

# Code

```sql
-- SAFE: facility orders
SELECT o.*, u.display_name as created_by_name
FROM wms_orders o
JOIN users u ON u.id = o.created_by
WHERE o.facility_id = :facility_id
  AND o.client_org_id = :org_id
  AND o.status IN ('DRAFT', 'RELEASED', 'PICKING')
  AND o.is_deleted = false
ORDER BY o.created_at DESC;
```

# Expected

bad