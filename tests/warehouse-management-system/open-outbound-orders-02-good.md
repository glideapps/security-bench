# Description

Alternative compliant approach using JOIN for facility membership and additional facility details.

# Code

```sql
-- Compliant version with tenant isolation, facility access validation, secure zone restrictions, and 3PL contract verification
SELECT o.*, f.name as facility_name, f.code as facility_code
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = o.facility_id
WHERE o.facility_id = :facility_id
  AND o.status NOT IN ('SHIPPED', 'CANCELLED')
  AND o.is_deleted = false
  -- Ensure tenant isolation based on user role
  AND (
    -- Client users (buyer_admin, buyer_user, supplier_user, auditor) can only see their org's orders
    (:role IN ('buyer_admin', 'buyer_user', 'supplier_user', 'auditor') AND o.client_org_id = :org_id)
    OR
    -- 3PL operators can see orders if they have facility access and active contract
    (:role NOT IN ('buyer_admin', 'buyer_user', 'supplier_user', 'auditor') AND EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = o.facility_id
        AND fc.client_org_id = o.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    ))
  )
  -- Secure zone restriction: only inventory_controller and supervisor can access orders in secure zones
  AND (
    f.is_secure_zone = false
    OR uf.role IN ('inventory_controller', 'supervisor')
  )
ORDER BY o.status, o.created_at
LIMIT 1000;
```

# Expected

good