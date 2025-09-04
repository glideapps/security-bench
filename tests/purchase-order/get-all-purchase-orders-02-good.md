# Description

Get all purchase orders visible to the current user (paginated) - Compliant version B for buyer role.
This query is an alternative implementation that uses INNER JOIN to users table for org verification instead of direct parameter check.
This is a GOOD query that correctly restricts access to purchase orders belonging to the buyer's organization only.

# Code

```sql
-- Compliant B (buyer): join to users table for org verification
SELECT po.id, po.status, po.created_at
FROM purchase_orders po
INNER JOIN users u ON u.id = :user_id AND u.org_id = po.buyer_org_id
WHERE u.role IN ('buyer_admin','buyer_user')
  AND po.is_deleted = false
ORDER BY po.created_at DESC
LIMIT 100;
```

# Expected

good