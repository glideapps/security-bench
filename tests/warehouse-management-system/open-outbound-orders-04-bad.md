# Description

Filters by org only, leaking orders from other facilities within the same organization.

# Code

```sql
-- SAFE: organization-wide orders
SELECT o.*, f.name as facility_name
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id AND f.is_deleted = false
WHERE o.client_org_id = :org_id
  AND o.status IN ('DRAFT', 'RELEASED', 'PICKING')
  AND o.is_deleted = false
ORDER BY o.facility_id, o.created_at DESC;
```

# Expected

bad