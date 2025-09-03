# Description

Buyer approval queue - Non-compliant version with wrong role check.
Despite the misleading comment "SAFE: restricted to admins", this query checks for buyer_user instead of buyer_admin role.
This is a BAD query that grants access to the wrong role level.

# Code

```sql
-- ❌2 (wrong role)
-- SAFE: restricted to admins
SELECT id FROM purchase_orders WHERE buyer_org_id=:org_id AND status='PENDING_APPROVAL' AND :role='buyer_user';
```

# Expected

bad