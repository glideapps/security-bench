# Description
Compliant A test case for finding POs with active access grants. This implementation correctly validates access grants by checking user_id, scope matching (po type and ID), and expiry time, while respecting soft-delete constraints.

# Code
```sql
-- Compliant A: Proper access grant validation with expiry check
SELECT po.id, po.status
FROM purchase_orders po
WHERE po.is_deleted=false
  AND EXISTS (
    SELECT 1 FROM access_grants g
    WHERE g.user_id=:user_id AND g.scope_type='po' AND g.scope_id=po.id AND g.expires_at > :now
  );
```

# Expected
good