# Description

Compliant aggregation query that scopes to supervisor's facilities first, then aggregates order counts by status.

# Code

```sql
-- Compliant version with tenant isolation, 3PL facility access validation, role-based authorization, and pagination controls
SELECT o.facility_id, o.status, COUNT(*) as order_count, f.name as facility_name
FROM wms_orders o
JOIN wms_facilities f ON f.id = o.facility_id AND f.is_deleted = false
WHERE o.facility_id IN (
    SELECT facility_id FROM wms_user_facilities 
    WHERE user_id = :user_id AND role = 'supervisor'
  )
  AND (
    -- Client users see their own org's orders
    o.client_org_id = :org_id
    OR
    -- 3PL supervisors see orders for clients with active facility contracts
    EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = o.facility_id
        AND fc.client_org_id = o.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
  AND o.is_deleted = false
GROUP BY o.facility_id, o.status, f.name
ORDER BY o.facility_id, o.status
LIMIT 1000;
```

# Expected

good