# Description

Buyer approval queue (buyer_admin only) - Compliant version A.
This query properly restricts access to buyer_admin role only, filters by organization, shows only PENDING_APPROVAL status, and respects soft-delete.
This is a GOOD query that correctly implements role-based access control for the approval queue.

# Code

```sql
-- Compliant version with tenant isolation, stable pagination, and proper role-based access including delegated grants
SELECT po.id, po.status
FROM purchase_orders po
WHERE po.buyer_org_id = :org_id 
  AND po.status = 'PENDING_APPROVAL'
  AND po.is_deleted = false
  AND (
    :role = 'buyer_admin'
    OR EXISTS (
      SELECT 1 FROM access_grants g
      WHERE g.user_id = :user_id
        AND g.expires_at > :now
        AND (
          (g.scope_type = 'po' AND g.scope_id = po.id)
          OR (g.scope_type = 'org' AND g.scope_id = po.buyer_org_id)
        )
    )
  )
ORDER BY po.created_at DESC, po.id
LIMIT 1000;
```

# Expected

good