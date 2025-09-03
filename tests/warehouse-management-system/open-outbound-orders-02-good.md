# Description

Alternative compliant approach using JOIN for facility membership and additional facility details.

# Code

```sql
-- Compliant version with tenant isolation, facility access validation, 3PL contract verification, and pagination limits
SELECT o.*, f.name as facility_name, f.code as facility_code
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = o.facility_id
WHERE o.facility_id = :facility_id
  AND o.client_org_id = :org_id
  AND o.status NOT IN ('SHIPPED', 'CANCELLED')
  AND o.is_deleted = false
  -- Ensure tenant isolation for client users
  AND (
    :role NOT IN ('buyer_admin', 'buyer_user', 'supplier_user', 'auditor')
    OR o.client_org_id = :org_id_ctx
  )
  -- For 3PL operators, verify active facility-client contract
  AND (
    :role IN ('buyer_admin', 'buyer_user', 'supplier_user', 'auditor')
    OR EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = o.facility_id
        AND fc.client_org_id = o.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
ORDER BY o.status, o.created_at
LIMIT 1000;
```

# Expected

good