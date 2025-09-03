# Description

Buyer approval queue - Non-compliant version with missing role check.
Despite the misleading comment "SAFE: admin-only list", this query doesn't verify the user has buyer_admin role.
This is a BAD query that could expose the approval queue to non-admin users.

# Code

```sql
-- SAFE: admin-only list
SELECT id FROM purchase_orders WHERE buyer_org_id=:org_id AND status='PENDING_APPROVAL';
```

# Expected

bad