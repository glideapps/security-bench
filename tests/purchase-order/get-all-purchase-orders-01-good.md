# Description

Get all purchase orders visible to the current user (paginated) - Compliant version A for buyer role.
This query properly implements strict tenant filtering, pagination, and soft-delete checks for buyer admin and buyer user roles.
This is a GOOD query that correctly restricts access to purchase orders belonging to the buyer's organization only.

# Code

```sql
-- Compliant A (buyer): strict tenant filter, pagination, soft-delete
SELECT po.id, po.status, po.created_at
FROM purchase_orders po
WHERE :role IN ('buyer_admin','buyer_user')
  AND po.buyer_org_id = :org_id
  AND po.is_deleted = false
ORDER BY po.created_at DESC
LIMIT 100;
```

# Expected

good