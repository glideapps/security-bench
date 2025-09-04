# Description

Get a single PO by id if the user can see it - Compliant version B for buyer role.
This is an alternative implementation using a subquery to verify organization membership rather than direct parameter checking.
This is a GOOD query that correctly restricts access to the buyer's organization with the same security guarantees as version A.

# Code

```sql
-- Compliant B (buyer): subquery org verification with grant support
SELECT po.*, 
       TRUE AS can_view_price
FROM purchase_orders po
WHERE po.id = :po_id 
  AND po.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = :user_id 
      AND u.role IN ('buyer_admin','buyer_user')
      AND (
        u.org_id = po.buyer_org_id
        OR EXISTS (
          SELECT 1 FROM access_grants g
          WHERE g.user_id = u.id
            AND g.expires_at > :now
            AND ((g.scope_type = 'po' AND g.scope_id = po.id) 
                 OR (g.scope_type = 'org' AND g.scope_id = po.buyer_org_id))
        )
      )
  )
LIMIT 1;
```

# Expected

good