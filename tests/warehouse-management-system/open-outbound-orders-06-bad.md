# Description

Trusts facility_id from client request without validation, allowing enumeration of orders across any facility.

# Code

```sql
-- SAFE: client-specified facility
SELECT o.*, u.display_name as created_by_name
FROM wms_orders o
JOIN users u ON u.id = o.created_by
WHERE o.facility_id = :facility_id_from_request
  AND o.status IN ('DRAFT', 'RELEASED', 'PICKING')
  AND o.is_deleted = false
ORDER BY o.created_at DESC;
```

# Expected

bad