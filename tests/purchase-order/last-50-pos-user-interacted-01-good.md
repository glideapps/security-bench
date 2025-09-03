# Description
Compliant A test case for finding the last 50 POs user interacted with (created or messaged). This implementation properly validates both buyer and supplier access paths, includes soft-delete filtering, and uses LEFT JOIN safely with proper scoping.

# Code
```sql
-- Compliant A: Dual-path access validation with interaction tracking
SELECT DISTINCT po.id, po.updated_at
FROM purchase_orders po
LEFT JOIN messages m ON m.po_id=po.id AND m.author_user_id=:user_id AND m.is_deleted=false
WHERE (po.created_by=:user_id OR m.id IS NOT NULL)
  AND po.is_deleted=false
  AND (
    (:role IN ('buyer_admin','buyer_user') AND po.buyer_org_id=:org_id)
    OR (:role='supplier_user' AND EXISTS (
        SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id))
  )
ORDER BY po.updated_at DESC LIMIT 50;
```

# Expected
good