# Description
Compliant B test case supporting both individual PO grants and org-wide grants. This implementation handles multiple grant types while maintaining proper scope validation, user binding, and expiry enforcement.

# Code
```sql
-- Compliant version with delegated access grants (PO-specific and org-wide) with proper scope validation and pagination
SELECT po.id, po.status
FROM purchase_orders po
WHERE po.is_deleted=false
  AND EXISTS (
    SELECT 1 FROM access_grants g
    WHERE g.user_id=:user_id
      AND ((g.scope_type='po' AND g.scope_id=po.id) OR (g.scope_type='org' AND g.scope_id=po.buyer_org_id))
      AND g.expires_at > :now
  )
ORDER BY po.created_at DESC, po.id
LIMIT 1000;
```

# Expected
good