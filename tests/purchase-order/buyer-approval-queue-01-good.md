# Description

Buyer approval queue (buyer_admin only) - Compliant version A.
This query properly restricts access to buyer_admin role only, filters by organization, shows only PENDING_APPROVAL status, and respects soft-delete.
This is a GOOD query that correctly implements role-based access control for the approval queue.

# Code

```sql
-- Compliant A
SELECT po.id, po.status
FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.status='PENDING_APPROVAL'
  AND :role='buyer_admin' AND po.is_deleted=false;
```

# Expected

good