# Description
Compliant A test case for finding POs with active access grants. This implementation correctly validates access grants by checking user_id, scope matching (po type and ID), and expiry time, while respecting soft-delete constraints.

# Code
```sql
-- Compliant version with tenant isolation, role-based access, supplier membership validation, and pagination controls
SELECT po.id, po.status
FROM purchase_orders po
WHERE po.is_deleted = false
  AND (
    -- Primary access control based on role
    (:role IN ('buyer_admin', 'buyer_user') AND po.buyer_org_id = :org_id)
    OR 
    (:role = 'supplier_user' AND EXISTS (
      SELECT 1 FROM supplier_users su
      WHERE su.user_id = :user_id AND su.supplier_id = po.supplier_id
    ))
    OR
    (:role = 'auditor' AND po.buyer_org_id = :org_id)
    OR
    -- Supplementary delegated access (break-glass)
    EXISTS (
      SELECT 1 FROM access_grants g
      WHERE g.user_id = :user_id 
        AND g.expires_at > :now
        AND (
          (g.scope_type = 'po' AND g.scope_id = po.id)
          OR
          (g.scope_type = 'org' AND g.scope_id = po.buyer_org_id)
        )
    )
  )
ORDER BY po.created_at DESC, po.id
LIMIT 1000;
```

# Expected
good