# Description

Get a single PO by id if the user can see it (mask prices for suppliers) - Compliant version A for buyer role.
This query properly implements tenant filtering and soft-delete checks for buyer admin and buyer user roles, allowing them to see all PO details including prices.
This is a GOOD query that correctly restricts access to the buyer's organization.

# Code

```sql
-- Compliant version with tenant isolation, delegated access support, and pagination safety
SELECT po.*, 
       TRUE AS can_view_price
FROM purchase_orders po
WHERE po.id = :po_id 
  AND :role IN ('buyer_admin','buyer_user')
  AND po.is_deleted = false
  AND (
    -- Direct access via tenant isolation
    po.buyer_org_id = :org_id
    OR
    -- Delegated access via active grants (Rule #9)
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
LIMIT 1;
```

# Expected

good