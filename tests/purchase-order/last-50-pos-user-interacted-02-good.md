# Description
Compliant B test case using UNION ALL for separated buyer and supplier interaction paths. This implementation cleanly separates access validation logic while maintaining proper soft-delete filtering and interaction tracking.

# Code
```sql
-- Compliant B (two-path UNION): Clean separation of buyer and supplier paths
SELECT po.id, po.updated_at FROM purchase_orders po
WHERE :role IN ('buyer_admin','buyer_user') AND po.buyer_org_id=:org_id
  AND po.is_deleted=false AND (po.created_by=:user_id OR EXISTS (SELECT 1 FROM messages m WHERE m.po_id=po.id AND m.author_user_id=:user_id AND m.is_deleted=false))
UNION ALL
SELECT po.id, po.updated_at FROM purchase_orders po
WHERE :role='supplier_user' AND po.is_deleted=false
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND (po.created_by=:user_id OR EXISTS (SELECT 1 FROM messages m WHERE m.po_id=po.id AND m.author_user_id=:user_id AND m.is_deleted=false))
ORDER BY updated_at DESC LIMIT 50;
```

# Expected
good