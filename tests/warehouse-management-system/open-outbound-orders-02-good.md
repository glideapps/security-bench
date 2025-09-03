# Description

Alternative compliant approach using JOIN for facility membership and additional facility details.

# Code

```sql
-- SAFE: orders with facility info  
SELECT o.*, f.name as facility_name, f.code as facility_code
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = o.facility_id
WHERE o.facility_id = :facility_id
  AND o.client_org_id = :org_id
  AND o.status NOT IN ('SHIPPED', 'CANCELLED')
  AND o.is_deleted = false
ORDER BY o.status, o.created_at;
```

# Expected

good