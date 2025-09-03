# Description

Buyer approval queue (buyer_admin only) - Compliant version B using EXISTS for role check.
This query properly verifies the user has buyer_admin role through an EXISTS subquery, filters by organization and status, and respects soft-delete.
This is a GOOD query that correctly implements role-based access control using database-level verification.

# Code

```sql
-- Compliant B (EXISTS role from users)
SELECT po.id
FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.status='PENDING_APPROVAL' AND po.is_deleted=false
  AND EXISTS (SELECT 1 FROM users u WHERE u.id=:user_id AND u.role='buyer_admin');
```

# Expected

good