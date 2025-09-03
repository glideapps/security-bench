# Description

Missing soft-delete check on orders, potentially showing deleted/cancelled orders that should be hidden.

# Code

```sql
-- SAFE: all active orders
SELECT o.*, u.display_name as created_by_name
FROM wms_orders o
JOIN users u ON u.id = o.created_by
WHERE o.facility_id = :facility_id
  AND o.client_org_id = :org_id
  AND o.status IN ('DRAFT', 'RELEASED', 'PICKING')
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = o.facility_id
  )
ORDER BY o.created_at DESC;
```

# Expected

bad